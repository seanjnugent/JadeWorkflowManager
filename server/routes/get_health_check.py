from fastapi import APIRouter
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import logging
import requests
import json

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

# Initialize Supabase client
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

# Create database engine
try:
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Failed to create database engine: {str(e)}")
    raise RuntimeError(f"Failed to create database engine: {str(e)}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()

def check_dagster_health():
    """Check Dagster service health dynamically"""
    DAGSTER_API_URL = os.getenv("DAGSTER_API_URL")
    if not DAGSTER_API_URL:
        return "not_configured"
    
    try:
        # Try a simple GET request to Dagster's root URL
        # Adjust the URL if Dagster has a specific health endpoint
        dagster_health_url = DAGSTER_API_URL.replace('/graphql', '')
        response = requests.get(dagster_health_url, timeout=5)
        
        if response.status_code == 200:
            return "Connected"
        else:
            return f"http_error ({response.status_code})"
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Dagster connection failed: {str(e)}")
        return f"connection_error ({str(e)})"

@router.get("/health_check")
def health_check():
    """Comprehensive health check endpoint"""
    dagster_status = check_dagster_health()
    
    return {
        "status": "healthy",
        "supabase": "Connected" if supabase else "Disconnected",
        "database": "Connected" if engine else "Disconnected",
        "dagster": dagster_status,
        "details": {
            "dagster_api_url": os.getenv("DAGSTER_API_URL"),
            "supabase_initialized": bool(supabase),
            "database_connected": bool(engine)
        }
    }