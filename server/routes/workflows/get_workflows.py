from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])

@router.get("/")
async def list_workflows(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_id: int = Query(None, description="Filter workflows by user permission"),
    db: Session = Depends(get_db)
):
    """List all workflows with pagination, optionally filtered by user permission"""
    try:
        logger.info(f"Listing workflows, page {page}, limit {limit}, user_id={user_id}")
        offset = (page - 1) * limit
        
        # Base query
        query = """
            SELECT a.id, a.name, description, a.status, a.created_at, destination, 
                   MAX(b.started_at) as last_run, 
                   concat(c.first_name, ' ', c.surname) as owner, 
                   c.id as owner_id, d."name" as group_name
            FROM workflow.workflow a
            left join workflow.run b on a.id = b.workflow_id
            left join workflow.user c on a.created_by = c.id
            left join workflow.user_group d on c.user_group_id = d.id
            inner join workflow.workflow_permission e on a.id = e.workflow_id
            {user_filter}
            group by a.id, a.name, description, a.status, a.created_at, destination, 
                     concat(c.first_name, ' ', c.surname), c.id, d."name" 
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        """
        
        # Count query
        count_query = """
            SELECT COUNT(*) 
            FROM workflow.workflow a
            {user_filter_count}
        """
        
        # Add user filter if user_id is provided
        params = {"limit": limit, "offset": offset}
        user_filter = ""
        if user_id is not None:
            user_filter = "WHERE e.user_id = :user_id"
            params["user_id"] = user_id
        
        # Execute workflows query
        result = db.execute(
            text(query.format(user_filter=user_filter)),
            params
        )
        workflows = [dict(row._mapping) for row in result.fetchall()]

        # Execute count query
        count_result = db.execute(
            text(count_query.format(
                user_filter_count="INNER JOIN workflow.workflow_permission e ON a.id = e.workflow_id " + user_filter
                if user_id is not None else ""
            )),
            params
        )
        total = count_result.fetchone()[0]

        logger.info(f"Retrieved {len(workflows)} workflows, total {total}")
        return {
            "workflows": workflows,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
    except Exception as e:
        logger.error(f"Failed to fetch workflows: {str(e)}")
        raise HTTPException(500, f"Failed to fetch workflows: {str(e)}")