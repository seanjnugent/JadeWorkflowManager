from dagster import sensor, SensorEvaluationContext, DagsterInstance
from datetime import datetime, timezone
import requests
import json
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import logging

load_dotenv()

logger = logging.getLogger(__name__)
DAGSTER_HOST = os.getenv("DAGSTER_HOST", "localhost")
DAGSTER_PORT = os.getenv("DAGSTER_PORT", "3500")
DATABASE_URL = os.getenv("DATABASE_URL")  # SQLite URL, e.g., sqlite:///path/to/db.sqlite
DAGSTER_URL = f"http://{DAGSTER_HOST}:{DAGSTER_PORT}/graphql"

# Event types to process (same as FastAPI endpoint)
RELEVANT_EVENT_TYPES = {
    "MessageEvent",
    "ExecutionStepFailureEvent",
    "ExecutionStepInputEvent",
    "ExecutionStepOutputEvent",
    "ExecutionStepStartEvent",
    "ExecutionStepSuccessEvent",
}

def insert_run_logs_and_steps(db, dagster_run_id: str, logs: list, run_id: int) -> int:
    """Insert or update logs and step statuses in the database."""
    log_count = 0

    for log in logs:
        event_type = log.get("__typename", "UnknownEvent")
        if event_type not in RELEVANT_EVENT_TYPES:
            continue

        step_key = log.get("stepKey")
        timestamp = None
        try:
            raw_ts = log.get("timestamp")
            if raw_ts:
                timestamp = float(raw_ts) / 1000  # Convert ms to seconds
        except (TypeError, ValueError):
            pass

        # Step status updates
        if step_key:
            if event_type == "ExecutionStepStartEvent":
                db.execute(
                    text("""
                        INSERT OR REPLACE INTO workflow_run_step_status (
                            dagster_run_id, step_code, status, started_at, run_id
                        ) VALUES (
                            :dagster_run_id, :step_code, 'STARTED', 
                            CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END, 
                            :run_id
                        )
                    """),
                    {
                        "dagster_run_id": dagster_run_id,
                        "step_code": step_key,
                        "timestamp": timestamp,
                        "run_id": run_id,
                    },
                )
            elif event_type in ["ExecutionStepSuccessEvent", "ExecutionStepOutputEvent"]:
                db.execute(
                    text("""
                        UPDATE workflow_run_step_status
                        SET status = 'SUCCESS',
                            finished_at = CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END,
                            end_time = CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END
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
                db.execute(
                    text("""
                        UPDATE workflow_run_step_status
                        SET status = 'FAILURE',
                            finished_at = CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END,
                            end_time = CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END,
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

        # Log message
        if event_type == "MessageEvent":
            message = log.get("message", "No message")
            level = log.get("level", "INFO")
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
            message = "Unknown event type"
            level = "INFO"

        # Insert log (SQLite doesn’t support JSONB, store as TEXT)
        result = db.execute(
            text("""
                INSERT OR REPLACE INTO workflow_run_log (
                    dagster_run_id, run_id, step_code, event_type, message, log_level, timestamp, event_data
                ) VALUES (
                    :dagster_run_id, :run_id, :step_code, :event_type, :message, :log_level,
                    CASE WHEN :timestamp IS NOT NULL THEN datetime(:timestamp, 'unixepoch') ELSE NULL END,
                    :event_data
                )
            """),
            {
                "dagster_run_id": dagster_run_id,
                "run_id": run_id,
                "step_code": step_key,
                "event_type": event_type,
                "message": message,
                "log_level": level,
                "timestamp": timestamp,
                "event_data": json.dumps(log),  # Store as JSON string
            },
        )
        log_count += 1

    return log_count

@sensor(minimum_interval_seconds=300)  # Run every 5 minutes
def workflow_run_status_sensor(context: SensorEvaluationContext):
    """Sensor that syncs Dagster run status and logs to the database."""
    instance = DagsterInstance.get()
    db_engine = create_engine(DATABASE_URL)

    # Cursor tracks the last processed update timestamp
    cursor = context.cursor or "0"
    try:
        last_processed_timestamp = (
            datetime.fromtimestamp(float(cursor), tz=timezone.utc)
            if cursor != "0"
            else None
        )
    except ValueError:
        logger.warning(f"Invalid cursor value: {cursor}. Resetting to beginning.")
        last_processed_timestamp = None

    # Get recent runs (non-terminal and terminal)
    runs = instance.get_run_records(
        filters=None,  # Fetch all runs
        limit=100,
        order_by="update_timestamp",  # Order by last update
        ascending=False,
    )

    if not runs:
        logger.debug("No runs found")
        return

    # GraphQL query (same as FastAPI endpoint)
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

    latest_timestamp = last_processed_timestamp
    processed_runs = 0

    with db_engine.connect() as conn:
        for run_record in runs:
            run = run_record.dagster_run
            run_id = run.run_id
            update_timestamp = run_record.update_timestamp
            if update_timestamp.tzinfo is None:
                update_timestamp = update_timestamp.replace(tzinfo=timezone.utc)

            # Skip runs not updated since last cursor
            if last_processed_timestamp and update_timestamp <= last_processed_timestamp:
                continue

            # Fetch detailed run data via GraphQL
            try:
                response = requests.post(
                    DAGSTER_URL,
                    json={"query": query, "variables": {"runId": run_id}},
                    headers={"Content-Type": "application/json"},
                    timeout=30,
                )
                response.raise_for_status()
                result = response.json()
                if "errors" in result:
                    logger.error(f"GraphQL errors for run {run_id}: {result['errors']}")
                    continue

                run_data = result.get("data", {}).get("pipelineRunOrError", {})
                if run_data.get("__typename") == "RunNotFoundError":
                    logger.warning(f"Run not found: {run_id}")
                    continue
                if run_data.get("__typename") != "Run":
                    logger.error(f"Unexpected response type for run {run_id}")
                    continue

                # Extract run details
                status = run_data.get("status")
                start_time = run_data.get("startTime")
                end_time = run_data.get("endTime")
                run_config = run_data.get("runConfig")
                logs = run_data.get("eventConnection", {}).get("events", [])
                tags = run.tags or {}
                workflow_id = tags.get("workflow_id")

                if not workflow_id:
                    logger.warning(f"No workflow_id in tags for run {run_id}")
                    continue

                # Calculate duration
                duration_ms = None
                if start_time and end_time:
                    try:
                        duration_ms = (float(end_time) - float(start_time)) * 1000
                    except (TypeError, ValueError):
                        pass

                # Extract output file path
                output_file_path = None
                if status == "SUCCESS" and run_config:
                    try:
                        config_data = (
                            json.loads(run_config)
                            if isinstance(run_config, str)
                            else run_config
                        )
                        ops = config_data.get("ops", {})
                        for op_name, op_config in ops.items():
                            output_path = op_config.get("config", {}).get("output_path")
                            if output_path:
                                output_file_path = output_path
                                break
                    except Exception as e:
                        logger.warning(f"Failed to extract output path for run {run_id}: {str(e)}")

                # Get run_id from workflow.run
                run_info = conn.execute(
                    text("SELECT id FROM workflow_run WHERE dagster_run_id = :dagster_run_id"),
                    {"dagster_run_id": run_id},
                ).fetchone()

                if not run_info:
                    logger.warning(f"Run not found in database for dagster_run_id {run_id}")
                    continue

                db_run_id = run_info.id

                # Insert logs and step statuses
                log_count = insert_run_logs_and_steps(conn, run_id, logs, db_run_id)

                # Update workflow.run (use SQLite-compatible datetime)
                status_mapping = {
                    "SUCCESS": "Completed",
                    "FAILURE": "Failed",
                    "CANCELED": "Cancelled",
                    "QUEUED": "Queued",
                    "STARTED": "Running",
                    "RUNNING": "Running",
                }
                workflow_status = status_mapping.get(status, status)

                conn.execute(
                    text("""
                        UPDATE workflow_run
                        SET status = :status,
                            finished_at = CASE WHEN :end_time IS NOT NULL THEN datetime(:end_time, 'unixepoch') ELSE NULL END,
                            duration_ms = :duration_ms,
                            output_file_path = :output_file_path,
                            updated_at = datetime('now')
                        WHERE dagster_run_id = :dagster_run_id
                    """),
                    {
                        "status": workflow_status,
                        "end_time": end_time,
                        "duration_ms": duration_ms,
                        "output_file_path": output_file_path,
                        "dagster_run_id": run_id,
                    },
                )
                conn.commit()
                logger.info(
                    f"Updated run {run_id} (workflow {workflow_id}) to status {workflow_status}, {log_count} logs"
                )
                processed_runs += 1

                # Update latest timestamp
                if latest_timestamp is None or update_timestamp > latest_timestamp:
                    latest_timestamp = update_timestamp

            except Exception as e:
                logger.error(f"Failed to process run {run_id}: {str(e)}")
                continue

        # Update cursor
        if latest_timestamp and processed_runs > 0:
            context.update_cursor(str(latest_timestamp.timestamp()))

    logger.debug(f"Processed {processed_runs} runs")
    yield from []