# Standard library imports
import json
import base64
import uuid
import tempfile
import os
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

# Third-party imports
import requests
import pandas as pd
import boto3
from botocore.exceptions import ClientError

# FastAPI imports
from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Request, Depends

# Pydantic imports
from pydantic import BaseModel

# SQLAlchemy imports
from sqlalchemy.orm import Session
from sqlalchemy import text

# Environment
from dotenv import load_dotenv

# Local imports
from app.file_parser import parser_map
from ..get_health_check import get_db

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
S3_BUCKET = os.getenv("S3_BUCKET", "jade-files")
S3_REGION = os.getenv("S3_REGION", "eu-west-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
GITHUB_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO = f"{os.getenv('GITHUB_REPO_OWNER')}/{os.getenv('GITHUB_REPO_NAME')}"
GITHUB_DAG_PATH = "DAGs"
GITHUB_ETL_PATH = "ETL"

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=S3_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

# Enhanced Models for Multiple Inputs/Outputs
class FileStructureField(BaseModel):
    name: str
    type: str  # string, integer, float, boolean, date, datetime
    required: bool = True
    description: Optional[str] = None

class InputFileConfig(BaseModel):
    name: str  # e.g., "hearings_file", "disposals_file"
    path: str  # e.g., "jade-files/inputs/109/hearings.csv"
    format: str  # csv, json, xlsx, pdf, etc
    structure: Optional[List[FileStructureField]] = []
    required: bool = True
    description: Optional[str] = None

class OutputFileConfig(BaseModel):
    name: str  # e.g., "processed_hearings", "summary_report", "receipt"
    format: str  # csv, json, xlsx, pdf
    path: str  # output path template
    description: Optional[str] = None
    include_receipt: Optional[bool] = False  # for JSON receipt outputs

class ParameterOption(BaseModel):
    label: str
    value: str

class Parameter(BaseModel):
    name: str
    type: str
    description: Optional[str] = None
    mandatory: Optional[bool] = False
    options: Optional[List[ParameterOption]] = []

class ParameterSection(BaseModel):
    name: str
    parameters: List[Parameter]

class SourceConfig(BaseModel):
    endpoint: Optional[str] = None
    authToken: Optional[str] = None
    method: Optional[str] = "GET"
    headers: Optional[Dict[str, str]] = {}
    supportedTypes: Optional[List[str]] = ["csv", "xlsx", "json", "pdf"]
    connectionId: Optional[str] = None
    query: Optional[str] = None
    schema: Optional[str] = None
    tableName: Optional[str] = None

class CsvConfig(BaseModel):
    filename: Optional[str] = "output.csv"
    path: Optional[str] = "outputs/"
    delimiter: Optional[str] = ","
    includeHeaders: Optional[bool] = True

class JsonConfig(BaseModel):
    filename: Optional[str] = "output.json"
    path: Optional[str] = "outputs/"
    pretty_print: Optional[bool] = True

class ApiConfig(BaseModel):
    endpoint: Optional[str] = ""
    authToken: Optional[str] = ""
    method: Optional[str] = "POST"
    headers: Optional[Dict[str, str]] = {}

class DatabaseConfig(BaseModel):
    connectionId: Optional[str] = ""
    schema: Optional[str] = ""
    tableName: Optional[str] = ""
    createIfNotExists: Optional[bool] = False

class DestinationConfig(BaseModel):
    csv: Optional[CsvConfig] = None
    json: Optional[JsonConfig] = None
    api: Optional[ApiConfig] = None
    database: Optional[DatabaseConfig] = None
    
    class Config:
        extra = "allow"

class Destination(BaseModel):
    id: int
    name: str
    type: str  # csv, json, api, database, receipt
    config: DestinationConfig
    description: Optional[str] = None
    is_receipt: Optional[bool] = False  # Mark receipt outputs

class AggregationConfig(BaseModel):
    groupBy: Optional[List[str]] = []
    aggregations: Optional[List[Dict[str, str]]] = []

class FilteringConfig(BaseModel):
    conditions: Optional[List[Dict[str, str]]] = []

class TransformationConfig(BaseModel):
    operations: Optional[List[Dict[str, Any]]] = []

class ETLConfig(BaseModel):
    processingType: str  # 'custom', 'aggregation', 'filtering', 'transformation'
    customLogic: Optional[str] = ""
    aggregationConfig: Optional[AggregationConfig] = AggregationConfig()
    filteringConfig: Optional[FilteringConfig] = FilteringConfig()
    transformationConfig: Optional[TransformationConfig] = TransformationConfig()
    githubPath: Optional[str] = ""
    functionName: Optional[str] = "process_data"

class FullWorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    created_by: int
    status: Optional[str] = "Draft"
    source_type: str = "file"  # 'file', 'api', 'database'
    source_config: Optional[SourceConfig] = None
    input_files: Optional[List[InputFileConfig]] = []  # Multiple input files
    parameters: Optional[List[ParameterSection]] = []
    destinations: Optional[List[Destination]] = []
    etl_config: ETLConfig
    include_receipt: Optional[bool] = True  # Auto-add receipt output

router = APIRouter(prefix="/workflows", tags=["workflows"])

def generate_etl_processing_code(etl_config: ETLConfig) -> str:
    """Generate ETL processing code based on configuration"""
    
    if etl_config.processingType == 'custom':
        if etl_config.customLogic:
            return etl_config.customLogic
        else:
            return """
        # Custom ETL logic placeholder - replace with actual logic
        processed_df = df.copy()
        
        # Example: Basic data cleaning
        processed_df = processed_df.dropna()
        
        # Use parameters if provided
        if parameters:
            pass  # Add parameter-based processing
            """
    
    elif etl_config.processingType == 'aggregation':
        code = """
        # Aggregation processing
        processed_df = df.copy()
        """
        
        if etl_config.aggregationConfig and etl_config.aggregationConfig.groupBy:
            group_cols = etl_config.aggregationConfig.groupBy
            aggregations = etl_config.aggregationConfig.aggregations or []
            
            code += f"""
        # Group by specified columns
        group_cols = {group_cols}
        agg_dict = {{"""
            
            for agg in aggregations:
                if agg.get('column') and agg.get('function'):
                    code += f"""
            '{agg['column']}': '{agg['function']}',"""
            
            code += """
        }
        processed_df = processed_df.groupby(group_cols).agg(agg_dict).reset_index()
        """
        
        return code
    
    elif etl_config.processingType == 'filtering':
        code = """
        # Filtering processing
        processed_df = df.copy()
        """
        
        if etl_config.filteringConfig and etl_config.filteringConfig.conditions:
            for i, condition in enumerate(etl_config.filteringConfig.conditions):
                if condition.get('column') and condition.get('operator') and condition.get('value') is not None:
                    operator_map = {
                        'eq': '==', 'ne': '!=', 'gt': '>', 'gte': '>=', 
                        'lt': '<', 'lte': '<=', 'contains': '.str.contains',
                        'startswith': '.str.startswith', 'endswith': '.str.endswith'
                    }
                    
                    op = operator_map.get(condition['operator'], '==')
                    value = condition['value']
                    
                    if op in ['.str.contains', '.str.startswith', '.str.endswith']:
                        code += f"""
        processed_df = processed_df[processed_df['{condition['column']}'{op}('{value}')]"""
                    else:
                        if isinstance(value, str) and not value.isdigit():
                            code += f"""
        processed_df = processed_df[processed_df['{condition['column']}'] {op} '{value}']"""
                        else:
                            code += f"""
        processed_df = processed_df[processed_df['{condition['column']}'] {op} {value}]"""
        
        return code
    
    elif etl_config.processingType == 'transformation':
        code = """
        # Transformation processing
        processed_df = df.copy()
        """
        
        if etl_config.transformationConfig and etl_config.transformationConfig.operations:
            for operation in etl_config.transformationConfig.operations:
                op_type = operation.get('type')
                config = operation.get('config', {})
                
                if op_type == 'add_column' and config.get('columnName') and config.get('expression'):
                    code += f"""
        processed_df['{config['columnName']}'] = {config['expression']}"""
                elif op_type == 'rename_column' and config.get('oldName') and config.get('newName'):
                    code += f"""
        processed_df = processed_df.rename(columns={{'{config['oldName']}': '{config['newName']}'}})"""
                elif op_type == 'drop_column' and config.get('columnName'):
                    code += f"""
        processed_df = processed_df.drop(columns=['{config['columnName']}'])"""
                elif op_type == 'fill_na' and config.get('columnName') and config.get('fillValue'):
                    code += f"""
        processed_df['{config['columnName']}'] = processed_df['{config['columnName']}'].fillna({config['fillValue']})"""
        
        return code
    
    return """
        # Default processing
        processed_df = df.copy()
        """

def generate_enhanced_dag_template(workflow: FullWorkflowCreate, workflow_id: int) -> str:
    """Generate a complete Dagster DAG template with ETL scaffolding"""
    
    safe_name = workflow.name.lower().replace(' ', '_').replace('-', '_')
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
    
    # Generate ETL processing code
    etl_processing_code = generate_etl_processing_code(workflow.etl_config)
    
    # Determine imports based on configuration
    imports = [
        "from dagster import job, op, Field, String, Int, Float, Bool, resource, Out, In",
        "import pandas as pd",
        "import tempfile",
        "import os",
        "import json",
        "import logging",
        "from datetime import datetime",
        "from pathlib import Path",
        "from typing import Dict, Any, List",
        "import boto3",
        "from botocore.exceptions import ClientError"
    ]
    
    if workflow.source_type == "api" or any(dest.type == "api" for dest in workflow.destinations):
        imports.append("import requests")
    
    if any(dest.type == "database" for dest in workflow.destinations):
        imports.append("import sqlalchemy")
        imports.append("from sqlalchemy import create_engine, text")
    
    # Resource definitions
    resources_code = '''
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- S3 Resource (Standard) ---
@resource(
    config_schema={
        "S3_ACCESS_KEY_ID": Field(String),
        "S3_SECRET_ACCESS_KEY": Field(String),
        "S3_REGION": Field(String, default_value="eu-west-2"),
        "S3_ENDPOINT": Field(String, is_required=False),
        "S3_BUCKET": Field(String, default_value="jade-files"),
    }
)
def s3_resource(init_context):
    """S3 resource returning client directly"""
    config = init_context.resource_config
    client_kwargs = {
        'aws_access_key_id': config['S3_ACCESS_KEY_ID'],
        'aws_secret_access_key': config['S3_SECRET_ACCESS_KEY'],
        'region_name': config['S3_REGION']
    }
    
    if config.get('S3_ENDPOINT'):
        client_kwargs['endpoint_url'] = config['S3_ENDPOINT']
    
    try:
        client = boto3.client('s3', **client_kwargs)
        client.list_buckets()  # Test connection
        return client
    except ClientError as e:
        init_context.log.error(f"S3 connection failed: {str(e)}")
        raise
'''

    # Base configuration schema
    base_config_schema = """{
        "workflow_id": Field(Int, description="Workflow identifier"),
        "created_at": Field(String, is_required=False, description="Timestamp for consistent file naming"),
        "parameters": Field(dict, default_value={}, description="Workflow parameters")
    }"""

    # Generate load operation based on source type
    if workflow.source_type == "file":
        load_op = f'''
# --- Operation 1: Load Input ---
@op(
    out=Out(pd.DataFrame),
    required_resource_keys={{"s3"}},
    config_schema={{
        **{base_config_schema},
        "input_path": Field(String, is_required=False, description="S3 input path"),
        "bucket": Field(String, default_value="jade-files")
    }}
)
def _1_load_input_{workflow_id}(context) -> pd.DataFrame:
    """Load input file from S3"""
    config = context.op_config
    s3 = context.resources.s3
    bucket = config.get("bucket", "jade-files")
    created_at = config.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S"))
    workflow_id = config["workflow_id"]
    
    # Dynamic input path construction
    input_path = config.get("input_path", f"workflow-files/runs/{{workflow_id}}/")
    if "/" in input_path and not input_path.startswith("s3://"):
        key = input_path
    elif input_path.startswith(f"s3://{{bucket}}/"):
        key = input_path[len(f"s3://{{bucket}}/"):]
    else:
        key = input_path
    
    context.log.info(f"Loading from s3://{{bucket}}/{{key}} with created_at: {{created_at}}")
    
    try:
        obj = s3.get_object(Bucket=bucket, Key=key)
        
        # Determine file type and load accordingly
        if key.endswith('.csv'):
            df = pd.read_csv(obj["Body"])
        elif key.endswith('.xlsx'):
            df = pd.read_excel(obj["Body"])
        elif key.endswith('.json'):
            df = pd.read_json(obj["Body"])
        else:
            # Default to CSV
            df = pd.read_csv(obj["Body"])
        
        context.log.info(f"Loaded {{len(df)}} rows, {{len(df.columns)}} columns")
        return df
    except ClientError as e:
        context.log.error(f"Failed to load from s3://{{bucket}}/{{key}}: {{str(e)}}")
        raise
    except Exception as e:
        context.log.error(f"Error processing file: {{str(e)}}")
        raise
'''
    elif workflow.source_type == "api":
        source_config = workflow.source_config or SourceConfig()
        load_op = f'''
# --- Operation 1: Load Input from API ---
@op(
    out=Out(pd.DataFrame),
    config_schema={{
        **{base_config_schema},
        "api_endpoint": Field(String, default_value="{source_config.endpoint or ''}"),
        "auth_token": Field(String, is_required=False),
        "method": Field(String, default_value="{source_config.method}")
    }}
)
def _1_load_input_{workflow_id}(context) -> pd.DataFrame:
    """Load data from API endpoint"""
    config = context.op_config
    endpoint = config["api_endpoint"]
    auth_token = config.get("auth_token")
    method = config.get("method", "GET")
    created_at = config.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S"))
    
    context.log.info(f"Loading data from API: {{endpoint}} with created_at: {{created_at}}")
    
    try:
        headers = {{"Content-Type": "application/json"}}
        if auth_token:
            headers["Authorization"] = f"Bearer {{auth_token}}"
        
        if method.upper() == "GET":
            response = requests.get(endpoint, headers=headers)
        elif method.upper() == "POST":
            response = requests.post(endpoint, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {{method}}")
        
        response.raise_for_status()
        data = response.json()
        
        # Convert to DataFrame
        if isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            raise ValueError("API response must be JSON array or object")
        
        context.log.info(f"Loaded {{len(df)}} rows from API")
        return df
        
    except Exception as e:
        context.log.error(f"Failed to load data from API: {{str(e)}}")
        raise
'''
    else:
        load_op = f'''
# --- Operation 1: Load Input (Placeholder) ---
@op(
    out=Out(pd.DataFrame),
    config_schema={base_config_schema}
)
def _1_load_input_{workflow_id}(context) -> pd.DataFrame:
    """Placeholder for data loading"""
    context.log.info("Data loading not configured - using empty DataFrame")
    return pd.DataFrame()
'''

    # Generate ETL processing operation with the custom logic
    process_op = f'''
# --- Operation 2: Process Data with ETL Logic ---
@op(
    out=Out(Dict[str, Any]),
    config_schema={base_config_schema}
)
def _2_process_data_{workflow_id}(context, df: pd.DataFrame) -> Dict[str, Any]:
    """Process the input data with configured ETL logic"""
    config = context.op_config
    workflow_id = config["workflow_id"]
    created_at = config.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S"))
    parameters = config.get("parameters", {{}})
    
    context.log.info(f"Processing {{len(df)}} rows with created_at: {{created_at}}")
    
    try:
        # ETL PROCESSING LOGIC - START
        {etl_processing_code.strip()}
        # ETL PROCESSING LOGIC - END
        
        # Create processing receipt
        receipt = {{
            "workflow_id": workflow_id,
            "created_at": created_at,
            "input_rows": len(df),
            "output_rows": len(processed_df),
            "input_columns": list(df.columns),
            "output_columns": list(processed_df.columns),
            "processing_timestamp": datetime.now().isoformat(),
            "processing_type": "{workflow.etl_config.processingType}",
            "parameters_used": parameters,
            "status": "completed"
        }}
        
        context.log.info(f"Processing complete: {{len(df)}} → {{len(processed_df)}} rows")
        
        return {{
            "processed_data": processed_df,
            "receipt": receipt,
            "workflow_id": workflow_id,
            "created_at": created_at
        }}
        
    except Exception as e:
        context.log.error(f"Data processing failed: {{str(e)}}")
        raise
'''

    # Generate save operations for each destination
    save_ops = []
    for i, dest in enumerate(workflow.destinations):
        if dest.type == "csv":
            save_ops.append(f'''
# --- Operation 3.{i+1}: Save to CSV ---
@op(
    out=Out(Dict[str, Any]),
    required_resource_keys={{"s3"}},
    config_schema={{
        **{base_config_schema},
        "output_path": Field(String, default_value="{dest.config.path or 'outputs/'}{dest.config.filename or dest.name}.csv"),
        "delimiter": Field(String, default_value="{dest.config.delimiter or ','}"),
        "include_headers": Field(Bool, default_value={str(dest.config.includeHeaders).lower()}),
        "bucket": Field(String, default_value="jade-files")
    }}
)
def _3_{i+1}_save_csv_{dest.name}_{workflow_id}(context, processed_result: Dict[str, Any]) -> Dict[str, Any]:
    """Save processed data as CSV file"""
    config = context.op_config
    s3 = context.resources.s3
    bucket = config.get("bucket", "jade-files")
    
    df = processed_result["processed_data"]
    workflow_id = config["workflow_id"]
    created_at = config.get("created_at", processed_result.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S")))
    
    # Handle output path with template variables
    output_path = config.get("output_path", "{dest.config.path or 'outputs/'}{dest.name}_output_{{created_at}}.csv")
    output_path = output_path.format(
        workflow_id=workflow_id,
        created_at=created_at,
        output_name="{dest.name}"
    )
    
    if output_path.startswith(f"{{bucket}}/"):
        output_key = output_path[len(bucket)+1:]
    elif "/" in output_path and not output_path.startswith("s3://"):
        output_key = output_path
    else:
        output_key = f"outputs/{{output_path}}"
    
    context.log.info(f"Saving CSV to s3://{{bucket}}/{{output_key}}")
    
    try:
        # Create CSV content
        csv_buffer = df.to_csv(
            index=False,
            sep=config.get("delimiter", ","),
            header=config.get("include_headers", True)
        )
        
        # Upload to S3
        s3.put_object(
            Bucket=bucket,
            Key=output_key,
            Body=csv_buffer.encode(),
            ContentType="text/csv"
        )
        
        context.log.info(f"Successfully saved {{len(df)}} rows to s3://{{bucket}}/{{output_key}}")
        
        return {{
            "output_path": f"s3://{{bucket}}/{{output_key}}",
            "rows_saved": len(df),
            "format": "csv",
            "destination_name": "{dest.name}",
            "created_at": created_at
        }}
        
    except Exception as e:
        context.log.error(f"Failed to save CSV: {{str(e)}}")
        raise
''')
        elif dest.type == "api":
            save_ops.append(f'''
# --- Operation 3.{i+1}: Save to API ---
@op(
    out=Out(Dict[str, Any]),
    config_schema={{
        **{base_config_schema},
        "api_endpoint": Field(String, default_value="{dest.config.endpoint or ''}"),
        "auth_token": Field(String, is_required=False),
        "method": Field(String, default_value="{dest.config.method or 'POST'}")
    }}
)
def _3_{i+1}_save_api_{dest.name}_{workflow_id}(context, processed_result: Dict[str, Any]) -> Dict[str, Any]:
    """Save processed data to API endpoint"""
    config = context.op_config
    df = processed_result["processed_data"]
    workflow_id = config["workflow_id"]
    created_at = config.get("created_at", processed_result.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S")))
    
    endpoint = config["api_endpoint"]
    auth_token = config.get("auth_token")
    method = config.get("method", "POST")
    
    context.log.info(f"Sending {{len(df)}} rows to API: {{endpoint}}")
    
    try:
        headers = {{"Content-Type": "application/json"}}
        if auth_token:
            headers["Authorization"] = f"Bearer {{auth_token}}"
        
        # Convert DataFrame to JSON
        data = df.to_dict(orient="records")
        
        if method.upper() == "POST":
            response = requests.post(endpoint, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(endpoint, json=data, headers=headers)
        elif method.upper() == "PATCH":
            response = requests.patch(endpoint, json=data, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {{method}}")
        
        response.raise_for_status()
        
        context.log.info(f"Successfully sent {{len(df)}} rows to API")
        
        return {{
            "output_path": endpoint,
            "rows_saved": len(df),
            "format": "api",
            "destination_name": "{dest.name}",
            "response_status": response.status_code,
            "created_at": created_at
        }}
        
    except Exception as e:
        context.log.error(f"Failed to save to API: {{str(e)}}")
        raise
''')

    # Generate save receipt operation
    receipt_op = f'''
# --- Operation 4: Save Processing Receipt ---
@op(
    out=Out(Dict[str, Any]),
    required_resource_keys={{"s3"}},
    config_schema={{
        **{base_config_schema},
        "receipt_path": Field(String, default_value="receipts/"),
        "bucket": Field(String, default_value="jade-files")
    }}
)
def _4_save_receipt_{workflow_id}(context, processed_result: Dict[str, Any], *save_results) -> Dict[str, Any]:
    """Save processing receipt to S3"""
    config = context.op_config
    s3 = context.resources.s3
    bucket = config.get("bucket", "jade-files")
    
    receipt = processed_result["receipt"]
    workflow_id = config["workflow_id"]
    created_at = config.get("created_at", processed_result.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S")))
    
    # Add output information to receipt
    receipt["outputs"] = []
    for save_result in save_results:
        if save_result:
            receipt["outputs"].append(save_result)
    
    # Construct receipt path
    receipt_path = config.get("receipt_path", "receipts/")
    receipt_key = f"{{receipt_path}}{{workflow_id}}_receipt_{{created_at}}.json"
    
    context.log.info(f"Saving receipt to s3://{{bucket}}/{{receipt_key}}")
    
    try:
        # Save receipt as JSON
        s3.put_object(
            Bucket=bucket,
            Key=receipt_key,
            Body=json.dumps(receipt, indent=2).encode(),
            ContentType="application/json"
        )
        
        context.log.info(f"Successfully saved processing receipt")
        
        return {{
            "receipt_path": f"s3://{{bucket}}/{{receipt_key}}",
            "workflow_id": workflow_id,
            "created_at": created_at,
            "all_outputs": receipt["outputs"]
        }}
        
    except Exception as e:
        context.log.error(f"Failed to save receipt: {{str(e)}}")
        raise
'''

    # Generate job definition
    job_name = f"workflow_job_{workflow_id}"
    
    # Build op calls for the job
    op_calls = [
        f"    input_data = _1_load_input_{workflow_id}()",
        f"    processed_result = _2_process_data_{workflow_id}(input_data)"
    ]
    
    save_op_calls = []
    for i, dest in enumerate(workflow.destinations):
        if dest.type == "csv":
            save_op_calls.append(f"    save_result_{i} = _3_{i+1}_save_csv_{dest.name}_{workflow_id}(processed_result)")
        elif dest.type == "api":
            save_op_calls.append(f"    save_result_{i} = _3_{i+1}_save_api_{dest.name}_{workflow_id}(processed_result)")
    
    op_calls.extend(save_op_calls)
    
    # Add receipt operation call with all save results
    save_results_args = ", ".join([f"save_result_{i}" for i in range(len(workflow.destinations))])
    op_calls.append(f"    _4_save_receipt_{workflow_id}(processed_result, {save_results_args})")

    # Generate config template
    config_template = {
        "ops": {
            f"_1_load_input_{workflow_id}": {
                "config": {
                    "workflow_id": "{workflow_id}",
                    "created_at": "{created_at}",
                    "input_path": "{input_file_path}",
                    "bucket": "jade-files",
                    "parameters": "{parameters}"
                }
            },
            f"_2_process_data_{workflow_id}": {
                "config": {
                    "workflow_id": "{workflow_id}",
                    "created_at": "{created_at}",
                    "parameters": "{parameters}"
                }
            },
            f"_4_save_receipt_{workflow_id}": {
                "config": {
                    "workflow_id": "{workflow_id}",
                    "created_at": "{created_at}",
                    "receipt_path": "receipts/",
                    "bucket": "jade-files"
                }
            }
        },
        "resources": {
            "s3": {
                "config": {
                    "S3_ACCESS_KEY_ID": {"env": "S3_ACCESS_KEY_ID"},
                    "S3_SECRET_ACCESS_KEY": {"env": "S3_SECRET_ACCESS_KEY"},
                    "S3_REGION": S3_REGION,
                    "S3_BUCKET": S3_BUCKET
                }
            }
        }
    }
    
    # Add destination configs
    for i, dest in enumerate(workflow.destinations):
        if dest.type == "csv":
            # Handle nested CSV config
            csv_config = dest.config.csv if dest.config.csv else CsvConfig()
            config_template["ops"][f"_3_{i+1}_save_csv_{dest.name}_{workflow_id}"] = {
                "config": {
                    "workflow_id": "{workflow_id}",
                    "created_at": "{created_at}",
                    "output_path": f"{csv_config.path}{dest.name}_output_{{created_at}}.csv",
                    "delimiter": csv_config.delimiter,
                    "include_headers": csv_config.includeHeaders,
                    "bucket": "jade-files"
                }
            }
        elif dest.type == "api":
            # Handle nested API config
            api_config = dest.config.api if dest.config.api else ApiConfig()
            config_template["ops"][f"_3_{i+1}_save_api_{dest.name}_{workflow_id}"] = {
                "config": {
                    "workflow_id": "{workflow_id}",
                    "created_at": "{created_at}",
                    "api_endpoint": api_config.endpoint,
                    "auth_token": api_config.authToken,
                    "method": api_config.method
                }
            }

    job_definition = f'''
# --- Job Definition ---
@job(
    resource_defs={{
        "s3": s3_resource
    }},
    description="{workflow.description or f'Auto-generated workflow job for {workflow.name}'}",
    tags={{"dagster/max_retries": 3, "workflow_type": "{workflow.etl_config.processingType}"}}
)
def {job_name}():
    """{workflow.description or f'Generated workflow job for {workflow.name}'}"""
{chr(10).join(op_calls)}
'''

    # Combine all parts
    dag_content = '\n'.join(imports) + '\n\n' + resources_code + '\n'
    dag_content += load_op + '\n' + process_op + '\n'
    for save_op in save_ops:
        dag_content += save_op + '\n'
    dag_content += receipt_op + '\n' + job_definition
    
    return dag_content, config_template

def create_github_dag_with_etl_placeholder(workflow: FullWorkflowCreate, workflow_id: int) -> dict:
    """Create a DAG in GitHub with ETL placeholder for later updates"""
    safe_name = workflow.name.lower().replace(' ', '_').replace('-', '_')
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
    
    dag_filename = f"workflow_{safe_name}_{workflow_id}.py"
    dag_path = f"{GITHUB_DAG_PATH}/{dag_filename}"
    github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{dag_path}"
    
    # Generate DAG content with ETL scaffolding
    dag_content, config_template = generate_enhanced_dag_template(workflow, workflow_id)
    
    encoded_content = base64.b64encode(dag_content.encode()).decode()
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
    }
    payload = {
        "message": f"Create enhanced DAG scaffold for workflow {workflow_id}: {workflow.name}",
        "content": encoded_content,
        "branch": "main"
    }
    
    try:
        response = requests.put(github_url, headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        logger.info(f"Created DAG scaffold at {dag_path}")
        
        # If custom ETL logic should be in separate file, create ETL placeholder
        etl_path = None
        if workflow.etl_config.githubPath:
            etl_path = create_etl_placeholder_file(workflow, workflow_id)
        
        return {
            "dag_path": f"https://github.com/{GITHUB_REPO}/blob/main/{dag_path}",
            "commit_sha": response_data.get("commit", {}).get("sha"),
            "filename": dag_filename,
            "config_template": config_template,
            "etl_path": etl_path
        }
    except requests.RequestException as e:
        logger.error(f"Failed to create DAG in GitHub: {str(e)}")
        raise HTTPException(500, f"Failed to create DAG in GitHub: {str(e)}")

def create_etl_placeholder_file(workflow: FullWorkflowCreate, workflow_id: int) -> str:
    """Create a separate ETL file placeholder in GitHub"""
    if not workflow.etl_config.githubPath:
        return None
    
    etl_path = f"{GITHUB_ETL_PATH}/{workflow.etl_config.githubPath}"
    github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{etl_path}"
    
    # Create ETL template content
    etl_content = f'''"""
ETL Processing Module for Workflow: {workflow.name}
Workflow ID: {workflow_id}
Generated: {datetime.now().isoformat()}
"""

import pandas as pd
from typing import Dict, Any, Optional

def {workflow.etl_config.functionName}(df: pd.DataFrame, parameters: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """
    Custom ETL processing function for {workflow.name}
    
    Args:
        df (pd.DataFrame): Input dataframe
        parameters (dict): Processing parameters from workflow configuration
    
    Returns:
        pd.DataFrame: Processed dataframe
    
    Processing Type: {workflow.etl_config.processingType}
    """
    
    # TODO: Implement your custom ETL logic here
    processed_df = df.copy()
    
    # Example: Basic data cleaning
    processed_df = processed_df.dropna()
    
    # Example: Use parameters if provided
    if parameters:
        # Add parameter-based processing logic
        pass
    
    # TODO: Add your specific transformations here
    
    return processed_df

# Additional helper functions can be added here
'''
    
    encoded_content = base64.b64encode(etl_content.encode()).decode()
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
    }
    payload = {
        "message": f"Create ETL placeholder for workflow {workflow_id}: {workflow.name}",
        "content": encoded_content,
        "branch": "main"
    }
    
    try:
        response = requests.put(github_url, headers=headers, json=payload)
        response.raise_for_status()
        logger.info(f"Created ETL placeholder at {etl_path}")
        return f"https://github.com/{GITHUB_REPO}/blob/main/{etl_path}"
    except requests.RequestException as e:
        logger.warning(f"Failed to create ETL placeholder: {str(e)}")
        return None

