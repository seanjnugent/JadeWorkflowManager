from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import json
import logging
from pydantic import BaseModel
from typing import Dict, Any, Optional
from .get_health_check import get_db

logger = logging.getLogger(__name__)

class WorkflowStepCreate(BaseModel):
    step_order: int
    label: str
    code_type: str
    code: str
    input_file_pattern: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

router = APIRouter()

@router.post("/workflows/{workflow_id}/steps")
async def add_workflow_step(
    workflow_id: int,
    step: WorkflowStepCreate,
    db: Session = Depends(get_db)
):
    """Add a step to an existing workflow"""
    try:
        logger.info(f"Adding step to workflow {workflow_id}")
        result = db.execute(
            text("""
                INSERT INTO workflow.workflow_step (
                    workflow_id, step_order, label, code_type,
                    code, input_file_pattern, parameters,
                    created_at, updated_at
                ) VALUES (
                    :workflow_id, :step_order, :label, :code_type,
                    :code, :input_file_pattern, :parameters,
                    NOW(), NOW()
                )
                RETURNING id, step_order, label, code_type
            """),
            {
                "workflow_id": workflow_id,
                "step_order": step.step_order,
                "label": step.label,
                "code_type": step.code_type,
                "code": step.code,
                "input_file_pattern": step.input_file_pattern,
                "parameters": json.dumps(step.parameters) if step.parameters else None
            }
        )
        step_record = result.fetchone()
        db.commit()
        logger.info("Step added successfully")
        return {"step": dict(step_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to add step: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to add step: {str(e)}")
