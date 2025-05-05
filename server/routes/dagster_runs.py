from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, Dict, List
import logging
import pandas as pd
import io
import json
import uuid
import os
import requests
import pickle
from dagster import job, op, repository, resource, In, Out, Config, JobDefinition
from .get_health_check import get_db, supabase, engine
from app.file_parser import parser_map
from supabase import Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

# Supabase configuration
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

# Pydantic Model for Run Creation
class RunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    parameters: Optional[Dict] = None

# Dagster Resources
@resource
def supabase_resource(init_context):
    return supabase

@resource
def db_engine_resource(init_context):
    return engine

# Define ops at the top level to avoid pickling issues
@op(out=Out(pd.DataFrame))
def load_input_op(context, input_file_path: str) -> pd.DataFrame:
    supabase_client = context.resources.supabase
    file_content = supabase_client.storage.from_(SUPABASE_BUCKET).download(input_file_path)
    df = pd.read_csv(io.BytesIO(file_content))
    context.log.info(f"Loaded input file: {input_file_path}")
    return df

@op(
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict),
    config_schema={"step_data": dict, "parameters": dict}
)
def transform_op(context, input_df: pd.DataFrame) -> dict:
    step_data = context.op_config["step_data"]
    parameters = context.op_config["parameters"]
    
    code = step_data["code"]
    local_vars = {"pd": pd, "json": json}
    exec(code, local_vars)
    transform_func = local_vars["csv_to_json_transformation"]

    result = transform_func(parameters, step_data["input_file_path"])
    
    context.log.info(f"Step {step_data['label']} executed successfully")
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO workflow.run_log (run_id, step_id, log_level, message, timestamp)
                VALUES (:run_id, :step_id, :log_level, :message, NOW())
            """),
            {
                "run_id": context.run_id,
                "step_id": step_data["id"],
                "log_level": "info",
                "message": f"Step {step_data['label']} executed successfully"
            }
        )
        conn.commit()

    return result

@op(ins={"input_data": In(dict)})
def save_output_op(context, input_data: dict, workflow_id: int, destination: Dict):
    if "error" in input_data:
        raise Exception(input_data["error"])
    
    df = pd.DataFrame(input_data["data"])
    output_path = destination["file_path"] or f"workflow-files/output/{workflow_id}_{uuid.uuid4()}.csv"
    df.to_csv(output_path, index=False)
    context.log.info(f"Output saved to CSV: {output_path}")

    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text("""
                UPDATE workflow.run 
                SET output_file_path = :output_file_path
                WHERE id = :run_id
            """),
            {"run_id": context.run_id, "output_file_path": output_path}
        )
        conn.commit()

# Factory function to create jobs dynamically
def create_workflow_job(workflow_id: int, input_file_path: str, destination: Dict) -> JobDefinition:
    @job(
        name=f"workflow_job_{workflow_id}",
        resource_defs={
            "supabase": supabase_resource,
            "db_engine": db_engine_resource
        }
    )
    def workflow_job():
        input_df = load_input_op(input_file_path)
        transformed = transform_op(input_df)
        save_output_op(transformed, workflow_id, destination)

    logger.info(f"Created dynamic pipeline: workflow_job_{workflow_id}")
    return workflow_job

# Run Dagster Job via GraphQL
def run_dagster_job(job_name, run_config):
    """Run a Dagster job using direct GraphQL API calls for Dagster 1.7.x"""
    dagster_api_url = os.getenv("DAGSTER_API_URL")
    if not dagster_api_url:
        raise ValueError("DAGSTER_API_URL must be set in .env")

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
                "repositoryLocationName": "Conduit",
                "repositoryName": "workflow_repository",
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

        logger.info(f"API Request to {dagster_api_url} completed with status: {response.status_code}")
        logger.debug(f"Request payload: {json.dumps(variables)}")

        if response.status_code != 200:
            logger.error(f"HTTP Error: {response.status_code}")
            logger.error(f"Response content: {response.text}")
            response.raise_for_status()

        result = response.json()
        logger.info(f"Job launch response: {result}")

        if "errors" in result:
            error_details = "; ".join([e.get("message", "Unknown error") for e in result["errors"]])
            logger.error(f"GraphQL errors: {error_details}")
            raise Exception(f"GraphQL errors: {error_details}")

        data = result.get("data", {}).get("launchPipelineExecution", {})

        if data.get("__typename") == "LaunchPipelineRunSuccess":
            return {
                "run_id": data["run"]["runId"],
                "status": data["run"]["status"]
            }
        else:
            error_message = "Unknown error"
            if data.get("__typename") == "PythonError":
                error_message = f"Python error: {data.get('message', 'Unknown')}"
            elif data.get("__typename") == "PipelineNotFoundError":
                error_message = f"Pipeline not found: {data.get('message', 'Unknown')}"
            elif data.get("__typename") == "RunConfigValidationInvalid":
                errors = data.get("errors", [])
                error_message = f"Config validation errors: {'; '.join([e.get('message', '') for e in errors])}"
            else:
                error_message = f"{data.get('__typename', 'Unknown error')}: {data.get('message', 'Unknown')}"

            logger.error(f"Failed to launch job: {error_message}")
            raise Exception(f"Failed to launch job: {error_message}")
    except Exception as e:
        logger.error(f"Error launching Dagster job: {str(e)}")
        raise

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

@router.post("/")
async def create_run(
    workflow_id: int = Form(...),
    triggered_by: int = Form(...),
    parameters: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Trigger a Dagster pipeline run in remote Dagster instance with uploaded file"""
    # Create run record first to ensure run_id is available
    try:
        result = db.execute(
            text("""
                INSERT INTO workflow.run (workflow_id, triggered_by, status, started_at)
                VALUES (:workflow_id, :triggered_by, :status, NOW())
                RETURNING id
            """),
            {
                "workflow_id": workflow_id,
                "triggered_by": triggered_by,
                "status": "running"
            }
        )
        run_id = result.fetchone()[0]
        db.commit()
        logger.info(f"Created run {run_id} for workflow {workflow_id}")
    except Exception as e:
        logger.error(f"Failed to create run for workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create run: {str(e)}")

    try:
        # Parse parameters if provided
        run_parameters = None
        if parameters and isinstance(parameters, str) and parameters.strip():
            try:
                run_parameters = json.loads(parameters)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in parameters: {str(e)}")
                raise HTTPException(status_code=400, detail=f"Invalid JSON in parameters: {str(e)}")

        # Fetch workflow details
        workflow = db.execute(
            text("""
                SELECT id, name, input_file_path, destination, input_structure 
                FROM workflow.workflow 
                WHERE id = :id
            """),
            {"id": workflow_id}
        ).fetchone()
        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(status_code=404, detail="Workflow not found")

        # Fetch steps
        steps = db.execute(
            text("""
                SELECT id, workflow_id, label, code_type, code, parameters, step_order
                FROM workflow.workflow_step 
                WHERE workflow_id = :workflow_id 
                ORDER BY step_order
            """),
            {"workflow_id": workflow_id}
        ).fetchall()
        if not steps:
            logger.error(f"No steps found for workflow {workflow_id}")
            raise HTTPException(status_code=400, detail="No steps found for workflow")
        if len(steps) > 1:
            logger.warning(f"Multiple steps found for workflow {workflow_id}. Using first step only.")
            step = steps[0]
        else:
            step = steps[0]

        # Fetch destination
        destination = db.execute(
            text("""
                SELECT workflow_id, file_path, file_format 
                FROM workflow.workflow_destination 
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        ).fetchone()

        # Validate and parse uploaded file
        if not file.filename or "." not in file.filename:
            logger.error("Invalid filename")
            raise HTTPException(status_code=400, detail="Invalid filename")

        file_ext = file.filename.split(".")[-1].lower()
        parser = parser_map.get(file_ext)
        if not parser:
            logger.error(f"Unsupported file type: {file_ext}")
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")

        content = await file.read()
        try:
            df = await parser.parse(content)
        except Exception as parse_error:
            logger.error(f"Failed to parse file: {str(parse_error)}")
            raise HTTPException(status_code=500, detail=f"File parsing failed: {str(parse_error)}")

        # Validate file structure
        logger.info(f"Input structure type: {type(workflow.input_structure)}, value: {workflow.input_structure}")
        expected_structure = workflow.input_structure if isinstance(workflow.input_structure, dict) else (json.loads(workflow.input_structure) if workflow.input_structure else {})
        validate_file_structure(df, expected_structure)

        # Upload file to Supabase using run_id
        file_path = f"runs/{run_id}/{uuid.uuid4()}.{file_ext}"
        storage_url = upload_to_storage(file_path, content)

        # Prepare step configuration
        step_config = {
            "id": step.id,
            "label": step.label,
            "code_type": step.code_type,
            "code": step.code,
            "parameters": step.parameters,
            "input_file_path": storage_url
        }

        # Create dynamic pipeline
        pipeline = create_workflow_job(
            workflow_id=workflow_id,
            input_file_path=storage_url,
            destination=dict(destination._mapping) if destination else {"file_path": None, "file_format": "csv"}
        )

        # Register pipeline with remote Dagster instance
        dagster_api_url = os.getenv("DAGSTER_API_URL")
        register_url = dagster_api_url.replace("/graphql", "") + "/register_pipeline"
        try:
            pipeline_def = pickle.dumps(pipeline).hex()
            response = requests.post(
                register_url,
                json={
                    "workflow_id": workflow_id,
                    "pipeline_def": pipeline_def
                },
                headers={"Content-Type": "application/json"}
            )
            if response.status_code != 200:
                logger.error(f"Pipeline registration failed: {response.text}")
                raise HTTPException(500, f"Failed to register pipeline: {response.text}")
            logger.info(f"Pipeline registered successfully: workflow_job_{workflow_id}")
        except Exception as e:
            logger.error(f"Error registering pipeline: {str(e)}")
            raise HTTPException(500, f"Error registering pipeline: {str(e)}")

        # Prepare run config
        run_config = {
            "resources": {
                "supabase": {"config": {}},
                "db_engine": {"config": {}}
            },
            "ops": {
                "transform": {
                    "config": {
                        "step_data": step_config,
                        "parameters": run_parameters or {"Title": "Untitled Report"}
                    }
                }
            }
        }

        logger.info(f"Triggering dynamic pipeline: workflow_job_{workflow_id}")
        pipeline_name = f"workflow_job_{workflow_id}"

        try:
            dagster_result = run_dagster_job(pipeline_name, run_config)
            dagster_run_id = dagster_result.get("run_id")
            status = "running"
            error_message = None
            logger.info(f"GraphQL API execution initiated with run_id: {dagster_run_id}")
        except Exception as api_error:
            logger.error(f"GraphQL API execution failed: {str(api_error)}")
            status = "failed"
            error_message = f"GraphQL API error: {str(api_error)}"
            dagster_run_id = None

        # Update run with file path and status
        db.execute(
            text("""
                UPDATE workflow.run 
                SET status = :status, 
                    finished_at = :finished_at, 
                    error_message = :error_message, 
                    dagster_run_id = :dagster_run_id,
                    input_file_path = :input_file_path
                WHERE id = :run_id
            """),
            {
                "run_id": run_id,
                "status": status,
                "finished_at": None if status == "running" else "NOW()",
                "error_message": error_message,
                "dagster_run_id": dagster_run_id,
                "input_file_path": storage_url
            }
        )
        db.commit()

        logger.info(f"Run {run_id} for workflow {workflow_id} triggered with Dagster run ID {dagster_run_id}")
        return {
            "run_id": run_id,
            "dagster_run_id": dagster_run_id,
            "status": status,
            "input_file_path": storage_url
        }
    except HTTPException as e:
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
    except Exception as e:
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
        logger.error(f"Failed to run workflow {workflow_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error running workflow: {str(e)}")

@router.get("/")
async def list_runs(db: Session = Depends(get_db)):
    """List all workflow runs"""
    try:
        logger.info("Fetching all runs")
        result = db.execute(
            text("""
                SELECT id, workflow_id, triggered_by, status, started_at, finished_at, 
                       error_message, output_file_path, dagster_run_id, input_file_path
                FROM workflow.run
            """)
        )
        runs = [dict(run._mapping) for run in result.fetchall()]
        logger.info(f"Retrieved {len(runs)} runs")
        return runs
    except Exception as e:
        logger.error(f"Failed to fetch runs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch runs: {str(e)}")