import os
import sys
import logging
from typing import List, Optional
from github import Github, GithubException
from dagster import (
    Definitions,
    JobDefinition,
    resource,
    Field,
    StringSource,
    EnvVar,
    success_hook,
    failure_hook,
    OpExecutionContext,
    sensor,
    SensorEvaluationContext,
    SensorResult,
    RunsFilter,
    DagsterRunStatus,
    job,
    op,
    graph,
    GraphDefinition
)
import boto3
from botocore.config import Config
from sqlalchemy import create_engine, text
import json
import requests
from datetime import datetime, timezone, timedelta
import time
from requests.exceptions import RequestException
from dotenv import load_dotenv
from psycopg2.extensions import register_adapter, AsIs

# Register adapter for DagsterRunStatus to handle serialization
def adapt_dagster_run_status(status):
    return AsIs(repr(status.value))

register_adapter(DagsterRunStatus, adapt_dagster_run_status)

# Custom StreamHandler to handle Unicode characters in Windows console
class SafeStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            stream.write(msg + self.terminator)
            stream.flush()
        except UnicodeEncodeError:
            # Replace problematic characters for console output
            msg = self.format(record).encode('ascii', errors='replace').decode('ascii')
            stream.write(msg + self.terminator)
            stream.flush()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        SafeStreamHandler(sys.stdout),  # Custom handler for console
        logging.FileHandler('dagster_repo.log', encoding='utf-8')  # UTF-8 for file
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# Configuration
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
DAGSTER_HOST = os.getenv("DAGSTER_HOST", "localhost")
DAGSTER_PORT = os.getenv("DAGSTER_PORT", "3500")
DAGSTER_URL = f"http://{DAGSTER_HOST}:{DAGSTER_PORT}/graphql"

# Validate environment variables
required_core_vars = [
    "DATABASE_URL",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_REGION",
    "S3_BUCKET"
]
missing_vars = [var for var in required_core_vars if not os.getenv(var)]
if missing_vars:
    logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
    # Don't raise error here - allow Dagster to start with fallback job

# S3 Resource
@resource(config_schema={
    "S3_ACCESS_KEY_ID": Field(StringSource, is_required=False, default_value=EnvVar("S3_ACCESS_KEY_ID")),
    "S3_SECRET_ACCESS_KEY": Field(StringSource, is_required=False, default_value=EnvVar("S3_SECRET_ACCESS_KEY")),
    "S3_REGION": Field(StringSource, is_required=False, default_value=os.getenv("S3_REGION", "eu-west-2")),
    "S3_BUCKET": Field(StringSource, is_required=False, default_value=EnvVar("S3_BUCKET")),
    "S3_ENDPOINT": Field(StringSource, is_required=False, default_value=os.getenv("S3_ENDPOINT", ""))
})
def s3_resource(init_context):
    try:
        config = init_context.resource_config
        client_kwargs = {
            "region_name": config["S3_REGION"],
            "aws_access_key_id": config["S3_ACCESS_KEY_ID"],
            "aws_secret_access_key": config["S3_SECRET_ACCESS_KEY"],
            "config": Config(s3={"addressing_style": "path"})
        }
        
        if config["S3_ENDPOINT"]:
            client_kwargs["endpoint_url"] = config["S3_ENDPOINT"]
            init_context.log.info(f"Using custom S3 endpoint: {config['S3_ENDPOINT']}")

        client = boto3.client("s3", **client_kwargs)
        client.head_bucket(Bucket=config["S3_BUCKET"])
        init_context.log.info("Initialized S3 client successfully")
        return client
    except Exception as e:
        init_context.log.error(f"Failed to initialize S3 client: {str(e)}")
        raise

# Database Resource
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

# Hooks
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

# Event types for sensor, excluding LogMessageEvent
RELEVANT_EVENT_TYPES = {
    "MessageEvent",
    "ExecutionStepFailureEvent",
    "ExecutionStepInputEvent",
    "ExecutionStepOutputEvent",
    "ExecutionStepStartEvent",
    "ExecutionStepSuccessEvent",
}

