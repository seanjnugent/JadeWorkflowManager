from fastapi import APIRouter
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import boto3
from botocore.exceptions import ClientError
from github import Github, GithubException
import os
from dotenv import load_dotenv
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# S3 configuration
S3_ACCESS_KEY_ID = os.getenv("S3_ACCESS_KEY_ID")
S3_SECRET_ACCESS_KEY = os.getenv("S3_SECRET_ACCESS_KEY")
S3_REGION = os.getenv("S3_REGION", "eu-west-2")
S3_BUCKET = os.getenv("S3_BUCKET")
if not all([S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION, S3_BUCKET]):
    raise EnvironmentError("Missing required S3 environment variables.")
print(f"S3_ACCESS_KEY_ID: {S3_ACCESS_KEY_ID}")

# Initialize S3 client
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=S3_ACCESS_KEY_ID,
        aws_secret_access_key=S3_SECRET_ACCESS_KEY,
        region_name=S3_REGION
    )
    # Verify S3 connectivity by listing buckets
    s3_client.list_buckets()
    logger.info("S3 client initialized successfully")
except ClientError as e:
    logger.error(f"Failed to initialize S3 client: {str(e)}")
    raise RuntimeError(f"Failed to initialize S3 client: {str(e)}")

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

# GitHub configuration
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
if not GITHUB_ACCESS_TOKEN:
    logger.error("GITHUB_ACCESS_TOKEN environment variable not set")
    raise RuntimeError("GITHUB_ACCESS_TOKEN environment variable is required")

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
        dagster_health_url = DAGSTER_API_URL.replace('/graphql', '')
        response = requests.get(dagster_health_url, timeout=5)
        
        if response.status_code == 200:
            return "Connected"
        else:
            return f"http_error ({response.status_code})"
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Dagster connection failed: {str(e)}")
        return f"connection_error ({str(e)})"

def check_github_health():
    """Check GitHub repository access"""
    try:
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        repo.get_contents("", ref="main")  # Check access to repository root
        logger.info(f"Successfully accessed GitHub repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        return "Connected"
    except GithubException as e:
        logger.error(f"GitHub connection failed: {str(e)}")
        if e.status in [401, 403]:
            return "unauthorized"
        elif e.status == 404:
            return "repo_not_found"
        return f"error ({str(e)})"
    except Exception as e:
        logger.error(f"Unexpected GitHub connection error: {str(e)}")
        return f"error ({str(e)})"

def check_s3_health():
    """Check S3 bucket access"""
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
        logger.info(f"Successfully accessed S3 bucket {S3_BUCKET}")
        return "Connected"
    except ClientError as e:
        logger.error(f"S3 connection failed: {str(e)}")
        if e.response['Error']['Code'] in ['403']:
            return "unauthorized"
        elif e.response['Error']['Code'] == '404':
            return "bucket_not_found"
        return f"error ({str(e)})"
    except Exception as e:
        logger.error(f"Unexpected S3 connection error: {str(e)}")
        return f"error ({str(e)})"

@router.get("/health_check")
def health_check():
    """Comprehensive health check endpoint"""
    dagster_status = check_dagster_health()
    github_status = check_github_health()
    s3_status = check_s3_health()
    
    overall_status = "healthy" if all([
        s3_client is not None,
        engine is not None,
        dagster_status == "Connected",
        github_status == "Connected",
        s3_status == "Connected"
    ]) else "unhealthy"
    
    return {
        "status": overall_status,
        "s3": s3_status,
        "database": "Connected" if engine else "Disconnected",
        "dagster": dagster_status,
        "github": github_status,
        "details": {
            "dagster_api_url": os.getenv("DAGSTER_API_URL"),
            "s3_initialized": bool(s3_client),
            "database_connected": bool(engine),
            "github_access": github_status,
            "s3_bucket": S3_BUCKET
        }
    }