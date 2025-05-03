from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from server.app.file_parser import parser_map
from supabase import create_client, Client
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import pandas as pd
import io
import os
import uuid
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import json
from datetime import datetime
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables FIRST
load_dotenv()

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Configuration Validation ==========
def validate_config():
    """Validate all required environment variables"""
    errors = []
    
    # Supabase validation
    if not os.getenv("SUPABASE_URL"):
        errors.append("SUPABASE_URL is required")
    if not os.getenv("SUPABASE_SERVICE_ROLE"):
        errors.append("SUPABASE_SERVICE_ROLE is required")
    
    # Database validation
    if not os.getenv("DATABASE_URL"):
        required_db_vars = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"]
        missing_db_vars = [var for var in required_db_vars if not os.getenv(var)]
        if missing_db_vars:
            errors.append(f"Missing database config: {', '.join(missing_db_vars)}")
    
    if errors:
        raise ValueError("Configuration errors:\n- " + "\n- ".join(errors))

validate_config()

# ========== Supabase Configuration ==========
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

# Initialize Supabase client with service role
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    # Test connection
    supabase.storage.list_buckets()
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

# ========== Database Configuration ==========
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Construct from individual components
    DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME')}"

# Verify the URL is not None before creating engine
if not DATABASE_URL:
    raise ValueError("Database URL cannot be None")

# Initialize database engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ========== Pydantic Models ==========
class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    created_by: int
    status: Optional[str] = "Draft"

class WorkflowStepCreate(BaseModel):
    step_order: int
    label: str
    code_type: str
    code: str
    input_file_pattern: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class WorkflowDestinationCreate(BaseModel):
    destination_type: str
    connection_id: Optional[int] = None
    table_name: Optional[str] = None
    file_path: Optional[str] = None
    file_format: Optional[str] = None

class RunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    input_file_path: Optional[str] = None

class ConnectionCreate(BaseModel):
    name: str
    type: str
    host: str
    port: int
    database_name: str
    username: str
    password: str
    created_by: int

# ========== Helper Functions ==========
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

def download_from_storage(file_path: str) -> bytes:
    """Download file from Supabase storage with error handling"""
    try:
        if not file_path:
            raise ValueError("File path cannot be empty")
        
        if '/' not in file_path:
            raise ValueError("Invalid file path format")
            
        bucket, path = file_path.split("/", 1)
        data = supabase.storage.from_(bucket).download(path)
        logger.info(f"File downloaded successfully from {file_path}")
        return data
    except Exception as e:
        logger.error(f"Failed to download file from {file_path}: {str(e)}")
        raise HTTPException(500, f"Failed to download file: {str(e)}")

# ========== API Routes ==========
@app.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "supabase": "connected" if supabase else "disconnected",
        "database": "connected" if engine else "disconnected"
    }

