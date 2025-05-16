from dagster import sensor, RunRequest, SkipReason
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

@sensor(minimum_interval_seconds=30)
def workflow_run_sensor(context):
    """Sensor to monitor Dagster run events for any workflow job and update database"""
    # Fetch active workflow runs to determine which jobs to monitor
    with engine.connect() as conn:
        active_runs = conn.execute(
            text("""
                SELECT id, workflow_id, dagster_run_id
                FROM workflow.run
                WHERE status = :status
            """),
            {"status": "Running"}
        ).fetchall()

    if not active_runs:
        return SkipReason("No active workflow runs to process")

    for run in active_runs:
        db_run_id = run.id
        workflow_id = run.workflow_id
        dagster_run_id = run.dagster_run_id
        job_name = f"workflow_job_{workflow_id}"

        # Check run status in Dagster
        dagster_run = context.instance.get_run_by_id(dagster_run_id)
        if not dagster_run:
            continue

        status = dagster_run.status.value

        # Update run status
        with engine.connect() as conn:
            conn.execute(
                text("""
                    UPDATE workflow.run
                    SET status = :status,
                        finished_at = :finished_at
                    WHERE id = :run_id
                """),
                {
                    "status": status,
                    "finished_at": "NOW()" if status in ["SUCCESS", "FAILURE"] else None,
                    "run_id": db_run_id
                }
            )

            # Process step events
            for event in context.instance.get_event_records(
                event_filters={"run_id": dagster_run_id, "event_type": "STEP_SUCCESS"}
            ):
                step_key = event.event_specific_data.step_key
                # Map step_key to workflow_step (assuming step_key includes workflow_id suffix)
                step = conn.execute(
                    text("""
                        SELECT id, step_code
                        FROM workflow.workflow_step
                        WHERE workflow_id = :workflow_id AND label = :label
                    """),
                    {"workflow_id": workflow_id, "label": step_key.replace(f"_json_converter_{workflow_id}", "")}
                ).fetchone()

                if step:
                    # Update run_step_status
                    conn.execute(
                        text("""
                            UPDATE workflow.run_step_status
                            SET status = :status,
                                finished_at = NOW(),
                                duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
                                output_data = :output_data,
                                updated_at = NOW()
                            WHERE run_id = :run_id AND step_id = :step_id
                        """),
                        {
                            "status": "Completed",
                            "output_data": json.dumps({"result": f"Step {step_key} completed"}),
                            "run_id": db_run_id,
                            "step_id": step.id
                        }
                    )

                    # Log to run_log
                    conn.execute(
                        text("""
                            INSERT INTO workflow.run_log (
                                run_id, dagster_step, log_level, message, timestamp,
                                dagster_run_id, workflow_id, step_code
                            ) VALUES (
                                :run_id, :dagster_step, :log_level, :message, NOW(),
                                :dagster_run_id, :workflow_id, :step_code
                            )
                        """),
                        {
                            "run_id": db_run_id,
                            "dagster_step": step_key,
                            "log_level": "INFO",
                            "message": f"Step {step_key} completed",
                            "dagster_run_id": dagster_run_id,
                            "workflow_id": str(workflow_id),
                            "step_code": step.step_code
                        }
                    )
            conn.commit()

    return SkipReason("Processed active runs")