from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/permissions")
async def get_workflow_permissions(
    user_id: int = Query(None, description="Filter by user_id"),
    db: Session = Depends(get_db)
):
    """
    Get workflow-user permissions with optional filtering by user_id.
    Joins user and user_group metadata.
    """
    try:
        logger.info(f"Fetching workflow permissions with user_id={user_id}")

        sql = """
          SELECT 
                wp.id,
                wp.user_id,
                concat(u.first_name,' ', u.surname) AS user_name,
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
        if user_id is not None:
            where_clause = "WHERE wp.user_id = :user_id"
            params["user_id"] = user_id

        final_sql = sql.format(where_clause=where_clause)

        result = db.execute(text(final_sql), params).fetchall()

        permissions = [dict(row._mapping) for row in result]

        logger.info(f"Fetched {len(permissions)} workflow permissions")
        return {"permissions": permissions}

    except Exception as e:
        logger.error(f"Failed to fetch workflow permissions: {str(e)}")
        raise HTTPException(500, f"Failed to fetch permissions: {str(e)}")
