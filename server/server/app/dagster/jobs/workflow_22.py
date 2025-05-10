from dagster import job, op, resource, In, Out, Field, StringSource, OpExecutionContext
import pandas as pd
import io
import json
import boto3
from botocore.config import Config
from supabase import Client
from sqlalchemy import create_engine, text
import logging

# Configure logging for extra fabulousness
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Resources
@resource(config_schema={
    "SUPABASE_URL": str,
    "SUPABASE_KEY": str,
    "S3_ACCESS_KEY_ID": str,
    "S3_SECRET_ACCESS_KEY": str,
    "S3_REGION": Field(str, is_required=False, default_value="eu-west-2"),
    "S3_ENDPOINT": Field(str, is_required=False, default_value="https://cxdfynepqojqrvfdbuaf.supabase.co/storage/v1/s3")
})
def supabase_resource(init_context):
    """Initialize Supabase client and store S3 credentials."""
    config = init_context.resource_config
    client = Client(config["SUPABASE_URL"], config["SUPABASE_KEY"])
    client._config = config  # Store config for S3 credentials
    return client

@resource(config_schema={"DATABASE_URL": str})
def db_engine_resource(init_context):
    """Initialize SQLAlchemy database engine."""
    return create_engine(init_context.resource_config["DATABASE_URL"])

# Ops
@op(
    required_resource_keys={"supabase", "db_engine"},
    config_schema={"input_file_path": str},
    out=Out(pd.DataFrame)
)
def load_input_op(context: OpExecutionContext):
    """Load CSV file from Supabase Storage via S3 protocol and return as pandas DataFrame."""
    input_file_path = context.op_config["input_file_path"]
    context.log.info(f"🔥 Loading input file: {input_file_path}")
    
    try:
        # Initialize Supabase client (for non-S3 operations)
        supabase_client = context.resources.supabase
        context.log.info(f"Supabase URL: {supabase_client.supabase_url}")
        context.log.info(f"Supabase key (first 10 chars): {supabase_client.supabase_key[:10]}...")
        
        # Get S3 credentials from resource config
        s3_access_key = supabase_client._config.get("S3_ACCESS_KEY_ID")
        s3_secret_key = supabase_client._config.get("S3_SECRET_ACCESS_KEY")
        s3_region = supabase_client._config.get("S3_REGION", "eu-west-2")
        s3_endpoint = supabase_client._config.get("S3_ENDPOINT", "https://cxdfynepqojqrvfdbuaf.supabase.co/storage/v1/s3")
        
        if not all([s3_access_key, s3_secret_key]):
            context.log.error("S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY missing in config")
            raise Exception("S3 credentials not provided")
        
        # Parse bucket and path
        parts = input_file_path.split("/", 1)
        bucket = parts[0] if len(parts) > 1 else "workflow-files"
        path = parts[1] if len(parts) > 1 else input_file_path
        context.log.info(f"Attempting to download from bucket: {bucket}, path: {path}")
        
        # Initialize S3 client
        context.log.info("🌐 Connecting to Supabase S3 storage...")
        s3_client = boto3.client(
            "s3",
            region_name=s3_region,
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            config=Config(s3={"addressing_style": "path"})
        )
        context.log.info("S3 client initialized successfully")
        
        # List objects in bucket for debugging
        context.log.info(f"📂 Listing objects in bucket: {bucket}")
        try:
            folder_prefix = "/".join(path.split("/")[:-1]) if "/" in path else ""
            context.log.info(f"Listing with prefix: {folder_prefix}")
            response = s3_client.list_objects_v2(Bucket=bucket, Prefix=folder_prefix)
            file_names = [obj["Key"] for obj in response.get("Contents", [])]
            context.log.info(f"Objects in bucket: {file_names}")
            if path not in file_names and folder_prefix + "/" + path not in file_names:
                context.log.error(f"File {path} not found in bucket {bucket}")
                raise Exception(f"File {path} not found in bucket {bucket}")
        except Exception as list_error:
            context.log.error(f"Failed to list objects in bucket: {str(list_error)}")
            context.log.warning("Skipping object list check due to error, attempting download...")
        
        # Download file from S3
        context.log.info("📥 Downloading file via S3 protocol...")
        try:
            response = s3_client.get_object(Bucket=bucket, Key=path)
            file_content = response["Body"].read()
            context.log.info(f"Download successful, received {len(file_content)} bytes")
        except Exception as download_error:
            context.log.error(f"Error downloading file via S3: {str(download_error)}")
            raise
        
        # Parse CSV content
        context.log.info("📊 Parsing CSV content...")
        buffer = io.BytesIO(file_content)
        df = pd.read_csv(buffer)
        
        context.log.info(f"Successfully loaded CSV with {len(df)} rows and {len(df.columns)} columns")
        context.log.info(f"Column names: {', '.join(df.columns.tolist())}")
        
        # Log sample data for verification
        if not df.empty:
            context.log.info(f"First row sample: {df.iloc[0].to_dict()}")
        
        return df
    except Exception as e:
        context.log.error(f"💥 Error loading input: {str(e)}")
        context.log.error(f"Error type: {type(e).__name__}")
        
        # Log error to database
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
                context.log.info("Error logged to database")
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {str(db_error)}")
        raise

