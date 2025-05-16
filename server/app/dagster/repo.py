from dagster import repository, JobDefinition
import importlib
import pathlib
import sys
import logging
from .sensors import workflow_run_sensor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Path to jobs directory
jobs_dir = pathlib.Path(__file__).parent / "jobs"

# Add jobs directory to sys.path
if str(jobs_dir) not in sys.path:
    sys.path.append(str(jobs_dir))

@repository
def workflow_repository():
    """Dynamically load jobs from the jobs directory based on workflow_id tags"""
    jobs = []
    
    # Scan jobs directory for .py files
    for py_file in jobs_dir.glob("*.py"):
        module_name = py_file.stem
        if module_name == "__init__":
            continue
            
        try:
            # Import the module
            module = importlib.import_module(module_name)
            # Inspect all attributes for JobDefinition instances
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, JobDefinition):
                    # Extract workflow_id from tags
                    workflow_id = attr.tags.get("workflow_id")
                    if workflow_id:
                        logger.info(f"Loaded job {attr.name} for workflow_id {workflow_id}")
                        jobs.append(attr)
                    else:
                        logger.warning(f"Job {attr.name} in {module_name} has no workflow_id tag, skipping")
        except Exception as e:
            logger.error(f"Failed to load module {module_name}: {str(e)}")

    if not jobs:
        logger.warning("No jobs loaded from jobs directory")

    return jobs + [workflow_run_sensor]