def insert_run_logs_and_steps(db, dagster_run_id: str, logs: list, db_run_id: int) -> int:
    """Insert or update logs and step statuses in the database for new events only, excluding LogMessageEvent."""
    logger.info(f"Starting log insertion for run {dagster_run_id} with {len(logs)} logs")
    log_count = 0
    start_time = time.time()

    with db.connect() as conn:
        for log in logs:
            event_type = log.get("__typename", "UnknownEvent")
            if event_type not in RELEVANT_EVENT_TYPES:
                logger.debug(f"Skipping irrelevant event type {event_type} for run {dagster_run_id}")
                continue

            step_key = log.get("stepKey")
            timestamp = None
            try:
                raw_ts = log.get("timestamp")
                if raw_ts:
                    timestamp = float(raw_ts) / 1000  # Convert ms to seconds
            except (TypeError, ValueError):
                logger.debug(f"Invalid timestamp for event {event_type} in run {dagster_run_id}")
                continue

            # Step status updates
            if step_key:
                try:
                    if event_type == "ExecutionStepStartEvent":
                        conn.execute(
                            text("""
                                INSERT INTO workflow.run_step_status (
                                    dagster_run_id, step_code, status, started_at, run_id
                                ) VALUES (
                                    :dagster_run_id, :step_code, 'STARTED', 
                                    TO_TIMESTAMP(:timestamp), 
                                    :run_id
                                ) ON CONFLICT (dagster_run_id, step_code) 
                                DO UPDATE SET
                                    status = EXCLUDED.status,
                                    started_at = EXCLUDED.started_at,
                                    run_id = EXCLUDED.run_id
                            """),
                            {
                                "dagster_run_id": dagster_run_id,
                                "step_code": step_key,
                                "timestamp": timestamp,
                                "run_id": db_run_id,
                            },
                        )
                    elif event_type in ["ExecutionStepSuccessEvent", "ExecutionStepOutputEvent"]:
                        conn.execute(
                            text("""
                                UPDATE workflow.run_step_status
                                SET status = 'SUCCESS',
                                    finished_at = TO_TIMESTAMP(:timestamp),
                                    end_time = TO_TIMESTAMP(:timestamp)
                                WHERE dagster_run_id = :dagster_run_id AND step_code = :step_code
                            """),
                            {
                                "dagster_run_id": dagster_run_id,
                                "step_code": step_key,
                                "timestamp": timestamp,
                            },
                        )
                    elif event_type == "ExecutionStepFailureEvent":
                        error = log.get("error", {})
                        conn.execute(
                            text("""
                                UPDATE workflow.run_step_status
                                SET status = 'FAILURE',
                                    finished_at = TO_TIMESTAMP(:timestamp),
                                    end_time = TO_TIMESTAMP(:timestamp),
                                    error_message = :error_message
                                WHERE dagster_run_id = :dagster_run_id AND step_code = :step_code
                            """),
                            {
                                "dagster_run_id": dagster_run_id,
                                "step_code": step_key,
                                "timestamp": timestamp,
                                "error_message": error.get("message", "Unknown error"),
                            },
                        )
                    logger.debug(f"Updated step status for event {event_type}, step {step_key} in run {dagster_run_id}")
                    conn.commit()
                except Exception as e:
                    logger.error(f"Failed to update step status for run {dagster_run_id}, step {step_key}: {str(e)}")
                    conn.rollback()
                    continue

            # Log message
            if event_type == "MessageEvent":
                message = log.get("message", "No message")
                level = log.get("level", "INFO").lower()
            elif event_type == "ExecutionStepFailureEvent":
                error = log.get("error", {})
                message = error.get("message", "Step failed")
                level = "ERROR"
            elif event_type in ["ExecutionStepInputEvent", "ExecutionStepOutputEvent"]:
                name = log.get("inputName") or log.get("outputName", "unknown")
                type_check = log.get("typeCheck", {})
                success = type_check.get("success", False)
                message = f"{event_type} for {name}: {'Success' if success else 'Failed'}"
                level = "INFO" if success else "ERROR"
            else:
                message = f"{event_type} occurred"
                level = "INFO"

            # Insert log with upsert to handle unique constraint
            try:
                conn.execute(
                    text("""
                        INSERT INTO workflow.run_log (
                            dagster_run_id, run_id, step_code, event_type, message, log_level, timestamp, event_data
                        ) VALUES (
                            :dagster_run_id, :run_id, :step_code, :event_type, :message, :log_level,
                            TO_TIMESTAMP(:timestamp),
                            :event_data
                        ) ON CONFLICT (dagster_run_id, event_type, timestamp)
                        DO UPDATE SET
                            message = EXCLUDED.message,
                            log_level = EXCLUDED.log_level,
                            event_data = EXCLUDED.event_data
                    """),
                    {
                        "dagster_run_id": dagster_run_id,
                        "run_id": db_run_id,
                        "step_code": step_key,
                        "event_type": event_type,
                        "message": message,
                        "log_level": level,
                        "timestamp": timestamp,
                        "event_data": json.dumps(log),
                    },
                )
                conn.commit()
                log_count += 1
                logger.debug(f"Inserted/Updated log for event {event_type}, step {step_key} in run {dagster_run_id}")
            except Exception as e:
                logger.error(f"Failed to insert log for run {dagster_run_id}, event {event_type}, step {step_key}, timestamp {timestamp}: {str(e)}")
                conn.rollback()
                continue

    logger.info(f"Processed {log_count} logs for run {dagster_run_id} in {time.time() - start_time:.2f} seconds")
    return log_count

