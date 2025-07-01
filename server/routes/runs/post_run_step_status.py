from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
import logging
from typing import Optional
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

@router.post("/{run_id}/steps/{step_id}/status")
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
@router.post("/{run_id}/steps/{step_id}/complete")
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
