from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Dict
import logging
import requests
import json
import os
from dotenv import load_dotenv
from .get_health_check import get_db  # Assuming this provides SQLAlchemy session

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])

# Pydantic Model for Run Creation
class RunCreate(BaseModel):
    job_name: str
    workflow_id: int
    triggered_by: int
    input_file_path: str | None = None
    output_file_path: str | None = None
    run_config: Dict

def run_dagster_job(job_name: str, run_config: Dict) -> Dict:
    """
    Run a Dagster job using GraphQL API.
    
    Args:
        job_name: Name of the Dagster job (e.g., json_converter_job_22)
        run_config: Run configuration for the job
    
    Returns:
        Dictionary with run_id and status
    """
    dagster_api_url = os.getenv("DAGSTER_API_URL")
    if not dagster_api_url:
        raise HTTPException(500, "DAGSTER_API_URL not set in environment")

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
        }
        ... on PipelineNotFoundError {
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
                "repositoryLocationName": "my_repo",
                "repositoryName": "server.app.dagster.repo",
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
        response.raise_for_status()
        result = response.json()

        if "errors" in result:
            error_details = "; ".join([e.get("message", "Unknown error") for e in result["errors"]])
            raise Exception(f"GraphQL errors: {error_details}")

        data = result.get("data", {}).get("launchPipelineExecution", {})
        if data.get("__typename") == "LaunchPipelineRunSuccess":
            return {
                "run_id": data["run"]["runId"],
                "status": data["run"]["status"]
            }
        else:
            error_message = data.get("message", "Unknown error")
            raise Exception(f"Failed to launch job: {data.get('__typename')}: {error_message}")
    except Exception as e:
        logger.error(f"Error launching Dagster job {job_name}: {str(e)}")
        raise HTTPException(500, f"Error launching Dagster job: {str(e)}")

@router.post("/post_new_run")
async def trigger_dagster_job(
    run_data: RunCreate,
    db: Session = Depends(get_db)
):
    """
    Trigger any Dagster job with a dynamic run configuration.
    
    Args:
        run_data: Pydantic model with job_name, workflow_id, triggered_by, optional file paths, and run_config
        db: SQLAlchemy session
    
    Returns:
        Dictionary with run details for frontend
    """
    try:
        # Create run record in workflow.run
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, status, started_at, input_file_path, output_file_path
                )
                VALUES (:workflow_id, :triggered_by, :status, NOW(), :input_file_path, :output_file_path)
                RETURNING id
            """),
            {
                "workflow_id": run_data.workflow_id,
                "triggered_by": run_data.triggered_by,
                "status": "running",
                "input_file_path": run_data.input_file_path,
                "output_file_path": run_data.output_file_path
            }
        )
        run_id = result.fetchone()[0]
        db.commit()
        logger.info(f"Created run {run_id} for workflow {run_data.workflow_id} and job {run_data.job_name}")

        # Trigger Dagster job
        try:
            dagster_result = run_dagster_job(run_data.job_name, run_data.run_config)
            dagster_run_id = dagster_result.get("run_id")
            status = dagster_result.get("status")
            logger.info(f"Triggered Dagster job {run_data.job_name} with run_id: {dagster_run_id}")
        except Exception as e:
            # Update run record with error
            db.execute(
                text("""
                    UPDATE workflow.run 
                    SET status = :status, 
                        finished_at = NOW(), 
                        error_message = :error_message
                    WHERE id = :run_id
                """),
                {
                    "run_id": run_id,
                    "status": "failed",
                    "error_message": str(e)
                }
            )
            db.commit()
            raise

        # Update run record with dagster_run_id
        db.execute(
            text("""
                UPDATE workflow.run 
                SET dagster_run_id = :dagster_run_id,
                    status = :status
                WHERE id = :run_id
            """),
            {
                "run_id": run_id,
                "dagster_run_id": dagster_run_id,
                "status": status
            }
        )
        db.commit()

        return {
            "run_id": run_id,
            "dagster_run_id": dagster_run_id,
            "status": status,
            "workflow_id": run_data.workflow_id,
            "job_name": run_data.job_name,
            "input_file_path": run_data.input_file_path,
            "output_file_path": run_data.output_file_path
        }
    except Exception as e:
        logger.error(f"Failed to trigger run for workflow {run_data.workflow_id}, job {run_data.job_name}: {str(e)}")
        # Ensure run record is updated on failure
        db.execute(
            text("""
                UPDATE workflow.run 
                SET status = :status, 
                    finished_at = NOW(), 
                    error_message = :error_message
                WHERE id = :run_id
            """),
            {
                "run_id": run_id,
                "status": "failed",
                "error_message": str(e)
            }
        )
        db.commit()
        raise HTTPException(500, f"Error triggering run: {str(e)}")