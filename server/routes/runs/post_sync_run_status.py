from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import json
import logging
import requests
import os
from sqlalchemy import text
from ..get_health_check import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])
DAGSTER_HOST = os.getenv("DAGSTER_HOST", "localhost")
DAGSTER_PORT = os.getenv("DAGSTER_PORT", "3500")

# Event types we care about
RELEVANT_EVENT_TYPES = {
    "MessageEvent",
    "ExecutionStepFailureEvent",
    "ExecutionStepInputEvent",
    "ExecutionStepOutputEvent",
    "ExecutionStepStartEvent",
    "ExecutionStepSuccessEvent"
}

def insert_run_logs_and_steps(db: Session, dagster_run_id: str, logs: List[Dict[str, Any]]) -> int:
    """Insert or update logs into run_log and steps into run_step_status"""
    log_count = 0  # Initialize log_count at the start of the function

    try:
        # Get run_id from workflow.run table
        run_info = db.execute(
            text("SELECT id FROM workflow.run WHERE dagster_run_id = :dagster_run_id"),
            {"dagster_run_id": dagster_run_id}
        ).fetchone()

        if not run_info:
            raise HTTPException(status_code=404, detail=f"Run not found for dagster_run_id {dagster_run_id}")

        run_id = run_info.id

        for log in logs:
            event_type = log.get("__typename", "UnknownEvent")
            if event_type not in RELEVANT_EVENT_TYPES:
                continue  # Skip irrelevant events

            step_key = log.get("stepKey")
            timestamp = None
            try:
                raw_ts = log.get("timestamp")
                if raw_ts:
                    timestamp = float(raw_ts) / 1000  # Convert ms → seconds
            except (TypeError, ValueError):
                pass

            # --- STEP STATUS UPDATES ---
            if step_key:
                if event_type == "ExecutionStepStartEvent":
                    db.execute(
                        text("""
                        INSERT INTO workflow.run_step_status (
                            dagster_run_id, step_code, status, started_at, run_id
                        ) VALUES (
                            :dagster_run_id, :step_code, 'STARTED', to_timestamp(:timestamp), :run_id
                        )
                        ON CONFLICT (dagster_run_id, step_code)
                        DO UPDATE SET
                            status = EXCLUDED.status,
                            started_at = EXCLUDED.started_at
                        """),
                        {
                            "dagster_run_id": dagster_run_id,
                            "step_code": step_key,
                            "timestamp": timestamp,
                            "run_id": run_id
                        }
                    )
                elif event_type in ["ExecutionStepSuccessEvent", "ExecutionStepOutputEvent"]:
                    db.execute(
                        text("""
                        UPDATE workflow.run_step_status
                        SET status = 'SUCCESS',
                            finished_at = to_timestamp(:timestamp),
                            end_time = to_timestamp(:timestamp)
                        WHERE dagster_run_id = :dagster_run_id AND step_code = :step_code
                        """),
                        {
                            "dagster_run_id": dagster_run_id,
                            "step_code": step_key,
                            "timestamp": timestamp
                        }
                    )
                elif event_type == "ExecutionStepFailureEvent":
                    error = log.get("error", {})
                    db.execute(
                        text("""
                        UPDATE workflow.run_step_status
                        SET status = 'FAILURE',
                            finished_at = to_timestamp(:timestamp),
                            end_time = to_timestamp(:timestamp),
                            error_message = :error_message
                        WHERE dagster_run_id = :dagster_run_id AND step_code = :step_code
                        """),
                        {
                            "dagster_run_id": dagster_run_id,
                            "step_code": step_key,
                            "timestamp": timestamp,
                            "error_message": error.get("message", "Unknown error")
                        }
                    )

            # --- LOG MESSAGE ---
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

            # Insert into run_log
            result = db.execute(
                text("""
                    INSERT INTO workflow.run_log (
                        dagster_run_id,
                        run_id,
                        step_code,
                        event_type,
                        message,
                        log_level,
                        timestamp,
                        event_data
                    ) VALUES (
                        :dagster_run_id,
                        :run_id,
                        :step_code,
                        :event_type,
                        :message,
                        :log_level,
                        CASE WHEN :timestamp IS NOT NULL THEN to_timestamp(:timestamp) ELSE NULL END,
                        CAST(:event_data AS jsonb)
                    )
                    ON CONFLICT (dagster_run_id, event_type, timestamp)
                    DO UPDATE SET
                        step_code = EXCLUDED.step_code,
                        message = EXCLUDED.message,
                        log_level = EXCLUDED.log_level,
                        event_data = EXCLUDED.event_data
                    RETURNING id
                """),
                {
                    "dagster_run_id": dagster_run_id,
                    "run_id": run_id,
                    "step_code": step_key,
                    "event_type": event_type,
                    "message": message,
                    "log_level": level,
                    "timestamp": timestamp,
                    "event_data": json.dumps(log)
                }
            )
            if result.fetchone():
                log_count += 1

        return log_count

    except Exception as e:
        logger.error(f"Failed to insert logs and steps for {dagster_run_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process logs and steps: {str(e)}")

