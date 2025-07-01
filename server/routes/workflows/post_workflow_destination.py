from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from pydantic import BaseModel
from typing import Optional
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

class WorkflowDestinationCreate(BaseModel):
    destination_type: str
    connection_id: Optional[int] = None
    table_name: Optional[str] = None
    file_path: Optional[str] = None
    file_format: Optional[str] = None

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.post("/workflow/{workflow_id}/destination")
async def set_workflow_destination(
    workflow_id: int,
    destination: WorkflowDestinationCreate,
    db: Session = Depends(get_db)
):
    """Set the destination for a workflow"""
    try:
        logger.info(f"Setting destination for workflow {workflow_id}")
        result = db.execute(
            text("""
                INSERT INTO workflow.workflow_destination (
                    workflow_id, destination_type, connection_id,
                    table_name, file_path, file_format,
                    created_at, updated_at
                ) VALUES (
                    :workflow_id, :destination_type, :connection_id,
                    :table_name, :file_path, :file_format,
                    NOW(), NOW()
                )
                RETURNING id, destination_type
            """),
            {
                "workflow_id": workflow_id,
                "destination_type": destination.destination_type,
                "connection_id": destination.connection_id,
                "table_name": destination.table_name,
                "file_path": destination.file_path,
                "file_format": destination.file_format
            }
        )
        dest_record = result.fetchone()
        db.commit()
        logger.info("Destination set successfully")
        return {"destination": dict(dest_record._mapping)}
    except Exception as e:
        logger.error(f"Failed to set destination: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Failed to set destination: {str(e)}")
