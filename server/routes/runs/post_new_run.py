from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
import json
import logging
import os
import requests
import pandas as pd
from ..get_health_check import get_db, supabase, engine
from app.file_parser import parser_map
from dotenv import load_dotenv
from sqlalchemy import text
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv()

logger = logging.getLogger(__name__)
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

class WorkflowRunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    parameters: Optional[Dict[str, Any]] = None

router = APIRouter(prefix="/runs", tags=["runs"])

def validate_environment():
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "DATABASE_URL", "DAGSTER_API_URL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing_vars)}")

validate_environment()

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def upload_to_storage(file_path: str, content: bytes) -> str:
    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=file_path,
            file=content,
            file_options={"content-type": "application/octet-stream"}
        )
        logger.info(f"File uploaded successfully to {SUPABASE_BUCKET}/{file_path}")
        return f"{SUPABASE_BUCKET}/{file_path}"
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise

def validate_file_structure(df: pd.DataFrame, expected_structure: Dict) -> None:
    if not expected_structure or not expected_structure.get("columns"):
        logger.info("No expected structure provided, skipping validation")
        return
    try:
        actual_columns = set(df.columns)
        expected_columns = {col["name"] for col in expected_structure.get("columns", [])}
        if actual_columns != expected_columns:
            missing = expected_columns - actual_columns
            extra = actual_columns - expected_columns
            error_msg = []
            if missing:
                error_msg.append(f"Missing columns: {', '.join(missing)}")
            if extra:
                error_msg.append(f"Unexpected columns: {', '.join(extra)}")
            raise ValueError("; ".join(error_msg))
        for col in expected_structure.get("columns", []):
            col_name = col["name"]
            expected_type = col["type"]
            actual_type = parser_map["csv"]._detect_type(df[col_name])
            if expected_type != actual_type:
                logger.warning(f"Type mismatch for column {col_name}: expected {expected_type}, got {actual_type}")
    except Exception as e:
        logger.error(f"File structure validation failed: {str(e)}")
        raise HTTPException(400, f"File structure validation failed: {str(e)}")

