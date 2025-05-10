from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import os
import json
import logging
from typing import Dict, List, Any, Optional
import re
from .get_health_check import get_db
from dotenv import load_dotenv
import uuid

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dags", tags=["dags"])

# Directory to save generated DAG files
DAG_OUTPUT_DIR = os.path.join("app", "dagster", "jobs")

# Ensure the output directory exists
os.makedirs(DAG_OUTPUT_DIR, exist_ok=True)

# Pydantic model for DAG creation request
class DagCreate(BaseModel):
    workflow_id: int

# Template for Dagster job file
DAG_TEMPLATE = """
from dagster import job, op, resource, In, Out, Field, StringSource
import pandas as pd
import io
import json
import uuid
from supabase import Client
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Define resources
@resource
def supabase_resource(init_context):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
    return Client(supabase_url, supabase_key)

@resource
def db_engine_resource(init_context):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL must be set")
    return create_engine(db_url)

# Define operations (ops)
@op(config_schema={"input_file_path": str}, out=Out(pd.DataFrame))
def load_input_op(context):
    input_file_path = context.op_config["input_file_path"]
    supabase_client = context.resources.supabase
    bucket = "workflow-files"
    try:
        file_content = supabase_client.storage.from_(bucket).download(input_file_path)
        df = pd.read_csv(io.BytesIO(file_content))
        context.log.info(f"Loaded input file: {input_file_path} with {len(df)} rows")
        return df
    except Exception as e:
        context.log.error(f"Error loading input: {str(e)}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, NULL, 'error', :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "message": f"Error loading input file: {str(e)}"
                }
            )
            conn.commit()
        raise

@op(
    config_schema={{
        "parameters": dict,
        "step_label": Field(StringSource, is_required=False, default_value="{step_label}")
    }},
    ins={{"input_df": In(pd.DataFrame)}},
    out=Out(dict)
)
def transform_op(context, input_df: pd.DataFrame):
    parameters = context.op_config["parameters"]
    step_label = context.op_config["step_label"]
    step_data = {{
        "label": step_label,
        "id": context.run_id
    }}
    try:
        code = '''{code}'''
        local_vars = {{"pd": pd, "json": json}}
        exec(code, local_vars)
        transform_func = local_vars.get("csv_to_json_transformation")
        if not transform_func:
            raise ValueError("Transformation function not found")
        result = transform_func(parameters, "{input_file_path}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, :log_level, :message, NOW())
                '''),
                {{
                    "run_id": context.run_id,
                    "step_id": step_data["id"],
                    "log_level": "info",
                    "message": f"Step {{step_data['label']}} executed"
                }}
            )
            conn.commit()
        return result
    except Exception as e:
        error_msg = f"Transformation error: {{str(e)}}"
        context.log.error(error_msg)
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, :log_level, :message, NOW())
                '''),
                {{
                    "run_id": context.run_id,
                    "step.ConcurrentModificationExceptionid": step_data["id"],
                    "log_level": "error",
                    "message": error_msg
                }}
            )
            conn.commit()
        raise Exception(error_msg)

@op(config_schema={{"workflow_id": int, "destination": dict}}, ins={{"input_data": In(dict)}})
def save_output_op(context, input_data: dict):
    workflow_id = context.op_config["workflow_id"]
    destination = context.op_config["destination"]
    try:
        if "error" in input_data:
            error_msg = f"Transformation error: {{input_data['error']}}"
            context.log.error(error_msg)
            raise ValueError(error_msg)
        df = pd.DataFrame(input_data["data"])
        output_path = destination.get("file_path") or \
            f"workflow-files/output/{{workflow_id}}_{{uuid.uuid4()}}.csv"
        supabase_client = context.resources.supabase
        bucket = "workflow-files"
        csv_data = df.to_csv(index=False).encode()
        file_content = io.BytesIO(csv_data)
        supabase_client.storage.from_(bucket).upload(output_path, file_content)
        context.log.info(f"Output uploaded to Supabase: {{bucket}}/{{output_path}}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    UPDATE workflow.run
                    SET output_file_path = :output_file_path,
                        status = 'completed',
                        finished_at = NOW()
                    WHERE id = :run_id
                '''),
                {{"run_id": context.run_id, "output_file_path": output_path}}
            )
            conn.commit()
        return {{"output_file_path": output_path}}
    except Exception as e:
        error_msg = f"Output save error: {{str(e)}}"
        context.log.error(error_msg)
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    UPDATE workflow.run
                    SET status = 'failed',
                        error_message = :error_message,
                        finished_at = NOW()
                    WHERE id = :run_id
                '''),
                {{"run_id": context.run_id, "error_message": error_msg}}
            )
            conn.commit()
        raise Exception(error_msg)

# Define the job
@job(
    name="workflow_job_{workflow_id}",
    resource_defs={{
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    }},
    tags={{"workflow_id": "{workflow_id}"}}
)
def workflow_job():
    raw_data = load_input_op()
    transformed_data = transform_op(raw_data)
    save_output_op(transformed_data)
"""

