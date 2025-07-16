import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...app.config_manager import ConfigTemplateManager, WorkflowConfig
from ..get_health_check import get_db

router = APIRouter(prefix="/config", tags=["configuration"])

def get_config_manager():
    return ConfigTemplateManager(os.getenv("DAGSTER_API_URL"))

@router.post("/workflows/{workflow_id}/generate")
async def generate_config(
    workflow_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    manager: ConfigTemplateManager = Depends(get_config_manager)
):
    """Generate or regenerate config template"""
    try:
        # Check existing config
        if not force:
            existing = await _get_existing_config(workflow_id, db)
            if existing:
                return {"message": "Config exists", "config": existing}
        
        # Generate new template
        template = await manager.generate_template(workflow_id)
        
        # Save to database
        await db.execute(
            "UPDATE workflow.workflow SET config_template = :template WHERE id = :id",
            {"template": json.dumps(template), "id": workflow_id}
        )
        db.commit()
        
        return {"template": template, "generated": True}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Generation failed: {str(e)}")

async def _get_existing_config(workflow_id: int, db: Session) -> Optional[Dict]:
    result = await db.execute(
        "SELECT config_template FROM workflow.workflow WHERE id = :id",
        {"id": workflow_id}
    )
    row = result.fetchone()
    return json.loads(row[0]) if row and row[0] else None