def validate_dagster_config(dagster_api_url: str, job_name: str, run_config: dict) -> bool:
    validate_query = """
    query ValidateConfig($pipelineName: String!, $runConfigData: RunConfigData!) {
        pipelineOrError(pipelineName: $pipelineName) {
            __typename
            ... on Pipeline {
                isRunConfigValid(runConfigData: $runConfigData) {
                    __typename
                    ... on RunConfigValidationResult {
                        isValid
                        errors {
                            message
                        }
                    }
                }
            }
            ... on PipelineNotFoundError {
                message
            }
        }
    }
    """
    try:
        response = requests.post(
            dagster_api_url,
            json={
                "query": validate_query,
                "variables": {
                    "pipelineName": job_name,
                    "runConfigData": run_config
                }
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            logger.error(f"HTTP Error validating config: {response.status_code}")
            return False
        result = response.json()
        if "errors" in result:
            logger.error(f"GraphQL errors validating config: {result['errors']}")
            return False
        data = result.get("data", {}).get("pipelineOrError", {})
        if data.get("__typename") == "PipelineNotFoundError":
            logger.error(f"Job {job_name} not found: {data['message']}")
            return False
        validation_result = data.get("isRunConfigValid", {})
        if not validation_result.get("isValid", False):
            errors = [err["message"] for err in validation_result.get("errors", [])]
            logger.error(f"Invalid config for {job_name}: {errors}")
            return False
        logger.info(f"Config validated successfully for {job_name}")
        return True
    except Exception as e:
        logger.error(f"Error validating config: {str(e)}")
        return False

def get_available_jobs(repository_selector):
    dagster_api_url = os.getenv("DAGSTER_API_URL")
    list_jobs_query = """
    query ListJobsQuery($repositorySelector: RepositorySelector!) {
        repositoryOrError(repositorySelector: $repositorySelector) {
            ... on Repository {
                name
                pipelines {
                    name
                }
            }
            ... on PythonError {
                message
                stack
            }
            ... on RepositoryNotFoundError {
                message
            }
        }
    }
    """
    try:
        response = requests.post(
            dagster_api_url,
            json={
                "query": list_jobs_query,
                "variables": {"repositorySelector": repository_selector}
            },
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            logger.error(f"HTTP Error listing jobs: {response.status_code}")
            return []
        result = response.json()
        if "errors" in result:
            logger.error(f"GraphQL errors listing jobs: {result['errors']}")
            return []
        repo_data = result.get("data", {}).get("repositoryOrError", {})
        pipelines = repo_data.get("pipelines", [])
        logger.info(f"Found {len(pipelines)} jobs in repository")
        return pipelines
    except Exception as e:
        logger.error(f"Error getting available jobs: {str(e)}")
        return []

def find_job_for_workflow(workflow_id, available_jobs):
    job_name = f"workflow_job_{workflow_id}"
    if available_jobs and not any(job["name"] == job_name for job in available_jobs):
        logger.warning(f"Job {job_name} not found in available jobs")
    return job_name

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=2, min=2, max=30))
def run_dagster_job(workflow_id, run_config, db):
    dagster_api_url = os.getenv("DAGSTER_API_URL")
    if not dagster_api_url:
        raise ValueError("DAGSTER_API_URL must be set in .env")
    job_name = f"workflow_job_{workflow_id}"
    repository_selector = {
        "repositoryLocationName": "server.app.dagster.repo",
        "repositoryName": "workflow_repository"
    }
    launch_mutation = """
    mutation LaunchPipelineExecution($executionParams: ExecutionParams!) {
        launchPipelineExecution(executionParams: $executionParams) {
            __typename
            ... on LaunchPipelineRunSuccess {
                run {
                    runId
                    status
                }
            }
            ... on PythonError {
                message
                stack
            }
            ... on PipelineNotFoundError {
                message
            }
            ... on InvalidSubsetError {
                message
            }
            ... on RunConfigValidationInvalid {
                errors {
                    message
                }
            }
        }
    }
    """
    variables = {
        "executionParams": {
            "selector": {
                "repositoryLocationName": repository_selector["repositoryLocationName"],
                "repositoryName": repository_selector["repositoryName"],
                "pipelineName": job_name,
            },
            "runConfigData": run_config,
            "mode": "default"
        }
    }
    try:
        response = requests.post(
            dagster_api_url,
            json={"query": launch_mutation, "variables": variables},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code != 200:
            logger.error(f"HTTP Error: {response.status_code}")
            raise Exception(f"HTTP error {response.status_code} from Dagster API")
        result = response.json()
        if "errors" in result:
            error_details = "; ".join([e.get("message", "Unknown error") for e in result["errors"]])
            logger.error(f"GraphQL errors: {error_details}")
            raise Exception(f"GraphQL errors: {error_details}")
        data = result.get("data", {}).get("launchPipelineExecution", {})
        if data.get("__typename") != "LaunchPipelineRunSuccess":
            error_type = data.get("__typename", "Unknown error type")
            error_message = data.get("message", "Unknown error")
            if error_type == "RunConfigValidationInvalid":
                errors = [err["message"] for err in data.get("errors", [])]
                error_message = f"Config validation failed: {errors}"
            logger.error(f"Failed to launch job ({error_type}): {error_message}")
            raise Exception(f"Failed to launch job: {error_message}")
        return {
            "run_id": data["run"]["runId"],
            "status": data["run"]["status"],
            "job_name": job_name
        }
    except Exception as e:
        logger.error(f"Error launching Dagster job with name '{job_name}': {str(e)}")
        raise

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def execute_db_query(db: Session, query: str, params: dict):
    try:
        result = db.execute(text(query), params)
        db.commit()
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Database query failed: {str(e)}")
        raise

async def validate_workflow(workflow_id: int, db: Session) -> dict:
    result = await execute_db_query(
        db,
        "SELECT id, name, input_file_path, input_structure, destination, dag_path FROM workflow.workflow WHERE id = :workflow_id",
        {"workflow_id": workflow_id}
    )
    workflow = result.fetchone()
    if not workflow:
        logger.error(f"Workflow {workflow_id} not found")
        raise HTTPException(404, f"Workflow {workflow_id} not found")
    return workflow

async def get_workflow_config(workflow_id: int, db: Session) -> dict:
    result = await execute_db_query(
        db,
        "SELECT workflow.get_effective_config(:workflow_id) as config",
        {"workflow_id": workflow_id}
    )
    config = result.fetchone().config
    return config

async def handle_file_upload(file: UploadFile, workflow_id: int, expected_structure: dict) -> str:
    if not file or not file.filename:
        return None
    file_ext = file.filename.split(".")[-1].lower()
    if file_ext not in ["csv"]:
        logger.error(f"Unsupported file type: {file_ext}")
        raise HTTPException(400, f"Unsupported file type: {file_ext}")
    parser = parser_map.get(file_ext)
    if not parser:
        raise HTTPException(400, f"Unsupported file type: {file_ext}")
    content = await file.read()
    try:
        df = await parser.parse(content)
        if expected_structure and expected_structure.get("columns"):
            validate_file_structure(df, expected_structure)
        file_path = f"runs/{workflow_id}/{uuid.uuid4()}.{file_ext}"
        return upload_to_storage(file_path, content)
    except Exception as e:
        logger.error(f"File processing failed: {str(e)}")
        raise HTTPException(500, f"File processing failed: {str(e)}")

async def create_run_record(db: Session, workflow_id: int, triggered_by: int, input_file_path: str, dagster_run_id: str, status: str, run_config: dict) -> dict:
    result = await execute_db_query(
        db,
        """
        INSERT INTO workflow.run (
            workflow_id, triggered_by, status, started_at,
            input_file_path, dagster_run_id, config_used, config_validation_passed
        ) VALUES (
            :workflow_id, :triggered_by, :status, NOW(),
            :input_file_path, :dagster_run_id, :config_used, :config_validation_passed
        )
        RETURNING id, workflow_id, triggered_by, status, started_at, input_file_path, dagster_run_id
        """,
        {
            "workflow_id": workflow_id,
            "triggered_by": triggered_by,
            "status": status,
            "input_file_path": input_file_path,
            "dagster_run_id": dagster_run_id,
            "config_used": json.dumps(run_config),
            "config_validation_passed": True
        }
    )
    return result.fetchone()

@router.post("/run/new")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    try:
        # Validate workflow
        workflow = await validate_workflow(workflow_id, db)
        
        # Get config template
        config_template = await get_workflow_config(workflow_id, db)
        
        # Handle input structure
        expected_structure = None
        if workflow.input_structure:
            try:
                expected_structure = (workflow.input_structure if isinstance(workflow.input_structure, dict) 
                                    else json.loads(workflow.input_structure))
            except json.JSONDecodeError:
                logger.warning(f"Invalid input_structure format for workflow {workflow_id}")
                expected_structure = None

        # Parse parameters
        run_parameters = {}
        if parameters and parameters.strip():
            try:
                run_parameters = json.loads(parameters)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid parameters format: {str(e)}")
                raise HTTPException(400, f"Invalid parameters format: {str(e)}")
        else:
            result = await execute_db_query(
                db,
                "SELECT default_parameters FROM workflow.workflow WHERE id = :workflow_id",
                {"workflow_id": workflow_id}
            )
            run_parameters = result.fetchone().default_parameters or {"Title": "Untitled Report"}

        # Handle file upload
        input_file_path = workflow.input_file_path
        if file and file.filename:
            input_file_path = await handle_file_upload(file, workflow_id, expected_structure)

        # Prepare run config
        output_file_path = f"workflow-files/outputs/{uuid.uuid4()}.json"
        run_config = config_template.copy()
        run_config["ops"][f"load_input_workflow_job_{workflow_id}"]["config"]["input_file_path"] = input_file_path
        run_config["ops"][f"load_input_workflow_job_{workflow_id}"]["config"]["output_file_path"] = output_file_path
        run_config["ops"][f"transform_workflow_job_{workflow_id}"]["config"]["parameters"] = run_parameters
        run_config["ops"][f"save_output_workflow_job_{workflow_id}"]["config"]["output_file_path"] = output_file_path

        # Validate job existence
        job_name = f"workflow_job_{workflow_id}"
        available_jobs = get_available_jobs({
            "repositoryLocationName": "server.app.dagster.repo",
            "repositoryName": "workflow_repository"
        })
        if not any(job["name"] == job_name for job in available_jobs):
            logger.error(f"Job {job_name} not found in repository")
            raise HTTPException(404, f"Job {job_name} not found in Dagster repository")

        # Validate config
        if not validate_dagster_config(os.getenv("DAGSTER_API_URL"), job_name, run_config):
            logger.warning(f"Primary config invalid, attempting last successful config")
            result = await execute_db_query(
                db,
                "SELECT last_successful_config FROM workflow.workflow WHERE id = :workflow_id",
                {"workflow_id": workflow_id}
            )
            last_config = result.fetchone().last_successful_config
            if last_config:
                run_config = last_config
                if not validate_dagster_config(os.getenv("DAGSTER_API_URL"), job_name, run_config):
                    raise HTTPException(400, f"Last successful config invalid for job {job_name}")
            else:
                raise HTTPException(400, f"Invalid Dagster configuration for job {job_name} and no fallback available")

        # Log config validation
        await execute_db_query(
            db,
            """
            INSERT INTO workflow.config_validation_log (
                workflow_id, config_data, validation_result, is_valid, dagster_job_name
            ) VALUES (
                :workflow_id, :config_data, :validation_result, :is_valid, :dagster_job_name
            )
            """,
            {
                "workflow_id": workflow_id,
                "config_data": json.dumps(run_config),
                "validation_result": json.dumps({"status": "valid"}),
                "is_valid": True,
                "dagster_job_name": job_name
            }
        )

        # Trigger Dagster job
        try:
            dagster_result = run_dagster_job(workflow_id, run_config, db)
            dagster_run_id = dagster_result["run_id"]
            status = "Running"
            error_message = None
        except Exception as e:
            logger.error(f"Failed to launch Dagster job: {str(e)}")
            status = "Failed"
            error_message = str(e)
            dagster_run_id = None

        # Create run record
        run_record = await create_run_record(db, workflow_id, triggered_by, input_file_path, dagster_run_id, status, run_config)

        # Log initial run log entry
        await execute_db_query(
            db,
            """
            INSERT INTO workflow.run_log (
                run_id, dagster_step, log_level, message, timestamp,
                dagster_run_id, workflow_id, config_snapshot
            ) VALUES (
                :run_id, :dagster_step, :log_level, :message, NOW(),
                :dagster_run_id, :workflow_id, :config_snapshot
            )
            """,
            {
                "run_id": run_record.id,
                "dagster_step": "Initialization",
                "log_level": "INFO" if status == "Running" else "ERROR",
                "message": "Workflow run initiated" if status == "Running" else f"Workflow run failed: {error_message}",
                "dagster_run_id": dagster_run_id,
                "workflow_id": str(workflow_id),
                "config_snapshot": json.dumps(run_config)
            }
        )

        # Insert step status records
        steps = await execute_db_query(
            db,
            """
            SELECT id, step_order, label, code, parameters, step_code, code_type
            FROM workflow.workflow_step
            WHERE workflow_id = :workflow_id
            ORDER BY step_order
            """,
            {"workflow_id": workflow_id}
        )
        for step in steps.fetchall():
            step_parameters = json.loads(step.parameters) if step.parameters else {}
            merged_parameters = {**step_parameters, **run_parameters}
            await execute_db_query(
                db,
                """
                INSERT INTO workflow.run_step_status (
                    run_id, step_id, status, started_at, input_data,
                    step_code, created_at, updated_at
                ) VALUES (
                    :run_id, :step_id, :status, NOW(), :input_data,
                    :step_code, NOW(), NOW()
                )
                """,
                {
                    "run_id": run_record.id,
                    "step_id": step.id,
                    "status": "Running" if status == "Running" else "Failed",
                    "input_data": json.dumps({"file_path": input_file_path, "parameters": merged_parameters}),
                    "step_code": step.step_code
                }
            )

        return {
            "message": "Workflow run triggered successfully",
            "run": dict(run_record._mapping),
            "file_path": input_file_path,
            "parameters": run_parameters,
            "dagster_run_id": dagster_run_id,
            "output_file_path": output_file_path
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow run failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow run failed: {str(e)}")