@sensor(
    minimum_interval_seconds=60, # 2.5 minutes
    required_resource_keys={"db_engine"}
)
def workflow_run_status_sensor(context: SensorEvaluationContext):
    """Sensor that syncs Dagster run status and logs to the database, processing only new events for non-terminal runs."""
    logger.info("Starting workflow_run_status_sensor evaluation")
    instance = context.instance
    db_engine = context.resources.db_engine

    # Parse cursor: {run_id: last_event_timestamp}
    cursor = context.cursor or json.dumps({"last_check": 0, "run_timestamps": {}})
    try:
        cursor_data = json.loads(cursor)
        last_check = cursor_data.get("last_check", 0)
        run_timestamps = cursor_data.get("run_timestamps", {})
    except json.JSONDecodeError:
        logger.warning(f"Invalid cursor value: {cursor}. Resetting.")
        last_check = 0
        run_timestamps = {}

    # Convert last_check to datetime for run filtering
    last_check_datetime = (
        datetime.fromtimestamp(last_check, tz=timezone.utc)
        if last_check > 0
        else datetime.now(timezone.utc) - timedelta(hours=24)
    )
    logger.info(f"Looking for runs updated after: {last_check_datetime}")

    # Get runs updated since last check
    runs = instance.get_run_records(
        filters=RunsFilter(
            updated_after=last_check_datetime,
            statuses=[
                DagsterRunStatus.QUEUED,
                DagsterRunStatus.STARTING,
                DagsterRunStatus.STARTED,
                DagsterRunStatus.SUCCESS,
                DagsterRunStatus.FAILURE,
                DagsterRunStatus.CANCELING,
                DagsterRunStatus.CANCELED,
            ]
        ),
        limit=50,
        order_by="update_timestamp",
        ascending=False,
    )
    logger.info(f"Found {len(runs)} runs from Dagster instance")

    if not runs:
        return SensorResult(
            cursor=cursor,
            run_requests=[]
        )

    # Process runs
    runs_processed = 0
    new_run_timestamps = run_timestamps.copy()
    latest_check = last_check

    # GraphQL query
    query = """
    query RunLogsQuery($runId: ID!) {
        pipelineRunOrError(runId: $runId) {
            __typename
            ... on Run {
                runId
                status
                startTime
                endTime
                runConfig
                tags {
                    key
                    value
                }
                pipeline {
                    name
                }
                executionPlan {
                    steps {
                        key
                    }
                }
                eventConnection {
                    events {
                        __typename
                        ... on MessageEvent {
                            message
                            timestamp
                            level
                            stepKey
                        }
                        ... on ExecutionStepFailureEvent {
                            error {
                                message
                                stack
                            }
                            stepKey
                            timestamp
                        }
                        ... on ExecutionStepInputEvent {
                            inputName
                            typeCheck {
                                label
                                description
                                success
                            }
                            timestamp
                        }
                        ... on ExecutionStepOutputEvent {
                            outputName
                            typeCheck {
                                label
                                description
                                success
                            }
                            timestamp
                        }
                        ... on ExecutionStepStartEvent {
                            stepKey
                            timestamp
                        }
                        ... on ExecutionStepSuccessEvent {
                            stepKey
                            timestamp
                        }
                    }
                }
            }
            ... on RunNotFoundError {
                message
            }
            ... on PythonError {
                message
                stack
            }
        }
    }
    """

    try:
        with db_engine.connect() as conn:
            for run_record in runs:
                run = run_record.dagster_run
                dagster_run_id = run.run_id
                update_timestamp = run_record.update_timestamp

                if update_timestamp.tzinfo is None:
                    update_timestamp = update_timestamp.replace(tzinfo=timezone.utc)

                # Check database status to skip terminal runs
                run_info = conn.execute(
                    text("SELECT id, workflow_id, status FROM workflow.run WHERE dagster_run_id = :dagster_run_id"),
                    {"dagster_run_id": dagster_run_id},
                ).fetchone()
                if not run_info:
                    logger.warning(f"No run record found for {dagster_run_id}, skipping")
                    continue

                db_run_id, workflow_id, current_status = run_info
                logger.debug(f"Found run record for {dagster_run_id} with workflow_id {workflow_id}, status {current_status}")

                if current_status in ["Completed", "Failed", "Cancelled"]:
                    logger.info(f"Run {dagster_run_id} already in terminal state {current_status}, skipping")
                    continue

                logger.info(f"Processing run {dagster_run_id} with status {run.status} updated at {update_timestamp}")

                # Fetch run data via GraphQL with retries
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        response = requests.post(
                            DAGSTER_URL,
                            json={"query": query, "variables": {"runId": dagster_run_id}},
                            headers={"Content-Type": "application/json"},
                            timeout=30,
                        )
                        response.raise_for_status()
                        result = response.json()
                        break
                    except RequestException as e:
                        logger.warning(f"Attempt {attempt + 1} failed for run {dagster_run_id}: {str(e)}")
                        if attempt == max_retries - 1:
                            logger.error(f"Failed to fetch GraphQL data for run {dagster_run_id} after {max_retries} attempts")
                            continue
                        time.sleep(2)
                else:
                    continue

                if "errors" in result:
                    logger.error(f"GraphQL errors for run {dagster_run_id}: {result['errors']}")
                    continue

                run_data = result.get("data", {}).get("pipelineRunOrError", {})
                if run_data.get("__typename") != "Run":
                    logger.error(f"Unexpected response for run {dagster_run_id}: {run_data.get('__typename')}")
                    continue

                # Extract run details
                status = run_data.get("status")
                start_time_ms = run_data.get("startTime")
                end_time_ms = run_data.get("endTime")
                run_config = run_data.get("runConfig")
                logs = run_data.get("eventConnection", {}).get("events", [])

                # Filter logs by timestamp
                last_run_timestamp = new_run_timestamps.get(dagster_run_id, 0)
                filtered_logs = [
                    log for log in logs
                    if log.get("timestamp") and float(log["timestamp"]) / 1000 > last_run_timestamp
                ]
                logger.info(f"Processing run {dagster_run_id}: status={status}, filtered_logs={len(filtered_logs)}/{len(logs)}")

                # Process logs and step statuses
                try:
                    log_count = insert_run_logs_and_steps(db_engine, dagster_run_id, filtered_logs, db_run_id)
                except Exception as e:
                    logger.error(f"Failed to process logs for run {dagster_run_id}: {str(e)}")
                    continue

                # Update workflow.run table
                status_mapping = {
                    "SUCCESS": "Completed",
                    "FAILURE": "Failed",
                    "CANCELED": "Cancelled",
                    "QUEUED": "Queued",
                    "STARTED": "Running",
                    "RUNNING": "Running",
                    "STARTING": "Running",
                    "CANCELING": "Cancelling",
                }
                workflow_status = status_mapping.get(status, status)
                logger.debug(f"Mapping Dagster status {status} to workflow status {workflow_status} for run {dagster_run_id}")

                duration_ms = None
                if start_time_ms and end_time_ms:
                    try:
                        duration_ms = (float(end_time_ms) - float(start_time_ms)) * 1000
                    except (TypeError, ValueError):
                        logger.debug(f"Failed to calculate duration for run {dagster_run_id}")

                output_file_path = None
                if status == "SUCCESS" and run_config:
                    try:
                        config_data = json.loads(run_config) if isinstance(run_config, str) else run_config
                        ops = config_data.get("ops", {})
                        for op_name, op_config in ops.items():
                            output_path = op_config.get("config", {}).get("output_path")
                            if output_path:
                                output_file_path = output_path
                                break
                    except Exception as e:
                        logger.warning(f"Failed to extract output path for run {dagster_run_id}: {str(e)}")

                try:
                    conn.execute(
                        text("""
                            UPDATE workflow.run
                            SET status = :status,
                                finished_at = TO_TIMESTAMP(:end_time),
                                duration_ms = :duration_ms,
                                output_file_path = :output_file_path,
                                updated_at = NOW()
                            WHERE dagster_run_id = :dagster_run_id
                        """),
                        {
                            "status": workflow_status,
                            "end_time": end_time_ms,
                            "duration_ms": duration_ms,
                            "output_file_path": output_file_path,
                            "dagster_run_id": dagster_run_id,
                        },
                    )
                    conn.commit()
                    logger.info(f"Updated run {dagster_run_id} to status {workflow_status}, processed {log_count} logs")
                except Exception as e:
                    logger.error(f"Failed to update run {dagster_run_id}: {str(e)}")
                    conn.rollback()
                    continue

                # Update run timestamp
                if filtered_logs:
                    latest_log_timestamp = max(float(log["timestamp"]) / 1000 for log in filtered_logs if log.get("timestamp"))
                    new_run_timestamps[dagster_run_id] = latest_log_timestamp
                runs_processed += 1

                if update_timestamp.timestamp() > latest_check:
                    latest_check = update_timestamp.timestamp()

    except Exception as e:
        logger.error(f"Database connection error: {str(e)}")
        return SensorResult(
            cursor=cursor,
            run_requests=[]
        )

    # Update cursor
    new_cursor = json.dumps({"last_check": latest_check, "run_timestamps": new_run_timestamps})
    logger.info(f"Processed {runs_processed} runs. Updated cursor to: {new_cursor}")

    return SensorResult(
        cursor=new_cursor,
        run_requests=[]
    )

