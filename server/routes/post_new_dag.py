from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import os
import json
import logging
from typing import Dict, List
from .get_health_check import get_db
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dags", tags=["dags"])

# Directory to save generated DAG files
DAG_OUTPUT_DIR = "workflow_dags_pending"

# Ensure the output directory exists
os.makedirs(DAG_OUTPUT_DIR, exist_ok=True)

# Pydantic model for DAG creation request
class DagCreate(BaseModel):
    workflow_id: int

# Template for Dagster job file
DAG_TEMPLATE = """
from dagster import job, op, resource, In, Out, InputDefinition
import pandas as pd
import io
import json
import uuid
from supabase import Client
from sqlalchemy import create_engine

@resource
def supabase_resource(init_context):
    supabase_url = "{supabase_url}"
    supabase_key = "{supabase_key}"
    return Client(supabase_url, supabase_key)

@resource
def db_engine_resource(init_context):
    return create_engine("{db_url}")

@op(out=Out(pd.DataFrame))
def load_input_op(context, input_file_path: str) -> pd.DataFrame:
    supabase_client = context.resources.supabase
    bucket = "{supabase_bucket}"
    file_content = supabase_client.storage.from_(bucket).download(input_file_path)
    df = pd.read_csv(io.BytesIO(file_content))
    context.log.info(f"Loaded input file: {{input_file_path}}")
    return df

@op(
    ins={{"input_df": In(pd.DataFrame)}},
    out=Out(dict),
    config_schema={{"step_data": dict, "parameters": dict}}
)
def transform_op(context, input_df: pd.DataFrame) -> dict:
    step_data = context.op_config["step_data"]
    parameters = context.op_config["parameters"]
    code = '''{code}'''
    local_vars = {{"pd": pd, "json": json}}
    exec(code, local_vars)
    transform_func = local_vars["csv_to_json_transformation"]
    result = transform_func(parameters, step_data["input_file_path"])
    context.log.info(f"Step {{step_data['label']}} executed successfully")
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                INSERT INTO workflow.run_log (run_id, step_id, log_level, message, timestamp)
                VALUES (:run_id, :step_id, :log_level, :message, NOW())
            '''),
            {{
                "run_id": context.run_id,
                "step_id": step_data["id"],
                "log_level": "info",
                "message": f"Step {{step_data['label']}} executed successfully"
            }}
        )
        conn.commit()
    return result

@op(ins={{"input_data": In(dict)}})
def save_output_op(context, input_data: dict, workflow_id: int, destination: dict):
    if "error" in input_data:
        raise Exception(input_data["error"])
    df = pd.DataFrame(input_data["data"])
    output_path = destination.get("file_path") or f"workflow-files/output/{{workflow_id}}_{{uuid.uuid4()}}.csv"
    df.to_csv(output_path, index=False)
    context.log.info(f"Output saved to CSV: {{output_path}}")
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                UPDATE workflow.run 
                SET output_file_path = :output_file_path
                WHERE id = :run_id
            '''),
            {{"run_id": context.run_id, "output_file_path": output_path}}
        )
        conn.commit()

@job(
    name="workflow_job_{workflow_id}",
    resource_defs={{"supabase": supabase_resource, "db_engine": db_engine_resource}},
    input_defs=[InputDefinition("input_file_path", str), InputDefinition("workflow_id", int), InputDefinition("destination", dict)]
)
def workflow_job(input_file_path: str, workflow_id: int, destination: dict):
    input_df = load_input_op(input_file_path)
    transformed = transform_op(input_df)
    save_output_op(transformed, workflow_id, destination)
"""

