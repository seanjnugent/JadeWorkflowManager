from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import timedelta
from .get_health_check import get_db  # Assuming get_db is defined in health_check.py
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class UserLogin(BaseModel):
    email_address: str
    password: str

@router.post("/user/authenticate")
async def authenticate_user(user_login: UserLogin, db: Session = Depends(get_db)):
    email = user_login.email_address
    password = user_login.password

    try:
        # Use PostgreSQL function to validate login
        result = db.execute(
            text("SELECT * FROM workflow.validate_login(:email, :password)"),
            {"email": email, "password": password}
        )
        user = result.fetchone()

        # If no user found or password incorrect
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
                    RETURNING failed_login_attempts
                """),
                {"email": email}
            )
            failed_attempts = failed_attempts_result.fetchone()[0] or 0
            remaining_attempts = max(0, 5 - failed_attempts)

            raise HTTPException(
                status_code=401,
                detail={
                    "message": "Invalid email or password",
                    "remainingAttempts": remaining_attempts
                }
            )

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

    except HTTPException as http_err:
        raise http_err
    except Exception as err:
        logger.error(f"Error during login: {str(err)}")
        raise HTTPException(status_code=500, detail="Internal server error")
