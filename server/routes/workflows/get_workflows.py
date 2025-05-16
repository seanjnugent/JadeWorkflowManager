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
    db: Session = Depends(get_db)
):
    """List all workflows with pagination"""
    try:
        logger.info(f"Listing workflows, page {page}, limit {limit}")
        offset = (page - 1) * limit
        result = db.execute(
            text("""
                SELECT id, name, description, status, created_at
                FROM workflow.workflow
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            """),
            {"limit": limit, "offset": offset}
        )
        workflows = [dict(row._mapping) for row in result.fetchall()]

        count_result = db.execute(
            text("SELECT COUNT(*) FROM workflow.workflow")
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