@router.post("/workflow/create-full")
async def create_full_workflow_with_dag(
    workflow: FullWorkflowCreate,
    db: Session = Depends(get_db)
):
    """Create a complete workflow with auto-generated DAG scaffold"""
    try:
        logger.info(f"Creating full workflow with DAG scaffold: {workflow.name}")
        
        # First, insert workflow into database to get the actual ID
        try:
            # Prepare input file configurations
            input_file_configs = []
            if workflow.source_type == "file" and workflow.input_files:
                for input_file in workflow.input_files:
                    input_file_configs.append({
                        "name": input_file.name,
                        "path": input_file.path,
                        "format": input_file.format,
                        "structure": [field.dict() for field in input_file.structure] if input_file.structure else [],
                        "required": input_file.required,
                        "description": input_file.description,
                        "supported_types": workflow.source_config.supportedTypes if workflow.source_config else ["csv", "xlsx", "json", "pdf"]
                    })
            elif workflow.source_type == "file":
                # Fallback for single file workflows
                input_file_configs.append({
                    "name": "input_file",
                    "path": "workflow-files/runs/{workflow_id}/",
                    "format": "dynamic",
                    "structure": [],
                    "required": True,
                    "description": "Primary input file",
                    "supported_types": workflow.source_config.supportedTypes if workflow.source_config else ["csv", "xlsx", "json"]
                })
            
            # Prepare output file configurations
            output_file_configs = []
            
            # Add configured destinations
            for dest in workflow.destinations:
                if dest.type == 'csv':
                    csv_config = dest.config.csv if dest.config.csv else CsvConfig()
                    output_path = f"{csv_config.path}{dest.name}_output_{{created_at}}.csv"
                elif dest.type == 'json':
                    json_config = dest.config.json if dest.config.json else JsonConfig()
                    output_path = f"{json_config.path}{dest.name}_output_{{created_at}}.json"
                elif dest.type == 'api':
                    output_path = f"api/{dest.name}_{{created_at}}.json"
                else:
                    output_path = f"outputs/{dest.name}_output_{{created_at}}.{dest.type}"
                
                output_file_configs.append({
                    "name": dest.name,
                    "format": dest.type,
                    "path": output_path,
                    "description": getattr(dest, 'description', f"Output file for {dest.name}"),
                    "is_receipt": getattr(dest, 'is_receipt', False)
                })
            
            # Auto-add receipt file if requested
            if workflow.include_receipt:
                receipt_exists = any(dest.get('is_receipt', False) or dest.get('name') == 'receipt' for dest in output_file_configs)
                if not receipt_exists:
                    output_file_configs.append({
                        "name": "processing_receipt",
                        "format": "json",
                        "path": "receipts/{workflow_id}_receipt_{created_at}.json",
                        "description": "Processing receipt and metadata",
                        "is_receipt": True
                    })
            
            # Insert workflow record first (let database generate the ID)
            result = db.execute(
                text("""
                    INSERT INTO workflow.workflow (
                        name, description, created_by, status, destination,
                        dag_path, config_template, default_parameters,
                        resources_config, dagster_location_name, dagster_repository_name,
                        requires_file, supported_file_types, input_file_path, output_file_paths,
                        etl_config, source_type, source_config, parameters,
                        created_at, updated_at
                    ) VALUES (
                        :name, :description, :created_by, :status, :destination,
                        '', '{}', '{}',
                        :resources_config, :dagster_location_name, :dagster_repository_name,
                        :requires_file, :supported_file_types, :input_file_path, :output_file_paths,
                        :etl_config, :source_type, :source_config, :parameters,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    RETURNING id, name, description, status
                """),
                {
                    "name": workflow.name,
                    "description": workflow.description,
                    "created_by": workflow.created_by,
                    "status": workflow.status,
                    "destination": workflow.destinations[0].type if workflow.destinations else "csv",
                    "resources_config": json.dumps({
                        "s3": {
                            "config": {
                                "S3_BUCKET": {"env": "S3_BUCKET"},
                                "S3_REGION": S3_REGION,
                                "S3_ENDPOINT": {"env": "S3_ENDPOINT"},
                                "S3_ACCESS_KEY_ID": {"env": "S3_ACCESS_KEY_ID"},
                                "S3_SECRET_ACCESS_KEY": {"env": "S3_SECRET_ACCESS_KEY"}
                            }
                        }
                    }),
                    "dagster_location_name": "server.app.dagster.repo",
                    "dagster_repository_name": "__repository__",
                    "requires_file": workflow.source_type == "file",
                    "supported_file_types": json.dumps(workflow.source_config.supportedTypes if workflow.source_config else ["csv", "xlsx", "json", "pdf"]),
                    "input_file_path": json.dumps(input_file_configs),
                    "output_file_paths": json.dumps(output_file_configs),
                    "etl_config": json.dumps(workflow.etl_config.dict()),
                    "source_type": workflow.source_type,
                    "source_config": json.dumps(workflow.source_config.dict() if workflow.source_config else {}),
                    "parameters": json.dumps([section.dict() for section in workflow.parameters])
                }
            )
            workflow_record = result.fetchone()
            actual_workflow_id = workflow_record.id

            # Insert permission record for the creator with admin access
            db.execute(
                text("""
                    INSERT INTO workflow.workflow_permission (
                        user_id, workflow_id, permission_level, created_at
                    ) VALUES (
                        :user_id, :workflow_id, :permission_level, CURRENT_TIMESTAMP
                    )
                """),
                {
                    "user_id": workflow.created_by,
                    "workflow_id": actual_workflow_id,
                    "permission_level": "admin"
                }
            )
            db.commit()
            
            logger.info(f"Workflow created in database with ID: {actual_workflow_id} and admin permission granted to user {workflow.created_by}")
            
        except Exception as db_error:
            logger.error(f"Database insertion failed: {str(db_error)}")
            db.rollback()
            raise HTTPException(500, f"Database insertion failed: {str(db_error)}")
        # Now create DAG scaffold in GitHub with the actual workflow ID
        dag_github_path = ""
        commit_sha = None
        config_template = {}
        etl_github_path = None
        dag_filename = None
        
        try:
            # Try complex DAG generation first
            try:
                dag_content, config_template = generate_enhanced_dag_template(workflow, actual_workflow_id)
                logger.info("Generated enhanced DAG template successfully")
            except Exception as complex_error:
                logger.warning(f"Enhanced DAG generation failed, using simple fallback: {str(complex_error)}")
                # Simple fallback DAG template
                dag_content = f'''from dagster import job, op, Field, String, Int, resource, Out
import pandas as pd
import tempfile
import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@op(
    config_schema={{
        "input_path": Field(String),
        "output_path": Field(String), 
        "workflow_id": Field(String),
        "parameters": Field(dict, default_value={{}})
    }}
)
def load_data_{actual_workflow_id}(context):
    """Load data for workflow {actual_workflow_id}: {workflow.name}"""
    # Placeholder for loading data
    logger.info(f"Loading data for workflow {actual_workflow_id}")
    return pd.DataFrame()

@op(
    config_schema={{
        "input_path": Field(String),
        "output_path": Field(String),
        "workflow_id": Field(String), 
        "parameters": Field(dict, default_value={{}})
    }}
)
def process_data_{actual_workflow_id}(context, input_data):
    """Process data for workflow {actual_workflow_id}: {workflow.name}"""
    # Placeholder for processing data
    logger.info(f"Processing data for workflow {actual_workflow_id}")
    # TODO: Add your custom ETL logic here
    return input_data

@op(
    config_schema={{
        "input_path": Field(String),
        "output_path": Field(String),
        "workflow_id": Field(String),
        "parameters": Field(dict, default_value={{}})
    }}
)
def save_data_{actual_workflow_id}(context, processed_data):
    """Save data for workflow {actual_workflow_id}: {workflow.name}"""
    # Placeholder for saving data
    logger.info(f"Saving data for workflow {actual_workflow_id}")
    return {{"status": "completed", "workflow_id": {actual_workflow_id}}}

@job
def workflow_job_{actual_workflow_id}():
    """Workflow job for {workflow.name}"""
    data = load_data_{actual_workflow_id}()
    processed = process_data_{actual_workflow_id}(data)
    save_data_{actual_workflow_id}(processed)
'''
                config_template = {
                    "ops": {
                        f"load_data_{actual_workflow_id}": {
                            "config": {
                                "input_path": "{input_file_path}",
                                "output_path": "{output_file_path}",
                                "workflow_id": str(actual_workflow_id),
                                "parameters": {}
                            }
                        },
                        f"process_data_{actual_workflow_id}": {
                            "config": {
                                "input_path": "{input_file_path}",
                                "output_path": "{output_file_path}",
                                "workflow_id": str(actual_workflow_id),
                                "parameters": {}
                            }
                        },
                        f"save_data_{actual_workflow_id}": {
                            "config": {
                                "input_path": "{input_file_path}",
                                "output_path": "{output_file_path}",
                                "workflow_id": str(actual_workflow_id),
                                "parameters": {}
                            }
                        }
                    }
                }
            
            safe_name = workflow.name.lower().replace(' ', '_').replace('-', '_')
            safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
            
            dag_filename = f"workflow_job_{actual_workflow_id}.py"  # Use same naming as old version
            dag_path = f"{GITHUB_DAG_PATH}/{dag_filename}"
            github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{dag_path}"
            
            # Check if GITHUB_TOKEN and GITHUB_REPO are configured
            if not GITHUB_TOKEN or not GITHUB_REPO or GITHUB_REPO == "/":
                logger.warning("GitHub integration not configured - skipping DAG creation")
                dag_github_path = f"DAG would be created at: {dag_path}"
            else:
                encoded_content = base64.b64encode(dag_content.encode()).decode()
                headers = {
                    "Authorization": f"Bearer {GITHUB_TOKEN}",
                    "Accept": "application/vnd.github+json",
                    "Content-Type": "application/json"
                }
                payload = {
                    "message": f"Create DAG for workflow {actual_workflow_id}: {workflow.name}",
                    "content": encoded_content,
                    "branch": "main"
                }
                
                logger.info(f"Creating DAG at {github_url}")
                response = requests.put(github_url, headers=headers, json=payload)
                
                if response.status_code in [200, 201]:
                    response_data = response.json()
                    dag_github_path = f"https://github.com/{GITHUB_REPO}/blob/main/{dag_path}"
                    commit_sha = response_data.get("commit", {}).get("sha")
                    logger.info(f"Created DAG scaffold at {dag_path}")
                else:
                    logger.error(f"GitHub API error: {response.status_code} - {response.text}")
                    dag_github_path = f"Failed to create DAG: {response.status_code}"
            
            # Create ETL placeholder file if specified
            if workflow.etl_config.githubPath and workflow.etl_config.githubPath.strip():
                try:
                    etl_github_path = create_etl_placeholder_file(workflow, actual_workflow_id)
                    logger.info(f"Created ETL placeholder at {etl_github_path}")
                except Exception as etl_error:
                    logger.warning(f"Failed to create ETL placeholder: {str(etl_error)}")
                    etl_github_path = None
            
        except Exception as dag_error:
            logger.error(f"Failed to create DAG scaffold: {str(dag_error)}")
            # Don't fail the entire operation, just log the error
            dag_github_path = f"Error creating DAG: {str(dag_error)}"
            commit_sha = None
            config_template = {}

        # Update workflow record with DAG information
        try:
            update_data = {
                "workflow_id": actual_workflow_id,
                "dag_path": f"server.app.dagster.jobs.workflow_job_{actual_workflow_id}",  # Use old format
                "commit_sha": commit_sha,
                "config_template": json.dumps(config_template)
            }
            
            logger.info(f"Updating workflow {actual_workflow_id} with DAG info: {update_data}")
            
            db.execute(
                text("""
                    UPDATE workflow.workflow 
                    SET dag_path = :dag_path, commit_sha = :commit_sha, config_template = :config_template
                    WHERE id = :workflow_id
                """),
                update_data
            )
            db.commit()
            logger.info(f"Updated workflow {actual_workflow_id} with DAG information")
            
        except Exception as update_error:
            logger.warning(f"Failed to update workflow with DAG info: {str(update_error)}")
            # Don't fail the operation, just log the warning

        return {
            "message": "Workflow created successfully with DAG scaffold",
            "workflow": {
                "id": actual_workflow_id,
                "name": workflow_record.name,
                "description": workflow_record.description,
                "status": workflow_record.status,
                "dag_path": dag_github_path,
                "commit_sha": commit_sha,
                "etl_path": etl_github_path,
                "processing_type": workflow.etl_config.processingType
            },
            "dag_info": {
                "filename": dag_filename if 'dag_filename' in locals() else None,
                "github_path": dag_github_path,
                "etl_github_path": etl_github_path,
                "config_template_generated": bool(config_template)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow creation failed: {str(e)}")
        if 'db' in locals():
            db.rollback()
        raise HTTPException(500, f"Workflow creation failed: {str(e)}")

@router.post("/workflow/{workflow_id}/update-etl")
async def update_workflow_etl_logic(
    workflow_id: int,
    etl_logic: str,
    function_name: Optional[str] = "process_data",
    github_path: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Update ETL logic for an existing workflow"""
    try:
        # Get workflow details
        result = db.execute(
            text("SELECT name, etl_config, dag_path FROM workflow.workflow WHERE id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")
        
        # Update ETL config
        current_etl_config = json.loads(workflow_record.etl_config) if workflow_record.etl_config else {}
        current_etl_config.update({
            "customLogic": etl_logic,
            "functionName": function_name,
            "githubPath": github_path or current_etl_config.get("githubPath", "")
        })
        
        # Update database
        db.execute(
            text("UPDATE workflow.workflow SET etl_config = :etl_config, updated_at = NOW() WHERE id = :workflow_id"),
            {
                "workflow_id": workflow_id,
                "etl_config": json.dumps(current_etl_config)
            }
        )
        db.commit()
        
        # If github_path is provided, update the separate ETL file
        if github_path:
            etl_file_path = f"{GITHUB_ETL_PATH}/{github_path}"
            github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{etl_file_path}"
            
            # Try to get existing file
            get_response = requests.get(github_url, headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github+json"
            })
            
            etl_content = f'''"""
ETL Processing Module for Workflow ID: {workflow_id}
Updated: {datetime.now().isoformat()}
"""

import pandas as pd
from typing import Dict, Any, Optional

def {function_name}(df: pd.DataFrame, parameters: Optional[Dict[str, Any]] = None) -> pd.DataFrame:
    """
    Custom ETL processing function
    
    Args:
        df (pd.DataFrame): Input dataframe
        parameters (dict): Processing parameters from workflow configuration
    
    Returns:
        pd.DataFrame: Processed dataframe
    """
    
{etl_logic}
'''
            
            encoded_content = base64.b64encode(etl_content.encode()).decode()
            headers = {
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json"
            }
            
            if get_response.status_code == 200:
                # Update existing file
                current_sha = get_response.json()["sha"]
                payload = {
                    "message": f"Update ETL logic for workflow {workflow_id}",
                    "content": encoded_content,
                    "sha": current_sha,
                    "branch": "main"
                }
                response = requests.put(github_url, headers=headers, json=payload)
            else:
                # Create new file
                payload = {
                    "message": f"Create ETL logic for workflow {workflow_id}",
                    "content": encoded_content,
                    "branch": "main"
                }
                response = requests.put(github_url, headers=headers, json=payload)
            
            if response.status_code not in [200, 201]:
                logger.warning(f"Failed to update ETL file: {response.text}")
        
        logger.info(f"Updated ETL logic for workflow {workflow_id}")
        return {
            "message": "ETL logic updated successfully",
            "workflow_id": workflow_id,
            "github_path": github_path,
            "function_name": function_name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ETL logic: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to update ETL logic: {str(e)}")

@router.get("/workflow/{workflow_id}/dag-preview")
async def get_workflow_dag_preview(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get a preview of the generated DAG for a workflow"""
    try:
        result = db.execute(
            text("""
                SELECT name, description, etl_config, source_type, source_config, 
                       parameters, destination_config, created_by, status
                FROM workflow.workflow 
                WHERE id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")
        
        # Reconstruct workflow object for DAG generation
        etl_config_dict = json.loads(workflow_record.etl_config) if workflow_record.etl_config else {}
        source_config_dict = json.loads(workflow_record.source_config) if workflow_record.source_config else {}
        parameters_list = json.loads(workflow_record.parameters) if workflow_record.parameters else []
        destinations_list = json.loads(workflow_record.destination_config) if workflow_record.destination_config else []
        
        # Create workflow object for preview
        preview_workflow = FullWorkflowCreate(
            name=workflow_record.name,
            description=workflow_record.description,
            created_by=workflow_record.created_by,
            status=workflow_record.status,
            source_type=workflow_record.source_type,
            source_config=SourceConfig(**source_config_dict) if source_config_dict else None,
            parameters=[ParameterSection(**section) for section in parameters_list],
            destinations=[Destination(**dest) for dest in destinations_list],
            etl_config=ETLConfig(**etl_config_dict)
        )
        
        # Generate DAG preview
        dag_content, config_template = generate_enhanced_dag_template(preview_workflow, workflow_id)
        
        return {
            "workflow_id": workflow_id,
            "dag_content": dag_content,
            "config_template": config_template,
            "processing_type": etl_config_dict.get("processingType", "custom"),
            "function_name": etl_config_dict.get("functionName", "process_data")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate DAG preview: {str(e)}")
        raise HTTPException(500, f"Failed to generate DAG preview: {str(e)}")

@router.get("/workflow/{workflow_id}/etl-template")
async def get_etl_template(
    workflow_id: int,
    processing_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get ETL template code for a specific processing type"""
    try:
        if processing_type:
            # Generate template for specific processing type
            etl_config = ETLConfig(processingType=processing_type)
        else:
            # Get from existing workflow
            result = db.execute(
                text("SELECT etl_config FROM workflow.workflow WHERE id = :workflow_id"),
                {"workflow_id": workflow_id}
            )
            workflow_record = result.fetchone()
            if not workflow_record:
                raise HTTPException(404, "Workflow not found")
            
            etl_config_dict = json.loads(workflow_record.etl_config) if workflow_record.etl_config else {}
            etl_config = ETLConfig(**etl_config_dict)
        
        template_code = generate_etl_processing_code(etl_config)
        
        return {
            "workflow_id": workflow_id,
            "processing_type": etl_config.processingType,
            "template_code": template_code,
            "function_name": etl_config.functionName
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get ETL template: {str(e)}")
        raise HTTPException(500, f"Failed to get ETL template: {str(e)}")