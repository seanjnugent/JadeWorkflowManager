import sys
import os
import importlib.util
import logging
from typing import List
import boto3
from botocore.config import Config
from github import Github, GithubException
from dotenv import load_dotenv

from dagster import (
    Definitions,
    JobDefinition,
    OpExecutionContext,
    Field,
    StringSource,
    EnvVar,
    resource,
    job,
    success_hook,
    failure_hook,
    sensor,
    SensorEvaluationContext,
    RunRequest,
    DagsterRunStatus,
    DagsterEventType,
)
from sqlalchemy import create_engine, text
from dagster._core.storage.event_log.sql_event_log import SqlEventLogStorage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('dagster_repo.log')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# --- GitHub Configuration ---
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
GITHUB_BRANCH = "main"

# Validate env vars
if not GITHUB_ACCESS_TOKEN:
    logger.error("GITHUB_ACCESS_TOKEN not set in .env")
    raise ValueError("GITHUB_ACCESS_TOKEN not set in .env")

# --- Resources ---
@resource(config_schema={
    "SUPABASE_URL": Field(StringSource, is_required=False, default_value=EnvVar("SUPABASE_URL")),
    "SUPABASE_KEY": Field(StringSource, is_required=False, default_value=EnvVar("SUPABASE_KEY")),
    "S3_ACCESS_KEY_ID": Field(StringSource, is_required=False, default_value=EnvVar("S3_ACCESS_KEY_ID")),
    "S3_SECRET_ACCESS_KEY": Field(StringSource, is_required=False, default_value=EnvVar("S3_SECRET_ACCESS_KEY")),
    "S3_REGION": Field(StringSource, is_required=False, default_value=os.getenv("S3_REGION", "eu-west-2")),
    "S3_ENDPOINT": Field(StringSource, is_required=False, default_value=EnvVar("S3_ENDPOINT"))
})
def supabase_resource(init_context):
    try:
        config = init_context.resource_config
        client = boto3.client(
            "s3",
            region_name=config["S3_REGION"],
            endpoint_url=config["S3_ENDPOINT"],
            aws_access_key_id=config["S3_ACCESS_KEY_ID"],
            aws_secret_access_key=config["S3_SECRET_ACCESS_KEY"],
            config=Config(s3={"addressing_style": "path"})
        )
        logger.info("Initialized Supabase client successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise

@resource(config_schema={
    "DATABASE_URL": Field(StringSource, is_required=False, default_value=EnvVar("DATABASE_URL"))
})
def db_engine_resource(init_context):
    try:
        engine = create_engine(init_context.resource_config["DATABASE_URL"])
        logger.info("Initialized database engine successfully")
        return engine
    except Exception as e:
        logger.error(f"Failed to create database engine: {str(e)}")
        raise

# --- Hooks ---
@success_hook(required_resource_keys={"db_engine"})
def log_success(context: OpExecutionContext):
    workflow_id = context.op_config.get("workflow_id") if context.op_config else None
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                INSERT INTO workflow.run_log 
                (dagster_run_id, workflow_id, step_code, log_level, message, timestamp) 
                VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_code": context.op.name,
                    "log_level": "info",
                    "message": f"Operation {context.op.name} completed successfully"
                }
            )
            conn.commit()
        logger.info(f"Logged success for op {context.op.name} in run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log success for op {context.op.name}: {str(e)}")

@failure_hook(required_resource_keys={"db_engine"})
def log_failure(context: OpExecutionContext):
    workflow_id = context.op_config.get("workflow_id") if context.op_config else None
    error = str(context.op_exception) if context.op_exception else "Unknown error"
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                INSERT INTO workflow.run_log 
                (dagster_run_id, workflow_id, step_code, log_level, message, timestamp) 
                VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_code": context.op.name,
                    "log_level": "error",
                    "message": f"Operation {context.op.name} failed: {error}"
                }
            )
            conn.commit()
        logger.info(f"Logged failure for op {context.op.name} in run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log failure for op {context.op.name}: {str(e)}")

