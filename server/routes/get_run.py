from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
import logging
from typing import Optional
from .get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter()
@router.get("/runs/run/{run_id}")
async def get_run(
    run_id: int,
    limit_logs: Optional[int] = 100,
    offset_logs: Optional[int] = 0,
    include_steps: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Get detailed run information including workflow, user, steps, and logs"""
    try:
        logger.info(f"Fetching run {run_id}")

        # Fetch run details with workflow and user information
        run = db.execute(
            text("""
                SELECT
                    r.*,
                    w.name AS workflow_name,  
                    w.description AS workflow_description,
                    u.email AS triggered_by_email,
                    u.username AS triggered_by_username
                FROM workflow.run r
                LEFT JOIN workflow.workflow w ON r.workflow_id = w.id
                LEFT JOIN workflow.user u ON r.triggered_by = u.id
                WHERE r.id = :id
            """),
            {"id": run_id}
        ).fetchone()

        if not run:
            logger.error(f"Run {run_id} not found")
            raise HTTPException(404, "Run not found")

        # Fetch run logs with pagination
        logs = db.execute(
            text("""
                SELECT
                    rl.*,
                    ws.label AS step_label
                FROM workflow.run_log rl
                LEFT JOIN workflow.workflow_step ws ON rl.step_id = ws.id
                WHERE rl.run_id = :run_id
                ORDER BY rl.timestamp DESC
                LIMIT :limit OFFSET :offset
            """),
            {"run_id": run_id, "limit": limit_logs, "offset": offset_logs}
        ).fetchall()

        # Fetch step statuses if requested
        step_statuses = []
        if include_steps:
            step_statuses = db.execute(
                text("""
                    SELECT
                        rss.id,
                        rss.run_id,
                        rss.step_id,
                        rss.status,
                        rss.started_at,
                        rss.finished_at,
                        rss.duration_ms,
                        rss.error_message,
                        ws.label AS step_label,
                        ws.description AS step_description,
                        ws.step_order
                    FROM workflow.run_step_status rss
                    LEFT JOIN workflow.workflow_step ws ON rss.step_id = ws.id
                    WHERE rss.run_id = :run_id
                    ORDER BY ws.step_order, rss.started_at
                """),
                {"run_id": run_id}
            ).fetchall()

        logger.info(f"Run {run_id} retrieved successfully")
        return {
            "run": dict(run._mapping),
            "logs": [dict(log._mapping) for log in logs],
            "step_statuses": [dict(status._mapping) for status in step_statuses]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch run {run_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch run: {str(e)}")

@router.post("/runs/{run_id}/steps/{step_id}/status")
async def update_step_status(
    run_id: int,
    step_id: int,
    status: str = Body(..., embed=True),
    error_message: Optional[str] = Body(None),
    metadata: Optional[dict] = Body(None),
    db: Session = Depends(get_db)
):
    """Update or create step execution status"""
    try:
        # Check if status exists
        existing = db.execute(
            text("SELECT id FROM workflow.run_step_status WHERE run_id = :run_id AND step_id = :step_id"),
            {"run_id": run_id, "step_id": step_id}
        ).fetchone()

        if existing:
            # Update existing
            db.execute(
                text("""
                    UPDATE workflow.run_step_status
                    SET
                        status = :status,
                        error_message = :error_message,
                        metadata = :metadata,
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {
                    "id": existing.id,
                    "status": status,
                    "error_message": error_message,
                    "metadata": metadata
                }
            )
        else:
            # Create new
            db.execute(
                text("""
                    INSERT INTO workflow.run_step_status (
                        run_id, step_id, status, error_message, metadata, started_at
                    ) VALUES (
                        :run_id, :step_id, :status, :error_message, :metadata, NOW()
                    )
                """),
                {
                    "run_id": run_id,
                    "step_id": step_id,
                    "status": status,
                    "error_message": error_message,
                    "metadata": metadata
                }
            )

        db.commit()
        return {"message": "Step status updated successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update step status: {str(e)}")
        raise HTTPException(500, f"Failed to update step status: {str(e)}")

@router.post("/runs/{run_id}/steps/{step_id}/complete")
async def complete_step(
    run_id: int,
    step_id: int,
    status: str = Body(..., embed=True, regex="^(success|failed|skipped)$"),
    output_data: Optional[dict] = Body(None),
    error_message: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Mark a step as completed"""
    try:
        db.execute(
            text("""
                UPDATE workflow.run_step_status
                SET
                    status = :status,
                    finished_at = NOW(),
                    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
                    output_data = :output_data,
                    error_message = :error_message,
                    updated_at = NOW()
                WHERE run_id = :run_id AND step_id = :step_id
            """),
            {
                "run_id": run_id,
                "step_id": step_id,
                "status": status,
                "output_data": output_data,
                "error_message": error_message
            }
        )
        db.commit()
        return {"message": "Step marked as completed"}
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to complete step: {str(e)}")
        raise HTTPException(500, f"Failed to complete step: {str(e)}")
