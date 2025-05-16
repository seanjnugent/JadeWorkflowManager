from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from ..get_health_check import get_db  # Assuming get_db is defined in health_check.py
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

class UserLogin(BaseModel):
    email_address: str
    password: str
@router.post("/user/authenticate")
async def authenticate_user(user_login: UserLogin, db: Session = Depends(get_db)):
    email = user_login.email_address
    password = user_login.password

    try:
        # First check if user is locked
        locked_user = db.execute(
            text("""
                SELECT is_locked, locked_until 
                FROM workflow."user" 
                WHERE email = :email
                AND is_locked = TRUE
                AND locked_until > CURRENT_TIMESTAMP
            """),
            {"email": email}
        ).fetchone()

        if locked_user:
            raise HTTPException(
                status_code=403,
                detail={
                    "message": "Account locked",
                    "lockedUntil": locked_user.locked_until.isoformat()
                }
            )

        # Use PostgreSQL function to validate login
        result = db.execute(
            text("SELECT * FROM workflow.validate_login(:email, :password)"),
            {"email": email, "password": password}
        )
        user = result.fetchone()

        if not user:
            # Track failed login attempts
            failed_attempts_result = db.execute(
                text("""
                    UPDATE workflow."user"
                    SET
                        failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
                        is_locked = (COALESCE(failed_login_attempts, 0) + 1 >= 5),
                        locked_until = CASE
                            WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5
                            THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                            ELSE NULL
                        END
                    WHERE email = :email
                    RETURNING failed_login_attempts, is_locked, locked_until
                """),
                {"email": email}
            )
            failed_data = failed_attempts_result.fetchone()
            failed_attempts = failed_data[0] or 0
            remaining_attempts = max(0, 5 - failed_attempts)
            
            if failed_data[1]:  # is_locked
                detail = {
                    "message": "Account locked due to too many failed attempts",
                    "lockedUntil": failed_data[2].isoformat(),
                    "remainingAttempts": 0
                }
            else:
                detail = {
                    "message": "Invalid email or password",
                    "remainingAttempts": remaining_attempts
                }
            
            raise HTTPException(status_code=401, detail=detail)

        # Reset failed attempts on success
        db.execute(
            text("""
                UPDATE workflow."user"
                SET
                    failed_login_attempts = 0,
                    is_locked = FALSE,
                    locked_until = NULL
                WHERE email = :email
            """),
            {"email": email}
        )
        db.commit()

        # Return user details
        return {
            "userId": user.user_id,
            "username": user.username,
            "role": user.role
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as err:
        db.rollback()
        logger.error(f"Error during login: {str(err)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")