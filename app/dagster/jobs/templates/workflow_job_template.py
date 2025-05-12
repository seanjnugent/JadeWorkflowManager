from dagster import job, op, resource, In, Out, Field, StringSource, OpExecutionContext
import pandas as pd
import io
import json
import boto3
from botocore.config import Config
from supabase import Client
from sqlalchemy import create_engine, text
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@resource
def supabase_resource(init_context):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    s3_access_key = os.getenv("S3_ACCESS_KEY_ID")
    s3_secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
    s3_region = os.getenv("S3_REGION", "eu-west-2")
    s3_endpoint = os.getenv("S3_ENDPOINT", "https://cxdfynepqojqrvfdbuaf.supabase.co/storage/v1/s3")
    if not all([supabase_url, supabase_key, s3_access_key, s3_secret_key]):
        raise ValueError("Missing required environment variables: SUPABASE_URL, SUPABASE_KEY, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY")
    client = Client(supabase_url, supabase_key)
    client.s3_access_key = s3_access_key
    client.s3_secret_key = s3_secret_key
    client.s3_region = s3_region
    client.s3_endpoint = s3_endpoint
    return client

@resource
def db_engine_resource(init_context):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL must be set")
    return create_engine(db_url)

@op(
    required_resource_keys=["supabase", "db_engine"],
    config_schema={"input_file_path": str},
    out=Out(pd.DataFrame)
)
def load_input_op(context: OpExecutionContext):
    input_file_path = context.op_config["input_file_path"]
    context.log.info(f"Loading input file: {input_file_path}")
    try:
        supabase_client = context.resources.supabase
        s3_access_key = supabase_client.s3_access_key
        s3_secret_key = supabase_client.s3_secret_key
        s3_region = supabase_client.s3_region
        s3_endpoint = supabase_client.s3_endpoint
        parts = input_file_path.split("/", 1)
        bucket = parts[0] if len(parts) > 1 else "workflow-files"
        path = parts[1] if len(parts) > 1 else input_file_path
        s3_client = boto3.client(
            "s3",
            region_name=s3_region,
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_key_id=s3_secret_key,
            config=Config(s3={"addressing_style": "path"})
        )
        response = s3_client.get_object(Bucket=bucket, Key=path)
        file_content = response["Body"].read()
        df = pd.read_csv(io.BytesIO(file_content))
        context.log.info(f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
        return df
    except Exception as e:
        context.log.error(f"Error loading input: {str(e)}")
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO workflow.run_log
                        (dagster_run_id, step_id, log_level, message, timestamp)
                        VALUES (:run_id, :step_id, 'error', :message, NOW())
                    '''),
                    {
                        "run_id": context.run_id,
                        "step_id": "load_input_op",
                        "message": f"Error loading input file: {str(e)}"
                    }
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {str(db_error)}")
        raise

@op(
    config_schema={"step_label": Field(StringSource, is_required=False, default_value="transform")},
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict)
)
def transform_op(context: OpExecutionContext, input_df: pd.DataFrame):
    context.log.info(f"Starting transformation for step: {context.op_config['step_label']}")
    try:
        json_data = input_df.to_dict(orient="records")
        context.log.info(f"Converted DataFrame to JSON with {len(json_data)} records")
        return {"data": json_data}
    except Exception as e:
        context.log.error(f"Error transforming data: {str(e)}")
        raise

@op(
    required_resource_keys=["supabase"],
    config_schema={"workflow_id": int, "output_file_path": str},
    ins={"transformed_data": In(dict)}
)
def save_output_op(context: OpExecutionContext, transformed_data: dict):
    workflow_id = context.op_config["workflow_id"]
    output_file_path = context.op_config["output_file_path"]
    context.log.info(f"Saving JSON data for workflow {workflow_id}")
    try:
        supabase_client = context.resources.supabase
        s3_access_key = supabase_client.s3_access_key
        s3_secret_key = supabase_client.s3_secret_key
        s3_region = supabase_client.s3_region
        s3_endpoint = supabase_client.s3_endpoint
        parts = output_file_path.split("/", 1)
        bucket = parts[0] if len(parts) > 1 else "workflow-files"
        path = parts[1] if len(parts) > 1 else output_file_path
        s3_client = boto3.client(
            "s3",
            region_name=s3_region,
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_key_id=s3_secret_key,
            config=Config(s3={"addressing_style": "path"})
        )
        json_content = json.dumps(transformed_data["data"], indent=2)
        s3_client.put_object(
            Bucket=bucket,
            Key=path,
            Body=json_content.encode('utf-8'),
            ContentType="application/json"
        )
        context.log.info(f"Successfully saved JSON to {bucket}/{path}")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    UPDATE workflow.run
                    SET output_file_path = :output_file_path,
                        status = 'completed',
                        finished_at = NOW()
                    WHERE id = :run_id
                '''),
                {"run_id": context.run_id, "output_file_path": output_file_path}
            )
            conn.commit()
    except Exception as e:
        context.log.error(f"Error saving output: {str(e)}")
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
                    {"run_id": context.run_id, "error_message": str(e)}
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to update run status: {str(db_error)}")
        raise

@job(
    name="workflow_job_{workflow_id}_{uuid}",
    resource_defs={"supabase": supabase_resource, "db_engine": db_engine_resource},
    tags={"workflow_id": "{workflow_id}"}
)
def workflow_job():
    input_df = load_input_op()
    transformed_data = transform_op(input_df)
    save_output_op(transformed_data)