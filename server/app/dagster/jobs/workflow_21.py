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
    file_content = supabase_client.storage.from_(bucket).download(input_file_path)
    df = pd.read_csv(io.BytesIO(file_content))
    context.log.info(f"Loaded input file: {input_file_path}")
    return df

@op(
    config_schema={
        "parameters": dict,
        "step_label": Field(StringSource, is_required=False, default_value="default_step")
    },
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict)
)
def transform_op(context, input_df: pd.DataFrame):
    parameters = context.op_config["parameters"]
    step_label = context.op_config["step_label"]
    step_data = {
        "label": step_label,
        "id": context.run_id
    }
    # Your transformation logic
    code = '''# Your transformation code here'''
    local_vars = {"pd": pd, "json": json}
    exec(code, local_vars)
    transform_func = local_vars.get("csv_to_json_transformation")
    if not transform_func:
        raise ValueError("Transformation function not found")
    result = transform_func(parameters, step_data["id"])
    # Database logging
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                INSERT INTO workflow.run_log 
                (run_id, step_id, log_level, message, timestamp)
                VALUES (:run_id, :step_id, :log_level, :message, NOW())
            '''),
            {
                "run_id": context.run_id,
                "step_id": step_data["id"],
                "log_level": "info",
                "message": f"Step {step_data['label']} executed"
            }
        )
        conn.commit()
    return result

@op(config_schema={"workflow_id": int, "destination": dict}, ins={"input_data": In(dict)})
def save_output_op(context, input_data: dict):
    workflow_id = context.op_config["workflow_id"]
    destination = context.op_config["destination"]
    if "error" in input_data:
        raise ValueError(input_data["error"])
    df = pd.DataFrame(input_data["data"])
    output_path = destination.get("file_path") or \
        f"workflow-files/output/{workflow_id}_{uuid.uuid4()}.csv"
    # Upload to Supabase storage
    supabase_client = context.resources.supabase
    bucket = "workflow-files"
    csv_data = df.to_csv(index=False).encode()
    file_content = io.BytesIO(csv_data)
    supabase_client.storage.from_(bucket).upload(output_path, file_content)
    context.log.info(f"Output uploaded to Supabase: {bucket}/{output_path}")
    # Update database
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                UPDATE workflow.run 
                SET output_file_path = :output_file_path
                WHERE id = :run_id
            '''),
            {"run_id": context.run_id, "output_file_path": output_path}
        )
        conn.commit()

# Define the job
@job(
    name="workflow_job_21",
    resource_defs={
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    }
)
def workflow_job():
    raw_data = load_input_op()
    transformed_data = transform_op(raw_data)
    save_output_op(transformed_data)