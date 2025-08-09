from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging
from typing import Optional
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/runs", tags=["runs"])


@router.get("/run/{run_id}")
async def get_run(
    run_id: int,
    limit_logs: Optional[int] = Query(100, ge=1, le=1000),
    offset_logs: Optional[int] = Query(0, ge=0),
    include_steps: bool = True,
    sort_logs_desc: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get detailed run information including workflow, user, steps, and logs.

    Parameters:
    - `run_id`: ID of the run
    - `limit_logs`: Max number of logs to return
    - `offset_logs`: Offset for pagination
    - `include_steps`: Whether to include step statuses
    - `sort_logs_desc`: Sort logs by timestamp descending if True; ascending otherwise
    """

    try:
        logger.info(f"Fetching run {run_id}")

        # Fetch run details with workflow and user info
        run = db.execute(
            text("""
                SELECT
                    r.*,
                    w.name AS workflow_name,
                    w.description AS workflow_description, run_name,
                    u.email AS triggered_by_email,
                    concat(u.first_name, ' ', u.surname) AS triggered_by_username
                FROM workflow.run r
                LEFT JOIN workflow.workflow w ON r.workflow_id = w.id
                LEFT JOIN workflow.user u ON r.triggered_by = u.id
                WHERE r.id = :id
            """),
            {"id": run_id}
        ).fetchone()

        if not run:
            logger.error(f"Run {run_id} not found")
            raise HTTPException(status_code=404, detail="Run not found")

        # Fetch run logs with pagination and consistent ordering
        order_by = "rl.timestamp DESC" if sort_logs_desc else "rl.timestamp ASC"
        logs_query = f"""
            SELECT
                rl.*,
                rl.step_code AS step_label
            FROM workflow.run_log rl
            WHERE rl.run_id = :run_id
            ORDER BY {order_by}
            LIMIT :limit OFFSET :offset
        """

        logs = db.execute(
            text(logs_query),
            {"run_id": run_id, "limit": limit_logs, "offset": offset_logs}
        ).fetchall()

        # Fetch step statuses if requested
        step_statuses = []
        if include_steps:
            step_status_query = """
      SELECT
                    rss.id,
                    rss.run_id,
                    rss.step_code,
                    rss.status,
                    rss.started_at,
                    rss.finished_at,
                    rss.duration_ms,
                    rss.error_message,
                    rss.step_code AS step_label
                FROM workflow.run_step_status rss
                WHERE rss.run_id = :run_id
                ORDER BY rss.started_at
            """

            step_statuses = db.execute(
                text(step_status_query),
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
        logger.error(f"Failed to fetch run {run_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch run: {str(e)}")