# Standard library imports
import json
import base64
import uuid
import tempfile
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

# Third-party imports
import requests
import pandas as pd
import boto3
from botocore.exceptions import ClientError

# FastAPI imports
from fastapi import APIRouter, HTTPException, File, UploadFile, Form, Request, Depends
from fastapi.responses import JSONResponse

# Pydantic imports
from pydantic import BaseModel

# SQLAlchemy imports
from sqlalchemy.orm import Session
from sqlalchemy import text

# Dagster imports
from dagster import logger

# Your application imports (these would need to be defined in your project)
from .database import get_db  # Database session dependency
from .config import (  # Configuration constants
    S3_BUCKET, 
    S3_REGION, 
    GITHUB_REPO, 
    GITHUB_TOKEN, 
    GITHUB_DAG_PATH
)
from .parsers import parser_map  # File parser mapping
from .models import Destination  # Destination model (referenced but not defined in the code)

# AWS S3 client (this would typically be initialized elsewhere)
# s3_client = boto3.client('s3', ...)  # This needs to be properly configured


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

class ApiSourceConfig(BaseModel):
    endpoint: str
    authToken: Optional[str] = None
    method: str = "GET"
    headers: Optional[Dict[str, str]] = {}

class DagConfig(BaseModel):
    name: str
    description: Optional[str] = None
    schedule: Optional[str] = None
    retries: int = 3
    timeout: int = 3600
    customCron: Optional[str] = None
    path: Optional[str] = None

class WorkflowCreate(BaseModel):
    workflow_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_by: int
    status: Optional[str] = "Draft"
    source_type: Optional[str] = "file"  # 'file', 'api', 'database'
    source_config: Optional[ApiSourceConfig] = None
    parameters: Optional[List[ParameterSection]] = []
    destinations: Optional[List[Destination]] = []
    dag_config: Optional[DagConfig] = None
    dag_path: Optional[str] = None
    skip_structure: Optional[bool] = False

router = APIRouter(prefix="/workflows", tags=["workflows"])

