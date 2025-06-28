from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/")
async def get_workflows(db: Session = Depends(get_db)):
    """
    Get all workflows.
    """
    try:
        logger.info("Fetching all workflows")
        sql = """
            SELECT id, name
            FROM workflow.workflow
            ORDER BY name
        """
        result = db.execute(text(sql)).fetchall()
        workflows = [dict(row._mapping) for row in result]
        logger.info(f"Fetched {len(workflows)} workflows")
        return {"workflows": workflows}
    except Exception as e:
        logger.error(f"Failed to fetch workflows: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflows: {str(e)}")

@router.get("/permissions")
async def get_workflow_permissions(
    workflow_id: int = Query(None, description="Filter by workflow_id"),
    db: Session = Depends(get_db)
):
    """
    Get workflow-user permissions with optional filtering by workflow_id.
    Joins user and user_group metadata.
    """
    try:
        logger.info(f"Fetching workflow permissions with workflow_id={workflow_id}")
        sql = """
            SELECT 
                wp.id,
                wp.user_id,
                concat(u.first_name, ' ', u.surname) AS user_name,
                wp.workflow_id,
                wp.permission_level,
                wp.created_at,
                ug.name AS user_group_name
            FROM workflow.workflow_permission wp
            LEFT JOIN workflow."user" u ON wp.user_id = u.id
            LEFT JOIN workflow.user_group ug ON u.user_group_id = ug.id
            {where_clause}
            ORDER BY wp.created_at DESC
        """
        params = {}
        where_clause = ""
        if workflow_id is not None:
            where_clause = "WHERE wp.workflow_id = :workflow_id"
            params["workflow_id"] = workflow_id
        final_sql = sql.format(where_clause=where_clause)
        result = db.execute(text(final_sql), params).fetchall()
        permissions = [dict(row._mapping) for row in result]
        logger.info(f"Fetched {len(permissions)} workflow permissions")
        return {"permissions": permissions}
    except Exception as e:
        logger.error(f"Failed to fetch workflow permissions: {str(e)}")
        raise HTTPException(500, f"Failed to fetch permissions: {str(e)}")

@router.post("/permissions")
async def add_workflow_permission(
    permission: dict,
    db: Session = Depends(get_db)
):
    """
    Add a new user permission to a workflow.
    """
    try:
        logger.info(f"Adding permission: {permission}")
        sql = """
            INSERT INTO workflow.workflow_permission (user_id, workflow_id, permission_level)
            VALUES (:user_id, :workflow_id, :permission_level)
            RETURNING id
        """
        params = {
            "user_id": permission["user_id"],
            "workflow_id": permission["workflow_id"],
            "permission_level": permission["permission_level"]
        }
        result = db.execute(text(sql), params).fetchone()
        db.commit()
        logger.info(f"Added permission with id {result.id}")
        return {"id": result.id}
    except Exception as e:
        logger.error(f"Failed to add permission: {str(e)}")
        raise HTTPException(500, f"Failed to add permission: {str(e)}")

@router.delete("/permissions/{permission_id}")
async def remove_workflow_permission(
    permission_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove a user's permission from a workflow.
    """
    try:
        logger.info(f"Removing permission with id {permission_id}")
        sql = """
            DELETE FROM workflow.workflow_permission
            WHERE id = :permission_id
            RETURNING id
        """
        result = db.execute(text(sql), {"permission_id": permission_id}).fetchone()
        if not result:
            logger.warning(f"Permission with id {permission_id} not found")
            raise HTTPException(404, "Permission not found")
        db.commit()
        logger.info(f"Removed permission with id {permission_id}")
        return {"message": "Permission removed"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to remove permission: {str(e)}")
        raise HTTPException(500, f"Failed to remove permission: {str(e)}")