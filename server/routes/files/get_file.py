from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import logging
from dotenv import load_dotenv
import os
import boto3
from botocore.exceptions import ClientError

from ..get_health_check import get_db  

load_dotenv()

logger = logging.getLogger(__name__)

# AWS S3 Configuration
S3_BUCKET = os.getenv("S3_BUCKET", "your-default-bucket-name")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Initialize S3 client
s3_client = boto3.client(
    's3',
    region_name=os.getenv("S3_REGION"),
    endpoint_url=os.getenv("S3_ENDPOINT"),
    aws_access_key_id=os.getenv("S3_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("S3_SECRET_ACCESS_KEY"),
)

router = APIRouter(prefix="/files", tags=["files"])

class FileDownloadRequest(BaseModel):
    file_path: str

@router.post("/download-url")
async def get_download_url(request: FileDownloadRequest, db: Session = Depends(get_db)):
    """Generate a pre-signed URL for downloading a file from S3"""
    try:
        file_path = request.file_path
        if not file_path:
            logger.error("No file path provided")
            raise HTTPException(status_code=400, detail="File path is required")

        # Normalize path - remove leading/trailing slashes and any bucket prefixes
        clean_path = file_path.strip('/')
        if clean_path.startswith(f"{S3_BUCKET}/"):
            clean_path = clean_path[len(S3_BUCKET)+1:]
        
        logger.info(f"Using S3 object key: {clean_path}")

        # Generate pre-signed URL
        try:
            url = s3_client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': S3_BUCKET,
                    'Key': clean_path
                },
                ExpiresIn=3600  # 1 hour validity
            )
            logger.info(f"Generated S3 pre-signed URL for {clean_path}")
            return {"url": url}
            
        except ClientError as e:
            logger.error(f"S3 ClientError: {e.response['Error']['Message']}")
            raise HTTPException(
                status_code=404 if 'NotFound' in str(e) else 500,
                detail=f"S3 operation failed: {e.response['Error']['Message']}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")