from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
import logging
import pandas as pd
from app.file_parser import parser_map
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])

def validate_workflow(workflow_id: int, db: Session) -> Dict[str, Any]:
    """Validate and retrieve workflow configuration from database"""
    try:
        result = db.execute(
            text("""
                SELECT id, name, input_file_path, supported_file_types
                FROM workflow.workflow
                WHERE id = :workflow_id AND status = 'Active'
            """),
            {"workflow_id": workflow_id}
        )
        workflow_row = result.fetchone()
        if not workflow_row:
            logger.error(f"Active workflow {workflow_id} not found")
            raise HTTPException(status_code=404, detail=f"Active workflow {workflow_id} not found")

        workflow = {
            "id": workflow_row.id,
            "name": workflow_row.name,
            "input_file_path": workflow_row.input_file_path,
            "supported_file_types": workflow_row.supported_file_types
        }

        json_fields = ["input_file_path", "supported_file_types"]
        for field in json_fields:
            if workflow[field] and isinstance(workflow[field], str):
                try:
                    workflow[field] = json.loads(workflow[field])
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in {field}: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Invalid JSON in {field}: {str(e)}")
            elif workflow[field] is None:
                if field == "input_file_path":
                    workflow[field] = []
                elif field == "supported_file_types":
                    workflow[field] = ["csv", "xlsx", "json"]

        return workflow
    except Exception as e:
        logger.error(f"Error validating workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {str(e)}")

def validate_file_structure(df: pd.DataFrame, expected_structure: List[Dict[str, Any]], filename: str, file_name: str) -> None:
    """Strictly validate uploaded file structure against expected schema"""
    if not expected_structure or not isinstance(expected_structure, list):
        logger.debug(f"No structure defined for file {filename} ({file_name}), skipping validation")
        return

    try:
        actual_columns = set(df.columns)
        expected_columns = {col["name"] for col in expected_structure if isinstance(col, dict) and "name" in col}
        
        if not expected_columns:
            logger.warning(f"No valid column definitions in structure for file {filename} ({file_name})")
            return

        # Check for missing and extra columns
        missing_columns = expected_columns - actual_columns
        extra_columns = actual_columns - expected_columns
        errors = []
        
        if missing_columns:
            errors.append(f"Missing columns in {filename} for {file_name}: {', '.join(sorted(missing_columns))}")
        if extra_columns:
            errors.append(f"Unexpected columns in {filename} for {file_name}: {', '.join(sorted(extra_columns))}")
        
        if errors:
            logger.error(f"File structure validation failed for {filename} ({file_name}): {'; '.join(errors)}")
            raise HTTPException(status_code=400, detail="; ".join(errors))

        # Validate data types for each column
        type_errors = []
        for col_def in expected_structure:
            if not isinstance(col_def, dict) or "name" not in col_def:
                continue
                
            col_name = col_def["name"]
            expected_type = col_def.get("type", "string")
            required = col_def.get("required", False)
            
            if col_name not in df.columns:
                continue  # Already handled in missing columns check
            
            series = df[col_name]
            
            # Check for required fields that are empty
            if required and series.isna().all():
                type_errors.append(f"Required column '{col_name}' in {filename} contains only null values")
                continue
            
            # Skip type validation if all values are null and column is not required
            if series.isna().all() and not required:
                continue
            
            # Validate data types
            non_null_series = series.dropna()
            if len(non_null_series) == 0:
                continue
            
            try:
                if expected_type == "string":
                    # String type - most permissive, just check it's not numeric when it shouldn't be
                    pass
                elif expected_type == "integer":
                    # Check if values can be converted to integers
                    pd.to_numeric(non_null_series, errors='raise', downcast='integer')
                elif expected_type == "float" or expected_type == "number":
                    # Check if values can be converted to floats
                    pd.to_numeric(non_null_series, errors='raise')
                elif expected_type == "date" or expected_type == "datetime":
                    # Check if values can be converted to datetime
                    pd.to_datetime(non_null_series, errors='raise')
                elif expected_type == "boolean":
                    # Check if values are boolean-like
                    unique_vals = non_null_series.unique()
                    valid_bool_vals = {True, False, 'true', 'false', 'True', 'False', 'TRUE', 'FALSE', 
                                     1, 0, '1', '0', 'yes', 'no', 'Yes', 'No', 'YES', 'NO'}
                    if not all(val in valid_bool_vals for val in unique_vals):
                        raise ValueError(f"Invalid boolean values in column {col_name}")
            except (ValueError, TypeError) as e:
                type_errors.append(f"Column '{col_name}' in {filename} has invalid data type. Expected {expected_type}, but validation failed: {str(e)}")
        
        if type_errors:
            logger.error(f"Data type validation failed for {filename} ({file_name}): {'; '.join(type_errors)}")
            raise HTTPException(status_code=400, detail="; ".join(type_errors))
        
        logger.debug(f"File {filename} ({file_name}) passed structure and type validation")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File structure validation failed for {filename} ({file_name}): {str(e)}")
        raise HTTPException(status_code=400, detail=f"File structure validation failed for {filename} ({file_name}): {str(e)}")

