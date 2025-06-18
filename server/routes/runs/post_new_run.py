from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
import json
import uuid
import logging
import os
import pandas as pd
from sqlalchemy import text
import requests
from app.file_parser import parser_map
from ..get_health_check import get_db, supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["workflow"])

SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")
DAGSTER_HOST = os.getenv("DAGSTER_HOST", "localhost")
DAGSTER_PORT = os.getenv("DAGSTER_PORT", "3500")

def validate_workflow(workflow_id: int, db: Session) -> Dict[str, Any]:
    """Validate and retrieve workflow configuration from database"""
    try:
        result = db.execute(
            text("""
            SELECT id, name, input_file_path, input_structure, destination,
                   config_template, default_parameters, parameters, resources_config,
                   dagster_location_name, dagster_repository_name, requires_file,
                   output_file_pattern, supported_file_types
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
            "supported_file_types": workflow_row.supported_file_types
        }

        # Parse JSON fields
        json_fields = ["input_structure", "config_template", "default_parameters", "parameters", "resources_config", "supported_file_types"]
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
                else:
                    workflow[field] = {}

        return workflow
    except Exception as e:
        logger.error(f"Error validating workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Workflow validation failed: {str(e)}")

async def handle_file_upload(file: UploadFile, workflow: Dict[str, Any]) -> str:
    """Handle file upload to Supabase storage"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = file.filename.split('.')[-1].lower()
    supported_types = workflow.get("supported_file_types", ["csv", "xlsx", "json"])

    if file_ext not in supported_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}. Supported types: {', '.join(supported_types)}")

    if file_ext not in parser_map:
        raise HTTPException(status_code=400, detail=f"No parser available for file type: {file_ext}")

    try:
        content = await file.read()
        df = await parser_map[file_ext].parse(content)

        if workflow.get("input_structure"):
            validate_file_structure(df, workflow["input_structure"])

        # Generate unique file path
        workflow_id = workflow["id"]
        file_path = f"runs/{workflow_id}/{uuid.uuid4()}.{file_ext}"

        # Upload to Supabase
        response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            file_path,
            content,
            {"content-type": "application/octet-stream"}
        )

        # Handle Supabase response (compatible with supabase-py >= 2.0.0)
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Supabase upload error: {response.error.message}")
        elif hasattr(response, 'status_code') and response.status_code >= 400:
            raise Exception(f"Supabase upload error: HTTP {response.status_code}")

        logger.info(f"File uploaded to {SUPABASE_BUCKET}/{file_path}")
        return f"{SUPABASE_BUCKET}/{file_path}"

    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

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
        expected_param_names = {p["name"] for p in parameters}
        input_param_names = set(input_params.keys())
        missing_params = expected_param_names - input_param_names
        extra_params = input_param_names - expected_param_names

        errors = []
        if missing_params:
            errors.append(f"Missing parameters: {', '.join(missing_params)}")
        if extra_params:
            errors.append(f"Unexpected parameters: {', '.join(extra_params)}")

        for param in parameters:
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
            raise HTTPException(status_code=400, detail="; ".join(errors))
    except Exception as e:
        logger.error(f"Parameter validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Parameter validation failed: {str(e)}")

