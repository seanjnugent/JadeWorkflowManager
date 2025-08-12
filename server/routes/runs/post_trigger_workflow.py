from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import json
import uuid
import logging
import os
import pandas as pd
from sqlalchemy import text
import requests
import boto3
from botocore.exceptions import ClientError
from app.file_parser import parser_map
from ..get_health_check import get_db  

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])

# AWS S3 Configuration
S3_BUCKET = os.getenv("S3_BUCKET", "workflow-files")
AWS_REGION = os.getenv("S3_REGION", "us-east-1")
S3_ENDPOINT = os.getenv("S3_ENDPOINT")
DAGSTER_HOST = os.getenv("DAGSTER_HOST", "localhost")
DAGSTER_PORT = os.getenv("DAGSTER_PORT", "3500")

# Initialize S3 client with explicit credentials
s3_client_config = {
    'region_name': AWS_REGION,
    'aws_access_key_id': os.getenv("S3_ACCESS_KEY_ID"),
    'aws_secret_access_key': os.getenv("S3_SECRET_ACCESS_KEY"),
}
if S3_ENDPOINT:
    s3_client_config['endpoint_url'] = S3_ENDPOINT

s3_client = boto3.client('s3', **s3_client_config)

def validate_workflow(workflow_id: int, db: Session) -> Dict[str, Any]:
    """Validate and retrieve workflow configuration from database"""
    try:
        result = db.execute(
            text("""
                SELECT id, name, input_file_path, input_structure, destination,
                       config_template, default_parameters, parameters, resources_config,
                       dagster_location_name, dagster_repository_name, requires_file,
                       output_file_pattern, supported_file_types, destination_config, source_config
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
            "input_structure": workflow_row.input_structure,
            "destination": workflow_row.destination,
            "config_template": workflow_row.config_template,
            "default_parameters": workflow_row.default_parameters,
            "parameters": workflow_row.parameters,
            "resources_config": workflow_row.resources_config,
            "dagster_location_name": workflow_row.dagster_location_name or "server.app.dagster.repo",
            "dagster_repository_name": workflow_row.dagster_repository_name or "__repository__",
            "requires_file": workflow_row.requires_file,
            "output_file_pattern": workflow_row.output_file_pattern,
            "supported_file_types": workflow_row.supported_file_types,
            "destination_config": workflow_row.destination_config,
            "source_config": workflow_row.source_config
        }

        json_fields = ["input_structure", "config_template", "default_parameters", "parameters", 
                       "resources_config", "supported_file_types", "destination_config", "source_config"]
        for field in json_fields:
            if workflow[field] and isinstance(workflow[field], str):
                try:
                    workflow[field] = json.loads(workflow[field])
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON in {field}: {str(e)}")
                    raise HTTPException(status_code=400, detail=f"Invalid JSON in {field}: {str(e)}")
            elif workflow[field] is None:
                if field == "parameters":
                    workflow[field] = []
                elif field == "supported_file_types":
                    workflow[field] = ["csv", "xlsx", "json"]
                elif field == "input_file_path":
                    workflow[field] = []
                else:
                    workflow[field] = {}

        return workflow
    except Exception as e:
        logger.error(f"Error validating workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {str(e)}")

async def handle_single_file_upload(file: UploadFile, workflow: Dict[str, Any], 
                                  file_config: Dict[str, Any] = None) -> str:
    """Handle single file upload with optional file config validation"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = file.filename.split('.')[-1].lower()
    
    # Use file_config supported types if provided, otherwise workflow default
    if file_config and "supported_types" in file_config:
        supported_types = file_config["supported_types"]
    else:
        supported_types = workflow.get("supported_file_types", ["csv", "xlsx", "json"])

    if file_ext not in supported_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type: {file_ext}. Supported types: {', '.join(supported_types)}"
        )

    if file_ext not in parser_map:
        raise HTTPException(status_code=400, detail=f"No parser available for file type: {file_ext}")

    try:
        content = await file.read()
        df = await parser_map[file_ext].parse(content)

        if workflow.get("input_structure"):
            validate_file_structure(df, workflow["input_structure"])

        workflow_id = workflow["id"]
        file_name_part = file_config["name"] if file_config else "input"
        s3_key = f"runs/{workflow_id}/{file_name_part}_{uuid.uuid4()}.{file_ext}"

        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=content,
            ContentType="application/octet-stream"
        )

        logger.info(f"File uploaded to S3: {S3_BUCKET}/{s3_key}")
        return f"{S3_BUCKET}/{s3_key}"

    except ClientError as e:
        logger.error(f"S3 upload failed: {e.response['Error']['Message']}")
        raise HTTPException(
            status_code=500,
            detail=f"File upload failed: {e.response['Error']['Message']}"
        )
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

