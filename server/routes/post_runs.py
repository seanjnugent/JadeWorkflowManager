from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import io
import json
import logging
from pydantic import BaseModel
from .get_health_check import get_db, supabase, engine
from typing import Optional

logger = logging.getLogger(__name__)

class RunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    input_file_path: Optional[str] = None

router = APIRouter()

def download_from_storage(file_path: str) -> bytes:
    """Download file from Supabase storage with error handling"""
    try:
        if not file_path:
            raise ValueError("File path cannot be empty")

        if '/' not in file_path:
            raise ValueError("Invalid file path format")

        bucket, path = file_path.split("/", 1)
        data = supabase.storage.from_(bucket).download(path)
        logger.info(f"File downloaded successfully from {file_path}")
        return data
    except Exception as e:
        logger.error(f"Failed to download file from {file_path}: {str(e)}")
        raise HTTPException(500, f"Failed to download file: {str(e)}")

@router.post("/runs/")
async def create_run(
    run: RunCreate,
    db: Session = Depends(get_db)
):
    """Execute a workflow run"""
    try:
        logger.info(f"Creating run for workflow {run.workflow_id}")
        # Create run record
        result = db.execute(
            text("""
                INSERT INTO workflow.run (
                    workflow_id, triggered_by, input_file_path,
                    status, started_at
                ) VALUES (
                    :workflow_id, :triggered_by, :input_file_path,
                    'running', NOW()
                )
                RETURNING id
            """),
            {
                "workflow_id": run.workflow_id,
                "triggered_by": run.triggered_by,
                "input_file_path": run.input_file_path
            }
        )
        run_id = result.fetchone()[0]
        db.commit()
        logger.info(f"Run {run_id} created")

        # Get workflow steps
        steps = db.execute(
            text("""
                SELECT * FROM workflow.workflow_step
                WHERE workflow_id = :workflow_id
                ORDER BY step_order
            """),
            {"workflow_id": run.workflow_id}
        ).fetchall()

        # Get destination
        destination = db.execute(
            text("""
                SELECT * FROM workflow.workflow_destination
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": run.workflow_id}
        ).fetchone()

        # Execute each step
        for step in steps:
            try:
                logger.info(f"Executing step {step.step_order} for run {run_id}")
                # Download input file if specified
                input_data = None
                if run.input_file_path:
                    file_content = download_from_storage(run.input_file_path)
                    input_data = pd.read_csv(io.BytesIO(file_content))

                # Execute the step based on code type
                if step.code_type == "python":
                    # In production, use a secure sandbox for Python execution
                    locals_dict = {"df": input_data}
                    if step.parameters:
                        locals_dict.update(json.loads(step.parameters))
                    exec(step.code, {}, locals_dict)
                    output_data = locals_dict.get("df")
                elif step.code_type == "sql":
                    # Execute SQL against the database
                    with engine.connect() as conn:
                        output_data = pd.read_sql(
                            step.code,
                            conn,
                            params=json.loads(step.parameters) if step.parameters else None
                        )

                # Handle destination
                if destination:
                    if destination.destination_type == "database":
                        output_data.to_sql(
                            destination.table_name,
                            engine,
                            if_exists="append",
                            index=False
                        )
                    else:
                        # Save to file
                        output_path = destination.file_path
                        if destination.file_format == "csv":
                            output_data.to_csv(output_path, index=False)
                        elif destination.file_format == "json":
                            output_data.to_json(output_path, orient="records")

                # Log success
                db.execute(
                    text("""
                        INSERT INTO workflow.run_log (
                            run_id, step_id, log_level, message, timestamp
                        ) VALUES (
                            :run_id, :step_id, 'info', :message, NOW()
                        )
                    """),
                    {
                        "run_id": run_id,
                        "step_id": step.id,
                        "message": "Step executed successfully"
                    }
                )
                db.commit()
                logger.info(f"Step {step.step_order} executed successfully")

            except Exception as step_error:
                logger.error(f"Step {step.step_order} failed: {str(step_error)}")
                # Log failure
                db.execute(
                    text("""
                        INSERT INTO workflow.run_log (
                            run_id, step_id, log_level, message, timestamp
                        ) VALUES (
                            :run_id, :step_id, 'error', :message, NOW()
                        )
                    """),
                    {
                        "run_id": run_id,
                        "step_id": step.id,
                        "message": str(step_error)
                    }
                )
                # Mark run as failed
                db.execute(
                    text("""
                        UPDATE workflow.run
                        SET status = 'failed', error_message = :error, finished_at = NOW()
                        WHERE id = :run_id
                    """),
                    {
                        "run_id": run_id,
                        "error": str(step_error)
                    }
                )
                db.commit()
                raise HTTPException(500, f"Step {step.step_order} failed: {str(step_error)}")

        # Mark run as completed
        db.execute(
            text("""
                UPDATE workflow.run
                SET status = 'completed', finished_at = NOW()
                WHERE id = :run_id
            """),
            {"run_id": run_id}
        )
        db.commit()
        logger.info(f"Run {run_id} completed")
        return {"run_id": run_id, "status": "completed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Run failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Run failed: {str(e)}")
