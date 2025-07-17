from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging
from github import Github, GithubException
import os
import re
from dotenv import load_dotenv
from typing import Optional
from ..get_health_check import get_db

# Load environment variables
load_dotenv()

# Configure logger
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api", tags=["github"])

# GitHub configuration
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")

if not GITHUB_ACCESS_TOKEN:
    logger.error("GITHUB_ACCESS_TOKEN environment variable not set")
    raise RuntimeError("GITHUB_ACCESS_TOKEN environment variable is required")

def extract_job_name(dag_path: str) -> Optional[str]:
    """
    Extract the workflow job name (e.g., 'workflow_job_2') from various formats.
   
    Handles:
    - Full Windows/Linux paths
    - Python module paths
    - Just the job name
    """
    if not dag_path:
        return None
   
    # Try extracting last part after dots or slashes
    segments = []

    # Split by dot (for Python module paths)
    segments.extend(dag_path.split("."))
   
    # Split by OS path separators
    segments.extend(dag_path.replace("\\", "/").split("/"))

    # Look for any segment matching workflow_job_{number}
    workflow_pattern = re.compile(r"^workflow_job_\d+$")
    for seg in reversed(segments):
        if workflow_pattern.match(seg):
            return seg

    # Fallback: strip everything except alphanum and match pattern
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", dag_path)
    match = re.search(r"workflow_job_\d+", cleaned)
    if match:
        return match.group(0)

    return None

@router.get("/github-dag-info")
async def get_github_dag_info(
    dag_path: str,
    db: Session = Depends(get_db)
):
    """
    Fetch metadata for a DAG file in the GitHub repository.
    Returns authorized status, last commit date, author, message, and version (1.x where x is padded file commit count).
    """
    try:
        logger.info(f"Fetching GitHub DAG info for raw dag_path: {dag_path}")

        # Validate input
        if not dag_path:
            logger.error("Missing required parameter: dag_path")
            raise HTTPException(status_code=400, detail="Missing required parameter: dag_path")

        # Extract clean job name
        job_name = extract_job_name(dag_path)
        if not job_name:
            logger.warning(f"Could not extract job name from dag_path: {dag_path}")
            return {"authorized": False}

        # Construct GitHub file path
        file_path = f"DAGs/{job_name}.py"
        logger.info(f"Constructed GitHub path: {file_path}")

        # Initialize GitHub client
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        logger.info(f"Successfully accessed repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")

        try:
            # Get file contents to check existence
            repo.get_contents(file_path, ref=GITHUB_BRANCH)

            # Get commits for the specific file (file-level history)
            commits = list(repo.get_commits(path=file_path, sha=GITHUB_BRANCH))
           
            if not commits:
                logger.warning(f"No commits found for file: {file_path}")
                return {"authorized": False}

            # Get the most recent commit for this file
            latest_commit = commits[0]
           
            # Count the actual number of commits that modified this specific file
            file_commit_count = len(commits)

            # Extract metadata from the latest commit
            last_updated = latest_commit.commit.author.date.isoformat()
            commit_message = latest_commit.commit.message
            author = latest_commit.commit.author.name or (latest_commit.author.login if latest_commit.author else "Unknown")
            version = f"1.{file_commit_count:02d}"

            logger.info(f"File-level metadata retrieved for {file_path}: last_updated={last_updated}, author={author}, version={version}, commits={file_commit_count}")

            return {
                "authorized": True,
                "last_updated": last_updated,
                "commit_message": commit_message,
                "author": author,
                "version": version,
                "file_commit_count": file_commit_count,
                "file_path": file_path
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