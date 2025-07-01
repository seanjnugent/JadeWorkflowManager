from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from sqlalchemy import text
from ..get_health_check import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/status/{run_id}")
async def get_run_status(run_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get the current status of a workflow run"""
    try:
        result = db.execute(
            text("""
                SELECT r.id, r.dagster_run_id, r.workflow_id, r.status, r.started_at,
                       r.finished_at, r.input_file_path, r.output_file_path,
                       r.error_message, r.duration_ms, w.name as workflow_name
                FROM workflow.run r
                LEFT JOIN workflow.workflow w ON r.workflow_id = w.id
                WHERE r.id = :run_id
            """),
            {"run_id": run_id}
        )

        run_record = result.fetchone()
        if not run_record:
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

        return {
            "run_id": run_record.id,
            "dagster_run_id": run_record.dagster_run_id,
            "workflow_id": run_record.workflow_id,
            "workflow_name": run_record.workflow_name,
            "status": run_record.status,
            "started_at": run_record.started_at.isoformat() if run_record.started_at else None,
            "finished_at": run_record.finished_at.isoformat() if run_record.finished_at else None,
            "input_file_path": run_record.input_file_path,
            "output_file_path": run_record.output_file_path,
            "error_message": run_record.error_message,
            "duration_ms": run_record.duration_ms
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get run status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get run status: {str(e)}")
