from fastapi import APIRouter, HTTPException, Depends, Body
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
            raise HTTPException(404, "Run not found")

        # Fetch run logs with pagination
        logs = db.execute(
            text("""
                SELECT
                    rl.*,
                    ws.label AS step_label
                FROM workflow.run_log rl
                LEFT JOIN workflow.workflow_step ws ON rl.step_code = ws.step_code
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
                        rss.step_code,
                        rss.status,
                        rss.started_at,
                        rss.finished_at,
                        rss.duration_ms,
                        rss.error_message,
                        ws.label AS step_label,
                        ws.description AS step_description,
                        ws.step_order
                    FROM workflow.run_step_status rss
                    LEFT JOIN workflow.workflow_step ws ON rss.step_code = ws.step_code
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