@router.post("/sync/{dagster_run_id}")
async def sync_run_status_from_dagster(dagster_run_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Sync run status and logs from Dagster GraphQL API for Dagster"""
    try:
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
        dagster_url = f"http://{DAGSTER_HOST}:{DAGSTER_PORT}/graphql"
        request_body = {
            "query": query,
            "variables": {"runId": dagster_run_id}
        }
        response = requests.post(
            dagster_url,
            json=request_body,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        if "errors" in result:
            raise HTTPException(status_code=500, detail=f"GraphQL errors: {result['errors']}")

        run_data = result.get("data", {}).get("pipelineRunOrError", {})
        if run_data.get("__typename") == "RunNotFoundError":
            return Response(
                content=json.dumps({"detail": run_data.get("message", "Run not found")}),
                status_code=404,
                media_type="application/json"
            )

        if run_data.get("__typename") != "Run":
            raise HTTPException(status_code=500, detail="Unexpected response type")

        status = run_data.get("status")
        start_time = run_data.get("startTime")
        end_time = run_data.get("endTime")
        run_config = run_data.get("runConfig")
        duration_ms = None
        if start_time and end_time:
            try:
                duration_ms = (float(end_time) - float(start_time)) * 1000
            except (TypeError, ValueError):
                pass

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
                logger.warning(f"Failed to extract output path: {str(e)}")

        logs = run_data.get("eventConnection", {}).get("events", [])
        log_count = insert_run_logs_and_steps(db, dagster_run_id, logs)

        update_result = db.execute(
            text("""
                UPDATE workflow.run
                SET status = :status,
                    finished_at = CASE WHEN :end_time IS NOT NULL THEN to_timestamp(:end_time) ELSE NULL END,
                    duration_ms = :duration_ms,
                    output_file_path = :output_file_path
                WHERE dagster_run_id = :dagster_run_id
                RETURNING id, status, finished_at, output_file_path
            """),
            {
                "status": status,
                "end_time": end_time,
                "duration_ms": duration_ms,
                "output_file_path": output_file_path,
                "dagster_run_id": dagster_run_id
            }
        )
        updated_record = update_result.fetchone()
        if not updated_record:
            return Response(
                content=json.dumps({"detail": "Run record not found locally"}),
                status_code=404,
                media_type="application/json"
            )

        db.commit()
        return {
            "success": True,
            "run_id": updated_record.id,
            "dagster_run_id": dagster_run_id,
            "status": updated_record.status,
            "finished_at": updated_record.finished_at.isoformat() if updated_record.finished_at else None,
            "duration_ms": duration_ms,
            "output_file_path": output_file_path,
            "log_count": log_count,
            "message": f"Successfully synced status: {updated_record.status} and {log_count} logs"
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to connect to Dagster: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to sync run status and logs: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
