from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import json
import logging
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

class WorkflowUpdate(BaseModel):
    workflow_id: int
    parameters: Optional[List[Dict[str, Any]]] = None
    destination: str
    destination_config: Optional[Dict[str, Any]] = None

class ParametersUpdate(BaseModel):
    workflow_id: int
    parameters: Optional[List[Dict[str, Any]]] = None

class DestinationConfigUpdate(BaseModel):
    workflow_id: int
    destination_config: Optional[Dict[str, Any]] = None

class ConfigTemplateUpdate(BaseModel):
    workflow_id: int
    config_template: Optional[Dict[str, Any]] = None

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
                    destination = :destination,
                    destination_config = :destination_config,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, name, description, status
            """),
            {
                "id": workflow_update.workflow_id,
                "parameters": json.dumps(workflow_update.parameters) if workflow_update.parameters else None,
                "destination": workflow_update.destination,
                "destination_config": json.dumps(workflow_update.destination_config) if workflow_update.destination_config else None
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

@router.patch("/workflow/update_parameters")
async def update_workflow_parameters(
    params_update: ParametersUpdate,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating parameters for workflow {params_update.workflow_id}")

        result = db.execute(
            text("""
                UPDATE workflow.workflow
                SET parameters = :parameters,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, name, description, status, parameters
            """),
            {
                "id": params_update.workflow_id,
                "parameters": json.dumps(params_update.parameters) if params_update.parameters else None
            }
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")

        db.commit()
        logger.info("Workflow parameters updated successfully")
        return {
            "message": "Workflow parameters updated successfully",
            "workflow": dict(workflow_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow parameters update failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow parameters update failed: {str(e)}")

@router.patch("/workflow/update_destination_config")
async def update_workflow_destination_config(
    config_update: DestinationConfigUpdate,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating destination config for workflow {config_update.workflow_id}")

        result = db.execute(
            text("""
                UPDATE workflow.workflow
                SET destination_config = :destination_config,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, name, description, status, destination_config
            """),
            {
                "id": config_update.workflow_id,
                "destination_config": json.dumps(config_update.destination_config) if config_update.destination_config else None
            }
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")

        db.commit()
        logger.info("Workflow destination config updated successfully")
        return {
            "message": "Workflow destination config updated successfully",
            "workflow": dict(workflow_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow destination config update failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow destination config update failed: {str(e)}")
    
@router.patch("/workflow/update_config_template")
async def update_workflow_config_template(
    config_template_update: ConfigTemplateUpdate,
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Updating config template for workflow {config_template_update.workflow_id}")

        result = db.execute(
            text("""
                UPDATE workflow.workflow
                SET config_template = :config_template,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, name, description, status, config_template
            """),
            {
                "id": config_template_update.workflow_id,
                "config_template": json.dumps(config_template_update.config_template) if config_template_update.config_template else None
            }
        )
        workflow_record = result.fetchone()
        if not workflow_record:
            raise HTTPException(404, "Workflow not found")

        db.commit()
        logger.info("Workflow config template updated successfully")
        return {
            "message": "Workflow config template updated successfully",
            "workflow": dict(workflow_record._mapping)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow config template update failed: {str(e)}")
        db.rollback()
        raise HTTPException(500, f"Workflow config template update failed: {str(e)}")