import sys
import os
import importlib.util
import logging
from typing import List
import boto3
from botocore.config import Config
from github import Github, GithubException
from dotenv import load_dotenv

from dagster import (
    Definitions,
    JobDefinition,
    OpExecutionContext,
    Field,
    StringSource,
    EnvVar,
    resource,
    job,
    success_hook,
    failure_hook,
)
from sqlalchemy import create_engine, text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('dagster_repo.log')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

# --- GitHub Configuration ---
GITHUB_ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
GITHUB_REPO_OWNER = os.getenv("GITHUB_REPO_OWNER", "seanjnugent")
GITHUB_REPO_NAME = os.getenv("GITHUB_REPO_NAME", "DataWorkflowTool-Workflows")
GITHUB_BRANCH = "main"

# Validate env vars
if not GITHUB_ACCESS_TOKEN:
    logger.error("GITHUB_ACCESS_TOKEN not set in .env")
    raise ValueError("GITHUB_ACCESS_TOKEN not set in .env")

# --- Resources ---
@resource(config_schema={
    "SUPABASE_URL": Field(StringSource, is_required=False, default_value=EnvVar("SUPABASE_URL")),
    "SUPABASE_KEY": Field(StringSource, is_required=False, default_value=EnvVar("SUPABASE_KEY")),
    "S3_ACCESS_KEY_ID": Field(StringSource, is_required=False, default_value=EnvVar("S3_ACCESS_KEY_ID")),
    "S3_SECRET_ACCESS_KEY": Field(StringSource, is_required=False, default_value=EnvVar("S3_SECRET_ACCESS_KEY")),
    "S3_REGION": Field(StringSource, is_required=False, default_value=os.getenv("S3_REGION", "eu-west-2")),
    "S3_ENDPOINT": Field(StringSource, is_required=False, default_value=EnvVar("S3_ENDPOINT"))
})
def supabase_resource(init_context):
    try:
        config = init_context.resource_config
        client = boto3.client(
            "s3",
            region_name=config["S3_REGION"],
            endpoint_url=config["S3_ENDPOINT"],
            aws_access_key_id=config["S3_ACCESS_KEY_ID"],
            aws_secret_access_key=config["S3_SECRET_ACCESS_KEY"],
            config=Config(s3={"addressing_style": "path"})
        )
        logger.info("Initialized Supabase client successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise

@resource(config_schema={
    "DATABASE_URL": Field(StringSource, is_required=False, default_value=EnvVar("DATABASE_URL"))
})
def db_engine_resource(init_context):
    try:
        engine = create_engine(init_context.resource_config["DATABASE_URL"])
        logger.info("Initialized database engine successfully")
        return engine
    except Exception as e:
        logger.error(f"Failed to create database engine: {str(e)}")
        raise

# --- Hooks ---
@success_hook(required_resource_keys={"db_engine"})
def log_success(context: OpExecutionContext):
    workflow_id = context.op_config.get("workflow_id") if context.op_config else None
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                INSERT INTO workflow.run_log 
                (dagster_run_id, workflow_id, step_code, log_level, message, timestamp) 
                VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_code": context.op.name,
                    "log_level": "info",
                    "message": f"Operation {context.op.name} completed successfully"
                }
            )
            conn.commit()
        logger.info(f"Logged success for op {context.op.name} in run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log success for op {context.op.name}: {str(e)}")

@failure_hook(required_resource_keys={"db_engine"})
def log_failure(context: OpExecutionContext):
    workflow_id = context.op_config.get("workflow_id") if context.op_config else None
    error = str(context.op_exception) if context.op_exception else "Unknown error"
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                INSERT INTO workflow.run_log 
                (dagster_run_id, workflow_id, step_code, log_level, message, timestamp) 
                VALUES (:run_id, :workflow_id, :step_code, :log_level, :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "workflow_id": workflow_id,
                    "step_code": context.op.name,
                    "log_level": "error",
                    "message": f"Operation {context.op.name} failed: {error}"
                }
            )
            conn.commit()
        logger.info(f"Logged failure for op {context.op.name} in run {context.run_id}")
    except Exception as e:
        logger.error(f"Failed to log failure for op {context.op.name}: {str(e)}")

