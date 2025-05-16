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
                       next_run_at, input_structure, parameters,
                       dag_path, dag_status, created_at, updated_at
                FROM workflow.workflow
                WHERE id = :id
            """),
            {"id": workflow_id}
        ).fetchone()

        if not workflow:
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(404, "Workflow not found")

        # Get workflow steps
        steps = db.execute(
            text("""
                SELECT * FROM workflow.workflow_step
                WHERE workflow_id = :workflow_id
                ORDER BY step_order
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        # Get destination
        destination = db.execute(
            text("""
                SELECT * FROM workflow.workflow_destination
                WHERE workflow_id = :workflow_id
            """),
            {"workflow_id": workflow_id}
        ).fetchone()

        # Get recent runs
        runs = db.execute(
            text("""
                SELECT id, status, started_at, finished_at
                FROM workflow.run
                WHERE workflow_id = :workflow_id
                ORDER BY started_at DESC
                LIMIT 5
            """),
            {"workflow_id": workflow_id}
        ).fetchall()

        logger.info(f"Workflow {workflow_id} retrieved successfully")
        return {
            "workflow": dict(workflow._mapping),
            "steps": [dict(step._mapping) for step in steps],
            "destination": dict(destination._mapping) if destination else None,
            "recent_runs": [dict(run._mapping) for run in runs]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflow: {str(e)}")