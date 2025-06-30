from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/workflow/{workflow_id}")
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """Get workflow details including steps and destination"""
    try:
        logger.info(f"Fetching workflow {workflow_id}")
        # Get workflow metadata including new columns
        workflow = db.execute(
            text("""
             SELECT id, name, description, status, schedule, last_run_at, 
                       next_run_at, input_structure, parameters, config_template,
                       dag_path, dag_status, created_at, updated_at, destination, destination_config
                FROM workflow.workflow
                WHERE id = :id
            """),
            {"id": workflow_id}
        ).fetchone()

        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(404, "Workflow not found")

        # Get recent runs
        runs = db.execute(
            text("""
                SELECT a.id, status, started_at, finished_at, concat(first_name, ' ', surname) as triggered_by_name, duration_ms
                FROM workflow.run a
                inner join workflow.user b on a.triggered_by = b.id
                WHERE workflow_id = :workflow_id
                ORDER BY started_at DESC
                LIMIT 5
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        logger.info(f"Workflow {workflow_id} retrieved successfully")
        return {
            "workflow": dict(workflow._mapping),
            "recent_runs": [dict(run._mapping) for run in runs]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflow: {str(e)}")