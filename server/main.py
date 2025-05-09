from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables FIRST
load_dotenv()

# Configure FastAPI app
app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routes
from routes.get_health_check import router as health_check_router
from routes.post_new_workflow import router as workflow_router
from routes.workflow_steps import router as workflow_steps_router
from routes.post_workflow_destination import router as workflow_destination_router
from routes.dagster_runs import router as runs_router
from routes.get_workflows import router as list_workflows_router
from routes.get_workflow import router as get_workflow_router
from routes.get_run import router as get_run_router
from routes.post_new_connection import router as connections_router
from routes.post_update_workflow import router as update_workflow_router
from routes.post_new_workflow_step import router as new_workflow_steps_router
from routes.post_user_authentication import router as user_authentication
from routes.post_new_dag import router as post_new_dag_router
from routes.post_new_run import router as post_new_run_router

# Include routers
app.include_router(health_check_router)
app.include_router(workflow_router, prefix="/workflow", tags=["workflow"])
app.include_router(workflow_steps_router)
app.include_router(workflow_destination_router)
app.include_router(runs_router)
app.include_router(list_workflows_router)
app.include_router(get_workflow_router)
app.include_router(get_run_router)
app.include_router(connections_router)
app.include_router(update_workflow_router, prefix="/workflow", tags=["workflow"])
app.include_router(new_workflow_steps_router, prefix="/workflow", tags=["workflow"])
app.include_router(user_authentication)
app.include_router(post_new_dag_router)
app.include_router(post_new_run_router)

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

    # Dagster validation
    if not os.getenv("DAGSTER_API_URL"):
        errors.append("DAGSTER_API_URL is required")

    if errors:
        raise ValueError("Configuration errors:\n- " + "\n- ".join(errors))

validate_config()