async def validate_single_file(file: UploadFile, workflow: Dict[str, Any], file_config: Dict[str, Any] = None) -> Dict[str, Any]:
    """Validate the structure of a single uploaded file in memory"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = file.filename.split('.')[-1].lower()
    file_name = file_config["name"] if file_config else "input"
    
    # Use file_config supported types if provided, otherwise workflow default
    if file_config and "format" in file_config:
        # If format is specified, use that as the primary supported type
        supported_types = [file_config["format"]]
        # Also allow other common formats if supported_file_types is available in workflow
        if workflow.get("supported_file_types"):
            supported_types.extend(workflow["supported_file_types"])
            supported_types = list(set(supported_types))  # Remove duplicates
    elif file_config and "supported_types" in file_config:
        supported_types = file_config["supported_types"]
    else:
        supported_types = workflow.get("supported_file_types", ["csv", "xlsx", "json"])

    if file_ext not in supported_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type for {file.filename} ({file_name}): {file_ext}. Supported types: {', '.join(supported_types)}"
        )

    if file_ext not in parser_map:
        raise HTTPException(status_code=400, detail=f"No parser available for file type: {file_ext}")

    # Check for potential file name mismatch
    warnings = []
    if file_name.lower() not in file.filename.lower():
        warnings.append(f"File {file.filename} for {file_name} may be incorrect based on its name. Expected a file related to {file_name}.")

    try:
        content = await file.read()
        # Sample up to 100 rows for CSVs only for validation
        parse_kwargs = {"nrows": 100} if file_ext == "csv" else {}
        df = await parser_map[file_ext].parse(content, **parse_kwargs)

        # Get the structure from the file_config
        expected_structure = file_config.get("structure", []) if file_config else []
        validate_file_structure(df, expected_structure, file.filename, file_name)

        response = {
            "name": file_name,
            "filename": file.filename,
            "valid": True,
            "message": f"File structure validated successfully for {file.filename} ({file_name})"
        }
        if warnings:
            response["warnings"] = warnings
        return response
    except HTTPException as e:
        logger.error(f"File validation failed for {file.filename} ({file_name}): {str(e)}")
        raise
    except Exception as e:
        logger.error(f"File validation failed for {file.filename} ({file_name}): {str(e)}")
        raise HTTPException(status_code=400, detail=f"File validation failed for {file.filename} ({file_name}): {str(e)}")

@router.post("/validate_file")
async def validate_file_structure_endpoint(
    workflow_id: int = Form(...),
    file: UploadFile = File(None),
    file_mapping: str = Form("{}"),
    request: Request = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Validate the structure of uploaded files against the workflow's expected schema"""
    try:
        workflow = validate_workflow(workflow_id, db)
        input_config = workflow.get("input_file_path", [])
        
        # Validate required files
        required_files = {config["name"] for config in input_config if config.get("required", False)}
        
        # Handle backward compatibility - single file workflows
        if not isinstance(input_config, list):
            if not file or not file.filename:
                if workflow.get("requires_file"):
                    raise HTTPException(status_code=400, detail="Input file required")
                return {
                    "success": True,
                    "files": [],
                    "message": "No files required for validation"
                }
            file_info = await validate_single_file(file, workflow)
            return {
                "success": True,
                "files": [file_info],
                "message": "All files validated successfully"
            }
        
        # Handle new multi-file structure
        if len(input_config) == 0:
            return {
                "success": True,
                "files": [],
                "message": "No files required for validation"
            }
        
        # If only one file config and it's the legacy 'input_file', use single file upload
        if len(input_config) == 1 and input_config[0].get("name") == "input_file" and file and file.filename:
            file_info = await validate_single_file(file, workflow, input_config[0])
            return {
                "success": True,
                "files": [file_info],
                "message": "All files validated successfully"
            }
        
        # Handle multiple files
        try:
            mapping = json.loads(file_mapping) if file_mapping else {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid file_mapping JSON: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid file_mapping JSON: {str(e)}")
        
        form = await request.form()
        validated_files = []
        uploaded_file_names = set()
        
        for file_config in input_config:
            file_name = file_config["name"]
            form_field = mapping.get(file_name, f"file_{file_name}")
            
            if form_field in form:
                uploaded_file = form[form_field]
                if hasattr(uploaded_file, 'filename') and uploaded_file.filename:
                    file_info = await validate_single_file(uploaded_file, workflow, file_config)
                    validated_files.append(file_info)
                    uploaded_file_names.add(file_name)
        
        # Check for missing required files
        missing_required = required_files - uploaded_file_names
        if missing_required:
            errors = [f"Required file missing: {file_name}" for file_name in sorted(missing_required)]
            logger.error(f"Validation failed: {'; '.join(errors)}")
            raise HTTPException(status_code=400, detail="; ".join(errors))
        
        if not validated_files:
            raise HTTPException(status_code=400, detail="No valid files provided for validation")
        
        logger.info(f"Validated {len(validated_files)} files for workflow {workflow_id}")
        any_warnings = any(file_info.get("warnings") for file_info in validated_files)
        message = "All files validated successfully"
        if any_warnings:
            message += " with warnings (check file names for potential mismatches)"
        return {
            "success": True,
            "files": validated_files,
            "message": message
        }
    
    except HTTPException as e:
        logger.error(f"Validation failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File validation failed: {str(e)}")