def substitute_template_variables(template: Dict[str, Any], variables: Dict[str, Any]) -> Dict[str, Any]:
    """Replace template variables like {variable} with actual values in a dictionary, preserving types."""
    def replace_in_dict(obj, vars_dict):
        if isinstance(obj, dict):
            return {k: replace_in_dict(v, vars_dict) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [replace_in_dict(item, vars_dict) for item in obj]
        elif isinstance(obj, str):
            # Handle both {key} and {{key}} patterns
            result = obj
            for key, value in vars_dict.items():
                # Replace {key} pattern
                placeholder = f"{{{key}}}"
                if placeholder in result:
                    # Replace with the value, preserving its type
                    result = result.replace(placeholder, str(value))
                    # If the entire string was the placeholder, return the original type
                    if result == str(value) and isinstance(value, (int, float, bool)):
                        return value
                # Replace {{key}} pattern
                placeholder = f"{{{{{key}}}}}"
                if placeholder in result:
                    # Replace with the value, preserving its type
                    result = result.replace(placeholder, str(value))
                    # If the entire string was the placeholder, return the original type
                    if result == str(value) and isinstance(value, (int, float, bool)):
                        return value
            return result
        return obj

    return replace_in_dict(template, variables)

def build_dagster_config(workflow: Dict[str, Any], input_path: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Build Dagster configuration from workflow template"""
    workflow_id = workflow["id"]

    # Generate run UUID
    run_uuid = str(uuid.uuid4())

    # Build output path with proper substitution
    output_pattern = workflow.get("output_file_pattern", "workflow-files/outputs/output_{workflow_id}_{run_uuid}.json")
    output_extension = workflow.get("destination", "json").lower()

    # Manual substitution for output pattern (since it's not in the template yet)
    output_path = output_pattern.replace("{workflow_id}", str(workflow_id)) \
                               .replace("{run_uuid}", run_uuid) \
                               .replace("{output_extension}", output_extension)

    # Build template variables
    template_vars = {
        "workflow_id": int(workflow_id),  # Cast to integer
        "input_file_path": input_path or "",
        "output_file_path": output_path,
        "run_uuid": run_uuid,
        "parameters_json": json.dumps(parameters)
    }

    # Add individual parameters as template variables
    for key, value in parameters.items():
        template_vars[key] = value

    # Get config template and substitute variables
    config_template = workflow.get("config_template", {})
    logger.info(f"Config template before substitution: {json.dumps(config_template, indent=2)}")
    logger.info(f"Template variables: {json.dumps(template_vars, indent=2)}")

    # Apply template substitution
    dagster_config = substitute_template_variables(config_template, template_vars)
    logger.info(f"Config template after substitution: {json.dumps(dagster_config, indent=2)}")

    # **FIX: Properly inject parameters into each operation's config**
    if "ops" in dagster_config:
        for op_name, op_config in dagster_config["ops"].items():
            if "config" in op_config:
                # Replace empty parameters with actual parameters
                if "parameters" in op_config["config"]:
                    op_config["config"]["parameters"] = parameters
                else:
                    # Add parameters if not present
                    op_config["config"]["parameters"] = parameters

    # Add resources configuration
    resources_config = workflow.get("resources_config", {})
    if resources_config:
        if "resources" not in dagster_config:
            dagster_config["resources"] = {}
        dagster_config["resources"].update(resources_config)
    else:
        if "resources" not in dagster_config:
            dagster_config["resources"] = {}
        dagster_config["resources"].update({
            "db_engine": {
                "config": {
                    "DATABASE_URL": {"env": "DATABASE_URL"}
                }
            },
            "supabase": {
                "config": {
                    "S3_ACCESS_KEY_ID": {"env": "S3_ACCESS_KEY_ID"},
                    "S3_ENDPOINT": {"env": "S3_ENDPOINT"},
                    "S3_REGION": "eu-west-2",
                    "S3_SECRET_ACCESS_KEY": {"env": "S3_SECRET_ACCESS_KEY"},
                    "SUPABASE_KEY": {"env": "SUPABASE_KEY"},
                    "SUPABASE_URL": {"env": "SUPABASE_URL"}
                }
            }
        })

    logger.info(f"Final Dagster config: {json.dumps(dagster_config, indent=2)}")
    return dagster_config

def create_run_record(db: Session, workflow_id: int, triggered_by: int, input_path: str,
                    dagster_run_id: str, status: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Create run record in database"""
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
        run_record = result.fetchone()
        return dict(run_record)
    except Exception as e:
        logger.error(f"Failed to create run record: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create run record: {str(e)}")


async def execute_dagster_workflow_direct(workflow: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, str]:
    """Execute Dagster workflow via direct GraphQL API call - Updated for newer Dagster versions"""
    try:
        workflow_id = workflow["id"]
        job_name = f"workflow_job_{workflow_id}"
        location_name = workflow.get("dagster_location_name", "server.app.dagster.repo")
        repository_name = workflow.get("dagster_repository_name", "__repository__")

        # Keep the original working GraphQL mutation 
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
            "pipelineName": job_name,  # Note: using pipelineName instead of jobName
            "runConfigData": config
        }

        logger.info(f"Submitting GraphQL mutation with variables: {json.dumps(variables, indent=2)}")

        # Make direct HTTP request to Dagster GraphQL endpoint
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
        
        # Log the raw response for debugging
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

        # Handle both old and new response types
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


def create_run_record(db: Session, workflow_id: int, triggered_by: int, input_path: str,
                    dagster_run_id: str, status: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Create run record in database"""
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
        run_record = result.fetchone()
        if run_record is None:
            raise Exception("No record returned from INSERT")
        
        run_id, run_status, run_dagster_run_id = run_record
        db.commit()
        
        return {
            "id": run_id,
            "status": run_status,
            "dagster_run_id": run_dagster_run_id
        }
    except Exception as e:
        logger.error(f"Failed to create run record: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create run record: {str(e)}")
    
@router.post("/trigger")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: str = Form("{}"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Trigger a workflow run with improved success handling"""
    try:
        # Validate workflow exists and is active
        workflow = validate_workflow(workflow_id, db)

        # Parse and validate parameters
        try:
            input_params = json.loads(parameters)
            if workflow.get("parameters"):
                validate_parameters(input_params, workflow["parameters"])
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid parameters format: {str(e)}")

        # Handle file upload if provided
        input_path = None
        if file and file.filename:
            input_path = await handle_file_upload(file, workflow)
        elif workflow.get("requires_file"):
            raise HTTPException(status_code=400, detail="Input file required")

        # Merge default parameters with user parameters
        default_params = workflow.get("default_parameters", {})
        run_params = {**default_params, **input_params}

        # Build Dagster configuration
        dagster_config = build_dagster_config(workflow, input_path, run_params)

        # Execute workflow in Dagster using direct GraphQL
        execution_result = await execute_dagster_workflow_direct(workflow, dagster_config)

        # Create run record with the actual status from Dagster
        run_record = create_run_record(
            db, workflow["id"], triggered_by, input_path or "",
            execution_result["run_id"], execution_result["status"], dagster_config
        )

        # Build output path from config if available
        output_path = None
        output_file_url = None
        
        for op_name, op_config in dagster_config.get("ops", {}).items():
            if "save_output" in op_name and "config" in op_config:
                output_path = op_config["config"].get("output_path")
                if output_path:
                    output_file_url = f"{os.getenv('SUPABASE_URL')}/storage/v1/object/public/{output_path}"
                break

        # Build comprehensive response
        response = {
            "success": True,
            "run_id": run_record["id"],
            "status": run_record["status"],
            "dagster_run_id": run_record["dagster_run_id"],
            "workflow_name": workflow["name"],
            "workflow_id": workflow["id"],
            "started_at": run_record["started_at"].isoformat() if run_record.get("started_at") else None,
            "message": f"Workflow '{workflow['name']}' triggered successfully with status: {execution_result['status']}"
        }

        if output_file_url:
            response["output_file_url"] = output_file_url
            response["expected_output_path"] = output_path

        if input_path:
            response["input_file_path"] = input_path

        logger.info(f"Successfully triggered workflow {workflow_id} with run ID {run_record['id']}")
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}")
        if 'db' in locals():
            db.rollback()
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")
    



@router.get("/status/{run_id}")
async def get_run_status(run_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get the current status of a workflow run"""
    try:
        result = db.execute(
            text("""
                SELECT r.id, r.dagster_run_id, r.workflow_id, r.status, r.started_at, 
                       r.finished_at, r.input_file_path, r.output_file_path, 
                       r.error_message, r.duration_ms, w.name as workflow_name
                FROM workflow.run r
                LEFT JOIN workflow.workflow w ON r.workflow_id = w.id
                WHERE r.id = :run_id
            """),
            {"run_id": run_id}
        )
        
        run_record = result.fetchone()
        if not run_record:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        
        return {
            "run_id": run_record.id,
            "dagster_run_id": run_record.dagster_run_id,
            "workflow_id": run_record.workflow_id,
            "workflow_name": run_record.workflow_name,
            "status": run_record.status,
            "started_at": run_record.started_at.isoformat() if run_record.started_at else None,
            "finished_at": run_record.finished_at.isoformat() if run_record.finished_at else None,
            "input_file_path": run_record.input_file_path,
            "output_file_path": run_record.output_file_path,
            "error_message": run_record.error_message,
            "duration_ms": run_record.duration_ms
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get run status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get run status: {str(e)}")


# New endpoint to sync run status from Dagster
@router.post("/sync/{dagster_run_id}")
async def sync_run_status_from_dagster(dagster_run_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Sync run status from Dagster GraphQL API for Dagster 1.10.x"""
    try:
        # GraphQL query for Dagster 1.10.x, including runConfig
        query = """
        query RunStatus($runId: ID!) {
            runOrError(runId: $runId) {
                __typename
                ... on Run {
                    id
                    status
                    startTime
                    endTime
                    runConfig
                }
                ... on RunNotFoundError {
                    message
                }
                ... on PythonError {
                    message
                    stack
                }
            }
        }
        """

        dagster_url = f"http://{DAGSTER_HOST}:{DAGSTER_PORT}/graphql"
        request_body = {
            "query": query,
            "variables": {"runId": dagster_run_id}
        }
        
        logger.info(f"Sending GraphQL request: {json.dumps(request_body, indent=2)}")
        
        response = requests.post(
            dagster_url,
            json=request_body,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        # Log response details for debugging
        logger.info(f"HTTP Response Status: {response.status_code}")
        logger.info(f"Raw response: {response.text}")

        response.raise_for_status()
        result = response.json()

        if "errors" in result:
            error_msg = f"GraphQL errors: {result['errors']}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        run_data = result.get("data", {}).get("runOrError", {})

        if run_data.get("__typename") == "RunNotFoundError":
            raise HTTPException(status_code=404, detail=f"Dagster run {dagster_run_id} not found: {run_data.get('message')}")
        
        if run_data.get("__typename") == "PythonError":
            error_msg = f"Dagster Python error: {run_data.get('message')}"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)

        if run_data.get("__typename") != "Run":
            raise HTTPException(status_code=500, detail=f"Unexpected response type: {run_data.get('__typename')}")

        # Extract run data
        status = run_data.get("status", "UNKNOWN")
        start_time = run_data.get("startTime")
        end_time = run_data.get("endTime")
        run_config = run_data.get("runConfig")

        # Calculate duration in milliseconds if both timestamps are available
        duration_ms = None
        if start_time and end_time:
            duration_ms = (float(end_time) - float(start_time)) * 1000  # Convert seconds to milliseconds

        # Extract output_path from any operation in run_config if status is SUCCESS
        output_file_path = None
        if status == "SUCCESS" and run_config:
            try:
                config_data = json.loads(run_config) if isinstance(run_config, str) else run_config
                ops = config_data.get("ops", {})
                for op_name, op_config in ops.items():
                    output_path = op_config.get("config", {}).get("output_path")
                    if output_path:
                        output_file_path = output_path
                        logger.info(f"Extracted output_path: {output_file_path} from operation {op_name} for run {dagster_run_id}")
                        break
                if not output_file_path:
                    logger.warning(f"No output_path found in any operation config for run {dagster_run_id}")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse run_config JSON: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Invalid run_config format: {str(e)}")
            except Exception as e:
                logger.error(f"Error extracting output_path from run_config: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to extract output_path: {str(e)}")

        # Update database record
        update_result = db.execute(
            text("""
                UPDATE workflow.run 
                SET status = :status,
                    finished_at = CASE WHEN :end_time IS NOT NULL THEN to_timestamp(:end_time) ELSE NULL END,
                    duration_ms = :duration_ms,
                    output_file_path = :output_file_path
                WHERE dagster_run_id = :dagster_run_id
                RETURNING id, status, finished_at, output_file_path
            """),
            {
                "status": status,
                "end_time": end_time,
                "duration_ms": duration_ms,
                "output_file_path": output_file_path,
                "dagster_run_id": dagster_run_id
            }
        )

        updated_record = update_result.fetchone()
        if not updated_record:
            raise HTTPException(status_code=404, detail=f"Local run record for {dagster_run_id} not found")

        db.commit()

        return {
            "success": True,
            "run_id": updated_record.id,
            "dagster_run_id": dagster_run_id,
            "status": updated_record.status,
            "finished_at": updated_record.finished_at.isoformat() if updated_record.finished_at else None,
            "duration_ms": duration_ms,
            "output_file_path": updated_record.output_file_path,
            "message": f"Successfully synced status: {status}"
        }

    except requests.exceptions.HTTPError as e:
        logger.error(f"HTTP request failed: {str(e)} - Response: {e.response.text if e.response else 'No response'}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Dagster: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to sync run status: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to sync run status: {str(e)}")