def load_jobs_from_github(directory: str = "DAGs") -> List[JobDefinition]:
    """Load Dagster job definitions from GitHub repository."""
    jobs = []
    if not GITHUB_ACCESS_TOKEN:
        logger.error("GITHUB_ACCESS_TOKEN is not set. Cannot load jobs from GitHub.")
        return jobs
        
    try:
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        logger.info(f"Successfully accessed repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")

        try:
            contents = repo.get_contents(directory, ref=GITHUB_BRANCH)
            if not contents:
                logger.warning(f"No files found in directory {directory}")
                return jobs
        except GithubException as e:
            if e.status == 404:
                logger.error(f"Directory '{directory}' not found in repository.")
                return jobs
            logger.error(f"GitHub API error: {str(e)}")
            return jobs

        for content in contents:
            if content.type == "file" and content.path.endswith(".py"):
                module_name = content.name.replace(".py", "")
                try:
                    file_content = content.decoded_content.decode('utf-8')
                    logger.debug(f"Loading job from {content.path}")
                    
                    # Create a clean module namespace
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
                        'op': op,
                        'graph': graph,
                        'GraphDefinition': GraphDefinition,
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
                    
                    # Execute the file content
                    exec(file_content, module_globals)
                    
                    # Look for JobDefinition objects
                    found_job = False
                    for name, obj in module_globals.items():
                        if isinstance(obj, JobDefinition):
                            # Set job name
                            workflow_id = module_name.split('_')[-1] if module_name.startswith('workflow_job_') else name
                            obj._name = f"workflow_job_{workflow_id}"
                            
                            # Assign resources
                            obj._resource_defs = {
                                "s3": s3_resource,
                                "db_engine": db_engine_resource
                            }
                            
                            # Assign hooks
                            obj._hooks = {log_success, log_failure}
                            
                            # Assign tags
                            obj.tags = obj.tags or {}
                            obj.tags["workflow_id"] = workflow_id
                            
                            jobs.append(obj)
                            logger.info(f"Successfully loaded job: {obj.name} from {content.path}")
                            found_job = True
                            break
                    
                    if not found_job:
                        logger.warning(f"No JobDefinition found in {content.path}")
                        
                except Exception as e:
                    logger.error(f"Failed to load job from {content.path}: {str(e)}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    continue
                
    except GithubException as e:
        logger.error(f"GitHub API error: {str(e)}")
        return jobs
    except Exception as e:
        logger.error(f"Unexpected error loading jobs: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jobs
    
    return jobs

def get_all_jobs() -> List[JobDefinition]:
    """Get all jobs from GitHub sources only."""
    try:
        jobs = load_jobs_from_github(directory="DAGs")
        if not jobs:
            logger.warning("No jobs loaded from GitHub, check GITHUB_ACCESS_TOKEN or DAGs/ directory")
        else:
            logger.info(f"Successfully loaded {len(jobs)} jobs from GitHub")
        return jobs
    except Exception as e:
        logger.error(f"Failed to load jobs: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

# --- Fallback job to ensure repository is valid ---
@op
def noop_op(context: OpExecutionContext):
    context.log.info("No-op operation")

@job(
    resource_defs={
        "s3": s3_resource,
        "db_engine": db_engine_resource
    },
    hooks={log_success, log_failure}
)
def fallback_job():
    noop_op()

# Define the repository
defs = Definitions(
    jobs=get_all_jobs() or [fallback_job],  # Ensure at least one job exists
    resources={
        "s3": s3_resource,
        "db_engine": db_engine_resource
    },
    sensors=[workflow_run_status_sensor]
)
