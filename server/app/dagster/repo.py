from dagster import repository, JobDefinition
import importlib
import pathlib
import sys

# Path to jobs directory
jobs_dir = pathlib.Path(__file__).parent / "jobs"

# Add jobs directory to sys.path
if str(jobs_dir) not in sys.path:
    sys.path.append(str(jobs_dir))

@repository
def my_repo():
    jobs = []
    for py_file in jobs_dir.glob("*.py"):
        module_name = py_file.stem
        if module_name == "__init__":
            continue
        try:
            module = importlib.import_module(module_name)
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, JobDefinition):
                    jobs.append(attr)
        except Exception as e:
            print(f"Failed to load module {module_name}: {e}")
    return jobs