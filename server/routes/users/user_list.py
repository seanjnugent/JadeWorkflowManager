from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")

async def get_users_list(db: Session = Depends(get_db)):
    """Get list of all users"""
    try:
        logger.info("Fetching list of users")
        result = db.execute(
            text("""
                SELECT id, first_name, surname, email, "role", is_locked, login_count, last_login_at
                FROM workflow."user"
                ORDER BY id
            """)
        ).fetchall()

        return {
            "users": [dict(row._mapping) for row in result]
        }

    except Exception as e:
        logger.error(f"Failed to fetch users list: {str(e)}")
        raise HTTPException(500, f"Failed to fetch users: {str(e)}")