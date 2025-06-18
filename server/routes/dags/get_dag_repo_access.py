from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from github import Github, GithubException
import os
from dotenv import load_dotenv
from typing import Optional
from ..get_health_check import get_db  # Adjust import based on your project structure

# Load environment variables
load_dotenv()

# Configure logger
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api", tags=["github"])

# GitHub configuration (matching Dagster setup)
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")

if not GITHUB_ACCESS_TOKEN:
    logger.error("GITHUB_ACCESS_TOKEN environment variable not set")
    raise RuntimeError("GITHUB_ACCESS_TOKEN environment variable is required")

@router.get("/github-dag-info")
async def get_github_dag_info(
    dag_path: str,
    db: Session = Depends(get_db)  # Included for consistency, optional for logging
):
    """
    Fetch metadata for a DAG file in the GitHub repository.

    Args:
        dag_path: Path to the DAG file relative to DAGs/ directory (e.g., 'workflow_job_2')
        db: Database session (for potential logging or auditing)

    Returns:
        dict: {
            "authorized": bool,
            "last_updated": str (ISO 8601 timestamp),
            "commit_message": str,
            "author": str
        } if access granted, or {"authorized": false} if not
    """
    try:
        logger.info(f"Fetching GitHub DAG info for {dag_path}")

        # Validate input
        if not dag_path:
            logger.error("Missing required parameter: dag_path")
            raise HTTPException(status_code=400, detail="Missing required parameter: dag_path")

        # Construct file path (e.g., DAGs/workflow_job_2.py)
        file_path = f"DAGs/{dag_path}.py"

        # Initialize GitHub client
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        logger.info(f"Successfully accessed repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")

        try:
            # Get file contents to check existence
            repo.get_contents(file_path, ref=GITHUB_BRANCH)

            # Get last commit for the file
            commits = repo.get_commits(path=file_path, sha=GITHUB_BRANCH)
            latest_commit = commits[0]  # First commit is the most recent

            # Extract metadata
            last_updated = latest_commit.commit.author.date.isoformat()
            commit_message = latest_commit.commit.message
            author = latest_commit.commit.author.name or latest_commit.author.login

            logger.info(f"Metadata retrieved for {file_path}: last_updated={last_updated}, author={author}")
            # Optionally log to database
            # db.execute(text("INSERT INTO github_dag_access_log (dag_path, success) VALUES (:dag_path, :success)"), {"dag_path": file_path, "success": True})

            return {
                "authorized": True,
                "last_updated": last_updated,
                "commit_message": commit_message,
                "author": author
            }

        except GithubException as e:
            if e.status in [401, 403]:
                logger.warning(f"Unauthorized access to {file_path}: {e.status}")
                return {"authorized": False}
            elif e.status == 404:
                logger.warning(f"DAG file not found: {file_path}")
                return {"authorized": False}
            else:
                logger.error(f"GitHub API error for {file_path}: {e.status} - {e.data}")
                raise HTTPException(status_code=500, detail=f"GitHub API error: {e.status}")
        except Exception as e:
            logger.error(f"Unexpected error fetching DAG info for {file_path}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch DAG info: {str(e)}")

    except GithubException as e:
        logger.error(f"Failed to access repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to access GitHub repository: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in get_github_dag_info: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")