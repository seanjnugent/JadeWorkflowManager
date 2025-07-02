from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import logging
import os
import uuid
from datetime import datetime
import requests
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv
from ..get_health_check import get_db, supabase

load_dotenv()

router = APIRouter(prefix="/runs", tags=["runs"])
logger = logging.getLogger(__name__)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")
SUPABASE_ACCESS_KEY = os.getenv("SUPABASE_ACCESS_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")
DAGSTER_URL = os.getenv("DAGSTER_URL", "http://localhost:3500")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# --- Core Functions ---

def get_s3_client():
    """Create authenticated S3 client for Supabase"""
    try:
        if not all([SUPABASE_URL, SUPABASE_ACCESS_KEY, SUPABASE_SECRET_KEY]):
            raise ValueError("Missing required Supabase configuration")
        
        return boto3.client(
            's3',
            endpoint_url=SUPABASE_URL,
            aws_access_key_id=SUPABASE_ACCESS_KEY,
            aws_secret_access_key=SUPABASE_SECRET_KEY,
            config=boto3.session.Config(signature_version='s3v4')
        )
    except Exception as e:
        logger.error(f"Failed to create S3 client: {str(e)}")
        raise HTTPException(status_code=500, detail="Storage service configuration error")

def validate_workflow(workflow_id: int, db: Session) -> dict:
    """Validate workflow exists and return its configuration"""
    try:
        result = db.execute(
            text("""
                SELECT id, name, destination, parameters, requires_file, 
                       supported_file_types, destination_config
                FROM workflow.workflow
                WHERE id = :workflow_id AND status = 'Active'
            """),
            {"workflow_id": workflow_id}
        )
        workflow = result.fetchone()
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found or inactive")
        
        # Convert to dictionary
        workflow_dict = dict(workflow._mapping)
        
        # Helper function to safely parse JSON fields
        def safe_json_parse(field_value, default_value):
            if field_value is None:
                return default_value
            # If it's already a dict/list (parsed by SQLAlchemy), return as-is
            if isinstance(field_value, (dict, list)):
                return field_value
            # If it's a string, try to parse it
            if isinstance(field_value, str):
                try:
                    return json.loads(field_value)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse JSON field: {field_value}")
                    return default_value
            # For any other type, return default
            return default_value
        
        # Parse JSON fields safely
        workflow_dict["parameters"] = safe_json_parse(workflow_dict.get("parameters"), [])
        workflow_dict["supported_file_types"] = safe_json_parse(workflow_dict.get("supported_file_types"), [])
        workflow_dict["destination_config"] = safe_json_parse(workflow_dict.get("destination_config"), {})
        
        # Normalize parameters: flatten if sectioned
        if workflow_dict["parameters"] and isinstance(workflow_dict["parameters"], list) and any("section" in p for p in workflow_dict["parameters"]):
            flat_params = []
            for section in workflow_dict["parameters"]:
                if "section" in section and "parameters" in section:
                    flat_params.extend(section["parameters"])
            workflow_dict["parameters"] = flat_params
        
        logger.debug(f"Parsed workflow parameters: {workflow_dict['parameters']}")
        return workflow_dict

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Workflow validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Workflow validation failed")
async def handle_file_upload(file: UploadFile, workflow: dict) -> str:
    """Handle file upload to Supabase storage"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = file.filename.split('.')[-1].lower()
    supported_types = workflow.get("supported_file_types", [])
    
    if supported_types and file_ext not in supported_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported types: {', '.join(supported_types)}"
        )
    
    try:
        content = await file.read()
        file_path = f"runs/{workflow['id']}/{uuid.uuid4()}.{file_ext}"
        
        response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            file_path,
            content,
            {"content-type": file.content_type or "application/octet-stream"}
        )
        
        if hasattr(response, 'error') and response.error:
            raise Exception(f"Supabase upload error: {response.error.message}")
        elif hasattr(response, 'status_code') and response.status_code >= 400:
            raise Exception(f"Supabase upload error: HTTP {response.status_code}")
        
        logger.info(f"File uploaded to {SUPABASE_BUCKET}/{file_path}")
        return f"{SUPABASE_BUCKET}/{file_path}"
    
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
    
def validate_parameters(input_params: dict, workflow_params: list) -> None:
    """Validate input parameters against workflow requirements"""
    try:
        for param in workflow_params:
            name = param.get("name")
            if not name:
                continue
                
            is_required = param.get("required", False)
            param_type = param.get("type", "text")
            
            # Check if required parameter is missing
            if is_required and (name not in input_params or not str(input_params[name]).strip()):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required parameter: {name}"
                )
            
            # Validate parameter value if present
            if name in input_params and input_params[name] is not None:
                value = input_params[name]
                
                # Type validation
                if param_type == "number":
                    try:
                        float(value)  # This will work for both int and float
                    except (ValueError, TypeError):
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Parameter '{name}' must be a number, got: {value}"
                        )
                
                # Option validation for select types
                elif param_type == "select":
                    options = param.get("options", [])
                    if options:
                        valid_values = [opt.get("value") for opt in options if isinstance(opt, dict) and "value" in opt]
                        if valid_values and value not in valid_values:
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Invalid value for '{name}': {value}. Valid options: {', '.join(map(str, valid_values))}"
                            )
                            
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Parameter validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Parameter validation error: {str(e)}")

def build_dagster_config(workflow: dict, input_path: str, parameters: dict) -> dict:
    """Build Dagster configuration from workflow and parameters"""
    try:
        config = {
            "ops": {
                f"workflow_job_{workflow['id']}": {
                    "config": {
                        "workflow_id": workflow["id"],
                        "input_path": input_path or "",
                        "output_path": f"runs/{workflow['id']}/{uuid.uuid4()}.json",
                        "parameters": parameters or {}
                    }
                }
            },
            "resources": {
                "supabase": {
                    "config": {
                        "endpoint_url": SUPABASE_URL,
                        "access_key": SUPABASE_ACCESS_KEY,
                        "secret_key": SUPABASE_SECRET_KEY,
                        "bucket": SUPABASE_BUCKET
                    }
                }
            }
        }
        
        # Add destination config if needed
        if workflow.get("destination") == "ckan":
            config["ops"][f"workflow_job_{workflow['id']}"]["config"]["destination_config"] = workflow.get("destination_config", {})
        
        logger.debug(f"Built Dagster config: {json.dumps(config, indent=2)}")
        return config
        
    except Exception as e:
        logger.error(f"Failed to build Dagster config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to build workflow configuration")

async def execute_dagster_workflow(workflow: dict, config: dict) -> dict:
    """Execute workflow via Dagster API"""
    try:
        job_name = f"workflow_job_{workflow['id']}"
        
        response = requests.post(
            f"{DAGSTER_URL}/graphql",
            json={
                "query": """
                    mutation LaunchPipelineExecution($jobName: String!, $runConfig: RunConfigData!) {
                        launchPipelineExecution(executionParams: {
                            selector: { pipelineName: $jobName }
                            runConfigData: $runConfig
                        }) {
                            __typename
                            ... on LaunchRunSuccess {
                                run {
                                    runId
                                    status
                                }
                            }
                            ... on PythonError {
                                message
                                stack
                            }
                            ... on InvalidStepError {
                                invalidStepKey
                            }
                            ... on InvalidOutputError {
                                stepKey
                                invalidOutputName
                            }
                        }
                    }
                """,
                "variables": {
                    "jobName": job_name,
                    "runConfig": config
                }
            },
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        response.raise_for_status()
        result = response.json()

        logger.debug(f"Dagster response: {json.dumps(result, indent=2)}")
        
        # Check for GraphQL errors
        if "errors" in result:
            error_msg = result["errors"][0].get("message", "Unknown GraphQL error")
            logger.error(f"Dagster GraphQL error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Workflow execution error: {error_msg}")

        # Check execution result
        execution_result = result.get("data", {}).get("launchPipelineExecution", {})
        
        if execution_result.get("__typename") == "LaunchRunSuccess":
            run_info = execution_result.get("run", {})
            return {
                "run_id": run_info.get("runId"),
                "status": run_info.get("status", "UNKNOWN")
            }
        elif execution_result.get("__typename") == "PythonError":
            error_msg = execution_result.get("message", "Unknown Python error")
            logger.error(f"Dagster Python error: {error_msg}")
            raise HTTPException(status_code=400, detail=f"Workflow execution failed: {error_msg}")
        else:
            logger.error(f"Unexpected Dagster response type: {execution_result.get('__typename')}")
            raise HTTPException(status_code=400, detail="Workflow launch failed")

    except requests.exceptions.Timeout:
        logger.error("Dagster API request timed out")
        raise HTTPException(status_code=504, detail="Workflow execution request timed out")
    except requests.exceptions.ConnectionError:
        logger.error("Failed to connect to Dagster API")
        raise HTTPException(status_code=502, detail="Failed to connect to Dagster service")
    except requests.exceptions.RequestException as e:
        logger.error(f"Dagster API request failed: {str(e)}")
        raise HTTPException(status_code=502, detail="Failed to communicate with Dagster service")
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Workflow execution failed")

def create_run_record(
    db: Session,
    workflow_id: int,
    triggered_by: int,
    name: str,
    input_path: str,
    dagster_run_id: str,
    config: dict,
    schedule: str,
    status: str
) -> dict:
    """Create run record in database"""
    try:
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, name, input_file_path,
                    dagster_run_id, config_used, schedule, status, started_at
                ) VALUES (
                    :workflow_id, :triggered_by, :name, :input_path,
                    :dagster_run_id, :config, :schedule, :status, NOW()
                )
                RETURNING id, status, started_at
            """),
            {
                "workflow_id": workflow_id,
                "triggered_by": triggered_by,
                "name": name,
                "input_path": input_path or "",
                "dagster_run_id": dagster_run_id,
                "config": json.dumps(config),
                "schedule": schedule,
                "status": status
            }
        )
        run_record = result.fetchone()
        db.commit()
        
        logger.info(f"Created run record with ID: {run_record.id}")
        return {
            "id": run_record.id,
            "status": run_record.status,
            "started_at": run_record.started_at
        }
        
    except Exception as e:
        logger.error(f"Failed to create run record: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create run record")

