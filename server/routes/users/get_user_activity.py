from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict
from ..get_health_check import get_db
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/recent-activity")
async def get_user_recent_activity(
    user_id: int = Query(..., description="ID of the user"),
    limit: int = Query(3, ge=1, le=50),
    db: Session = Depends(get_db)
) -> List[Dict]:
    """
    Get recent activity for a specific user using the PostgreSQL function.
    Returns list of runs with status, workflow name, ID, user, time, and latest activity.
    """
    try:
        logger.info(f"Fetching recent activity for user {user_id}, limit={limit}")

        # Call the PostgreSQL function directly
        result = db.execute(
            text("""
                SELECT * FROM workflow.get_recent_activity(:user_id, :limit)
            """),
            {"user_id": user_id, "limit": limit}
        )

        rows = [dict(row._mapping) for row in result]

        if not rows:
            raise HTTPException(status_code=404, detail=f"No recent activity found for user {user_id}")

        return rows

    except Exception as e:
        logger.error(f"Failed to fetch recent activity for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")