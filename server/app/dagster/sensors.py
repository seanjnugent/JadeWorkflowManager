from dagster import sensor, RunRequest, SkipReason, SensorEvaluationContext
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import json

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in .env")
engine = create_engine(DATABASE_URL)

@sensor(minimum_interval_seconds=10)
def workflow_run_sensor(context: SensorEvaluationContext):
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

        dagster_run = context.instance.get_run_by_id(dagster_run_id)
        if not dagster_run:
            continue

        status = dagster_run.status.value

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

            for event in context.instance.get_event_records(
                event_filters={"run_id": dagster_run_id, "event_type": ["STEP_SUCCESS", "STEP_FAILURE"]}
            ):
                step_key = event.event_specific_data.step_key
                event_type = event.event_type.value
                step = conn.execute(
                    text("""
                        SELECT id, step_code
                        FROM workflow.workflow_step
                        WHERE workflow_id = :workflow_id AND label = :label
                    """),
                    {"workflow_id": workflow_id, "label": step_key.replace(f"_json_converter_{workflow_id}", "")}
                ).fetchone()

                if step:
                    status = "Completed" if event_type == "STEP_SUCCESS" else "Failed"
                    conn.execute(
                        text("""
                            UPDATE workflow.run_step_status
                            SET status = :status,
                                finished_at = NOW(),
                                duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
                                output_data = :output_data,
                                error_message = :error_message,
                                updated_at = NOW()
                            WHERE run_id = :run_id AND step_id = :step_id
                        """),
                        {
                            "status": status,
                            "output_data": json.dumps({"result": f"Step {step_key} {status.lower()}"}),
                            "error_message": event.event_specific_data.error.message if event_type == "STEP_FAILURE" else None,
                            "run_id": db_run_id,
                            "step_id": step.id
                        }
                    )

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
                            "log_level": "INFO" if event_type == "STEP_SUCCESS" else "ERROR",
                            "message": f"Step {step_key} {status.lower()}",
                            "dagster_run_id": dagster_run_id,
                            "workflow_id": str(workflow_id),
                            "step_code": step.step_code
                        }
                    )
            conn.commit()

    return SkipReason("Processed active runs")