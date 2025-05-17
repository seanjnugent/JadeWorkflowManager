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

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

class WorkflowRunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    parameters: Optional[Dict[str, Any]] = None

router = APIRouter(prefix="/runs", tags=["runs"])

def upload_to_storage(file_path: str, content: bytes) -> str:
    """Upload file to Supabase storage with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=file_path,
                file=content,
                file_options={"content-type": "application/octet-stream"}
            )
            logger.info(f"File uploaded successfully to {SUPABASE_BUCKET}/{file_path}")
            return f"{SUPABASE_BUCKET}/{file_path}"
        except Exception as e:
            logger.error(f"Upload attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:
                raise HTTPException(500, f"Failed to upload file after {max_retries} attempts: {str(e)}")
            continue
    raise HTTPException(500, "Unexpected error in file upload")

def validate_file_structure(df: pd.DataFrame, expected_structure: Dict) -> None:
    """Validate DataFrame structure against expected workflow input_structure"""
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

def extract_job_name_from_dag_path(dag_path):
    """Extract job name from a DAG path like 'C:\\Users\\seanj\\Documents\\Projects\\Conduit\\server\\app\\dagster\\jobs\\33333_job_25.py'"""
    if not dag_path:
        raise ValueError("DAG path is required")

    # Extract the filename from the path
    filename = dag_path.split('\\')[-1].split('/')[-1]

    # Remove the .py extension if present
    if filename.endswith('.py'):
        filename = filename[:-3]

    return filename

def run_dagster_job(workflow_id, run_config, db):
    """Run a Dagster job using GraphQL API with dynamic job name"""
    dagster_api_url = os.getenv("DAGSTER_API_URL")
    if not dagster_api_url:
        raise ValueError("DAGSTER_API_URL must be set in .env")

    # Query to get the dag_path for this workflow
    dag_path_query = db.execute(
        text("""
            SELECT dag_path FROM workflow.workflow WHERE id = :workflow_id
        """),
        {"workflow_id": workflow_id}
    ).fetchone()

    # Default job name as fallback
    default_job_name = f"workflow_job_{workflow_id}"

    if not dag_path_query or not dag_path_query.dag_path:
        # Fallback to the traditional naming convention if no dag_path is found
        job_name = default_job_name
        logger.warning(f"No dag_path found for workflow {workflow_id}, using default job name: {job_name}")
    else:
        try:
            job_name = extract_job_name_from_dag_path(dag_path_query.dag_path)
            logger.info(f"Using job name '{job_name}' extracted from dag path: {dag_path_query.dag_path}")
        except Exception as e:
            # If there's any error extracting the job name, use the default
            job_name = default_job_name
            logger.error(f"Error extracting job name from path '{dag_path_query.dag_path}': {str(e)}. Using default: {job_name}")

    # Check if job exists in repository
    job_exists_query = """
    query JobExistsQuery($repositorySelector: RepositorySelector!, $pipelineName: String!) {
      pipelineOrError(params: {
        repositorySelector: $repositorySelector,
        pipelineName: $pipelineName
      }) {
        __typename
        ... on Pipeline {
          name
        }
        ... on PipelineNotFoundError {
          message
        }
      }
    }
    """

    repository_selector = {
        "repositoryLocationName": "server.app.dagster.repo",
        "repositoryName": "workflow_repository"
    }

    # First check if the job exists
    try:
        exists_response = requests.post(
            dagster_api_url,
            json={
                "query": job_exists_query,
                "variables": {
                    "repositorySelector": repository_selector,
                    "pipelineName": job_name
                }
            },
            headers={"Content-Type": "application/json"}
        )

        if exists_response.status_code != 200:
            logger.error(f"HTTP Error checking job existence: {exists_response.status_code}")
            logger.error(f"Response: {exists_response.text}")
        else:
            exists_result = exists_response.json()
            if "errors" in exists_result:
                logger.error(f"GraphQL errors checking job: {exists_result['errors']}")

            pipeline_or_error = exists_result.get("data", {}).get("pipelineOrError", {})
            if pipeline_or_error.get("__typename") == "PipelineNotFoundError":
                logger.warning(f"Job '{job_name}' not found. Available jobs may be different. Trying default: {default_job_name}")
                # If the extracted job name doesn't exist, try the default naming convention
                job_name = default_job_name
    except Exception as e:
        logger.error(f"Error checking if job exists: {str(e)}")
        # Continue with the current job_name

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

    logger.info(f"Attempting to launch job: {job_name}")

    variables = {
        "executionParams": {
            "selector": {
                "repositoryLocationName": "server.app.dagster.repo",
                "repositoryName": "workflow_repository",
                "pipelineName": job_name,
            },
            "runConfigData": run_config,
            "mode": "default"
        }
    }

    max_attempts = 2  # Try with extracted name, then with default name if needed
    attempt = 0
    last_error = None

    while attempt < max_attempts:
        try:
            logger.info(f"Launch attempt {attempt+1} with job name: {job_name}")
            response = requests.post(
                dagster_api_url,
                json={"query": launch_mutation, "variables": variables},
                headers={"Content-Type": "application/json"}
            )

            # Log full response for debugging
            logger.debug(f"Dagster API response: {response.text}")

            if response.status_code != 200:
                logger.error(f"HTTP Error: {response.status_code}")
                logger.error(f"Response body: {response.text}")
                response.raise_for_status()

            result = response.json()
            if "errors" in result:
                error_details = "; ".join([e.get("message", "Unknown error") for e in result["errors"]])
                logger.error(f"GraphQL errors: {error_details}")
                raise Exception(f"GraphQL errors: {error_details}")

            data = result.get("data", {}).get("launchPipelineExecution", {})
            logger.debug(f"Launch pipeline execution result: {data}")

            if data.get("__typename") == "LaunchPipelineRunSuccess":
                logger.info(f"Successfully launched job '{job_name}'")
                return {
                    "run_id": data["run"]["runId"],
                    "status": data["run"]["status"]
                }
            elif data.get("__typename") == "PipelineNotFoundError":
                error_message = data.get("message", "Pipeline not found")
                logger.error(f"Pipeline not found error: {error_message}")

                if attempt == 0 and job_name != default_job_name:
                    # If this is the first attempt and we're not using the default job name,
                    # try again with the default name
                    logger.info(f"Job '{job_name}' not found. Trying with default name: {default_job_name}")
                    job_name = default_job_name
                    variables["executionParams"]["selector"]["pipelineName"] = job_name
                    attempt += 1
                    continue
                else:
                    raise Exception(f"Pipeline not found: {error_message}")
            else:
                error_type = data.get("__typename", "Unknown error type")
                error_message = data.get("message", "Unknown error")

                if error_type == "PythonError" and "stack" in data:
                    logger.error(f"Python error: {error_message}")
                    logger.error(f"Stack trace: {data['stack']}")
                elif error_type == "RunConfigValidationInvalid" and "errors" in data:
                    validation_errors = "; ".join([e.get("message", "") for e in data["errors"]])
                    logger.error(f"Config validation errors: {validation_errors}")

                logger.error(f"Failed to launch job ({error_type}): {error_message}")

                if attempt == 0 and job_name != default_job_name:
                    # Try again with default name
                    job_name = default_job_name
                    variables["executionParams"]["selector"]["pipelineName"] = job_name
                    attempt += 1
                    last_error = f"{error_type}: {error_message}"
                    continue
                else:
                    raise Exception(f"Failed to launch job: {error_message}")
        except Exception as e:
            last_error = str(e)
            logger.error(f"Error launching Dagster job with name '{job_name}': {last_error}")

            if attempt == 0 and job_name != default_job_name:
                # Try again with default name
                job_name = default_job_name
                variables["executionParams"]["selector"]["pipelineName"] = job_name
                attempt += 1
            else:
                # Re-raise the exception on the final attempt
                raise Exception(f"Failed to launch job after {attempt+1} attempts: {last_error}")

        attempt += 1

    # We should never reach here due to raise statements above
    raise Exception(f"Unexpected error in run_dagster_job: {last_error}")

@router.post("/run/new")
async def trigger_workflow_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: Optional[str] = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    try:
        # Validate workflow existence
        workflow = db.execute(
            text("""
                SELECT id, name, input_file_path, input_structure, destination, dag_path
                FROM workflow.workflow
                WHERE id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        ).fetchone()
        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(404, f"Workflow {workflow_id} not found")

        # Parse parameters
        run_parameters = {}
        if parameters and parameters.strip():
            try:
                run_parameters = json.loads(parameters)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid parameters format: {str(e)}")
                raise HTTPException(400, f"Invalid parameters format: {str(e)}")

        # Handle file upload and validation
        input_file_path = workflow.input_file_path
        if file and file.filename:
            file_ext = file.filename.split(".")[-1].lower()
            if file_ext not in ["csv"]:
                logger.error(f"Unsupported file type: {file_ext}")
                raise HTTPException(400, f"Unsupported file type: {file_ext}")

            # Parse and validate file
            parser = parser_map.get(file_ext)
            if not parser:
                logger.error(f"Unsupported file type: {file_ext}")
                raise HTTPException(400, f"Unsupported file type: {file_ext}")

            content = await file.read()
            try:
                df = await parser.parse(content)
            except Exception as parse_error:
                logger.error(f"Failed to parse file: {str(parse_error)}")
                raise HTTPException(500, f"File parsing failed: {str(parse_error)}")

            # Validate file structure
            expected_structure = workflow.input_structure if isinstance(workflow.input_structure, dict) else json.loads(workflow.input_structure or "{}")
            validate_file_structure(df, expected_structure)

            # Upload file to Supabase
            file_path = f"runs/{workflow_id}/{uuid.uuid4()}.{file_ext}"
            input_file_path = upload_to_storage(file_path, content)

        # Create run record
        dagster_run_id = str(uuid.uuid4())
        run_result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, status, started_at,
                    input_file_path, dagster_run_id
                ) VALUES (
                    :workflow_id, :triggered_by, :status, NOW(),
                    :input_file_path, :dagster_run_id
                )
                RETURNING id, workflow_id, triggered_by, status, started_at, input_file_path, dagster_run_id
            """),
            {
                "workflow_id": workflow_id,
                "triggered_by": triggered_by,
                "status": "Running",
                "input_file_path": input_file_path,
                "dagster_run_id": dagster_run_id
            }
        )
        run_record = run_result.fetchone()
        db.commit()
        logger.info(f"Run {run_record.id} created for workflow {workflow_id}")

        # Log initial run log entry
        db.execute(
            text("""
                INSERT INTO workflow.run_log (
                    run_id, dagster_step, log_level, message, timestamp,
                    dagster_run_id, workflow_id
                ) VALUES (
                    :run_id, :dagster_step, :log_level, :message, NOW(),
                    :dagster_run_id, :workflow_id
                )
            """),
            {
                "run_id": run_record.id,
                "dagster_step": "Initialization",
                "log_level": "INFO",
                "message": "Workflow run initiated",
                "dagster_run_id": dagster_run_id,
                "workflow_id": str(workflow_id)
            }
        )
        db.commit()

        # Fetch workflow steps
        steps = db.execute(
            text("""
                SELECT id, step_order, label, code, parameters, step_code, code_type
                FROM workflow.workflow_step
                WHERE workflow_id = :workflow_id
                ORDER BY step_order
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        # Fetch destination
        destination = db.execute(
            text("""
                SELECT workflow_id, file_path, file_format
                FROM workflow.workflow_destination
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        ).fetchone()

        # Prepare run config for Dagster to match manual configuration
        output_file_path = f"workflow-files/outputs/{uuid.uuid4()}.json"
        run_config = {
            "ops": {
                f"load_input_json_converter_{workflow_id}": {
                    "config": {
                        "input_file_path": input_file_path,
                        "output_file_path": output_file_path,
                        "workflow_id": workflow_id
                    }
                },
                f"transform_json_converter_{workflow_id}": {
                    "config": {
                        "workflow_id": workflow_id,
                        "steps": [
                            {
                                "id": step.id,
                                "label": step.label,
                                "code_type": step.code_type,
                                "code": step.code,
                                "parameters": json.loads(step.parameters) if step.parameters else {},
                                "step_code": step.step_code
                            } for step in steps
                        ],
                        "parameters": run_parameters or {"Title": "Untitled Report"}
                    }
                },
                f"save_output_json_converter_{workflow_id}": {
                    "config": {
                        "output_file_path": output_file_path,
                        "workflow_id": workflow_id
                    }
                }
            }
        }

        # Trigger Dagster job
        try:
            # Pass workflow_id to the updated run_dagster_job function
            dagster_result = run_dagster_job(workflow_id, run_config, db)
            dagster_run_id = dagster_result.get("run_id")
            status = "Running"
            error_message = None
        except Exception as e:
            status = "Failed"
            error_message = str(e)
            # Log error in run_log
            db.execute(
                text("""
                    INSERT INTO workflow.run_log (
                        run_id, dagster_step, log_level, message, timestamp,
                        dagster_run_id, workflow_id
                    ) VALUES (
                        :run_id, :dagster_step, :log_level, :message, NOW(),
                        :dagster_run_id, :workflow_id
                    )
                """),
                {
                    "run_id": run_record.id,
                    "dagster_step": "Execution",
                    "log_level": "ERROR",
                    "message": f"Run failed: {error_message}",
                    "dagster_run_id": dagster_run_id,
                    "workflow_id": str(workflow_id)
                }
            )
            db.commit()

        # Update run status
        db.execute(
            text("""
                UPDATE workflow.run
                SET status = :status,
                    finished_at = :finished_at,
                    error_message = :error_message,
                    dagster_run_id = :dagster_run_id,
                    output_file_path = :output_file_path
                WHERE id = :run_id
            """),
            {
                "status": status,
                "finished_at": None if status == "Running" else "NOW()",
                "error_message": error_message,
                "dagster_run_id": dagster_run_id,
                "output_file_path": output_file_path,
                "run_id": run_record.id
            }
        )
        db.commit()

        # Insert initial step status records
        for step in steps:
            step_parameters = json.loads(step.parameters) if step.parameters else {}
            merged_parameters = {**step_parameters, **(run_parameters or {})}
            db.execute(
                text("""
                    INSERT INTO workflow.run_step_status (
                        run_id, step_id, status, started_at, input_data,
                        step_code, created_at, updated_at
                    ) VALUES (
                        :run_id, :step_id, :status, NOW(), :input_data,
                        :step_code, NOW(), NOW()
                    )
                """),
                {
                    "run_id": run_record.id,
                    "step_id": step.id,
                    "status": "Running",
                    "input_data": json.dumps({"file_path": input_file_path, "parameters": merged_parameters}),
                    "step_code": step.step_code
                }
            )
            db.commit()

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
