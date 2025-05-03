from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from .get_health_check import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/runs/{run_id}")
async def get_run(
    run_id: int,
    db: Session = Depends(get_db)
):
    """Get run details including logs"""
    try:
        logger.info(f"Fetching run {run_id}")
        run = db.execute(
            text("""
                SELECT * FROM workflow.run
                WHERE id = :id
            """),
            {"id": run_id}
        ).fetchone()

        if not run:
            logger.error(f"Run {run_id} not found")
            raise HTTPException(404, "Run not found")

        logs = db.execute(
            text("""
                SELECT * FROM workflow.run_log
                WHERE run_id = :run_id
                ORDER BY timestamp
            """),
            {"run_id": run_id}
        ).fetchall()

        logger.info(f"Run {run_id} retrieved successfully")
        return {
            "run": dict(run._mapping),
            "logs": [dict(log._mapping) for log in logs]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch run {run_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch run: {str(e)}")