@app.post("/workflow/new")
async def create_new_workflow(
    file: UploadFile = File(...),
    workflow: WorkflowCreate = Depends(),
    db: Session = Depends(get_db)
):
    """Create a new workflow with an uploaded file"""
    try:
        logger.info(f"Creating new workflow: {workflow.name}, file: {file.filename}")
        
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
                    "input_structure": json.dumps(parsed_data["structure"])
                }
            )
            workflow_record = result.fetchone()
            db.commit()
            logger.info("Workflow inserted successfully")
        except Exception as db_error:
            logger.error(f"Database insertion failed: {str(db_error)}")
            db.rollback()
            raise HTTPException(500, f"Database insertion failed: {str(db_error)}")

        return {
            "message": "Workflow created successfully",
            "workflow": dict(workflow_record._mapping),
            "file_info": {
                "path": storage_url,
                "schema": parsed_data["schema"],
                "preview": parsed_data["data"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow creation failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow creation failed: {str(e)}")

@app.post("/workflows/{workflow_id}/steps")
async def add_workflow_step(
    workflow_id: int,
    step: WorkflowStepCreate,
    db: Session = Depends(get_db)
):
    """Add a step to an existing workflow"""
    try:
        logger.info(f"Adding step to workflow {workflow_id}")
        result = db.execute(
            text("""
                INSERT INTO workflow.workflow_step (
                    workflow_id, step_order, label, code_type,
                    code, input_file_pattern, parameters,
                    created_at, updated_at
                ) VALUES (
                    :workflow_id, :step_order, :label, :code_type,
                    :code, :input_file_pattern, :parameters,
                    NOW(), NOW()
                )
                RETURNING id, step_order, label, code_type
            """),
            {
                "workflow_id": workflow_id,
                "step_order": step.step_order,
                "label": step.label,
                "code_type": step.code_type,
                "code": step.code,
                "input_file_pattern": step.input_file_pattern,
                "parameters": json.dumps(step.parameters) if step.parameters else None
            }
        )
        step_record = result.fetchone()
        db.commit()
        logger.info("Step added successfully")
        return {"step": dict(step_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to add step: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to add step: {str(e)}")

@app.post("/workflows/{workflow_id}/destination")
async def set_workflow_destination(
    workflow_id: int,
    destination: WorkflowDestinationCreate,
    db: Session = Depends(get_db)
):
    """Set the destination for a workflow"""
    try:
        logger.info(f"Setting destination for workflow {workflow_id}")
        result = db.execute(
            text("""
                INSERT INTO workflow.workflow_destination (
                    workflow_id, destination_type, connection_id,
                    table_name, file_path, file_format,
                    created_at, updated_at
                ) VALUES (
                    :workflow_id, :destination_type, :connection_id,
                    :table_name, :file_path, :file_format,
                    NOW(), NOW()
                )
                RETURNING id, destination_type
            """),
            {
                "workflow_id": workflow_id,
                "destination_type": destination.destination_type,
                "connection_id": destination.connection_id,
                "table_name": destination.table_name,
                "file_path": destination.file_path,
                "file_format": destination.file_format
            }
        )
        dest_record = result.fetchone()
        db.commit()
        logger.info("Destination set successfully")
        return {"destination": dict(dest_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to set destination: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to set destination: {str(e)}")

@app.post("/runs/")
async def create_run(
    run: RunCreate,
    db: Session = Depends(get_db)
):
    """Execute a workflow run"""
    try:
        logger.info(f"Creating run for workflow {run.workflow_id}")
        # Create run record
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, input_file_path,
                    status, started_at
                ) VALUES (
                    :workflow_id, :triggered_by, :input_file_path,
                    'running', NOW()
                )
                RETURNING id
            """),
            {
                "workflow_id": run.workflow_id,
                "triggered_by": run.triggered_by,
                "input_file_path": run.input_file_path
            }
        )
        run_id = result.fetchone()[0]
        db.commit()
        logger.info(f"Run {run_id} created")

        # Get workflow steps
        steps = db.execute(
            text("""
                SELECT * FROM workflow.workflow_step
                WHERE workflow_id = :workflow_id
                ORDER BY step_order
            """),
            {"workflow_id": run.workflow_id}
        ).fetchall()

        # Get destination
        destination = db.execute(
            text("""
                SELECT * FROM workflow.workflow_destination
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": run.workflow_id}
        ).fetchone()

        # Execute each step
        for step in steps:
            try:
                logger.info(f"Executing step {step.step_order} for run {run_id}")
                # Download input file if specified
                input_data = None
                if run.input_file_path:
                    file_content = download_from_storage(run.input_file_path)
                    input_data = pd.read_csv(io.BytesIO(file_content))

                # Execute the step based on code type
                if step.code_type == "python":
                    # In production, use a secure sandbox for Python execution
                    locals_dict = {"df": input_data}
                    if step.parameters:
                        locals_dict.update(json.loads(step.parameters))
                    exec(step.code, {}, locals_dict)
                    output_data = locals_dict.get("df")
                elif step.code_type == "sql":
                    # Execute SQL against the database
                    with engine.connect() as conn:
                        output_data = pd.read_sql(
                            step.code, 
                            conn,
                            params=json.loads(step.parameters) if step.parameters else None
                        )

                # Handle destination
                if destination:
                    if destination.destination_type == "database":
                        output_data.to_sql(
                            destination.table_name,
                            engine,
                            if_exists="append",
                            index=False
                        )
                    else:
                        # Save to file
                        output_path = destination.file_path
                        if destination.file_format == "csv":
                            output_data.to_csv(output_path, index=False)
                        elif destination.file_format == "json":
                            output_data.to_json(output_path, orient="records")

                # Log success
                db.execute(
                    text("""
                        INSERT INTO workflow.run_log (
                            run_id, step_id, log_level, message, timestamp
                        ) VALUES (
                            :run_id, :step_id, 'info', :message, NOW()
                        )
                    """),
                    {
                        "run_id": run_id,
                        "step_id": step.id,
                        "message": "Step executed successfully"
                    }
                )
                db.commit()
                logger.info(f"Step {step.step_order} executed successfully")

            except Exception as step_error:
                logger.error(f"Step {step.step_order} failed: {str(step_error)}")
                # Log failure
                db.execute(
                    text("""
                        INSERT INTO workflow.run_log (
                            run_id, step_id, log_level, message, timestamp
                        ) VALUES (
                            :run_id, :step_id, 'error', :message, NOW()
                        )
                    """),
                    {
                        "run_id": run_id,
                        "step_id": step.id,
                        "message": str(step_error)
                    }
                )
                # Mark run as failed
                db.execute(
                    text("""
                        UPDATE workflow.run
                        SET status = 'failed', error_message = :error, finished_at = NOW()
                        WHERE id = :run_id
                    """),
                    {
                        "run_id": run_id,
                        "error": str(step_error)
                    }
                )
                db.commit()
                raise HTTPException(500, f"Step {step.step_order} failed: {str(step_error)}")

        # Mark run as completed
        db.execute(
            text("""
                UPDATE workflow.run
                SET status = 'completed', finished_at = NOW()
                WHERE id = :run_id
            """),
            {"run_id": run_id}
        )
        db.commit()
        logger.info(f"Run {run_id} completed")
        return {"run_id": run_id, "status": "completed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Run failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Run failed: {str(e)}")

@app.get("/workflows/")
async def list_workflows(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List all workflows with pagination"""
    try:
        logger.info(f"Listing workflows, page {page}, limit {limit}")
        offset = (page - 1) * limit
        result = db.execute(
            text("""
                SELECT id, name, description, status, created_at
                FROM workflow.workflow
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": offset}
        )
        workflows = [dict(row._mapping) for row in result.fetchall()]

        count_result = db.execute(
            text("SELECT COUNT(*) FROM workflow.workflow")
        )
        total = count_result.fetchone()[0]

        logger.info(f"Retrieved {len(workflows)} workflows, total {total}")
        return {
            "workflows": workflows,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    except Exception as e:
        logger.error(f"Failed to fetch workflows: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflows: {str(e)}")

@app.get("/workflows/{workflow_id}")
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get workflow details including steps and destination"""
    try:
        logger.info(f"Fetching workflow {workflow_id}")
        # Get workflow metadata
        workflow = db.execute(
            text("""
                SELECT * FROM workflow.workflow
                WHERE id = :id
            """),
            {"id": workflow_id}
        ).fetchone()

        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(404, "Workflow not found")

        # Get workflow steps
        steps = db.execute(
            text("""
                SELECT * FROM workflow.workflow_step
                WHERE workflow_id = :workflow_id
                ORDER BY step_order
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        # Get destination
        destination = db.execute(
            text("""
                SELECT * FROM workflow.workflow_destination
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        ).fetchone()

        # Get recent runs
        runs = db.execute(
            text("""
                SELECT id, status, started_at, finished_at
                FROM workflow.run
                WHERE workflow_id = :workflow_id
                ORDER BY started_at DESC
                LIMIT 5
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        logger.info(f"Workflow {workflow_id} retrieved successfully")
        return {
            "workflow": dict(workflow._mapping),
            "steps": [dict(step._mapping) for step in steps],
            "destination": dict(destination._mapping) if destination else None,
            "recent_runs": [dict(run._mapping) for run in runs]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflow: {str(e)}")

@app.get("/runs/{run_id}")
async def get_run(
    run_id: int,
    db: Session = Depends(get_db)
):
    """Get run details including logs"""
    try:
        logger.info(f"Fetching run {run_id}")
        run = db.execute(
            text("""
                SELECT * FROM workflow.run
                WHERE id = : China's
            """),
            {"id": run_id}
        ).fetchone()

        if not run:
            logger.error(f"Run {run_id} not found")
            raise HTTPException(404, "Run not found")

        logs = db.execute(
            text("""
                SELECT * FROM workflow.run_log
                WHERE run_id = :run_id
                ORDER BY timestamp
            """),
            {"run_id": run_id}
        ).fetchall()

        logger.info(f"Run {run_id} retrieved successfully")
        return {
            "run": dict(run._mapping),
            "logs": [dict(log._mapping) for log in logs]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch run {run_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch run: {str(e)}")

@app.post("/connections/")
async def create_connection(
    connection: ConnectionCreate,
    db: Session = Depends(get_db)
):
    """Create a new database connection"""
    try:
        logger.info(f"Creating new connection: {connection.name}")
        result = db.execute(
            text("""
                INSERT INTO workflow.connection (
                    name, type, host, port,
                    database_name, username, password_hash,
                    created_by, created_at, updated_at
                ) VALUES (
                    :name, :type, :host, :port,
                    :database_name, :username, crypt(:password, gen_salt('bf')),
                    :created_by, NOW(), NOW()
                )
                RETURNING id, name, type, host
            """),
            {
                "name": connection.name,
                "type": connection.type,
                "host": connection.host,
                "port": connection.port,
                "database_name": connection.database_name,
                "username": connection.username,
                "password": connection.password,
                "created_by": connection.created_by
            }
        )
        conn_record = result.fetchone()
        db.commit()
        logger.info(f"Connection {connection.name} created successfully")
        return {"connection": dict(conn_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to create connection: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to create connection: {str(e)}")

@app.get("/connections/")
async def list_connections(
    db: Session = Depends(get_db)
):
    """List all connections (without passwords)"""
    try:
        logger.info("Listing connections")
        result = db.execute(
            text("""
                SELECT id, name, type, host, port, database_name, username
                FROM workflow.connection
                ORDER BY name
            """)
        )
        connections = [dict(row._mapping) for row in result.fetchall()]
        logger.info(f"Retrieved {len(connections)} connections")
        return connections
    except Exception as e:
        logger.error(f"Failed to fetch connections: {str(e)}")
        raise HTTPException(500, f"Failed to fetch connections: {str(e)}")