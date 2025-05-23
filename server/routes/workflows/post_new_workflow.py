from fastapi import APIRouter, File, UploadFile, HTTPException, Form, Depends
from sqlalchemy.orm import Session
from app.file_parser import parser_map
import pandas as pd
import io
import uuid
import json
import logging
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from ..get_health_check import get_db, supabase, engine
from dotenv import load_dotenv
from sqlalchemy import text
import os 

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    created_by: int
    status: Optional[str] = "Draft"

router = APIRouter(prefix="/workflows", tags=["workflows"])

def upload_to_storage(file_path: str, content: bytes) -> str:
    """Upload file to Supabase storage with retry logic"""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                path=file_path,
                file=content,
                file_options={"content-type": "application/octet-stream"}
            )
            logger.info(f"File uploaded successfully to {SUPABASE_BUCKET}/{file_path}")
            return f"{SUPABASE_BUCKET}/{file_path}"
        except Exception as e:
            logger.error(f"Upload attempt {attempt + 1} failed: {str(e)}")
            if attempt == max_retries - 1:
                raise HTTPException(500, f"Failed to upload file after {max_retries} attempts: {str(e)}")
            continue
    raise HTTPException(500, "Unexpected error in file upload")
from fastapi import Request
from fastapi.encoders import jsonable_encoder

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
    """Create a new workflow with optional file upload"""
    try:
        # Check content type to handle both form and JSON
        content_type = request.headers.get('content-type')
        
        if content_type and 'application/json' in content_type:
            # Handle JSON payload
            json_data = await request.json()
            workflow = WorkflowCreate(
                name=json_data.get('name'),
                description=json_data.get('description'),
                created_by=json_data.get('created_by'),
                status=json_data.get('status', 'Draft')
            )
            skip_structure = json_data.get('skip_structure', False)
        else:
            # Handle form data
            workflow = WorkflowCreate(
                name=name,
                description=description,
                created_by=created_by,
                status=status
            )

        logger.info(f"Creating new workflow: {workflow.name}")

        parsed_data = None
        storage_url = None

        # Only process file if not skipping structure
        if file and not skip_structure:
            # Validate file
            if not file.filename or "." not in file.filename:
                logger.error("Invalid filename")
                raise HTTPException(400, "Invalid filename")

            file_ext = file.filename.split(".")[-1].lower()
            logger.info(f"File extension: {file_ext}")

            parser = parser_map.get(file_ext)
            if not parser:
                logger.error(f"Unsupported file type: {file_ext}")
                raise HTTPException(400, f"Unsupported file type: {file_ext}")

            # Read and parse file
            content = await file.read()
            logger.info("Parsing file content")
            try:
                df = await parser.parse(content)
            except Exception as parse_error:
                logger.error(f"Failed to parse file: {str(parse_error)}")
                raise HTTPException(500, f"File parsing failed: {str(parse_error)}")

            # Generate unique path for the file
            file_path = f"workflows/{workflow.name}/{uuid.uuid4()}.{file_ext}"
            logger.info(f"Generated file path: {file_path}")

            # Upload file to Supabase storage
            logger.info("Uploading file to Supabase")
            storage_url = upload_to_storage(file_path, content)

            # Format the parsed structure
            logger.info("Formatting parsed data")
            try:
                parsed_data = parser.format_response(df, storage_url)
            except Exception as format_error:
                logger.error(f"Failed to format parsed data: {str(format_error)}")
                raise HTTPException(500, f"Failed to format parsed data: {str(format_error)}")

        # Insert into workflow table
        logger.info("Inserting workflow into database")
        try:
            result = db.execute(
                text("""
                    INSERT INTO workflow.workflow (
                        name, description, created_by, status,
                        input_file_path, input_structure,
                        created_at, updated_at
                    ) VALUES (
                        :name, :description, :created_by, :status,
                        :input_file_path, :input_structure,
                        NOW(), NOW()
                    )
                    RETURNING id, name, description, status, input_file_path
                """),
                {
                    "name": workflow.name,
                    "description": workflow.description,
                    "created_by": workflow.created_by,
                    "status": workflow.status,
                    "input_file_path": storage_url,
                    "input_structure": json.dumps(parsed_data["structure"]) if parsed_data else None
                }
            )
            workflow_record = result.fetchone()
            db.commit()
            logger.info("Workflow inserted successfully")
        except Exception as db_error:
            logger.error(f"Database insertion failed: {str(db_error)}")
            db.rollback()
            raise HTTPException(500, f"Database insertion failed: {str(db_error)}")

        response_data = {
            "message": "Workflow created successfully",
            "workflow": dict(workflow_record._mapping),
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