async def handle_multiple_file_uploads(workflow: Dict[str, Any], single_file: UploadFile, 
                                     file_mapping: str, request: Request) -> Dict[str, str]:
    """Handle multiple file uploads with backward compatibility"""
    input_config = workflow.get("input_file_path", [])
    
    # Handle backward compatibility - single file workflows
    if not isinstance(input_config, list):
        if single_file and single_file.filename:
            path = await handle_single_file_upload(single_file, workflow)
            return {"input_file": path}
        return {}
    
    # Handle new multi-file structure
    if len(input_config) == 0:
        return {}
    
    # If only one file config and it's the legacy 'input_file', use single file upload
    if len(input_config) == 1 and input_config[0].get("name") == "input_file" and single_file:
        path = await handle_single_file_upload(single_file, workflow)
        return {"input_file": path}
    
    # Handle multiple files
    file_paths = {}
    
    try:
        mapping = json.loads(file_mapping) if file_mapping else {}
    except json.JSONDecodeError:
        mapping = {}
    
    # Get the request form to access dynamic file fields
    form = await request.form()
    
    for file_config in input_config:
        file_name = file_config["name"]
        form_field = mapping.get(file_name, f"file_{file_name}")
        
        if form_field in form:
            uploaded_file = form[form_field]
            if hasattr(uploaded_file, 'filename') and uploaded_file.filename:
                file_path = await handle_single_file_upload(uploaded_file, workflow, file_config)
                file_paths[file_name] = file_path
    
    return file_paths

