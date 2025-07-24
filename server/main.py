from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging
import os
from fastapi.responses import JSONResponse
import sys

app = FastAPI(root_path="/api")

# Configure logging with detailed format and file output
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logs during troubleshooting
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),  # Log to console
        logging.FileHandler("app.log")      # Log to file for persistence
    ]
)
logger = logging.getLogger(__name__)

# Log application startup
logger.info("Starting FastAPI application...")

# Load environment variables
try:
    logger.debug("Loading environment variables from .env file")
    load_dotenv()
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.error(f"Failed to load environment variables: {str(e)}", exc_info=True)
    raise

# CORS setup
logger.debug("Configuring CORS middleware")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware configured")

@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return JSONResponse(content={"status": "ok"}, status_code=200)

# Import routes with logging
logger.debug("Importing routes")
try:
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
    logger.info("All routes imported successfully")
except ImportError as e:
    logger.error(f"Failed to import routes: {str(e)}", exc_info=True)
    raise

# Include routers
logger.debug("Including routers")
app.include_router(health_check_router)
app.include_router(workflow_destination_router)
app.include_router(get_workflows_router)
app.include_router(get_workflow_router)
app.include_router(post_new_workflow_router)
app.include_router(workflow_permissions)
app.include_router(post_update_workflow_config_router)
app.include_router(file_router)
app.include_router(get_run_router)
app.include_router(get_runs_router)
app.include_router(post_run_step_status_router)
app.include_router(get_analytics_router)
app.include_router(connections_router)
app.include_router(update_workflow_router)
app.include_router(post_new_dag_router)
app.include_router(dag_repo_access)
app.include_router(post_trigger_workflow_router)
app.include_router(post_sync_run_status_router)
app.include_router(get_run_status_router)
app.include_router(user_authentication)
app.include_router(user_details)
app.include_router(user_list)
app.include_router(get_user_activity_router)
logger.info("All routers included successfully")

# ========== Configuration Validation ==========
def validate_config():
    """Validate all required environment variables and test connections"""
    logger.info("Starting configuration validation")
    errors = []

    # S3 validation
    logger.debug("Validating S3 configuration")
    try:
        if not os.getenv("S3_ACCESS_KEY_ID"):
            errors.append("S3_ACCESS_KEY_ID is required")
        if not os.getenv("S3_SECRET_ACCESS_KEY"):
            errors.append("S3_SECRET_ACCESS_KEY is required")
        if not os.getenv("S3_REGION"):
            errors.append("S3_REGION is required")
        if not os.getenv("S3_BUCKET"):
            errors.append("S3_BUCKET is required")
        logger.info("S3 configuration validated")
    except Exception as e:
        logger.error(f"S3 configuration validation failed: {str(e)}", exc_info=True)
        errors.append(f"S3 validation error: {str(e)}")

    # Database validation
    logger.debug("Validating database configuration")
    try:
        if not os.getenv("DATABASE_URL"):
            required_db_vars = ["DB_USER", "DB_PASSWORD", "DB_HOST", "DB_NAME"]
            missing_db_vars = [var for var in required_db_vars if not os.getenv(var)]
            if missing_db_vars:
                errors.append(f"Missing database config: {', '.join(missing_db_vars)}")
        else:
            # Attempt to establish a database connection
            try:
                import sqlalchemy
                engine = sqlalchemy.create_engine(os.getenv("DATABASE_URL"))
                with engine.connect() as connection:
                    logger.info("Database connection successful")
            except Exception as e:
                logger.error(f"Database connection failed: {str(e)}", exc_info=True)
                errors.append(f"Database connection error: {str(e)}")
    except Exception as e:
        logger.error(f"Database configuration validation failed: {str(e)}", exc_info=True)
        errors.append(f"Database validation error: {str(e)}")

    # Dagster validation
    logger.debug("Validating Dagster configuration")
    try:
        if not os.getenv("DAGSTER_API_URL"):
            errors.append("DAGSTER_API_URL is required")
        else:
            # Attempt to ping Dagster API
            try:
                import requests
                response = requests.get(f"{os.getenv('DAGSTER_API_URL')}/health", timeout=5)
                if response.status_code == 200:
                    logger.info("Dagster API connection successful")
                else:
                    logger.warning(f"Dagster API returned status code: {response.status_code}")
                    errors.append(f"Dagster API connection issue: Status code {response.status_code}")
            except Exception as e:
                logger.error(f"Dagster API connection failed: {str(e)}", exc_info=True)
                errors.append(f"Dagster API connection error: {str(e)}")
    except Exception as e:
        logger.error(f"Dagster configuration validation failed: {str(e)}", exc_info=True)
        errors.append(f"Dagster validation error: {str(e)}")

    if errors:
        logger.error("Configuration validation failed with errors:\n- " + "\n- ".join(errors))
        raise ValueError("Configuration errors:\n- " + "\n- ".join(errors))
    logger.info("Configuration validation completed successfully")

# Run configuration validation
try:
    validate_config()
except Exception as e:
    logger.critical(f"Application startup failed: {str(e)}", exc_info=True)
    raise