# --- Sensor ---
@sensor(
    job_name=None,
    minimum_interval_seconds=30,
    required_resource_keys={"db_engine"}
)
def run_status_sensor(context: SensorEvaluationContext):
    """Sensor to monitor Dagster run and step status and update database."""
    context.log.info("Starting sensor evaluation")  # Use context.log instead of logger
    
    try:
        # Get event log storage
        event_log_storage = context.instance.event_log_storage
        if not isinstance(event_log_storage, SqlEventLogStorage):
            context.log.error("Event log storage is not SQL-based")
            return

        # Use cursor to track processed events
        last_event_id = int(context.cursor) if context.cursor else 0
        events = event_log_storage.get_logs_for_all_runs_by_log_id(
            after_id=last_event_id,
            limit=1000
        )

        if not events:
            logger.info("No new events to process")
            return

        # Process events
        for event in events:
            event_id = event[0]
            dagster_event = event[1].dagster_event
            if not dagster_event:
                continue

            run_id = event[1].run_id
            timestamp = event[1].timestamp
            workflow_id = None
            config = None

            # Fetch run config to get workflow_id
            run = context.instance.get_run_by_id(run_id)
            if run and run.run_config:
                config = run.run_config
                workflow_id = config.get("ops", {}).get(list(config.get("ops", {}).keys())[0], {}).get("config", {}).get("workflow_id")

            with context.resources.db_engine.connect() as conn:
                # Handle run-level events
                if dagster_event.event_type in [
                    DagsterEventType.RUN_START,
                    DagsterEventType.RUN_SUCCESS,
                    DagsterEventType.RUN_FAILURE,
                    DagsterEventType.RUN_CANCELED
                ]:
                    status = {
                        DagsterEventType.RUN_START: "STARTED",
                        DagsterEventType.RUN_SUCCESS: "SUCCESS",
                        DagsterEventType.RUN_FAILURE: "FAILURE",
                        DagsterEventType.RUN_CANCELED: "CANCELED"
                    }.get(dagster_event.event_type, "UNKNOWN")
                    error_message = dagster_event.event_specific_data.error.message if dagster_event.event_specific_data and dagster_event.event_specific_data.error else None

                    # Update workflow.run
                    conn.execute(
                        text('''
                        UPDATE workflow.run
                        SET
                            status = :status,
                            finished_at = CASE WHEN :status IN ('SUCCESS', 'FAILURE', 'CANCELED') THEN :timestamp ELSE finished_at END,
                            duration_ms = CASE WHEN :status IN ('SUCCESS', 'FAILURE', 'CANCELED') THEN EXTRACT(EPOCH FROM (:timestamp - started_at)) * 1000 ELSE duration_ms END,
                            error_message = :error_message
                        WHERE dagster_run_id = :run_id
                        '''),
                        {
                            "status": status,
                            "timestamp": timestamp,
                            "run_id": run_id,
                            "error_message": error_message
                        }
                    )

                    # Log to workflow.run_log
                    conn.execute(
                        text('''
                        INSERT INTO workflow.run_log
                        (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                        VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, :timestamp)
                        '''),
                        {
                            "run_id": run_id,
                            "workflow_id": workflow_id,
                            "step_code": None,
                            "log_level": "info" if status != "FAILURE" else "error",
                            "message": f"Run {status.lower()}",
                            "timestamp": timestamp
                        }
                    )

                # Handle step-level events
                if dagster_event.event_type in [
                    DagsterEventType.STEP_START,
                    DagsterEventType.STEP_SUCCESS,
                    DagsterEventType.STEP_FAILURE
                ]:
                    step_key = dagster_event.step_key
                    status = {
                        DagsterEventType.STEP_START: "STARTED",
                        DagsterEventType.STEP_SUCCESS: "SUCCESS",
                        DagsterEventType.STEP_FAILURE: "FAILURE"
                    }.get(dagster_event.event_type, "UNKNOWN")
                    error_message = dagster_event.event_specific_data.error.message if dagster_event.event_specific_data and dagster_event.event_specific_data.error else None

                    # Check if step status exists
                    result = conn.execute(
                        text('''
                        SELECT id FROM workflow.run_step_status
                        WHERE dagster_run_id = :run_id AND step_code = :step_code
                        '''),
                        {"run_id": run_id, "step_code": step_key}
                    )
                    step_status_id = result.fetchone()

                    if step_status_id:
                        # Update existing step status
                        conn.execute(
                            text('''
                            UPDATE workflow.run_step_status
                            SET
                                status = :status,
                                end_time = CASE WHEN :status IN ('SUCCESS', 'FAILURE') THEN :timestamp ELSE end_time END,
                                duration_ms = CASE WHEN :status IN ('SUCCESS', 'FAILURE') THEN EXTRACT(EPOCH FROM (:timestamp - start_time)) * 1000 ELSE duration_ms END,
                                error_message = :error_message
                            WHERE id = :id
                            '''),
                            {
                                "status": status,
                                "timestamp": timestamp,
                                "error_message": error_message,
                                "id": step_status_id[0]
                            }
                        )
                    else:
                        # Insert new step status
                        conn.execute(
                            text('''
                            INSERT INTO workflow.run_step_status
                            (dagster_run_id, workflow_id, step_code, status, start_time, run_id)
                            VALUES (:run_id, :workflow_id, :step_code, :status, :timestamp, (SELECT id FROM workflow.run WHERE dagster_run_id = :run_id))
                            '''),
                            {
                                "run_id": run_id,
                                "workflow_id": workflow_id,
                                "step_code": step_key,
                                "status": status,
                                "timestamp": timestamp
                            }
                        )

                    # Log to workflow.run_log
                    conn.execute(
                        text('''
                        INSERT INTO workflow.run_log
                        (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                        VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, :timestamp)
                        '''),
                        {
                            "run_id": run_id,
                            "workflow_id": workflow_id,
                            "step_code": step_key,
                            "log_level": "info" if status != "FAILURE" else "error",
                            "message": f"Step {step_key} {status.lower()}",
                            "timestamp": timestamp
                        }
                    )

                # Handle custom log messages
                if dagster_event.event_type == DagsterEventType.LOG_MESSAGE:
                    log_message = dagster_event.event_specific_data.log_message
                    log_level = dagster_event.event_specific_data.level.lower()
                    step_key = dagster_event.step_key

                    conn.execute(
                        text('''
                        INSERT INTO workflow.run_log
                        (dagster_run_id, workflow_id, step_code, log_level, message, timestamp)
                        VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, :timestamp)
                        '''),
                        {
                            "run_id": run_id,
                            "workflow_id": workflow_id,
                            "step_code": step_key,
                            "log_level": log_level,
                            "message": log_message,
                            "timestamp": timestamp
                        }
                    )

                conn.commit()

            # Update cursor to the last processed event
            context.update_cursor(str(event_id))

        logger.info(f"Processed {len(events)} events, last event ID: {event_id}")

    except Exception as e:
        logger.error(f"Sensor failed: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

# --- Dynamic Job Loader ---
def load_jobs_from_github(directory: str = "DAGs") -> List[JobDefinition]:
    jobs = []
    try:
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        logger.info(f"Successfully accessed repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")

        try:
            contents = repo.get_contents(directory, ref=GITHUB_BRANCH)
        except GithubException as e:
            if e.status == 404:
                try:
                    root_contents = repo.get_contents("", ref=GITHUB_BRANCH)
                    dirs = [c.path for c in root_contents if c.type == "dir"]
                    logger.error(f"Directory '{directory}' not found. Available directories: {dirs}")
                except Exception as ex:
                    logger.error(f"Failed to list root directories: {str(ex)}")
            raise

        for content in contents:
            if content.path.endswith(".py"):
                module_name = content.name.replace(".py", "")
                try:
                    file_content = content.decoded_content.decode('utf-8')
                    
                    module_globals = {
                        '__name__': module_name,
                        '__file__': f'<github:{content.path}>',
                        'sys': sys,
                        'os': os,
                        'json': __import__('json'),
                        'io': __import__('io'),
                        'datetime': __import__('datetime'),
                        'load_dotenv': load_dotenv,
                        'pd': __import__('pandas'),
                        'boto3': boto3,
                        'create_engine': create_engine,
                        'text': text,
                        'job': job,
                        'op': __import__('dagster').op,
                        'OpExecutionContext': OpExecutionContext,
                        'Out': __import__('dagster').Out,
                        'In': __import__('dagster').In,
                        'Field': Field,
                        'Int': __import__('dagster').Int,
                        'String': __import__('dagster').String,
                        'Permissive': __import__('dagster').Permissive,
                        'Dict': dict,
                        'Optional': type(None),
                        'List': list,
                    }
                    
                    try:
                        from botocore.config import Config as BotoConfig
                        module_globals['BotoConfig'] = BotoConfig
                    except ImportError:
                        pass
                    
                    exec(file_content, module_globals)
                    
                    for name, obj in module_globals.items():
                        if isinstance(obj, JobDefinition):
                            obj._resource_defs = {
                                "supabase": supabase_resource,
                                "db_engine": db_engine_resource
                            }
                            obj._hooks = {log_success, log_failure}
                            jobs.append(obj)
                            logger.info(f"Successfully loaded job: {name} from {content.path}")
                            break
                            
                except Exception as e:
                    logger.error(f"Failed to load job from {content.path}: {str(e)}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    continue
                    
    except GithubException as e:
        logger.error(f"GitHub API error accessing {directory}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error loading GitHub jobs from {directory}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
    return jobs

# --- Get Jobs Function ---
def get_all_jobs():
    """Get all jobs from GitHub sources only"""
    try:
        github_jobs = load_jobs_from_github(directory="DAGs")
        
        if not github_jobs:
            logger.warning("No jobs loaded from GitHub, check GITHUB_ACCESS_TOKEN or DAGs/ directory")
        else:
            logger.info(f"Successfully loaded {len(github_jobs)} jobs from GitHub")
            
        return github_jobs
        
    except Exception as e:
        logger.error(f"Failed to load jobs: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

# --- Definitions for Dagster ---
defs = Definitions(
    jobs=get_all_jobs(),
    resources={
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    },
    sensors=[run_status_sensor]
)

if __name__ == "__main__":
    logger.info("Testing repository loading")
    try:
        jobs = get_all_jobs()
        for job_def in jobs:
            logger.info(f"Found job: {job_def.name}")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")