from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os
from fastapi.responses import JSONResponse

app = FastAPI(root_path="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables FIRST
load_dotenv()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return JSONResponse(content={"status": "ok"}, status_code=200)

# Import routes
from routes.get_health_check import router as health_check_router
from routes.workflows.post_workflow_destination import router as workflow_destination_router
from routes.workflows.get_workflow import router as get_workflow_router
from routes.workflows.get_workflows import router as get_workflows_router
from routes.workflows.post_new_workflow import router as post_new_workflow_router
from routes.analytics.get_analytics import router as get_analytics_router

from routes.files.get_file import router as file_router

from routes.runs.get_run import router as get_run_router
from routes.runs.get_runs import router as get_runs_router
from routes.runs.post_run_step_status import router as post_run_step_status_router
from routes.runs.post_trigger_workflow import router as post_trigger_workflow_router
from routes.runs.post_validate_file import router as post_validate_file_router
from routes.runs.post_sync_run_status import router as post_sync_run_status_router
from routes.runs.get_run_status import router as get_run_status_router

from routes.connections.post_new_connection import router as connections_router
from routes.workflows.post_update_workflow import router as update_workflow_router
from routes.workflows.get_workflow_permissions import router as workflow_permissions
from routes.workflows.post_update_workflow_config import router as post_update_workflow_config_router

from routes.users.user_authentication import router as user_authentication
from routes.users.user_details import router as user_details
from routes.users.get_user_activity import router as get_user_activity_router

from routes.users.user_list import router as user_list
from routes.dags.post_new_dag import router as post_new_dag_router
from routes.dags.get_dag_repo_access import router as dag_repo_access

# Include routers
app.include_router(health_check_router)
app.include_router(workflow_destination_router)

# Workflows
app.include_router(get_workflows_router)
app.include_router(get_workflow_router)
app.include_router(post_new_workflow_router)
app.include_router(workflow_permissions)
app.include_router(post_update_workflow_config_router)
app.include_router(file_router)

# Runs
app.include_router(get_run_router)
app.include_router(get_runs_router)
app.include_router(post_run_step_status_router)
app.include_router(get_analytics_router)
app.include_router(post_validate_file_router)
app.include_router(connections_router)
app.include_router(update_workflow_router)
app.include_router(post_new_dag_router)
app.include_router(dag_repo_access)
app.include_router(post_trigger_workflow_router)
app.include_router(post_sync_run_status_router)
app.include_router(get_run_status_router)

# Users
app.include_router(user_authentication)
app.include_router(user_details)
app.include_router(user_list)
app.include_router(get_user_activity_router)

# ========== Configuration Validation ==========
def validate_config():
    """Validate all required environment variables"""
    errors = []

    # S3 validation
    if not os.getenv("S3_ACCESS_KEY_ID"):
        errors.append("S3_ACCESS_KEY_ID is required")
    if not os.getenv("S3_SECRET_ACCESS_KEY"):
        errors.append("S3_SECRET_ACCESS_KEY is required")
    if not os.getenv("S3_REGION"):
        errors.append("S3_REGION is required")
    if not os.getenv("S3_BUCKET"):
        errors.append("S3_BUCKET is required")

    # Database validation
    if not os.getenv("DATABASE_URL"):
        required_db_vars = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"]
        missing_db_vars = [var for var in required_db_vars if not os.getenv(var)]
        if missing_db_vars:
            errors.append(f"Missing database config: {', '.join(missing_db_vars)}")

    # Dagster validation
    if not os.getenv("DAGSTER_API_URL"):
        errors.append("DAGSTER_API_URL is required")

    if errors:
        raise ValueError("Configuration errors:\n- " + "\n- ".join(errors))

validate_config()