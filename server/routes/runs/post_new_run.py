from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import json
import uuid
import logging
import os
import pandas as pd
from sqlalchemy import text
from ..config.get_run_config import WorkflowConfig
from app.file_parser import parser_map
from ..get_health_check import get_db, supabase
from ..dagster_execute import execute_workflow, validate_dagster_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["workflow"])

SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

def validate_workflow(workflow_id: int, db: Session) -> Dict[str, Any]:
    try:
        result = db.execute(
            text("""
            SELECT id, name, input_file_path, input_structure, destination,
                   config_template, default_parameters, parameters
            FROM workflow.workflow
            WHERE id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        )
        workflow_row = result.fetchone()
        if not workflow_row:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

        workflow = {
            "id": workflow_row.id,
            "name": workflow_row.name,
            "input_file_path": workflow_row.input_file_path,
            "input_structure": workflow_row.input_structure,
            "destination": workflow_row.destination,
            "config_template": workflow_row.config_template,
            "default_parameters": workflow_row.default_parameters,
            "parameters": workflow_row.parameters
        }

        json_fields = ["input_structure", "config_template", "default_parameters", "parameters"]
        for field in json_fields:
            if workflow[field] and isinstance(workflow[field], str):
                try:
                    workflow[field] = json.loads(workflow[field])
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in {field}: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Invalid JSON in {field}: {str(e)}")
            elif workflow[field] is None:
                workflow[field] = {} if field != "parameters" else []

        return workflow
    except Exception as e:
        logger.error(f"Error validating workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {str(e)}")

async def handle_file_upload(file: UploadFile, workflow_id: int, expected_structure: Optional[Dict]) -> str:
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in parser_map:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")

    try:
        content = await file.read()
        df = await parser_map[file_ext].parse(content)
        if expected_structure:
            validate_file_structure(df, expected_structure)

        file_path = f"runs/{workflow_id}/{uuid.uuid4()}.{file_ext}"
        # Remove the await keyword here
        supabase.storage.from_(SUPABASE_BUCKET).upload(file_path, content, {"content-type": "application/octet-stream"})
        logger.info(f"File uploaded to {SUPABASE_BUCKET}/{file_path}")
        return f"{SUPABASE_BUCKET}/{file_path}"
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

def validate_file_structure(df: pd.DataFrame, expected_structure: Dict[str, Any]) -> None:
    if not expected_structure.get("columns"):
        return

    actual_columns = set(df.columns)
    expected_columns = {col["name"] for col in expected_structure["columns"]}
    if actual_columns != expected_columns:
        missing = expected_columns - actual_columns
        extra = actual_columns - expected_columns
        errors = []
        if missing:
            errors.append(f"Missing columns: {', '.join(missing)}")
        if extra:
            errors.append(f"Unexpected columns: {', '.join(extra)}")
        raise ValueError("; ".join(errors))

def validate_parameters(input_params: Dict[str, Any], expected_params: List[Dict[str, Any]]) -> None:
    expected_param_names = {p["name"] for p in expected_params}
    input_param_names = set(input_params.keys())
    missing_params = expected_param_names - input_param_names
    extra_params = input_param_names - expected_param_names

    errors = []
    if missing_params:
        errors.append(f"Missing parameters: {', '.join(missing_params)}")
    if extra_params:
        errors.append(f"Unexpected parameters: {', '.join(extra_params)}")

    for param in expected_params:
        if param["name"] in input_params:
            expected_type = param["type"]
            actual_value = input_params[param["name"]]
            if expected_type == "string" and not isinstance(actual_value, str):
                errors.append(f"Parameter {param['name']} must be a string")
            elif expected_type == "integer" and not isinstance(actual_value, int):
                errors.append(f"Parameter {param['name']} must be an integer")
            if param.get("mandatory") and not actual_value:
                errors.append(f"Parameter {param['name']} is mandatory")

    if errors:
        raise ValueError("; ".join(errors))

def create_run_record(db: Session, workflow_id: int, triggered_by: int, input_path: str,
                    dagster_run_id: str, status: str, config: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, status, input_file_path,
                    dagster_run_id, config_used, started_at
                ) VALUES (
                    :workflow_id, :triggered_by, :status, :input_path,
                    :dagster_run_id, :config, NOW()
                )
                RETURNING id, status, dagster_run_id
            """),
            {
                "workflow_id": workflow_id,
                "triggered_by": triggered_by,
                "status": status,
                "input_path": input_path,
                "dagster_run_id": dagster_run_id,
                "config": json.dumps(config)
            }
        )
        db.commit()
        return dict(result.fetchone())
    except Exception as e:
        logger.error(f"Failed to create run record: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create run record: {str(e)}")

@router.post("/run/new")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: str = Form("{}"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    try:
        workflow = validate_workflow(workflow_id, db)
        try:
            input_params = json.loads(parameters)
            if workflow.get("parameters"):
                validate_parameters(input_params, workflow["parameters"])
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid parameters format: {str(e)}")

        input_path = workflow.get("input_file_path")
        if file and file.filename:
            input_path = await handle_file_upload(file, workflow_id, workflow.get("input_structure"))
        elif workflow.get("input_file_path") and not file:
            raise HTTPException(status_code=400, detail="Input file required")

        config_template = workflow.get("config_template", {})
        defaults = workflow.get("default_parameters", {})
        config = WorkflowConfig(workflow_id, config_template, defaults)
        run_params = {**defaults, **input_params}
        run_config = config.build_config(input_path, run_params)

        is_valid, error_msg = validate_dagster_config(f"workflow_job_{workflow_id}", run_config)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid configuration: {error_msg}")

        result = await execute_workflow(workflow_id, run_config, db)
        run_record = create_run_record(
            db, workflow_id, triggered_by, input_path,
            result["run_id"], result["status"], run_config
        )

        output_path = run_config.get("ops", {}).get("save_output_{workflow_id}", {}).get("config", {}).get("output_file_path")
        response = {
            "run_id": run_record["id"],
            "status": run_record["status"],
            "dagster_run_id": run_record["dagster_run_id"]
        }
        if output_path:
            response["output_file"] = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/{output_path}"
        return response

    except HTTPException as he:
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")
