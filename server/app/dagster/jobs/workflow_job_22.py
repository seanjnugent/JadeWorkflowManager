from dagster import job, op, resource, In, Out, Field, StringSource, OpExecutionContext
import pandas as pd
import io
import json
import boto3
from botocore.config import Config
from sqlalchemy import create_engine, text
import logging
import os
import datetime
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@resource(config_schema={
    "SUPABASE_URL": Field(str, default_value=os.getenv("SUPABASE_URL")),
    "SUPABASE_KEY": Field(str, default_value=os.getenv("SUPABASE_KEY")),
    "S3_ACCESS_KEY_ID": Field(str, default_value=os.getenv("S3_ACCESS_KEY_ID")),
    "S3_SECRET_ACCESS_KEY": Field(str, default_value=os.getenv("S3_SECRET_ACCESS_KEY")),
    "S3_REGION": Field(str, default_value=os.getenv("S3_REGION", "eu-west-2")),
    "S3_ENDPOINT": Field(str, default_value=os.getenv("S3_ENDPOINT"))
})
def supabase_resource(init_context):
    try:
        config = init_context.resource_config
        client = boto3.client(
            "s3",
            region_name=config["S3_REGION"],
            endpoint_url=config["S3_ENDPOINT"],
            aws_access_key_id=config["S3_ACCESS_KEY_ID"],
            aws_secret_access_key=config["S3_SECRET_ACCESS_KEY"],
            config=Config(s3={"addressing_style": "path"})
        )
        return client
    except Exception as e:
        init_context.log.error(f"Failed to initialize Supabase client: {str(e)}")
        raise

@resource(config_schema={
    "DATABASE_URL": Field(str, default_value=os.getenv("DATABASE_URL"))
})
def db_engine_resource(init_context):
    try:
        return create_engine(init_context.resource_config["DATABASE_URL"])
    except Exception as e:
        init_context.log.error(f"Failed to create database engine: {str(e)}")
        raise

@op(
    required_resource_keys={"supabase", "db_engine"},
    config_schema={
        "input_file_path": Field(str, description="Path to input file in format 'bucket/path'"),
        "output_file_path": Field(str, description="Path to save output in format 'bucket/path'"),
        "workflow_id": Field(int, description="ID of the workflow"),
    },
    out=Out(pd.DataFrame),
    name="load_input_22"
)
def load_input_op(context: OpExecutionContext):
    config = context.op_config
    input_file_path = config["input_file_path"]
    workflow_id = config["workflow_id"]
    context.log.info(f"Loading input file: {input_file_path} for workflow {workflow_id}")

    try:
        supabase_client = context.resources.supabase
        bucket, path = input_file_path.split("/", 1) if "/" in input_file_path else ("workflow-files", input_file_path)
        response = supabase_client.get_object(Bucket=bucket, Key=path)
        df = pd.read_csv(io.BytesIO(response["Body"].read()))
        context.log.info(f"Loaded {len(df)} rows")

        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'info', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "load_input_22",
                    "message": f"Successfully loaded {len(df)} rows"
                }
            )
            conn.commit()

        return df
    except Exception as e:
        context.log.error(f"Failed to load input: {str(e)}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'error', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "load_input_22",
                    "message": f"Error loading input: {str(e)}"
                }
            )
            conn.commit()
        raise

@op(
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict),
    config_schema={
        "parameters": Field(dict, is_required=False, default_value={}),
        "workflow_id": Field(int, description="ID of the workflow"),
        "step_label": Field(str, is_required=False, default_value="process_step")
    },
    name="process_22"
)
def process_op(context: OpExecutionContext, input_df: pd.DataFrame):
    workflow_id = context.op_config["workflow_id"]
    try:
        context.log.info(f"Processing {len(input_df)} rows for workflow {workflow_id}")
        result = {
            "data": input_df.to_dict(orient="records"),
            "metadata": {
                "workflow_id": workflow_id,
                "processed_at": datetime.datetime.now().isoformat()
            }
        }

        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'info', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "process_22",
                    "message": "Processing completed successfully"
                }
            )
            conn.commit()

        return result
    except Exception as e:
        context.log.error(f"Processing failed: {str(e)}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'error', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "process_22",
                    "message": f"Processing failed: {str(e)}"
                }
            )
            conn.commit()
        raise

@op(
    required_resource_keys={"supabase", "db_engine"},
    ins={"processed_data": In(dict)},
    config_schema={
        "output_file_path": Field(str, description="Path to save output in format 'bucket/path'"),
        "workflow_id": Field(int, description="ID of the workflow")
    },
    name="save_output_22"
)
def save_output_op(context: OpExecutionContext, processed_data: dict):
    output_file_path = context.op_config["output_file_path"]
    workflow_id = context.op_config["workflow_id"]
    context.log.info(f"Saving output to {output_file_path} for workflow {workflow_id}")

    try:
        supabase_client = context.resources.supabase
        bucket, path = output_file_path.split("/", 1) if "/" in output_file_path else ("workflow-files", output_file_path)
        json_data = json.dumps(processed_data, indent=2).encode("utf-8")
        supabase_client.put_object(
            Bucket=bucket,
            Key=path,
            Body=json_data,
            ContentType="application/json"
        )

        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                UPDATE workflow.workflow
                SET status = 'completed', last_run_at = NOW()
                WHERE id = :workflow_id
                """),
                {"workflow_id": workflow_id}
            )
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'info', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "save_output_22",
                    "message": "Successfully saved output"
                }
            )
            conn.commit()

        context.log.info("Successfully saved output")
    except Exception as e:
        context.log.error(f"Failed to save output: {str(e)}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                VALUES (:run_id, :workflow_id, :step_id, 'error', :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": "save_output_22",
                    "message": f"Failed to save output: {str(e)}"
                }
            )
            conn.commit()
        raise

@job(
    name="workflow_job_22",
    resource_defs={
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    }
)
def workflow_job_22():
    input_df = load_input_op()
    processed_data = process_op(input_df)
    save_output_op(processed_data)