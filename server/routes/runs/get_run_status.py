from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
from ..get_health_check import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/run/{run_id}/status")
async def get_run_status(
    run_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed status of a workflow run including logs"""
    try:
        run = db.execute(
            text("""
                SELECT r.*, w.name as workflow_name 
                FROM workflow.run r
                JOIN workflow.workflow w ON r.workflow_id = w.id
                WHERE r.id = :run_id
            """),
            {"run_id": run_id}
        ).fetchone()
        
        if not run:
            raise HTTPException(404, f"Run with ID {run_id} not found")
            
        logs = db.execute(
            text("""
                SELECT * FROM workflow.run_log
                WHERE run_id = :run_id OR dagster_run_id = :dagster_run_id
                ORDER BY timestamp ASC
            """),
            {"run_id": run_id, "dagster_run_id": run.dagster_run_id}
        ).fetchall()
        
        steps = db.execute(
            text("""
                SELECT rs.*, ws.label as step_name
                FROM workflow.run_step_status rs
                JOIN workflow.workflow_step ws ON rs.step_code = ws.step_code
                WHERE rs.run_id = :run_id
                ORDER BY ws.step_order
            """),
            {"run_id": run_id}
        ).fetchall()
        
        return {
            "run": dict(run._mapping),
            "steps": [dict(step._mapping) for step in steps],
            "logs": [dict(log._mapping) for log in logs],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting run status: {str(e)}")
        raise HTTPException(500, f"Failed to get run status: {str(e)}")