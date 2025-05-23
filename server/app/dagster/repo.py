from dagster import repository, JobDefinition, success_hook, failure_hook, OpExecutionContext
from sqlalchemy import create_engine, text
import importlib
import pathlib
import sys
import logging
import os  # Added this import
from dotenv import load_dotenv
from .dagster_event_listener import workflow_run_status_sensor  # Removed workflow_run_sensor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to jobs directory
jobs_dir = pathlib.Path(__file__).parent / "jobs"

# Add jobs directory to sys.path
if str(jobs_dir) not in sys.path:
    sys.path.append(str(jobs_dir))

load_dotenv()

@success_hook(required_resource_keys={"db_engine"})
def log_success(context: OpExecutionContext):
    """Hook that runs on successful completion of an operation"""
    workflow_id = context.op_config.get("workflow_id")
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_id, log_level, message, timestamp) VALUES (:run_id, :workflow_id, :step_id, :log_level, :message, NOW())'),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": context.op.name,
                    "log_level": "info",
                    "message": f"Operation {context.op.name} completed successfully"
                }
            )
            conn.commit()
            logger.info(f"Logged success for op {context.op.name}, workflow {workflow_id}, run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log success for op {context.op.name}: {str(e)}")

@failure_hook(required_resource_keys={"db_engine"})
def log_failure(context: OpExecutionContext):
    """Hook that runs on operation failure"""
    workflow_id = context.op_config.get("workflow_id")
    error_message = context.op_exception.message if context.op_exception else "Unknown error"
    
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('INSERT INTO workflow.run_log (dagster_run_id, workflow_id, step_id, log_level, message, timestamp) VALUES (:run_id, :workflow_id, :step_id, :log_level, :message, NOW())'),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_id": context.op.name,
                    "log_level": "error",
                    "message": f"Operation {context.op.name} failed: {error_message}"
                }
            )
            conn.commit()
            logger.info(f"Logged failure for op {context.op.name}, workflow {workflow_id}, run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log failure for op {context.op.name}: {str(e)}")

@repository
def workflow_repository():
    # Dynamically load jobs
    jobs = []
    for job_file in jobs_dir.glob("*.py"):
        module_name = job_file.stem
        try:
            module = importlib.import_module(module_name)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, JobDefinition):
                    jobs.append(attr)
        except Exception as e:
            logger.error(f"Failed to load job from {module_name}: {str(e)}")
    
    # Include sensors
    sensors = [
        workflow_run_status_sensor  # Removed workflow_run_sensor and db_engine parameter
    ]
    
    return jobs + sensors