def fetch_workflow_data(db: Session, workflow_id: int) -> tuple[Dict, List[Dict]]:
    """
    Fetch workflow and its steps from the database.
    
    Args:
        db: SQLAlchemy session
        workflow_id: ID of the workflow
    
    Returns:
        Tuple of (workflow data, list of step data)
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
    if isinstance(workflow_data["input_structure"], str):
        workflow_data["input_structure"] = json.loads(workflow_data["input_structure"])
    if isinstance(workflow_data["parameters"], str):
        workflow_data["parameters"] = json.loads(workflow_data["parameters"])
    
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
        if isinstance(step["parameters"], str):
            step["parameters"] = json.loads(step["parameters"]) if step["parameters"] else []
    
    return workflow_data, steps_data

def generate_dag_file(workflow_data: Dict, steps_data: List[Dict], supabase_url: str, supabase_key: str, supabase_bucket: str, db_url: str) -> str:
    """
    Generate a Dagster job file and save it to workflow_dags_pending.
    
    Args:
        workflow_data: Workflow metadata from database
        steps_data: List of step metadata from database
        supabase_url: Supabase URL for storage
        supabase_key: Supabase key for storage
        supabase_bucket: Supabase bucket name
        db_url: Database connection URL
    
    Returns:
        Path to the generated DAG file
    """
    workflow_id = workflow_data["id"]
    
    # For now, use the first step (since workflow ID 22 has one step)
    if len(steps_data) > 1:
        logger.warning(f"Multiple steps found for workflow {workflow_id}. Using first step.")
    step_data = steps_data[0]
    
    # Escape triple quotes in code to prevent syntax errors
    code = step_data["code"].replace("'''", '"""')
    
    # Populate template
    dag_content = DAG_TEMPLATE.format(
        workflow_id=workflow_id,
        code=code,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        supabase_bucket=supabase_bucket,
        db_url=db_url
    )
    
    # Save to file
    dag_file_path = os.path.join(DAG_OUTPUT_DIR, f"workflow_{workflow_id}.py")
    with open(dag_file_path, "w") as f:
        f.write(dag_content)
    
    logger.info(f"Generated DAG file: {dag_file_path}")
    return dag_file_path

def create_dag(db: Session, workflow_id: int, supabase_url: str, supabase_key: str, supabase_bucket: str, db_url: str) -> str:
    """
    Main function to create a Dagster DAG for a workflow.
    
    Args:
        db: SQLAlchemy session
        workflow_id: ID of the workflow
        supabase_url: Supabase URL
        supabase_key: Supabase key
        supabase_bucket: Supabase bucket name
        db_url: Database connection URL
    
    Returns:
        Path to the generated DAG file
    """
    try:
        workflow_data, steps_data = fetch_workflow_data(db, workflow_id)
        dag_file_path = generate_dag_file(workflow_data, steps_data, supabase_url, supabase_key, supabase_bucket, db_url)
        return dag_file_path
    except Exception as e:
        logger.error(f"Failed to create DAG for workflow {workflow_id}: {str(e)}")
        raise

@router.post("/")
async def create_dag_endpoint(
    request: DagCreate,
    db: Session = Depends(get_db)
):
    """
    Create a Dagster DAG file for a workflow.
    
    Args:
        request: DagCreate model with workflow_id
        db: SQLAlchemy session
    
    Returns:
        Dictionary with the path to the generated DAG file
    """
    try:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        supabase_bucket = os.getenv("SUPABASE_BUCKET", "workflow-files")
        db_url = os.getenv("DATABASE_URL")

        if not all([supabase_url, supabase_key, supabase_bucket, db_url]):
            logger.error("Missing required environment variables")
            raise HTTPException(status_code=500, detail="Missing required environment variables")

        dag_file_path = create_dag(
            db=db,
            workflow_id=request.workflow_id,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
            supabase_bucket=supabase_bucket,
            db_url=db_url
        )

        logger.info(f"DAG created successfully for workflow {request.workflow_id}")
        return {
            "workflow_id": request.workflow_id,
            "dag_file_path": dag_file_path,
            "message": f"DAG file generated at {dag_file_path}. Please copy to Dagster's dags directory."
        }
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create DAG: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create DAG: {str(e)}")