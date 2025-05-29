from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException, requests
from sqlalchemy.orm import Session
import json
import uuid
import logging
import os
import pandas as pd
import supabase
from app.file_parser import parser_map
from app.config_manager import WorkflowConfig
from sqlalchemy import text
from ..get_health_check import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])

async def validate_workflow(workflow_id: int, db: Session) -> dict:
    """Validate workflow exists and return its details"""
    result = await db.execute(
        text("""
        SELECT id, name, input_file_path, input_structure, destination 
        FROM workflow.workflow 
        WHERE id = :workflow_id
        """),
        {"workflow_id": workflow_id}
    )
    workflow = result.fetchone()
    if not workflow:
        logger.error(f"Workflow {workflow_id} not found")
        raise HTTPException(404, f"Workflow {workflow_id} not found")
    return workflow

async def handle_file_upload(
    file: UploadFile, 
    workflow_id: int, 
    expected_structure: Optional[dict]
) -> str:
    """Handle file upload and validate structure if needed"""
    if not file or not file.filename:
        return None
        
    # Validate file type
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in parser_map:
        raise HTTPException(400, f"Unsupported file type: {file_ext}")
    
    # Parse and validate
    try:
        content = await file.read()
        df = await parser_map[file_ext].parse(content)
        
        if expected_structure:
            validate_file_structure(df, expected_structure)
            
        # Upload to storage
        file_path = f"runs/{workflow_id}/{uuid.uuid4()}.{file_ext}"
        return await upload_to_storage(file_path, content)
        
    except Exception as e:
        logger.error(f"File processing failed: {str(e)}")
        raise HTTPException(500, f"File processing failed: {str(e)}")

def validate_file_structure(df: pd.DataFrame, expected_structure: dict) -> None:
    """Validate DataFrame matches expected column structure"""
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
    
    # Validate column types if specified
    for col in expected_structure["columns"]:
        if "type" in col:
            actual_type = parser_map["csv"]._detect_type(df[col["name"]])
            if actual_type != col["type"]:
                raise ValueError(f"Type mismatch in {col['name']}: expected {col['type']}, got {actual_type}")

async def upload_to_storage(file_path: str, content: bytes) -> str:
    """Upload file to Supabase storage"""
    try:
        supabase.storage.from_(os.getenv("SUPABASE_BUCKET")).upload(
            path=file_path,
            file=content,
            file_options={"content-type": "application/octet-stream"}
        )
        return f"{os.getenv('SUPABASE_BUCKET')}/{file_path}"
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(500, "File upload failed")

def validate_dagster_config(job_name: str, config: dict) -> bool:
    """Validate configuration against Dagster job"""
    try:
        response = requests.post(
            os.getenv("DAGSTER_API_URL"),
            json={
                "query": """
                query ValidateConfig($job: String!, $config: RunConfigData!) {
                    pipeline(pipelineName: $job) {
                        isRunConfigValid(runConfigData: $config) {
                            isValid
                            errors { message }
                        }
                    }
                }
                """,
                "variables": {
                    "job": job_name,
                    "config": config
                }
            },
            timeout=10
        )
        data = response.json()
        if "errors" in data:
            logger.error(f"Config validation errors: {data['errors']}")
            return False
            
        validation = data.get("data", {}).get("pipeline", {}).get("isRunConfigValid", {})
        if not validation.get("isValid", False):
            logger.error(f"Invalid config: {validation.get('errors', [])}")
        return validation.get("isValid", False)
        
    except Exception as e:
        logger.error(f"Config validation failed: {str(e)}")
        return False

async def execute_workflow(
    workflow_id: int,
    run_config: dict,
    db: Session
) -> dict:
    """Execute workflow through Dagster"""
    job_name = f"workflow_job_{workflow_id}"
    try:
        response = requests.post(
            os.getenv("DAGSTER_API_URL"),
            json={
                "query": """
                mutation LaunchRun($executionParams: ExecutionParams!) {
                    launchPipelineExecution(executionParams: $executionParams) {
                        __typename
                        ... on LaunchPipelineRunSuccess {
                            run { runId status }
                        }
                        ... on PipelineNotFoundError {
                            message
                        }
                        ... on RunConfigValidationInvalid {
                            errors { message }
                        }
                    }
                }
                """,
                "variables": {
                    "executionParams": {
                        "selector": {
                            "repositoryLocationName": "server.app.dagster.repo",
                            "repositoryName": "workflow_repository",
                            "pipelineName": job_name
                        },
                        "runConfigData": run_config,
                        "mode": "default"
                    }
                }
            },
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"Dagster API error: {response.status_code}")
            
        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL errors: {data['errors']}")
            
        if data["data"]["launchPipelineExecution"]["__typename"] != "LaunchPipelineRunSuccess":
            raise Exception(f"Execution failed: {data['data']['launchPipelineExecution'].get('message', 'Unknown error')}")
            
        return {
            "run_id": data["data"]["launchPipelineExecution"]["run"]["runId"],
            "status": data["data"]["launchPipelineExecution"]["run"]["status"]
        }
        
    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}")
        raise HTTPException(500, f"Failed to execute workflow: {str(e)}")

@router.post("/run/new")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: str = Form("{}"),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    """Main workflow execution endpoint"""
    try:
        # 1. Validate workflow exists
        workflow = await validate_workflow(workflow_id, db)
        
        # 2. Parse expected structure if exists
        expected_structure = None
        if workflow.input_structure:
            try:
                expected_structure = (workflow.input_structure if isinstance(workflow.input_structure, dict)
                                else json.loads(workflow.input_structure))
            except json.JSONDecodeError:
                logger.warning(f"Invalid input_structure for workflow {workflow_id}")
        
        # 3. Handle file upload if needed
        input_path = workflow.input_file_path
        if file and file.filename:
            input_path = await handle_file_upload(file, workflow_id, expected_structure)
        
        # 4. Load and build config
        config = await WorkflowConfig(workflow_id, db)
        run_params = {**config.default_params, **json.loads(parameters)}
        run_config = config.build_config(input_path, run_params)
        
        # 5. Validate config
        if not validate_dagster_config(config.job_name, run_config):
            raise HTTPException(400, "Invalid workflow configuration")
        
        # 6. Execute workflow
        result = await execute_workflow(workflow_id, run_config, db)
        
        # 7. Create run record
        run_record = await create_run_record(
            db,
            workflow_id,
            triggered_by,
            input_path,
            result["run_id"],
            result["status"],
            run_config
        )
        
        return {
            "run_id": run_record["id"],
            "status": run_record["status"],
            "dagster_run_id": result["run_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow execution failed: {str(e)}")

async def create_run_record(
    db: Session,
    workflow_id: int,
    triggered_by: int,
    input_path: str,
    dagster_run_id: str,
    status: str,
    config: dict
) -> dict:
    """Create database record for the workflow run"""
    result = await db.execute(
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
    return result.fetchone()