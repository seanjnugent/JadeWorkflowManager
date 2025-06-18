from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import logging
from dotenv import load_dotenv
import os
from ..get_health_check import get_db, supabase

load_dotenv()

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "workflow-files")

router = APIRouter(prefix="/files", tags=["files"])

class FileDownloadRequest(BaseModel):
    file_path: str

@router.post("/download-url")
async def get_download_url(request: FileDownloadRequest, db: Session = Depends(get_db)):
    """Generate a pre-signed URL for downloading a file from Supabase storage"""
    try:
        file_path = request.file_path
        if not file_path:
            logger.error("No file path provided")
            raise HTTPException(status_code=400, detail="File path is required")

        # Normalize file path by removing bucket prefix if present
        relative_path = file_path
        if file_path.startswith(f"{SUPABASE_BUCKET}/"):
            relative_path = file_path[len(f"{SUPABASE_BUCKET}/"):]
        elif file_path.startswith(SUPABASE_BUCKET):
            relative_path = file_path[len(SUPABASE_BUCKET):].lstrip('/')
        
        logger.info(f"Normalized relative path: {relative_path}")

        # Check if file exists by attempting to list the parent directory
        try:
            # Extract the parent directory (e.g., 'workflows/example' from 'workflows/example/1234.csv')
            parent_dir = '/'.join(relative_path.split('/')[:-1]) or ''
            file_name = relative_path.split('/')[-1]
            logger.info(f"Listing parent directory: {parent_dir}, looking for file: {file_name}")

            response = supabase.storage.from_(SUPABASE_BUCKET).list(path=parent_dir)
            logger.debug(f"Supabase list response: {response}")

            file_exists = False
            if response:
                file_exists = any(obj.get('name') == file_name for obj in response)
            
            if not file_exists:
                logger.warning(f"File not found in bucket: {SUPABASE_BUCKET}/{relative_path}")
                # Continue to generate signed URL as a fallback, as list might not always be reliable
        except Exception as e:
            logger.error(f"Error checking file existence: {str(e)}")
            # Log the error but attempt to generate the signed URL anyway
            logger.info("Proceeding with signed URL generation despite existence check failure")

        # Generate pre-signed URL
        try:
            signed_url = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(
                path=relative_path,
                expires_in=3600  # URL valid for 1 hour
            )
            if not signed_url or 'signedURL' not in signed_url:
                logger.error("Failed to generate signed URL")
                raise HTTPException(status_code=500, detail="Failed to generate download URL")
            
            logger.info(f"Generated signed URL for file: {SUPABASE_BUCKET}/{relative_path}")
            return {"url": signed_url['signedURL']}
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generating download URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")