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

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/dags", tags=["dags"])

# Directory to save generated DAG files - update to your desired path
DAG_OUTPUT_DIR = "server/app/dagster/jobs"

# Ensure the output directory exists
os.makedirs(DAG_OUTPUT_DIR, exist_ok=True)

# Pydantic model for DAG creation request
class DagCreate(BaseModel):
    workflow_id: int

# Template for Dagster job file based on Dagster 1.10.14 syntax
DAG_TEMPLATE = """
from dagster import job, op, resource, In, Out, Field, StringSource, OpExecutionContext
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

@op(config_schema={{"input_file_path": str}}, out=Out(pd.DataFrame))
def load_input_op(context: OpExecutionContext):
    input_file_path = context.op_config["input_file_path"]
    context.log.info(f"Loading input file: {{input_file_path}}")
    
    try:
        supabase_client = context.resources.supabase

        # Extract bucket and path
        if "/" in input_file_path:
            parts = input_file_path.split("/", 1)
            bucket = parts[0]
            path = parts[1]
        else:
            bucket = "workflow-files"
            path = input_file_path

        # Download file content
        file_content = supabase_client.storage.from_(bucket).download(path)
        
        # Parse CSV
        df = pd.read_csv(io.BytesIO(file_content))
        context.log.info(f"Loaded CSV with {{len(df)}} rows and {{len(df.columns)}} columns")
        return df
    except Exception as e:
        context.log.error(f"Error loading input: {{str(e)}}")
        # Log error to database
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO workflow.run_log
                        (run_id, step_id, log_level, message, timestamp)
                        VALUES (:run_id, null, 'error', :message, NOW())
                    '''),
                    {{
                        "run_id": context.run_id,
                        "message": f"Error loading input file: {{str(e)}}"
                    }}
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {{str(db_error)}}")
        raise

@op(
    config_schema={{
        "parameters": dict,
        "step_data": dict,
        "step_label": Field(StringSource, is_required=False, default_value="default_step")
    }},
    ins={{"input_df": In(pd.DataFrame)}},
    out=Out(dict)
)
def transform_op(context: OpExecutionContext, input_df: pd.DataFrame):
    parameters = context.op_config["parameters"] or {{}}
    step_data = context.op_config["step_data"] or {{}}
    step_label = context.op_config["step_label"]
    step_id = step_data.get("id")
    
    context.log.info(f"Starting transformation for step {{step_label}}")
    context.log.info(f"Parameters: {{parameters}}")
    
    # Record start in database
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, 'info', :message, NOW())
                '''),
                {{
                    "run_id": context.run_id,
                    "step_id": step_id,
                    "message": f"Starting step {{step_label}}"
                }}
            )
            conn.commit()
    except Exception as e:
        context.log.error(f"Database error logging step start: {{str(e)}}")
    
    # Execute transformation code
    try:
        # Extract transformation code
        code = '''{code}'''
        
        # Create execution environment
        local_vars = {{
            "pd": pd,
            "json": json,
            "input_df": input_df
        }}
        
        # Execute code
        exec(code, {{}}, local_vars)
        
        # Call transformation function
        transform_func = local_vars["csv_to_json_transformation"]
        result = transform_func(parameters, step_data.get("input_file_path", "unknown"))
        
        # Log success
        context.log.info(f"Transformation completed successfully")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, :log_level, :message, NOW())
                '''),
                {{
                    "run_id": context.run_id,
                    "step_id": step_id,
                    "log_level": "info",
                    "message": "Transformation executed successfully"
                }}
            )
            conn.commit()
        
        return result
    except Exception as e:
        error_msg = f"Transformation error: {{str(e)}}"
        context.log.error(error_msg)
        
        # Log error to database
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO workflow.run_log
                        (run_id, step_id, log_level, message, timestamp)
                        VALUES (:run_id, :step_id, :log_level, :message, NOW())
                    '''),
                    {{
                        "run_id": context.run_id,
                        "step_id": step_id,
                        "log_level": "error",
                        "message": error_msg
                    }}
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {{str(db_error)}}")
        
        raise Exception(error_msg)

@op(
    config_schema={{
        "workflow_id": int,
        "destination": dict
    }},
    ins={{"transformed_data": In(dict)}}
)
def save_output_op(context: OpExecutionContext, transformed_data: dict):
    workflow_id = context.op_config["workflow_id"]
    destination = context.op_config["destination"] or {{}}
    
    try:
        context.log.info(f"Saving output for workflow {{workflow_id}}")
        
        # Check for errors in transformed data
        if "error" in transformed_data:
            error_msg = f"Transformation error: {{transformed_data['error']}}"
            context.log.error(error_msg)
            raise Exception(error_msg)
        
        # Get destination file path or generate default
        output_path = destination.get("file_path")
        if not output_path:
            output_format = destination.get("file_format", "csv").lower()
            output_path = f"workflow-files/output/{{workflow_id}}_{{uuid.uuid4()}}.{{output_format}}"
        
        # Handle different output formats
        supabase_client = context.resources.supabase
        bucket = "workflow-files"
        
        if output_path.endswith(".json"):
            # JSON output
            json_data = json.dumps(transformed_data, indent=2).encode()
            file_content = io.BytesIO(json_data)
            
            # Upload to Supabase storage
            if "/" in output_path:
                parts = output_path.split("/", 1)
                bucket = parts[0]
                path = parts[1]
            else:
                path = output_path
                
            supabase_client.storage.from_(bucket).upload(path, file_content)
            
        else:
            # Convert to DataFrame and save as CSV
            if isinstance(transformed_data.get("data"), dict):
                # Handle grouped data
                flattened_data = []
                for group_name, group_data in transformed_data["data"].items():
                    for item in group_data:
                        row = {{"group": group_name}}
                        row.update(item)
                        flattened_data.append(row)
                df = pd.DataFrame(flattened_data)
            else:
                # Regular data list
                df = pd.DataFrame(transformed_data.get("data", []))
            
            # Save DataFrame as CSV and upload
            csv_data = df.to_csv(index=False).encode()
            file_content = io.BytesIO(csv_data)
            
            if "/" in output_path:
                parts = output_path.split("/", 1)
                bucket = parts[0] 
                path = parts[1]
            else:
                path = output_path
                
            supabase_client.storage.from_(bucket).upload(path, file_content)
        
        context.log.info(f"Output saved to: {{output_path}}")
        
        # Update run record with output file path
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
            context.log.info(f"Run record updated with output path")
        
        return {{"output_file_path": output_path}}
    except Exception as e:
        error_msg = f"Output save error: {{str(e)}}"
        context.log.error(error_msg)
        
        # Update run with error status
        try:
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
        except Exception as db_error:
            context.log.error(f"Failed to update run status: {{str(db_error)}}")
        
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
    input_df = load_input_op()
    transformed_data = transform_op(input_df)
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
    code = re.sub(r'{{([^{}]*?)}}', r'{{{\1}}}', code)
    return code

def fetch_workflow_data(db: Session, workflow_id: int) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
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

    # Parse destination if it's a string
    if isinstance(workflow_data.get("destination"), str) and workflow_data["destination"].strip():
        try:
            workflow_data["destination"] = json.loads(workflow_data["destination"])
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse destination as JSON: {str(e)}")
            workflow_data["destination"] = {"file_format": "csv"}

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
        if isinstance(step.get("parameters"), str) and step["parameters"] and step["parameters"].strip():
            try:
                step["parameters"] = json.loads(step["parameters"])
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse step parameters as JSON: {str(e)}")
                step["parameters"] = {}

    return workflow_data, steps_data

def generate_dag_file(workflow_data: Dict[str, Any], steps_data: List[Dict[str, Any]]) -> str:
    """
    Generate a Dagster job file and save it to the DAG_OUTPUT_DIR directory.

    Args:
        workflow_data: Workflow metadata from database
        steps_data: List of step metadata from database

    Returns:
        Path to the generated DAG file
    """
    workflow_id = workflow_data["id"]

    # For workflows with multiple steps, we'll need to handle them appropriately
    # For now, using the first step as per your request
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
        code=code
    )

    # Save to file
    os.makedirs(DAG_OUTPUT_DIR, exist_ok=True)
    dag_file_path = os.path.join(DAG_OUTPUT_DIR, f"workflow_{workflow_id}.py")
    with open(dag_file_path, "w") as f:
        f.write(dag_content)

    logger.info(f"Generated DAG file: {dag_file_path}")
    return dag_file_path

def create_dag(db: Session, workflow_id: int) -> str:
    """
    Main function to create a Dagster DAG for a workflow.

    Args:
        db: SQLAlchemy session
        workflow_id: ID of the workflow

    Returns:
        Path to the generated DAG file
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

    Args:
        request: DagCreate model with workflow_id
        db: SQLAlchemy session

    Returns:
        Dictionary with the path to the generated DAG file
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

        # Check if dagster_home is set
        dagster_home = os.getenv("DAGSTER_HOME")
        destination_msg = ""
        if dagster_home:
            # Create symlink in Dagster home directory if needed
            # This is optional depending on your Dagster setup
            dagster_dag_dir = os.path.join(dagster_home, "dags")
            os.makedirs(dagster_dag_dir, exist_ok=True)
            symlink_path = os.path.join(dagster_dag_dir, f"workflow_{request.workflow_id}.py")

            # Remove existing symlink if it exists
            if os.path.exists(symlink_path):
                os.remove(symlink_path)

            # Create symlink
            try:
                os.symlink(os.path.abspath(dag_file_path), symlink_path)
                destination_msg = f" A symlink was created in {symlink_path}."
            except Exception as link_error:
                logger.error(f"Failed to create symlink: {str(link_error)}")
                destination_msg = f" Failed to create symlink: {str(link_error)}"

        logger.info(f"DAG created successfully for workflow {request.workflow_id}")
        return {
            "workflow_id": request.workflow_id,
            "dag_file_path": dag_file_path,
            "message": f"DAG file generated at {dag_file_path}.{destination_msg}"
        }
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create DAG: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to create DAG: {str(e)}")