# --- Main Endpoint ---

@router.post("/trigger")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    name: str = Form(...),
    parameters: str = Form("{}"),
    file: UploadFile = File(None),
    schedule: str = Form("none"),
    db: Session = Depends(get_db)
) -> dict:
    """Complete workflow trigger endpoint with all functionality"""
    try:
        logger.info(f"Starting workflow run - ID: {workflow_id}, Name: {name}")
        
        # 1. Validate workflow
        workflow = validate_workflow(workflow_id, db)
        logger.debug(f"Workflow validated: {workflow['name']}")
        
        # 2. Parse and validate parameters
        try:
            input_params = json.loads(parameters) if parameters else {}
        except json.JSONDecodeError as e:
            logger.error(f"Invalid parameters JSON: {parameters}")
            raise HTTPException(status_code=400, detail=f"Invalid parameters format: {str(e)}")
        
        # Validate parameters against workflow schema
        if workflow.get("parameters"):
            validate_parameters(input_params, workflow["parameters"])
        
        logger.debug(f"Parameters validated: {list(input_params.keys())}")

        # 3. Handle file upload if required/provided
        input_path = ""
        if file and file.filename:
            logger.info(f"Uploading file: {file.filename}")
            input_path = await handle_file_upload(file, workflow)
        elif workflow.get("requires_file", False):
            raise HTTPException(status_code=400, detail="This workflow requires an input file")

        # 4. Build Dagster configuration
        config = build_dagster_config(workflow, input_path, input_params)
        
        # 5. Execute workflow via Dagster
        logger.info("Executing workflow via Dagster")
        execution_result = await execute_dagster_workflow(workflow, config)

        # 6. Create run record in database
        run_record = create_run_record(
            db=db,
            workflow_id=workflow_id,
            triggered_by=triggered_by,
            name=name,
            input_path=input_path,
            dagster_run_id=execution_result["run_id"],
            config=config,
            schedule=schedule,
            status=execution_result["status"]
        )

        # 7. Return success response
        response = {
            "success": True,
            "run_id": run_record["id"],
            "status": run_record["status"],
            "dagster_run_id": execution_result["run_id"],
            "workflow_name": workflow["name"],
            "workflow_id": workflow_id,
            "started_at": run_record["started_at"].isoformat() if hasattr(run_record["started_at"], 'isoformat') else str(run_record["started_at"]),
            "message": f"Workflow '{workflow['name']}' triggered successfully"
        }
        
        logger.info(f"Workflow run completed successfully - Run ID: {run_record['id']}")
        return response

    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}", exc_info=True)
        try:
            db.rollback()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")