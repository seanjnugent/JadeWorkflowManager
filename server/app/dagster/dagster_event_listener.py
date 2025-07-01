from dagster import sensor, SensorEvaluationContext, DagsterInstance
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

@sensor(minimum_interval_seconds=30)
def workflow_run_status_sensor(context: SensorEvaluationContext):
    """Sensor that monitors Dagster run status using native Dagster storage APIs"""
    instance = DagsterInstance.get()
    
    # Get the last cursor (if any) to avoid reprocessing old runs
    cursor = context.cursor or "0"
    try:
        last_processed_timestamp = datetime.fromtimestamp(float(cursor), tz=timezone.utc) if cursor != "0" else None
    except ValueError:
        logger.warning(f"Invalid cursor value: {cursor}. Resetting to beginning.")
        last_processed_timestamp = None
    
    try:
        # Get all recent runs (we'll filter them ourselves)
        runs = instance.get_run_records(limit=100)
        
        if not runs:
            logger.debug("No runs found at all")
            return
        
        # Filter for runs that:
        # 1. Are completed (SUCCESS/FAILURE/CANCELED)
        # 2. Were updated after our cursor
        completed_runs = []
        for run_record in runs:
            run = run_record.dagster_run
            if run.status.value not in ["SUCCESS", "FAILURE", "CANCELED"]:
                continue
                
            # Ensure both datetimes are timezone-aware for comparison
            run_timestamp = run_record.create_timestamp
            if run_timestamp.tzinfo is None:
                run_timestamp = run_timestamp.replace(tzinfo=timezone.utc)
                
            if last_processed_timestamp and run_timestamp <= last_processed_timestamp:
                continue
                
            completed_runs.append(run_record)
        
        if not completed_runs:
            logger.debug("No new completed runs found")
            return
        
        db_engine = create_engine(os.getenv("DATABASE_URL"))
        
        with db_engine.connect() as conn:
            for run_record in completed_runs:
                run = run_record.dagster_run
                run_id = run.run_id
                status = run.status.value
                tags = run.tags or {}
                
                # Extract workflow_id from tags
                workflow_id = tags.get("workflow_id")
                if not workflow_id:
                    logger.warning(f"No workflow_id found in run tags for run {run_id}")
                    continue
                
                # Map Dagster status to workflow status
                status_mapping = {
                    "SUCCESS": "Completed",
                    "FAILURE": "Failed",
                    "CANCELED": "Cancelled"
                }
                
                workflow_status = status_mapping.get(status, "Unknown")
                
                # Update workflow run status
                try:
                    conn.execute(
                        text("""
                            UPDATE workflow.run
                            SET status = :status,
                                finished_at = CASE WHEN :status IN ('Completed', 'Failed', 'Cancelled') THEN NOW() ELSE NULL END,
                                updated_at = NOW(),
                                dagster_run_id = :dagster_run_id
                            WHERE workflow_id = :workflow_id AND status = 'Running'
                        """),
                        {
                            "status": workflow_status,
                            "dagster_run_id": run_id,
                            "workflow_id": workflow_id
                        }
                    )
                    conn.commit()
                    logger.info(f"Updated run status to {workflow_status} for workflow {workflow_id}, run {run_id}")
                except Exception as e:
                    logger.error(f"Failed to update run status for workflow {workflow_id}, run {run_id}: {str(e)}")
                    continue
        
        # Update cursor to the latest timestamp (as UTC timestamp)
        if completed_runs:
            latest_timestamp = max(
                run_record.create_timestamp.replace(tzinfo=timezone.utc).timestamp() 
                for run_record in completed_runs
            )
            context.update_cursor(str(latest_timestamp))
        
    except Exception as e:
        logger.error(f"Error in workflow run status sensor: {str(e)}")
    
    yield from []