from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import json
import logging
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from .get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

class WorkflowUpdate(BaseModel):
    workflow_id: int
    parameters: Optional[List[Dict[str, Any]]] = None

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.patch("/workflow/update")
async def update_workflow(
    workflow_update: WorkflowUpdate,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating workflow {workflow_update.workflow_id}")

        result = db.execute(
            text("""
                UPDATE workflow.workflow
                SET parameters = :parameters,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, name, description, status
            """),
            {
                "id": workflow_update.workflow_id,
                "parameters": json.dumps(workflow_update.parameters) if workflow_update.parameters else None
            }
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")

        db.commit()
        logger.info("Workflow updated successfully")
        return {
            "message": "Workflow updated successfully",
            "workflow": dict(workflow_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow update failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow update failed: {str(e)}")
