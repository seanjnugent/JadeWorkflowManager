from fastapi import APIRouter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE")
if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE]):
    raise EnvironmentError("Missing required Supabase environment variables.")

# Dagster configuration
DAGSTER_API_URL = os.getenv("DAGSTER_API_URL")

# Initialize Dagster API status
dagster_status = "not_configured"
if DAGSTER_API_URL:
    try:
        response = requests.post(
            DAGSTER_API_URL,
            json={"query": "query { version }"},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        if response.status_code == 200 and response.json().get("data", {}).get("version"):
            dagster_status = "connected"
        elif response.status_code == 401:
            dagster_status = "auth_failed (authentication required)"
        elif response.status_code == 404:
            dagster_status = "not_found (check DAGSTER_API_URL)"
        else:
            dagster_status = f"http_error ({response.status_code})"
    except requests.exceptions.RequestException as e:
        dagster_status = f"connection_error ({str(e)})"

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
    supabase.storage.list_buckets()
    logger.info("Supabase client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {str(e)}")
    raise RuntimeError(f"Failed to initialize Supabase client: {str(e)}")

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME')}"

if not DATABASE_URL:
    raise ValueError("Database URL cannot be None")

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()

@router.get("/")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "supabase": "connected" if supabase else "disconnected",
        "database": "connected" if engine else "disconnected",
        "dagster": dagster_status
    }