def validate_file_structure(df: pd.DataFrame, expected_structure: Dict[str, Any]) -> None:
    """Validate uploaded file structure against expected schema"""
    if not expected_structure.get("columns"):
        return

    try:
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
            if errors:
                raise HTTPException(status_code=400, detail="; ".join(errors))
    except Exception as e:
        logger.error(f"File structure validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"File structure validation failed: {str(e)}")

def validate_parameters(input_params: Dict[str, Any], parameters: List[Dict[str, Any]]) -> None:
    """Validate input parameters against workflow requirements"""
    try:
        flattened_params = []
        for section in parameters:
            if "parameters" in section:
                flattened_params.extend(section["parameters"])
            else:
                flattened_params.append(section)
        
        logger.info(f"Input parameters: {input_params}")
        logger.info(f"Flattened parameters config: {flattened_params}")
        
        expected_param_names = {p["name"] for p in flattened_params}
        input_param_names = set(input_params.keys())
        
        missing_params = expected_param_names - input_param_names
        extra_params = input_param_names - expected_param_names

        errors = []
        if missing_params:
            errors.append(f"Missing parameters: {', '.join(missing_params)}")
        if extra_params:
            errors.append(f"Unexpected parameters: {', '.join(extra_params)}")

        for param in flattened_params:
            param_name = param["name"]
            if param_name in input_params:
                expected_type = param["type"]
                actual_value = input_params[param_name]
                
                if expected_type == "select":
                    if "options" in param:
                        valid_values = [opt["value"] for opt in param["options"]]
                        if actual_value not in valid_values:
                            errors.append(f"Parameter {param_name} must be one of: {', '.join(valid_values)}")
                elif expected_type == "string" and not isinstance(actual_value, str):
                    errors.append(f"Parameter {param_name} must be a string")
                elif expected_type == "integer" and not isinstance(actual_value, int):
                    errors.append(f"Parameter {param_name} must be an integer")
                    
                if param.get("mandatory") and not actual_value:
                    errors.append(f"Parameter {param_name} is mandatory")

        if errors:
            raise HTTPException(status_code=400, detail="; ".join(errors))
            
    except Exception as e:
        logger.error(f"Parameter validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Parameter validation failed: {str(e)}")

def validate_required_files(workflow: Dict[str, Any], input_paths: Dict[str, str]) -> None:
    """Validate that all required files have been uploaded"""
    input_config = workflow.get("input_file_path", [])
    
    if not isinstance(input_config, list):
        # Legacy single file handling
        if workflow.get("requires_file") and not input_paths:
            raise HTTPException(status_code=400, detail="Input file required")
        return
    
    # Multi-file validation
    for file_config in input_config:
        if file_config.get("required", False):
            file_name = file_config["name"]
            if file_name not in input_paths or not input_paths[file_name]:
                description = file_config.get("description", file_name)
                raise HTTPException(
                    status_code=400, 
                    detail=f"Required file missing: {description}"
                )

def substitute_template_variables(obj, vars_dict):
    """Recursively replace template variables in any part of the object"""
    if isinstance(obj, dict):
        return {k: substitute_template_variables(v, vars_dict) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [substitute_template_variables(item, vars_dict) for item in obj]
    elif isinstance(obj, str):
        if obj.startswith('{') and obj.endswith('}'):
            var_name = obj[1:-1]
            if var_name in vars_dict:
                return vars_dict[var_name]
        
        result = obj
        for key, value in vars_dict.items():
            placeholder = f"{{{key}}}"
            if placeholder in result:
                result = result.replace(placeholder, str(value))
        
        return result
    return obj

def build_dagster_config(workflow: Dict[str, Any], input_paths: Dict[str, str], 
                        parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Build Dagster configuration from workflow template with multiple file support"""
    workflow_id = workflow["id"]
    run_uuid = str(uuid.uuid4())
    output_pattern = workflow.get("output_file_pattern", "workflow-files/outputs/output_{workflow_id}_{run_uuid}.json")
    output_extension = workflow.get("destination", "json").lower()
    output_path = output_pattern.replace("{workflow_id}", str(workflow_id)) \
                                .replace("{run_uuid}", run_uuid) \
                                .replace("{output_extension}", output_extension)

    # Build template variables with file paths
    template_vars = {
        "workflow_id": int(workflow_id),
        "run_uuid": run_uuid,
        "output_file_path": output_path,
        **parameters
    }
    
    # Add file paths to template variables
    if input_paths:
        # For backward compatibility, if there's a single file called 'input_file', 
        # also set 'input_file_path'
        if len(input_paths) == 1 and "input_file" in input_paths:
            template_vars["input_file_path"] = input_paths["input_file"]
        
        # Add all file paths with their names
        for file_name, file_path in input_paths.items():
            template_vars[f"{file_name}_path"] = file_path
        
        # Also add the full input_paths dict for more complex workflows
        template_vars["input_paths"] = input_paths
    else:
        template_vars["input_file_path"] = ""
        template_vars["input_paths"] = {}

    source_config = workflow.get("source_config", {})
    if isinstance(source_config, str):
        try:
            source_config = json.loads(source_config)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse source_config JSON: {source_config}")
            source_config = {}
    
    if isinstance(source_config, dict):
        template_vars.update(source_config)
        logger.info(f"Added source_config to template vars: {source_config}")
    
    if workflow["destination"] == "API" and workflow.get("destination_config"):
        dest_config = workflow["destination_config"]
        if isinstance(dest_config, dict):
            template_vars.update({
                f"ckan_{k}": v for k, v in dest_config.items()
            })

    config_template = workflow.get("config_template", {})
    logger.info(f"Config template before substitution: {json.dumps(config_template, indent=2)}")
    logger.info(f"Template variables: {json.dumps(template_vars, indent=2, default=str)}")

    dagster_config = substitute_template_variables(config_template, template_vars)
    
    dagster_config.setdefault("resources", {}).update(workflow.get("resources_config", {
        "s3": {
            "config": {
                "aws_access_key_id": {"env": "S3_ACCESS_KEY_ID"},
                "aws_secret_access_key": {"env": "S3_SECRET_ACCESS_KEY"},
                "region_name": os.getenv("S3_REGION", "eu-west-2"),
                "endpoint_url": {"env": "S3_ENDPOINT"}
            }
        }
    }))

    logger.info(f"Final Dagster config: {json.dumps(dagster_config, indent=2, default=str)}")
    return dagster_config

def create_run_record(db: Session, workflow_id: int, triggered_by: int, file_mapping: Dict[str, str], 
                     dagster_run_id: str, status: str, config: Dict[str, Any], run_name: str) -> Dict[str, Any]:
    """Create run record in database"""
    try:
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, status, input_file_path,
                    dagster_run_id, config_used, started_at, run_name
                ) VALUES (
                    :workflow_id, :triggered_by, :status, :input_path,
                    :dagster_run_id, :config, NOW(), :run_name
                )
                RETURNING id, status, dagster_run_id, run_name
            """),
            {
                "workflow_id": workflow_id,
                "triggered_by": triggered_by,
                "status": status,
                "input_path": json.dumps(file_mapping),
                "dagster_run_id": dagster_run_id,
                "config": json.dumps(config),
                "run_name": run_name
            }
        )
        run_record = result.fetchone()
        if run_record is None:
            raise Exception("No record returned from INSERT")

        run_id, run_status, run_dagster_run_id, run_name = run_record
        db.commit()

        return {
            "id": run_id,
            "status": run_status,
            "dagster_run_id": run_dagster_run_id,
            "run_name": run_name
        }
    except Exception as e:
        logger.error(f"Failed to create run record: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create run record: {str(e)}")

async def execute_dagster_workflow_direct(workflow: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, str]:
    """Execute Dagster workflow via direct GraphQL API call"""
    try:
        workflow_id = workflow["id"]
        job_name = f"workflow_job_{workflow_id}"
        location_name = workflow.get("dagster_location_name", "server.app.dagster.repo")
        repository_name = workflow.get("dagster_repository_name", "__repository__")

        mutation = """
        mutation LaunchPipelineExecution(
            $repositoryLocationName: String!
            $repositoryName: String!
            $pipelineName: String!
            $runConfigData: RunConfigData!
        ) {
            launchPipelineExecution(
                executionParams: {
                    selector: {
                        repositoryLocationName: $repositoryLocationName
                        repositoryName: $repositoryName
                        pipelineName: $pipelineName
                    }
                    runConfigData: $runConfigData
                }
            ) {
                __typename
                ... on LaunchRunSuccess {
                    run {
                        runId
                        status
                    }
                }
                ... on LaunchPipelineRunSuccess {
                    run {
                        runId
                        status
                    }
                }
                ... on InvalidStepError {
                    invalidStepKey
                }
                ... on InvalidOutputError {
                    stepKey
                    invalidOutputName
                }
                ... on RunConfigValidationInvalid {
                    errors {
                        message
                        reason
                        path
                    }
                }
                ... on PipelineNotFoundError {
                    message
                    pipelineName
                }
                ... on PythonError {
                    message
                    stack
                }
            }
        }
        """

        variables = {
            "repositoryLocationName": location_name,
            "repositoryName": repository_name,
            "pipelineName": job_name,
            "runConfigData": config
        }

        logger.info(f"Submitting GraphQL mutation with variables: {json.dumps(variables, indent=2)}")

        dagster_url = f"http://{DAGSTER_HOST}:{DAGSTER_PORT}/graphql"

        response = requests.post(
            dagster_url,
            json={
                "query": mutation,
                "variables": variables
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        logger.info(f"HTTP Response Status: {response.status_code}")
        logger.info(f"HTTP Response Headers: {dict(response.headers)}")

        try:
            response_text = response.text
            logger.info(f"Raw response: {response_text}")
        except:
            logger.info("Could not log raw response")

        response.raise_for_status()
        result = response.json()

        logger.info(f"GraphQL response: {json.dumps(result, indent=2)}")

        if "errors" in result:
            error_msg = f"GraphQL errors: {result['errors']}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        launch_result = result.get("data", {}).get("launchPipelineExecution", {})

        if launch_result.get("__typename") in ["LaunchRunSuccess", "LaunchPipelineRunSuccess"]:
            run_info = launch_result["run"]
            run_id = run_info["runId"]
            status = run_info.get("status", "SUBMITTED")
            logger.info(f"Successfully submitted Dagster job {job_name} with run_id: {run_id}")
            return {
                "run_id": run_id,
                "status": status
            }
        elif launch_result.get("__typename") == "RunConfigValidationInvalid":
            errors = launch_result.get("errors", [])
            error_messages = [f"{err.get('message', '')} (path: {err.get('path', '')}, reason: {err.get('reason', '')})" for err in errors]
            error_msg = f"Config validation failed: {'; '.join(error_messages)}"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        elif launch_result.get("__typename") == "PipelineNotFoundError":
            error_msg = f"Pipeline not found: {launch_result.get('message', '')} (pipeline: {launch_result.get('pipelineName', job_name)})"
            logger.error(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        elif launch_result.get("__typename") == "JobNotFoundError":
            error_msg = f"Job not found: {launch_result.get('message', '')} (job: {launch_result.get('jobName', job_name)})"
            logger.error(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        elif launch_result.get("__typename") == "PythonError":
            error_msg = f"Python error: {launch_result.get('message', '')}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        else:
            error_msg = f"Unknown response type: {launch_result}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Dagster: {str(e)}")
    except Exception as e:
        logger.error(f"Error executing Dagster workflow: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.post("/trigger")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    run_name: str = Form(...),
    parameters: str = Form("{}"),
    file: UploadFile = File(None),  # Keep for backward compatibility
    file_mapping: str = Form("{}"),  # JSON string mapping file names to form field names
    request: Request = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Trigger a workflow run with support for multiple files"""
    try:
        workflow = validate_workflow(workflow_id, db)
        input_params = json.loads(parameters)
        
        if workflow.get("parameters"):
            validate_parameters(input_params, workflow["parameters"])

        # Handle multiple files
        input_paths = await handle_multiple_file_uploads(workflow, file, file_mapping, request)
        
        # Validate required files
        validate_required_files(workflow, input_paths)

        default_params = workflow.get("default_parameters", {})
        run_params = {**default_params, **input_params}

        dagster_config = build_dagster_config(workflow, input_paths, run_params)
        execution_result = await execute_dagster_workflow_direct(workflow, dagster_config)

        # Store input_paths as JSON in database
        input_paths_json = json.dumps(input_paths) if input_paths else ""
        
        run_record = create_run_record(
            db, workflow["id"], triggered_by, input_paths,
            execution_result["run_id"], execution_result["status"], dagster_config, run_name
        )

        output_path = None
        output_file_url = None

        for op_name, op_config in dagster_config.get("ops", {}).items():
            if "save_epc_report" in op_name and "config" in op_config:
                output_path = op_config["config"].get("output_path")
                if output_path:
                    output_file_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={
                            'Bucket': S3_BUCKET,
                            'Key': output_path.replace(f"{S3_BUCKET}/", "")
                        },
                        ExpiresIn=3600
                    )
                break

        response = {
            "success": True,
            "run_id": run_record["id"],
            "status": run_record["status"],
            "dagster_run_id": run_record["dagster_run_id"],
            "workflow_name": workflow["name"],
            "workflow_id": workflow["id"],
            "run_name": run_name,
            "started_at": run_record["started_at"].isoformat() if run_record.get("started_at") else None,
            "message": f"Workflow '{workflow['name']}' triggered successfully with status: {execution_result['status']}",
            "input_file_paths": input_paths
        }

        if output_file_url:
            response["output_file_url"] = output_file_url
            response["expected_output_path"] = output_path

        logger.info(f"Successfully triggered workflow {workflow_id} with run ID {run_record['id']}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}")
        if 'db' in locals():
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")