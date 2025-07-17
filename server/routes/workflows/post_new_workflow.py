from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends, Request
from sqlalchemy.orm import Session
from app.file_parser import parser_map
import pandas as pd
import io
import uuid
import json
import logging
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from ..get_health_check import get_db, engine
from dotenv import load_dotenv
from sqlalchemy import text
import os
import base64
import requests
import boto3
from botocore.exceptions import ClientError

load_dotenv()
logger = logging.getLogger(__name__)

# S3 Configuration
S3_BUCKET = os.getenv("S3_BUCKET", "workflow-files")
S3_REGION = os.getenv("S3_REGION", "eu-west-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=S3_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

GITHUB_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO = f"{os.getenv('GITHUB_REPO_OWNER')}/{os.getenv('GITHUB_REPO_NAME')}"
GITHUB_DAG_PATH = "DAGs"

class WorkflowCreate(BaseModel):
    workflow_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    created_by: int
    status: Optional[str] = "Draft"
    parameters: Optional[List[Dict]] = []
    destination: Optional[str] = "csv"
    destination_config: Optional[Dict] = None
    skip_structure: Optional[bool] = False
    dag_path: Optional[str] = None

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

def create_github_dag(workflow_id: int, workflow_name: str) -> dict:
    """Create a blank DAG in GitHub and return its path and commit SHA"""
    dag_filename = f"workflow_job_{workflow_id}.py"
    dag_path = f"{GITHUB_DAG_PATH}/{dag_filename}"
    github_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{dag_path}"
    # Default DAG template
    dag_content = """from dagster import job, op

@op(config_schema={"input_path": str, "output_path": str, "workflow_id": str, "parameters": dict})
def load_data(context):
    # Placeholder for loading data
    pass

@op(config_schema={"input_path": str, "output_path": str, "workflow_id": str, "parameters": dict})
def process_data(context):
    # Placeholder for processing data
    pass

@op(config_schema={"input_path": str, "output_path": str, "workflow_id": str, "parameters": dict})
def save_data(context):
    # Placeholder for saving data
    pass

@job
def workflow_job():
    data = load_data()
    processed = process_data(data)
    save_data(processed)
"""
    encoded_content = base64.b64encode(dag_content.encode()).decode()
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
    }
    payload = {
        "message": f"Create DAG for workflow {workflow_id}",
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
            "commit_sha": response_data.get("commit", {}).get("sha")
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
                skip_structure=skip_structure
            )
        else:
            json_data = await request.json()
            workflow = WorkflowCreate(**json_data)
        logger.info(f"Creating new workflow: {workflow.name}")
        parsed_data = None
        storage_url = None
        if file and not skip_structure:
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
            result = db.execute(
                text("""
                    INSERT INTO workflow.workflow (
                        name, description, created_by, status,
                        input_file_path, input_structure,
                        created_at, updated_at,
                        dag_path, commit_sha, config_template, default_parameters,
                        dagster_location_name, dagster_repository_name,
                        requires_file, output_file_pattern, supported_file_types
                    ) VALUES (
                        :name, :description, :created_by, :status,
                        :input_file_path, :input_structure,
                        NOW(), NOW(),
                        :dag_path, :commit_sha, :config_template, :default_parameters,
                        :dagster_location_name, :dagster_repository_name,
                        :requires_file, :output_file_pattern, :supported_file_types
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
                    "config_template": json.dumps({
                        "ops": {
                            "load_data": {"config": {"input_path": "{input_file_path}", "output_path": "{output_file_path}", "workflow_id": "{workflow_id}", "parameters": {}}},
                            "process_data": {"config": {"input_path": "{input_file_path}", "output_path": "{output_file_path}", "workflow_id": "{workflow_id}", "parameters": {}}},
                            "save_data": {"config": {"input_path": "{input_file_path}", "output_path": "{output_file_path}", "workflow_id": "{workflow_id}", "parameters": {}}}
                        },
                        "resources": {
                            "s3": {
                                "config": {
                                    "s3_region": S3_REGION,
                                    "s3_bucket": S3_BUCKET,
                                    "aws_access_key_id": {"env": "AWS_ACCESS_KEY_ID"},
                                    "aws_secret_access_key": {"env": "AWS_SECRET_ACCESS_KEY"}
                                }
                            }
                        }
                    }),
                    "default_parameters": json.dumps({}),
                    "dagster_location_name": "server.app.dagster.repo",
                    "dagster_repository_name": "__repository__",
                    "requires_file": not skip_structure,
                    "output_file_pattern": f"workflow-files/outputs/output_{{workflow_id}}_{{run_uuid}}.{workflow.destination or 'csv'}",
                    "supported_file_types": json.dumps(["csv", "xlsx", "json"])
                }
            )
            workflow_record = result.fetchone()
            db.commit()
            logger.info("Workflow inserted successfully")
            # Create DAG in GitHub
            dag_info = create_github_dag(workflow_record.id, workflow.name)

            # Update workflow with dag_path and commit_sha
            db.execute(
                text("""
                    UPDATE workflow.workflow
                    SET dag_path = :dag_path, commit_sha = :commit_sha
                    WHERE id = :id
                """),
                {"dag_path": dag_info["dag_path"], "commit_sha": dag_info["commit_sha"], "id": workflow_record.id}
            )
            db.commit()
            logger.info(f"Updated workflow {workflow_record.id} with dag_path: {dag_info['dag_path']}")
        except Exception as db_error:
            logger.error(f"Database insertion failed: {str(db_error)}")
            db.rollback()
            raise HTTPException(500, f"Database insertion failed: {str(db_error)}")
        response_data = {
            "message": "Workflow created successfully",
            "workflow": dict(workflow_record._mapping) | {"dag_path": dag_info["dag_path"], "commit_sha": dag_info["commit_sha"]}
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
        db.rollback()
        raise HTTPException(500, f"Workflow creation failed: {str(e)}")

@router.post("/workflow/update")
async def update_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """Update an existing workflow"""
    try:
        logger.info(f"Updating workflow {workflow.workflow_id}")
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
                    updated_at = NOW(),
                    requires_file = :requires_file,
                    output_file_pattern = :output_file_pattern,
                    supported_file_types = :supported_file_types,
                    dag_path = :dag_path
                WHERE id = :workflow_id
                RETURNING id, name, description, status, dag_path
            """),
            {
                "workflow_id": workflow.workflow_id,
                "name": workflow.name,
                "description": workflow.description,
                "created_by": workflow.created_by,
                "status": workflow.status,
                "parameters": json.dumps(workflow.parameters),
                "destination": workflow.destination,
                "destination_config": json.dumps(workflow.destination_config) if workflow.destination_config else None,
                "requires_file": workflow.skip_structure,
                "output_file_pattern": f"workflow-files/outputs/output_{{workflow_id}}_{{run_uuid}}.{workflow.destination or 'csv'}",
                "supported_file_types": json.dumps(["csv", "xlsx", "json"]),
                "dag_path": workflow.dag_path
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
                    destination, destination_config,
                    requires_file, output_file_pattern, supported_file_types,
                    created_at, updated_at
                FROM workflow.workflow
                WHERE id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        )
        workflow = result.fetchone()
        if not workflow:
            raise HTTPException(404, "Workflow not found")
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
            "workflow": dict(workflow._mapping),
            "destination": {
                "destination_type": workflow.destination,
                "table_name": workflow.destination_config.get("tableName") if workflow.destination_config else None,
                "file_path": workflow.output_file_pattern
            },
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
    # Construct the path to the DAG file within the repo
    file_in_repo_path = f"{GITHUB_DAG_PATH}/{dag_path}.py"

    # API endpoint to get *commits* for a specific file
    commits_url = f"https://api.github.com/repos/{GITHUB_REPO}/commits"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }
    params = {
        "path": file_in_repo_path,
        "per_page": 1, # We only need the latest commit
        "sha": "main" # Or your desired branch name
    }

    try:
        logger.info(f"Fetching GitHub commit info for file: {file_in_repo_path} in repo: {GITHUB_REPO}")
        response = requests.get(commits_url, headers=headers, params=params)
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)

        commits_data = response.json()

        if not commits_data:
            logger.warning(f"No commits found for file: {file_in_repo_path}")
            return {"authorized": True, "message": "DAG file exists, but no commit history found directly via path.", "version": "N/A", "last_updated": "N/A", "author": "N/A", "commit_message": "N/A"}

        latest_commit = commits_data[0] # Get the first (most recent) commit

        # Extract relevant information
        version = latest_commit["sha"][:7] # Short SHA
        last_updated = latest_commit["commit"]["committer"]["date"]
        author = latest_commit["commit"]["author"]["name"]
        commit_message = latest_commit["commit"]["message"]

        logger.info(f"Successfully retrieved DAG info for {file_in_repo_path}. Version: {version}")

        return {
            "authorized": True,
            "version": version,
            "last_updated": last_updated,
            "author": author,
            "commit_message": commit_message
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

