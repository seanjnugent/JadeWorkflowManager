from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

@router.get("/")
async def get_runs(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get a list of runs with pagination"""
    try:
        logger.info("Fetching runs")
        offset = (page - 1) * limit
        runs = db.execute(
            text("""
                SELECT a.id, workflow_id, triggered_by, a.status, started_at, finished_at, error_message,
                       a.output_file_path, dagster_run_id, a.input_file_path, w."name", concat(b.first_name,' ', b.surname) as user_name
                FROM workflow.run a
                left join workflow.user b on a.triggered_by  = b.id
                left join workflow.workflow w on a.workflow_id = w.id
                ORDER BY started_at desc
                LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": offset}
        ).fetchall()

        total = db.execute(
            text("SELECT COUNT(*) FROM workflow.run")
        ).scalar()

        logger.info("Runs retrieved successfully")
        return {
            "runs": [dict(run._mapping) for run in runs],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }

    except Exception as e:
        logger.error(f"Failed to fetch runs: {str(e)}")
        raise HTTPException(500, f"Failed to fetch runs: {str(e)}")
