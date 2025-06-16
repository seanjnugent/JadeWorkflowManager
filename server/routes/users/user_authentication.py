from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
from ..get_health_check import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# JWT Configuration
SECRET_KEY = "your-secret-key-here"  # Replace with a secure key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer for token authentication
security = HTTPBearer()

class UserLogin(BaseModel):
    email_address: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    user_id: int
    first_name: str
    surname: str
    role: str

class LogoutRequest(BaseModel):
    refresh_token: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/user/authenticate", response_model=TokenResponse)
async def authenticate_user(user_login: UserLogin, db: Session = Depends(get_db)):
    email = user_login.email_address
    password = user_login.password

    try:
        # Check if user is locked
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

        # Validate login
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
            
            if failed_data[1]:
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

        # Generate tokens
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_token_expires = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        access_token = create_access_token(
            data={"sub": str(user.user_id)}, expires_delta=access_token_expires
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user.user_id)}, expires_delta=refresh_token_expires
        )

        # Store refresh token in database
        db.execute(
            text("""
                INSERT INTO workflow.refresh_tokens (user_id, token, expires_at)
                VALUES (:user_id, :token, :expires_at)
            """),
            {
                "user_id": user.user_id,
                "token": refresh_token,
                "expires_at": datetime.now(timezone.utc) + refresh_token_expires
            }
        )
        db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": user.user_id,
            "first_name": user.first_name,
            "surname": user.surname,
            "role": user.role
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as err:
        db.rollback()
        logger.error(f"Error during login: {str(err)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/user/refresh")
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    try:
        # Verify refresh token
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        # Check if refresh token exists in database
        token_data = db.execute(
            text("""
                SELECT expires_at 
                FROM workflow.refresh_tokens 
                WHERE user_id = :user_id AND token = :token
            """),
            {"user_id": int(user_id), "token": refresh_token}
        ).fetchone()

        if not token_data or token_data.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Refresh token expired or invalid")

        # Generate new access token
        access_token = create_access_token(
            data={"sub": user_id}, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.get("/user/verify")
async def verify_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token_data = verify_token(credentials.credentials)
    return {"user_id": token_data["user_id"], "status": "authenticated"}

@router.post("/user/logout")
async def logout_user(request: LogoutRequest, credentials: HTTPAuthorizationCredentials = Security(security), db: Session = Depends(get_db)):
    try:
        # Verify access token
        token_data = verify_token(credentials.credentials)
        user_id = int(token_data["user_id"])

        # Delete refresh token from database
        result = db.execute(
            text("""
                DELETE FROM workflow.refresh_tokens 
                WHERE user_id = :user_id AND token = :token
            """),
            {"user_id": user_id, "token": request.refresh_token}
        )
        db.commit()

        if result.rowcount == 0:
            logger.warning(f"No refresh token found for user_id {user_id}")
        
        return {"message": "Successfully logged out"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid access token")
    except Exception as err:
        db.rollback()
        logger.error(f"Error during logout: {str(err)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")