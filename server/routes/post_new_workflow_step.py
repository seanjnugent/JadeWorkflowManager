from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging
from .get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

class WorkflowStepCreate(BaseModel):
    workflow_id: int
    label: str
    description: Optional[str] = None
    code_type: str
    code: str
    step_order: int

router = APIRouter()

@router.post("/steps")
async def create_workflow_step(
    step: WorkflowStepCreate,
    db: Session = Depends(get_db)
):
    """Create a new workflow step"""
    try:
        logger.info(f"Creating step for workflow {step.workflow_id}")

        # Validate code_type
        valid_code_types = ['python', 'sql', 'r']
        if step.code_type not in valid_code_types:
            raise HTTPException(400, f"Invalid code type. Must be one of: {', '.join(valid_code_types)}")

        # Basic validation (e.g., non-empty code and label)
        if not step.label:
            raise HTTPException(400, "Step label is required")
        if not step.code:
            raise HTTPException(400, "Step code is required")

        # Insert into workflow_step table
        result = db.execute(
            text("""
                INSERT INTO workflow.workflow_step (
                    workflow_id, step_order, label, description,
                    code_type, code, created_at, updated_at
                ) VALUES (
                    :workflow_id, :step_order, :label, :description,
                    :code_type, :code, NOW(), NOW()
                )
                RETURNING id, workflow_id, step_order, label, description, code_type, code
            """),
            {
                "workflow_id": step.workflow_id,
                "step_order": step.step_order,
                "label": step.label,
                "description": step.description,
                "code_type": step.code_type,
                "code": step.code
            }
        )
        step_record = result.fetchone()
        if not step_record:
            raise HTTPException(500, "Failed to create step")

        db.commit()
        logger.info("Step created successfully")
        return {
            "message": "Step created successfully",
            "step": dict(step_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Step creation failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Step creation failed: {str(e)}")