from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import json
import logging
import requests
import os
from sqlalchemy import text
from datetime import datetime
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

# Status mapping for Dagster to application status
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

def substitute_template_variables(template: str, variables: Dict[str, Any]) -> str:
    """Substitute template variables in a string"""
    if not isinstance(template, str):
        return template
        
    result = template
    for key, value in variables.items():
        placeholder = f"{{{key}}}"
        if placeholder in result:
            result = result.replace(placeholder, str(value))
    return result

def extract_template_variables_from_config(run_config: Dict) -> Dict[str, Any]:
    """Extract template variables from run configuration"""
    template_vars = {}
    
    try:
        config_data = json.loads(run_config) if isinstance(run_config, str) else run_config
        ops = config_data.get("ops", {})
        
        # Extract common template variables from any op config
        for op_name, op_config in ops.items():
            op_config_data = op_config.get("config", {})
            
            # Common template variables
            for key in ["workflow_id", "run_uuid", "created_at", "batch_name"]:
                if key in op_config_data:
                    template_vars[key] = op_config_data[key]
        
        # Add current timestamp if created_at not found
        if "created_at" not in template_vars:
            template_vars["created_at"] = datetime.now().strftime("%Y%m%d_%H%M%S")
            
    except Exception as e:
        logger.error(f"Failed to extract template variables: {str(e)}")
    
    return template_vars

def extract_dynamic_output_paths(db: Session, dagster_run_id: str, run_config: Dict) -> List[Dict[str, str]]:
    """Extract output paths dynamically based on workflow configuration"""
    try:
        # Get workflow configuration from database
        workflow_result = db.execute(
            text("""
                SELECT w.output_file_paths, w.config_template, w.output_file_pattern
                FROM workflow.workflow w
                JOIN workflow.run r ON w.id = r.workflow_id
                WHERE r.dagster_run_id = :dagster_run_id
            """),
            {"dagster_run_id": dagster_run_id}
        ).fetchone()
        
        if not workflow_result:
            logger.warning(f"No workflow found for dagster_run_id {dagster_run_id}")
            return extract_legacy_output_paths(run_config)
        
        output_file_paths = workflow_result.output_file_paths
        output_file_pattern = workflow_result.output_file_pattern
        
        # Parse output_file_paths if it's a string
        if isinstance(output_file_paths, str):
            try:
                output_file_paths = json.loads(output_file_paths)
            except json.JSONDecodeError:
                output_file_paths = []
        
        # If we have the new dynamic output configuration, use it
        if output_file_paths:
            # Extract template variables from run_config
            template_vars = extract_template_variables_from_config(run_config)
            
            extracted_paths = []
            for output_config in output_file_paths:
                path_template = output_config.get("path", "")
                if path_template:
                    # Substitute template variables
                    actual_path = substitute_template_variables(path_template, template_vars)
                    extracted_paths.append({
                        "path": actual_path,
                        "name": output_config.get("name", "output_file"),
                        "description": output_config.get("description", "Output file")
                    })
            
            logger.info(f"Extracted {len(extracted_paths)} dynamic output paths for run {dagster_run_id}")
            return extracted_paths
        
        # Fallback to legacy pattern if available
        elif output_file_pattern:
            template_vars = extract_template_variables_from_config(run_config)
            actual_path = substitute_template_variables(output_file_pattern, template_vars)
            return [{
                "path": actual_path,
                "name": "primary_output",
                "description": "Primary output file"
            }]
        
        # Final fallback to legacy extraction
        else:
            return extract_legacy_output_paths(run_config)
        
    except Exception as e:
        logger.error(f"Failed to extract dynamic output paths for {dagster_run_id}: {str(e)}")
        return extract_legacy_output_paths(run_config)

def extract_legacy_output_paths(run_config: Dict) -> List[Dict[str, str]]:
    """Legacy extraction method for backward compatibility"""
    output_file_paths = []
    seen_paths = set()
    output_path_keys = ["output_path", "agg_output_path", "detailed_output_path", "receipt_output_path", "transformed_file_path", "receipt_file_path"]
    
    try:
        config_data = json.loads(run_config) if isinstance(run_config, str) else run_config
        ops = config_data.get("ops", {})
        
        for op_name, op_config in ops.items():
            op_config_data = op_config.get("config", {})
            for key in output_path_keys:
                output_path = op_config_data.get(key)
                if output_path and output_path not in seen_paths:
                    seen_paths.add(output_path)
                    
                    # Determine description based on key
                    if "agg" in key:
                        description = "Aggregated results"
                    elif "detailed" in key:
                        description = "Detailed results"
                    elif "receipt" in key:
                        description = "Processing receipt"
                    elif "transformed" in key:
                        description = "Transformed data file"
                    else:
                        description = "Job output file"
                    
                    # Clean up the name
                    name = key.replace("_path", "").replace("_", " ").title()
                    if name == "Output":
                        name = op_name.replace("_", " ").title()
                    
                    output_file_paths.append({
                        "path": output_path,
                        "name": name,
                        "description": description
                    })
        
        logger.debug(f"Legacy extraction found {len(output_file_paths)} output paths")
        return output_file_paths
        
    except Exception as e:
        logger.warning(f"Legacy output path extraction failed: {str(e)}")
        return []

def insert_run_logs_and_steps(db: Session, dagster_run_id: str, logs: List[Dict[str, Any]]) -> int:
    """Insert or update logs into run_log and steps into run_step_status"""
    log_count = 0

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
    """Sync run status and logs from Dagster GraphQL API with dynamic output extraction"""
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

        dagster_status = run_data.get("status")
        status = status_mapping.get(dagster_status, dagster_status)
        start_time = run_data.get("startTime")
        end_time = run_data.get("endTime")
        run_config = run_data.get("runConfig")
        duration_ms = None
        if start_time and end_time:
            try:
                duration_ms = (float(end_time) - float(start_time)) * 1000
            except (TypeError, ValueError):
                pass

        # Enhanced dynamic output path extraction
        output_file_paths = []
        if dagster_status == "SUCCESS" and run_config:
            output_file_paths = extract_dynamic_output_paths(db, dagster_run_id, run_config)
            logger.debug(f"Extracted {len(output_file_paths)} output paths for run {dagster_run_id}: {output_file_paths}")

        logs = run_data.get("eventConnection", {}).get("events", [])
        log_count = insert_run_logs_and_steps(db, dagster_run_id, logs)

        update_result = db.execute(
            text("""
                UPDATE workflow.run
                SET status = :status,
                    finished_at = CASE WHEN :end_time IS NOT NULL THEN to_timestamp(:end_time) ELSE NULL END,
                    duration_ms = :duration_ms,
                    output_file_path = CAST(:output_file_path AS jsonb)
                WHERE dagster_run_id = :dagster_run_id
                RETURNING id, status, finished_at, output_file_path
            """),
            {
                "status": status,
                "end_time": end_time,
                "duration_ms": duration_ms,
                "output_file_path": json.dumps(output_file_paths),
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
        logger.info(f"Updated run {dagster_run_id} to status {status}, processed {log_count} logs, stored {len(output_file_paths)} output paths")
        return {
            "success": True,
            "run_id": updated_record.id,
            "dagster_run_id": dagster_run_id,
            "status": updated_record.status,
            "finished_at": updated_record.finished_at.isoformat() if updated_record.finished_at else None,
            "duration_ms": duration_ms,
            "output_file_path": output_file_paths,
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