@op(
    config_schema={
        "parameters": dict,
        "step_data": dict,
        "step_label": Field(StringSource, is_required=False, default_value="default_step")
    },
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict)
)
def transform_op(context: OpExecutionContext, input_df: pd.DataFrame):
    """Transform pandas DataFrame to JSON-compatible dictionary."""
    context.log.info(f"✨ Starting data transformation for step: {context.op_config['step_label']}")
    context.log.info(f"Input DataFrame has {len(input_df)} rows and {len(input_df.columns)} columns")
    
    try:
        context.log.info("Converting DataFrame to JSON format...")
        json_data = input_df.to_dict(orient="records")
        context.log.info(f"Converted DataFrame to JSON with {len(json_data)} records")
        
        if json_data:
            context.log.info(f"Sample output record: {json.dumps(json_data[0], default=str)[:200]}...")
        
        return {"data": json_data}
    except Exception as e:
        context.log.error(f"💥 Error transforming data: {str(e)}")
        context.log.error(f"Error type: {type(e).__name__}")
        raise

@op(
    required_resource_keys={"supabase"},
    config_schema={
        "workflow_id": int,
        "destination": Field(
            dict,
            description="Destination for output JSON with 'bucket' and 'path' keys"
        )
    },
    ins={"transformed_data": In(dict)}
)
def save_output_op(context: OpExecutionContext, transformed_data: dict):
    """Save transformed data as JSON to Supabase Storage via S3 protocol."""
    destination = context.op_config["destination"]
    workflow_id = context.op_config["workflow_id"]
    context.log.info(f"💾 Saving JSON data for workflow {workflow_id}")
    context.log.info(f"Destination bucket: {destination.get('bucket', 'workflow-files')}")
    context.log.info(f"Destination path: {destination.get('path', f'runs/{workflow_id}/output.json')}")
    
    try:
        supabase_client = context.resources.supabase
        bucket = destination.get("bucket", "workflow-files")
        path = destination.get("path", f"runs/{workflow_id}/output.json")
        
        # Get S3 credentials
        s3_access_key = supabase_client._config.get("S3_ACCESS_KEY_ID")
        s3_secret_key = supabase_client._config.get("S3_SECRET_ACCESS_KEY")
        s3_region = supabase_client._config.get("S3_REGION", "eu-west-2")
        s3_endpoint = supabase_client._config.get("S3_ENDPOINT", "https://cxdfynepqojqrvfdbuaf.supabase.co/storage/v1/s3")
        
        if not all([s3_access_key, s3_secret_key]):
            context.log.error("S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY missing in config")
            raise Exception("S3 credentials not provided")
        
        # Initialize S3 client
        context.log.info("🌐 Connecting to Supabase S3 storage...")
        s3_client = boto3.client(
            "s3",
            region_name=s3_region,
            endpoint_url=s3_endpoint,
            aws_access_key_id=s3_access_key,
            aws_secret_access_key=s3_secret_key,
            config=Config(s3={"addressing_style": "path"})
        )
        context.log.info("S3 client initialized successfully")
        
        # Convert dictionary to JSON string
        context.log.info("Converting data to JSON string...")
        json_content = json.dumps(transformed_data["data"], indent=2, default=str)
        content_size = len(json_content)
        context.log.info(f"JSON content prepared, size: {content_size} characters")
        
        # Upload to S3
        context.log.info(f"Starting upload to Supabase S3 storage...")
        s3_client.put_object(
            Bucket=bucket,
            Key=path,
            Body=json_content.encode('utf-8'),
            ContentType="application/json"
        )
        context.log.info(f"Successfully saved JSON to {bucket}/{path}")
    except Exception as e:
        context.log.error(f"💥 Error saving output: {str(e)}")
        context.log.error(f"Error type: {type(e).__name__}")
        raise

# Job
@job(
    name="workflow_job_22",
    resource_defs={"supabase": supabase_resource, "db_engine": db_engine_resource},
    tags={"workflow_id": "22"}
)
def workflow_job():
    """Define the Dagster workflow job."""
    input_df = load_input_op()
    transformed_data = transform_op(input_df)
    save_output_op(transformed_data)