from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from ..get_health_check import get_db
import logging

load_dotenv()

router = APIRouter(prefix="/admin/workflows", tags=["admin"])
logger = logging.getLogger(__name__)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

def encrypt_token(token: str) -> str:
    if not ENCRYPTION_KEY:
        logger.error("ENCRYPTION_KEY not set")
        raise HTTPException(status_code=500, detail="Encryption key not configured")
    try:
        fernet = Fernet(ENCRYPTION_KEY)
        return fernet.encrypt(token.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to encrypt token: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to encrypt token: {str(e)}")

@router.post("/{workflow_id}/destination_config")
async def update_destination_config(
    workflow_id: int,
    api_url: str = Form(...),
    api_token: str = Form(...),
    db: Session = Depends(get_db)
):
    """Update destination_config for a workflow, encrypting the api_token."""
    try:
        # Validate workflow exists
        result = db.execute(
            text("SELECT id FROM workflow.workflow WHERE id = :workflow_id"),
            {"workflow_id": workflow_id}
        )
        if not result.fetchone():
            logger.error(f"Workflow {workflow_id} not found")
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")

        # Encrypt the api_token
        encrypted_token = encrypt_token(api_token)
        destination_config = {
            "api_url": api_url,
            "api_token": encrypted_token
        }

        # Update destination_config column
        db.execute(
            text("""
                UPDATE workflow.workflow
                SET destination_config = :destination_config
                WHERE id = :workflow_id
            """),
            {
                "destination_config": json.dumps(destination_config),
                "workflow_id": workflow_id
            }
        )
        db.commit()

        logger.info(f"Updated destination_config for workflow {workflow_id}")
        return {"success": True, "message": f"Destination config updated for workflow {workflow_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update destination_config: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update destination_config: {str(e)}")