def upload_to_s3(file_path: str, content: bytes) -> str:
    """Upload file to S3 storage with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=file_path,
                Body=content,
                ContentType="application/octet-stream"
            )
            logger.info(f"File uploaded successfully to {S3_BUCKET}/{file_path}")
            return f"s3://{S3_BUCKET}/{file_path}"
        except ClientError as e:
            logger.error(f"Upload attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:
                raise HTTPException(500, f"Failed to upload file after {max_retries} attempts: {str(e)}")
    raise HTTPException(500, "Unexpected error in file upload")

def generate_dag_template(workflow: WorkflowCreate, workflow_id: int) -> str:
    """Generate a Dagster DAG template based on workflow configuration"""
    
    # Sanitize workflow name for Python function names
    safe_name = workflow.name.lower().replace(' ', '_').replace('-', '_')
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
    
    # Build imports based on source and destination types
    imports = [
        "from dagster import job, op, Field, String, Int, resource, Out",
        "import pandas as pd",
        "import tempfile",
        "import os",
        "import logging",
        "from datetime import datetime"
    ]
    
    # Add specific imports based on configuration
    if workflow.source_type == "api" or any(dest.type == "api" for dest in workflow.destinations):
        imports.append("import requests")
    
    if any(dest.type == "database" for dest in workflow.destinations):
        imports.append("import sqlalchemy")
        imports.append("from sqlalchemy import create_engine, text")
    
    # Add S3 imports for file operations
    imports.append("import boto3")
    imports.append("from botocore.exceptions import ClientError")
    
    # Generate resource definitions
    resources_code = '''
# --- Resources ---
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
    """S3 resource for file operations"""
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
    
    # Generate load operation based on source type
    if workflow.source_type == "file":
        load_op = f'''
@op(
    required_resource_keys={{"s3"}},
    config_schema={{
        "input_file_path": Field(String, is_required=True),
        "workflow_id": Field(Int),
        "bucket": Field(String, default_value="jade-files")
    }},
    out=Out(dict)
)
def load_data_{workflow_id}(context):
    """Load data from uploaded file"""
    s3_client = context.resources.s3
    config = context.op_config
    bucket = config["bucket"]
    file_path = config["input_file_path"]
    
    try:
        # Extract key from S3 path
        if file_path.startswith(f"s3://{{bucket}}/"):
            key = file_path[len(f"s3://{{bucket}}/"):]
        else:
            key = file_path
        
        # Create temporary file for download
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file_name = temp_file.name
        
        # Download file
        s3_client.download_file(bucket, key, temp_file_name)
        context.log.info(f"Downloaded s3://{{bucket}}/{{key}} to {{temp_file_name}}")
        
        # Load data based on file extension
        if key.endswith('.csv'):
            df = pd.read_csv(temp_file_name)
        elif key.endswith('.xlsx'):
            df = pd.read_excel(temp_file_name)
        elif key.endswith('.json'):
            df = pd.read_json(temp_file_name)
        else:
            raise ValueError(f"Unsupported file type: {{key}}")
        
        # Clean up temporary file
        os.unlink(temp_file_name)
        
        context.log.info(f"Loaded {{len(df)}} rows from {{key}}")
        return {{"data": df, "source_path": file_path}}
        
    except Exception as e:
        context.log.error(f"Failed to load data: {{str(e)}}")
        raise
'''
    elif workflow.source_type == "api":
        load_op = f'''
@op(
    config_schema={{
        "api_endpoint": Field(String, is_required=True),
        "auth_token": Field(String, is_required=False),
        "method": Field(String, default_value="GET"),
        "workflow_id": Field(Int),
    }},
    out=Out(dict)
)
def load_data_{workflow_id}(context):
    """Load data from API endpoint"""
    config = context.op_config
    endpoint = config["api_endpoint"]
    auth_token = config.get("auth_token")
    method = config.get("method", "GET")
    
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
        return {{"data": df, "source_path": endpoint}}
        
    except Exception as e:
        context.log.error(f"Failed to load data from API: {{str(e)}}")
        raise
'''
    else:
        load_op = f'''
@op(
    config_schema={{
        "workflow_id": Field(Int),
    }},
    out=Out(dict)
)
def load_data_{workflow_id}(context):
    """Placeholder for data loading"""
    context.log.info("Data loading not configured")
    return {{"data": pd.DataFrame(), "source_path": "none"}}
'''
    
    # Generate process operation
    process_op = f'''
@op(
    config_schema={{
        "workflow_id": Field(Int),
        "parameters": Field(dict, default_value={{}})
    }},
    out=Out(dict)
)
def process_data_{workflow_id}(context, input_data: dict):
    """Process the loaded data"""
    df = input_data["data"]
    config = context.op_config
    parameters = config.get("parameters", {{}})
    
    try:
        # Apply any data processing logic here
        # This is where custom business logic would go
        
        context.log.info(f"Processing {{len(df)}} rows")
        
        # Example processing steps:
        # 1. Data cleaning
        df = df.dropna()
        
        # 2. Data transformation (based on parameters)
        # Add custom transformations here
        
        context.log.info(f"Processed data: {{len(df)}} rows after cleaning")
        
        return {{
            "processed_data": df,
            "source_path": input_data["source_path"],
            "processing_info": {{
                "rows_processed": len(df),
                "parameters_used": parameters
            }}
        }}
        
    except Exception as e:
        context.log.error(f"Data processing failed: {{str(e)}}")
        raise
'''
    
    # Generate save operations based on destinations
    save_ops = []
    for i, dest in enumerate(workflow.destinations):
        if dest.type == "csv":
            save_ops.append(f'''
@op(
    required_resource_keys={{"s3"}},
    config_schema={{
        "output_path": Field(String),
        "delimiter": Field(String, default_value=","),
        "include_headers": Field(bool, default_value=True),
        "workflow_id": Field(Int),
        "bucket": Field(String, default_value="jade-files")
    }},
    out=Out(dict)
)
def save_csv_{workflow_id}_{i}(context, processed_data: dict):
    """Save data as CSV file"""
    s3_client = context.resources.s3
    config = context.op_config
    df = processed_data["processed_data"]
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            df.to_csv(
                temp_file.name, 
                sep=config.get("delimiter", ","),
                index=False,
                header=config.get("include_headers", True)
            )
            temp_file_name = temp_file.name
        
        # Upload to S3
        output_path = config["output_path"]
        bucket = config["bucket"]
        
        if output_path.startswith(f"s3://{{bucket}}/"):
            key = output_path[len(f"s3://{{bucket}}/"):]
        else:
            key = output_path
        
        with open(temp_file_name, 'rb') as f:
            s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=f,
                ContentType="text/csv"
            )
        
        # Clean up
        os.unlink(temp_file_name)
        
        context.log.info(f"Saved CSV to s3://{{bucket}}/{{key}}")
        return {{
            "output_path": f"s3://{{bucket}}/{{key}}",
            "rows_saved": len(df),
            "format": "csv"
        }}
        
    except Exception as e:
        context.log.error(f"Failed to save CSV: {{str(e)}}")
        raise
''')
        elif dest.type == "api":
            save_ops.append(f'''
@op(
    config_schema={{
        "api_endpoint": Field(String),
        "auth_token": Field(String, is_required=False),
        "method": Field(String, default_value="POST"),
        "workflow_id": Field(Int),
    }},
    out=Out(dict)
)
def save_api_{workflow_id}_{i}(context, processed_data: dict):
    """Save data to API endpoint"""
    config = context.op_config
    df = processed_data["processed_data"]
    
    try:
        endpoint = config["api_endpoint"]
        auth_token = config.get("auth_token")
        method = config.get("method", "POST")
        
        headers = {{"Content-Type": "application/json"}}
        if auth_token:
            headers["Authorization"] = f"Bearer {{auth_token}}"
        
        # Convert DataFrame to JSON
        data = df.to_dict(orient="records")
        
        if method.upper() == "POST":
            response = requests.post(endpoint, json=data, headers=headers)
        elif method.upper() == "PUT":
            response = requests.put(endpoint, json=data, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {{method}}")
        
        response.raise_for_status()
        
        context.log.info(f"Sent {{len(df)}} rows to API endpoint")
        return {{
            "output_path": endpoint,
            "rows_saved": len(df),
            "format": "api",
            "response_status": response.status_code
        }}
        
    except Exception as e:
        context.log.error(f"Failed to save to API: {{str(e)}}")
        raise
''')
    
    # Generate job definition
    job_name = f"workflow_job_{workflow_id}"
    
    # Build op calls for the job
    op_calls = [f"    data = load_data_{workflow_id}()"]
    op_calls.append(f"    processed = process_data_{workflow_id}(data)")
    
    for i, dest in enumerate(workflow.destinations):
        if dest.type == "csv":
            op_calls.append(f"    csv_result_{i} = save_csv_{workflow_id}_{i}(processed)")
        elif dest.type == "api":
            op_calls.append(f"    api_result_{i} = save_api_{workflow_id}_{i}(processed)")
    
    # Generate config template
    config_template = {
        "ops": {
            f"load_data_{workflow_id}": {
                "config": {
                    "workflow_id": workflow_id,
                    "bucket": "jade-files"
                }
            },
            f"process_data_{workflow_id}": {
                "config": {
                    "workflow_id": workflow_id,
                    "parameters": {}
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
            config_template["ops"][f"save_csv_{workflow_id}_{i}"] = {
                "config": {
                    "output_path": f"jade-files/outputs/{dest.name}",
                    "delimiter": dest.config.delimiter or ",",
                    "include_headers": dest.config.includeHeaders if dest.config.includeHeaders is not None else True,
                    "workflow_id": workflow_id,
                    "bucket": "jade-files"
                }
            }
        elif dest.type == "api":
            config_template["ops"][f"save_api_{workflow_id}_{i}"] = {
                "config": {
                    "api_endpoint": dest.config.endpoint or "",
                    "auth_token": dest.config.authToken or "",
                    "method": dest.config.method or "POST",
                    "workflow_id": workflow_id
                }
            }
    
    job_definition = f'''
@job(
    resource_defs={{
        "s3": s3_resource
    }},
    config={json.dumps(config_template, indent=4)},
    description="{workflow.description or f'Workflow job for {workflow.name}'}",
    tags={{"dagster/max_retries": {workflow.dag_config.retries if workflow.dag_config else 3}}}
)
def {job_name}():
    """{workflow.description or f'Generated workflow job for {workflow.name}'}"""
{chr(10).join(op_calls)}
'''
    
    # Combine all parts
    dag_content = '\n'.join(imports) + '\n' + resources_code + '\n' + load_op + '\n' + process_op
    for save_op in save_ops:
        dag_content += '\n' + save_op
    dag_content += '\n' + job_definition
    
    return dag_content

def create_github_dag(workflow: WorkflowCreate, workflow_id: int) -> dict:
    """Create a DAG in GitHub and return its path and commit SHA"""
    safe_name = workflow.name.lower().replace(' ', '_').replace('-', '_')
    safe_name = ''.join(c for c in safe_name if c.isalnum() or c == '_')
    
    dag_filename = f"workflow_{safe_name}_{workflow_id}.py"
    dag_path = f"{GITHUB_DAG_PATH}/{dag_filename}"
    github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{dag_path}"
    
    # Generate DAG content
    dag_content = generate_dag_template(workflow, workflow_id)
    
    encoded_content = base64.b64encode(dag_content.encode()).decode()
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
    }
    payload = {
        "message": f"Create DAG for workflow {workflow_id}: {workflow.name}",
        "content": encoded_content,
        "branch": "main"
    }
    
    try:
        response = requests.put(github_url, headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        logger.info(f"Created DAG at {dag_path}")
        return {
            "dag_path": f"https://github.com/{GITHUB_REPO}/blob/main/{dag_path}",
            "commit_sha": response_data.get("commit", {}).get("sha"),
            "filename": dag_filename
        }
    except requests.RequestException as e:
        logger.error(f"Failed to create DAG in GitHub: {str(e)}")
        raise HTTPException(500, f"Failed to create DAG in GitHub: {str(e)}")

@router.post("/workflow/new")
async def create_new_workflow(
    request: Request,
    file: Optional[UploadFile] = File(None),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    created_by: Optional[int] = Form(None),
    status: Optional[str] = Form("Draft"),
    skip_structure: Optional[bool] = Form(False),
    source_type: Optional[str] = Form("file"),
    db: Session = Depends(get_db)
):
    """Create a new workflow with optional file upload and DAG creation"""
    try:
        content_type = request.headers.get('content-type')

        if content_type and 'multipart/form-data' in content_type:
            workflow = WorkflowCreate(
                name=name,
                description=description,
                created_by=created_by,
                status=status,
                skip_structure=skip_structure,
                source_type=source_type or "file"
            )
        else:
            json_data = await request.json()
            workflow = WorkflowCreate(**json_data)
        
        logger.info(f"Creating new workflow: {workflow.name}")
        parsed_data = None
        storage_url = None
        
        # Handle file upload if provided
        if file and not skip_structure and workflow.source_type == "file":
            if not file.filename or "." not in file.filename:
                logger.error("Invalid filename")
                raise HTTPException(400, "Invalid filename")
            
            file_ext = file.filename.split(".")[-1].lower()
            logger.info(f"File extension: {file_ext}")
            
            parser = parser_map.get(file_ext)
            if not parser:
                logger.error(f"Unsupported file type: {file_ext}")
                raise HTTPException(400, f"Unsupported file type: {file_ext}")
            
            content = await file.read()
            logger.info("Parsing file content")
            
            try:
                df = await parser.parse(content)
            except Exception as parse_error:
                logger.error(f"Failed to parse file: {str(parse_error)}")
                raise HTTPException(500, f"File parsing failed: {str(parse_error)}")
            
            file_path = f"workflows/{workflow.name}/{uuid.uuid4()}.{file_ext}"
            logger.info(f"Generated file path: {file_path}")
            logger.info("Uploading file to S3")
            storage_url = upload_to_s3(file_path, content)
            
            logger.info("Formatting parsed data")
            try:
                parsed_data = parser.format_response(df, storage_url)
            except Exception as format_error:
                logger.error(f"Failed to format parsed data: {str(format_error)}")
                raise HTTPException(500, f"Failed to format parsed data: {str(format_error)}")

        logger.info("Inserting workflow into database")
        try:
            # Generate DAG configuration
            dag_config = {
                "name": workflow.name.lower().replace(' ', '_').replace('-', '_'),
                "description": workflow.description or f"DAG for {workflow.name}",
                "retries": 3,
                "timeout": 3600
            }
            
            result = db.execute(
                text("""
                    INSERT INTO workflow.workflow (
                        name, description, created_by, status,
                        input_file_path, input_structure,
                        created_at, updated_at,
                        dag_path, commit_sha, config_template, default_parameters,
                        dagster_location_name, dagster_repository_name,
                        requires_file, output_file_pattern, supported_file_types,
                        source_config, parameters, destination, destination_config
                    ) VALUES (
                        :name, :description, :created_by, :status,
                        :input_file_path, :input_structure,
                        NOW(), NOW(),
                        :dag_path, :commit_sha, :config_template, :default_parameters,
                        :dagster_location_name, :dagster_repository_name,
                        :requires_file, :output_file_pattern, :supported_file_types,
                        :source_config, :parameters, :destination, :destination_config
                    )
                    RETURNING id, name, description, status, input_file_path, dag_path, commit_sha
                """),
                {
                    "name": workflow.name,
                    "description": workflow.description,
                    "created_by": workflow.created_by,
                    "status": workflow.status,
                    "input_file_path": storage_url,
                    "input_structure": json.dumps(parsed_data["structure"]) if parsed_data else None,
                    "dag_path": "",  # Will be updated after DAG creation
                    "commit_sha": None,
                    "config_template": json.dumps({}),  # Will be generated with DAG
                    "default_parameters": json.dumps({}),
                    "dagster_location_name": "server.app.dagster.repo",
                    "dagster_repository_name": "__repository__",
                    "requires_file": workflow.source_type == "file" and not skip_structure,
                    "output_file_pattern": f"jade-files/outputs/workflow_{workflow.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    "supported_file_types": json.dumps(["csv", "xlsx", "json"]),
                    "source_config": json.dumps(workflow.source_config.dict() if workflow.source_config else {}),
                    "parameters": json.dumps([section.dict() for section in workflow.parameters] if workflow.parameters else []),
                    "destination": workflow.destinations[0].type if workflow.destinations else "csv",
                    "destination_config": json.dumps([dest.dict() for dest in workflow.destinations] if workflow.destinations else [])
                }
            )
            workflow_record = result.fetchone()
            db.commit()
            logger.info("Workflow inserted successfully")
            
            # Create minimal DAG in GitHub (will be updated later)
            try:
                dag_info = create_github_dag(workflow, workflow_record.id)
                
                # Update workflow with dag_path and commit_sha
                db.execute(
                    text("""
                        UPDATE workflow.workflow
                        SET dag_path = :dag_path, commit_sha = :commit_sha
                        WHERE id = :id
                    """),
                    {
                        "dag_path": dag_info["dag_path"], 
                        "commit_sha": dag_info["commit_sha"], 
                        "id": workflow_record.id
                    }
                )
                db.commit()
                logger.info(f"Updated workflow {workflow_record.id} with dag_path: {dag_info['dag_path']}")
            except Exception as dag_error:
                logger.warning(f"Failed to create DAG, but workflow was created: {str(dag_error)}")
                dag_info = {"dag_path": "", "commit_sha": None}
            
        except Exception as db_error:
            logger.error(f"Database insertion failed: {str(db_error)}")
            db.rollback()
            raise HTTPException(500, f"Database insertion failed: {str(db_error)}")

        response_data = {
            "message": "Workflow created successfully",
            "workflow": dict(workflow_record._mapping) | {
                "dag_path": dag_info["dag_path"], 
                "commit_sha": dag_info["commit_sha"]
            }
        }
        
        if parsed_data:
            response_data["file_info"] = {
                "path": storage_url,
                "schema": parsed_data["schema"],
                "preview": parsed_data["data"]
            }
        
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow creation failed: {str(e)}")
        if 'db' in locals():
            db.rollback()
        raise HTTPException(500, f"Workflow creation failed: {str(e)}")

@router.post("/workflow/update")
async def update_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """Update an existing workflow and regenerate DAG"""
    try:
        logger.info(f"Updating workflow {workflow.workflow_id}")
        
        # Generate new DAG if configuration changed
        dag_info = None
        if workflow.dag_config:
            try:
                dag_info = create_github_dag(workflow, workflow.workflow_id)
            except Exception as dag_error:
                logger.warning(f"Failed to update DAG: {str(dag_error)}")
        
        result = db.execute(
            text("""
                UPDATE workflow.workflow
                SET
                    name = :name,
                    description = :description,
                    created_by = :created_by,
                    status = :status,
                    parameters = :parameters,
                    destination = :destination,
                    destination_config = :destination_config,
                    source_config = :source_config,
                    updated_at = NOW(),
                    requires_file = :requires_file,
                    output_file_pattern = :output_file_pattern,
                    supported_file_types = :supported_file_types,
                    dag_path = :dag_path,
                    commit_sha = :commit_sha
                WHERE id = :workflow_id
                RETURNING id, name, description, status, dag_path
            """),
            {
                "workflow_id": workflow.workflow_id,
                "name": workflow.name,
                "description": workflow.description,
                "created_by": workflow.created_by,
                "status": workflow.status,
                "parameters": json.dumps([section.dict() for section in workflow.parameters] if workflow.parameters else []),
                "destination": workflow.destinations[0].type if workflow.destinations else "csv",
                "destination_config": json.dumps([dest.dict() for dest in workflow.destinations] if workflow.destinations else []),
                "source_config": json.dumps(workflow.source_config.dict() if workflow.source_config else {}),
                "requires_file": workflow.source_type == "file" and not workflow.skip_structure,
                "output_file_pattern": f"jade-files/outputs/workflow_{workflow.name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "supported_file_types": json.dumps(["csv", "xlsx", "json"]),
                "dag_path": dag_info["dag_path"] if dag_info else workflow.dag_path,
                "commit_sha": dag_info["commit_sha"] if dag_info else None
            }
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")

        db.commit()
        logger.info("Workflow updated successfully")
        return {
            "message": "Workflow updated successfully",
            "workflow": dict(workflow_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow update failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow update failed: {str(e)}")

@router.get("/workflow/{workflow_id}")
async def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Retrieve workflow details"""
    try:
        result = db.execute(
            text("""
                SELECT
                    id, name, description, created_by, status,
                    input_file_path, input_structure, dag_path,
                    commit_sha, config_template, default_parameters,
                    destination, destination_config, source_config,
                    parameters, requires_file, output_file_pattern, 
                    supported_file_types, created_at, updated_at
                FROM workflow.workflow
                WHERE id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        )
        workflow = result.fetchone()
        if not workflow:
            raise HTTPException(404, "Workflow not found")
        
        # Parse JSON fields
        workflow_dict = dict(workflow._mapping)
        
        # Safely parse JSON fields
        try:
            workflow_dict["parameters"] = json.loads(workflow.parameters) if workflow.parameters else []
        except (json.JSONDecodeError, TypeError):
            workflow_dict["parameters"] = []
        
        try:
            workflow_dict["destination_config"] = json.loads(workflow.destination_config) if workflow.destination_config else []
        except (json.JSONDecodeError, TypeError):
            workflow_dict["destination_config"] = []
        
        try:
            workflow_dict["source_config"] = json.loads(workflow.source_config) if workflow.source_config else {}
        except (json.JSONDecodeError, TypeError):
            workflow_dict["source_config"] = {}
        
        try:
            workflow_dict["input_structure"] = json.loads(workflow.input_structure) if workflow.input_structure else {}
        except (json.JSONDecodeError, TypeError):
            workflow_dict["input_structure"] = {}
        
        # Fetch recent runs
        recent_runs_result = db.execute(
            text("""
                SELECT
                    id, workflow_id, status, started_at,
                    duration_ms, triggered_by_name
                FROM workflow.run
                WHERE workflow_id = :workflow_id
                ORDER BY started_at DESC
                LIMIT 5
            """),
            {"workflow_id": workflow_id}
        )
        recent_runs = [dict(row._mapping) for row in recent_runs_result.fetchall()]
        
        return {
            "workflow": workflow_dict,
            "recent_runs": recent_runs
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Failed to retrieve workflow: {str(e)}")

@router.get("/github-dag-info")
async def get_github_dag_info(dag_path: str) -> Dict[str, Any]:
    """Retrieve GitHub DAG information (last commit details for the file)"""
    # Extract filename from URL if full GitHub URL is provided
    if "github.com" in dag_path:
        # Extract filename from GitHub URL
        filename = dag_path.split("/")[-1]
        if not filename.endswith(".py"):
            filename += ".py"
    else:
        filename = dag_path if dag_path.endswith(".py") else f"{dag_path}.py"
    
    file_in_repo_path = f"{GITHUB_DAG_PATH}/{filename}"
    
    # API endpoint to get commits for a specific file
    commits_url = f"https://api.github.com/repos/{GITHUB_REPO}/commits"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }
    params = {
        "path": file_in_repo_path,
        "per_page": 1,
        "sha": "main"
    }

    try:
        logger.info(f"Fetching GitHub commit info for file: {file_in_repo_path} in repo: {GITHUB_REPO}")
        response = requests.get(commits_url, headers=headers, params=params)
        response.raise_for_status()

        commits_data = response.json()

        if not commits_data:
            logger.warning(f"No commits found for file: {file_in_repo_path}")
            return {
                "authorized": True, 
                "message": "DAG file exists, but no commit history found.", 
                "version": "N/A", 
                "last_updated": "N/A", 
                "author": "N/A", 
                "commit_message": "N/A"
            }

        latest_commit = commits_data[0]

        # Extract relevant information
        version = latest_commit["sha"][:7]
        last_updated = latest_commit["commit"]["committer"]["date"]
        author = latest_commit["commit"]["author"]["name"]
        commit_message = latest_commit["commit"]["message"]

        logger.info(f"Successfully retrieved DAG info for {file_in_repo_path}. Version: {version}")

        return {
            "authorized": True,
            "version": version,
            "last_updated": last_updated,
            "author": author,
            "commit_message": commit_message,
            "file_path": file_in_repo_path
        }

    except requests.exceptions.HTTPError as e:
        logger.error(f"GitHub API HTTP error for {file_in_repo_path}: {e.response.status_code} - {e.response.text}")
        if e.response.status_code == 404:
            return {"authorized": False, "message": f"DAG file '{file_in_repo_path}' not found in GitHub."}
        elif e.response.status_code == 401 or e.response.status_code == 403:
            return {"authorized": False, "message": "Unauthorized or forbidden access to GitHub repository. Check GITHUB_ACCESS_TOKEN and repository permissions."}
        raise HTTPException(status_code=500, detail=f"GitHub API error: {e.response.status_code} - {e.response.text}")
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error to GitHub API: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Could not connect to GitHub API: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error fetching GitHub DAG info for {file_in_repo_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch DAG info: {str(e)}")

@router.get("/workflows")
async def list_workflows(
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all workflows with optional filtering"""
    try:
        # Build query with optional status filter
        query = """
            SELECT 
                id, name, description, created_by, status,
                created_at, updated_at, dag_path, destination,
                requires_file, last_run_at, next_run_at
            FROM workflow.workflow
        """
        params = {"skip": skip, "limit": limit}
        
        if status:
            query += " WHERE status = :status"
            params["status"] = status
        
        query += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
        
        result = db.execute(text(query), params)
        workflows = [dict(row._mapping) for row in result.fetchall()]
        
        # Get total count
        count_query = "SELECT COUNT(*) as total FROM workflow.workflow"
        if status:
            count_query += " WHERE status = :status"
        
        count_result = db.execute(text(count_query), {"status": status} if status else {})
        total = count_result.fetchone().total
        
        return {
            "workflows": workflows,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Failed to list workflows: {str(e)}")
        raise HTTPException(500, f"Failed to list workflows: {str(e)}")

@router.delete("/workflow/{workflow_id}")
async def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Delete a workflow"""
    try:
        # Check if workflow exists
        result = db.execute(
            text("SELECT id, name, dag_path FROM workflow.workflow WHERE id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        workflow = result.fetchone()
        if not workflow:
            raise HTTPException(404, "Workflow not found")
        
        # Delete from database
        db.execute(
            text("DELETE FROM workflow.workflow WHERE id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        db.commit()
        
        logger.info(f"Deleted workflow {workflow_id}")
        return {"message": f"Workflow {workflow_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete workflow {workflow_id}: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to delete workflow: {str(e)}")

@router.post("/workflow/{workflow_id}/run")
async def trigger_workflow_run(
    workflow_id: int,
    parameters: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db)
):
    """Trigger a workflow run"""
    try:
        # Get workflow details
        result = db.execute(
            text("SELECT id, name, status, dag_path FROM workflow.workflow WHERE id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        workflow = result.fetchone()
        if not workflow:
            raise HTTPException(404, "Workflow not found")
        
        if workflow.status != "Active":
            raise HTTPException(400, "Workflow is not active")
        
        # Create run record
        run_result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, status, started_at, triggered_by_name, parameters
                ) VALUES (
                    :workflow_id, 'Running', NOW(), 'API', :parameters
                )
                RETURNING id, workflow_id, status, started_at
            """),
            {
                "workflow_id": workflow_id,
                "parameters": json.dumps(parameters or {})
            }
        )
        run_record = run_result.fetchone()
        db.commit()
        
        # Here you would integrate with Dagster to actually trigger the run
        # For now, we'll just return the run record
        
        logger.info(f"Triggered run {run_record.id} for workflow {workflow_id}")
        return {
            "message": f"Workflow run triggered successfully",
            "run": dict(run_record._mapping)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger workflow run {workflow_id}: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to trigger workflow run: {str(e)}")

@router.get("/workflow/{workflow_id}/runs")
async def get_workflow_runs(
    workflow_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get runs for a specific workflow"""
    try:
        result = db.execute(
            text("""
                SELECT 
                    id, workflow_id, status, started_at, completed_at,
                    duration_ms, triggered_by_name, parameters, error_message
                FROM workflow.run
                WHERE workflow_id = :workflow_id
                ORDER BY started_at DESC
                LIMIT :limit OFFSET :skip
            """),
            {"workflow_id": workflow_id, "skip": skip, "limit": limit}
        )
        runs = []
        for row in result.fetchall():
            run_dict = dict(row._mapping)
            # Parse parameters JSON
            try:
                run_dict["parameters"] = json.loads(row.parameters) if row.parameters else {}
            except (json.JSONDecodeError, TypeError):
                run_dict["parameters"] = {}
            runs.append(run_dict)
        
        # Get total count
        count_result = db.execute(
            text("SELECT COUNT(*) as total FROM workflow.run WHERE workflow_id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        total = count_result.fetchone().total
        
        return {
            "runs": runs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    except Exception as e:
        logger.error(f"Failed to get runs for workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Failed to get workflow runs: {str(e)}")
