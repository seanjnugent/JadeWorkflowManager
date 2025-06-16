from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from ..get_health_check import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/user/{user_id}")
async def get_user_details(user_id: int, db: Session = Depends(get_db)):
    """Get full details for a specific user"""
    try:
        logger.info(f"Fetching user details for ID: {user_id}")
        user = db.execute(
            text("""
                SELECT id, first_name, surname, email, password_hash, created_at, updated_at,
                       "role", last_login_at, login_count, is_locked, 
                       failed_login_attempts, locked_until
                FROM workflow."user"
                WHERE id = :id
            """),
            {"id": user_id}
        ).fetchone()

        if not user:
            logger.error(f"User with ID {user_id} not found")
            raise HTTPException(404, "User not found")

        logger.info(f"User {user.id} retrieved successfully")
        return {
            "user": dict(user._mapping)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user details for ID {user_id}: {str(e)}")
        raise HTTPException(500, f"Failed to fetch user: {str(e)}")