def fix_indentation(code: str) -> str:
    """Fix indentation in the generated code to use 4 spaces."""
    lines = code.split('\n')
    fixed_lines = []
    for line in lines:
        # Replace tabs with spaces and ensure consistent indentation
        fixed_line = line.replace('\t', '    ')
        fixed_lines.append(fixed_line)
    return '\n'.join(fixed_lines)

def sanitize_code(code: str) -> str:
    """Sanitize code to prevent template string issues."""
    # Escape any curly braces in the code that aren't template markers
    code = re.sub(r'(?<!{){(?!{)', r'{{', code)
    code = re.sub(r'(?<!})}(?!})', r'}}', code)
    return code

def fetch_workflow_data(db: Session, workflow_id: int) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Fetch workflow and its steps from the database.
    """
    # Fetch workflow
    workflow_result = db.execute(
        text("""
            SELECT id, name, input_file_path, destination, input_structure, parameters
            FROM workflow.workflow
            WHERE id = :id
        """),
        {"id": workflow_id}
    ).fetchone()
    if not workflow_result:
        logger.error(f"Workflow {workflow_id} not found")
        raise ValueError(f"Workflow {workflow_id} not found")

    workflow_data = dict(workflow_result._mapping)

    # Parse input_structure and parameters if they are JSON strings
    if isinstance(workflow_data.get("input_structure"), str) and workflow_data["input_structure"].strip():
        try:
            workflow_data["input_structure"] = json.loads(workflow_data["input_structure"])
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse input_structure as JSON: {str(e)}")

    if isinstance(workflow_data.get("parameters"), str) and workflow_data["parameters"].strip():
        try:
            workflow_data["parameters"] = json.loads(workflow_data["parameters"])
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse parameters as JSON: {str(e)}")

    # Fetch steps
    steps_result = db.execute(
        text("""
            SELECT id, workflow_id, label, code_type, code, parameters, step_order
            FROM workflow.workflow_step
            WHERE workflow_id = :workflow_id
            ORDER BY step_order
        """),
        {"workflow_id": workflow_id}
    ).fetchall()

    if not steps_result:
        logger.error(f"No steps found for workflow {workflow_id}")
        raise ValueError(f"No steps found for workflow {workflow_id}")

    steps_data = [dict(step._mapping) for step in steps_result]

    # Parse step parameters if they are JSON strings
    for step in steps_data:
        if isinstance(step.get("parameters"), str) and step["parameters"].strip():
            try:
                step["parameters"] = json.loads(step["parameters"])
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse step parameters as JSON: {str(e)}")
                step["parameters"] = {}

    return workflow_data, steps_data

def generate_dag_file(workflow_data: Dict[str, Any], steps_data: List[Dict[str, Any]]) -> str:
    """
    Generate a Dagster job file and save it to the jobs directory.
    """
    workflow_id = workflow_data["id"]
    input_file_path = workflow_data.get("input_file_path", "")
    destination = workflow_data.get("destination", {})

    # For now, use the first step (as per your current workflow)
    if len(steps_data) > 1:
        logger.warning(f"Multiple steps found for workflow {workflow_id}. Using first step.")
    step_data = steps_data[0]

    # Fix indentation and sanitize code
    code = step_data.get("code", "")
    code = fix_indentation(code)
    code = sanitize_code(code)

    # Populate template
    dag_content = DAG_TEMPLATE.format(
        workflow_id=workflow_id,
        step_label=step_data.get("label", "default_step"),
        code=code,
        input_file_path=input_file_path
    )

    # Save to file
    dag_file_path = os.path.join(DAG_OUTPUT_DIR, f"workflow_{workflow_id}.py")
    with open(dag_file_path, "w") as f:
        f.write(dag_content)

    logger.info(f"Generated DAG file: {dag_file_path}")
    return dag_file_path

def create_dag(db: Session, workflow_id: int) -> str:
    """
    Main function to create a Dagster DAG for a workflow.
    """
    try:
        workflow_data, steps_data = fetch_workflow_data(db, workflow_id)
        dag_file_path = generate_dag_file(workflow_data, steps_data)
        return dag_file_path
    except Exception as e:
        logger.error(f"Failed to create DAG for workflow {workflow_id}: {str(e)}")
        raise

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_dag_endpoint(
    request: DagCreate,
    db: Session = Depends(get_db)
):
    """
    Create a Dagster DAG file for a workflow.
    """
    try:
        # Check if environment variables are set
        required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "DATABASE_URL"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "error": f"Missing required environment variables: {', '.join(missing_vars)}",
                    "message": "Please set these variables in the .env file"
                }
            )

        # Create DAG file
        dag_file_path = create_dag(
            db=db,
            workflow_id=request.workflow_id
        )

        logger.info(f"DAG created successfully for workflow {request.workflow_id}")
        return {
            "workflow_id": request.workflow_id,
            "dag_file_path": dag_file_path,
            "message": f"DAG file generated at {dag_file_path}."
        }
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create DAG: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create DAG: {str(e)}")