# --- Dynamic Job Loader ---
def load_jobs_from_github(directory: str = "DAGs") -> List[JobDefinition]:
    jobs = []
    try:
        g = Github(GITHUB_ACCESS_TOKEN)
        repo = g.get_repo(f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
        logger.info(f"Successfully accessed repo {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")

        try:
            contents = repo.get_contents(directory, ref=GITHUB_BRANCH)
        except GithubException as e:
            if e.status == 404:
                try:
                    root_contents = repo.get_contents("", ref=GITHUB_BRANCH)
                    dirs = [c.path for c in root_contents if c.type == "dir"]
                    logger.error(f"Directory '{directory}' not found. Available directories: {dirs}")
                except Exception as ex:
                    logger.error(f"Failed to list root directories: {str(ex)}")
            raise

        for content in contents:
            if content.path.endswith(".py"):
                module_name = content.name.replace(".py", "")
                try:
                    file_content = content.decoded_content.decode('utf-8')
                    
                    # Create a clean module namespace
                    module_globals = {
                        '__name__': module_name,
                        '__file__': f'<github:{content.path}>',
                        # Standard library imports
                        'sys': sys,
                        'os': os,
                        'json': __import__('json'),
                        'io': __import__('io'),
                        'datetime': __import__('datetime'),
                        'load_dotenv': load_dotenv,
                        # Third party imports
                        'pd': __import__('pandas'),
                        'boto3': boto3,
                        'create_engine': create_engine,
                        'text': text,
                        # Dagster imports
                        'job': job,
                        'op': __import__('dagster').op,
                        'OpExecutionContext': OpExecutionContext,
                        'Out': __import__('dagster').Out,
                        'In': __import__('dagster').In,
                        'Field': Field,
                        'Int': __import__('dagster').Int,
                        'String': __import__('dagster').String,
                        'Permissive': __import__('dagster').Permissive,
                        # Type hints
                        'Dict': dict,
                        'Optional': type(None),
                        'List': list,
                    }
                    
                    # Import botocore Config with alias to avoid conflicts
                    try:
                        from botocore.config import Config as BotoConfig
                        module_globals['BotoConfig'] = BotoConfig
                    except ImportError:
                        pass
                    
                    # Execute the file content
                    exec(file_content, module_globals)
                    
                    # Find JobDefinition objects
                    for name, obj in module_globals.items():
                        if isinstance(obj, JobDefinition):
                            # Update the job's resource_defs and hooks directly
                            obj._resource_defs = {
                                "supabase": supabase_resource,
                                "db_engine": db_engine_resource
                            }
                            obj._hooks = {log_success, log_failure}
                            
                            jobs.append(obj)
                            logger.info(f"Successfully loaded job: {name} from {content.path}")
                            break
                            
                except Exception as e:
                    logger.error(f"Failed to load job from {content.path}: {str(e)}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    continue
                    
    except GithubException as e:
        logger.error(f"GitHub API error accessing {directory}: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error loading GitHub jobs from {directory}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
    return jobs

# --- Get Jobs Function ---
def get_all_jobs():
    """Get all jobs from GitHub sources only"""
    try:
        github_jobs = load_jobs_from_github(directory="DAGs")
        
        if not github_jobs:
            logger.warning("No jobs loaded from GitHub, check GITHUB_ACCESS_TOKEN or DAGs/ directory")
        else:
            logger.info(f"Successfully loaded {len(github_jobs)} jobs from GitHub")
            
        return github_jobs
        
    except Exception as e:
        logger.error(f"Failed to load jobs: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return []

# --- Definitions for Dagster ---
defs = Definitions(
    jobs=get_all_jobs(),
    resources={
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    }
)

if __name__ == "__main__":
    logger.info("Testing repository loading")
    try:
        jobs = get_all_jobs()
        for job_def in jobs:
            logger.info(f"Found job: {job_def.name}")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")