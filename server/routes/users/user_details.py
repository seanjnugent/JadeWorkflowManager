from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
import logging
from pydantic import BaseModel
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
            raise HTTPException(status_code=404, detail="User not found")

        logger.info(f"User {user.id} retrieved successfully")
        return {
            "user": dict(user._mapping)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user details for ID {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

class UserUpdate(BaseModel):
    first_name: str
    surname: str
    email: str
    role: str
    is_locked: bool

@router.put("/{user_id}")
async def update_user(user_id: int, user: UserUpdate, db: Session = Depends(get_db)):
    """Update a user by ID"""
    try:
        logger.info(f"Updating user with ID: {user_id}")

        result = db.execute(
            text("""
                UPDATE workflow."user"
                SET first_name = :first_name,
                    surname = :surname,
                    email = :email,
                    role = :role,
                    is_locked = :is_locked
                WHERE id = :user_id
            """),
            {
                "first_name": user.first_name,
                "surname": user.surname,
                "email": user.email,
                "role": user.role,
                "is_locked": user.is_locked,
                "user_id": user_id
            }
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "User updated successfully"}

    except Exception as e:
        logger.error(f"Failed to update user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

class UserCreate(BaseModel):
    first_name: str
    surname: str
    email: str
    role: str
    password: str

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        logger.info("Creating a new user")

        # Use the workflow.hash_password function to hash the password
        result = db.execute(
            text("""
                INSERT INTO workflow."user" (first_name, surname, email, role, password_hash)
                VALUES (:first_name, :surname, :email, :role, workflow.hash_password(:password))
                RETURNING id
            """),
            {
                "first_name": user.first_name,
                "surname": user.surname,
                "email": user.email,
                "role": user.role,
                "password": user.password
            }
        )

        new_user_id = result.fetchone()[0]
        db.commit()

        return {"message": "User created successfully", "user_id": new_user_id}

    except Exception as e:
        logger.error(f"Failed to create user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

class PasswordChange(BaseModel):
    new_password: str

@router.patch("/{user_id}/password")
async def change_password(user_id: int, password_data: PasswordChange, db: Session = Depends(get_db)):
    """Change a user's password"""
    try:
        logger.info(f"Changing password for user with ID: {user_id}")

        result = db.execute(
            text("""
                UPDATE workflow."user"
                SET password_hash = workflow.hash_password(:new_password)
                WHERE id = :user_id
            """),
            {
                "new_password": password_data.new_password,
                "user_id": user_id
            }
        )

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "Password changed successfully"}

    except Exception as e:
        logger.error(f"Failed to change password: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")
