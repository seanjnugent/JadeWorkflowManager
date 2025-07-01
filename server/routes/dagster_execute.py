import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import logging
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import os

logger = logging.getLogger(__name__)

DAGSTER_API_URL = os.getenv("DAGSTER_API_URL", "http://localhost:3500/graphql")

def get_http_session():
    session = requests.Session()
    retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[502, 503, 504])
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session

def execute_workflow(workflow_id: int, run_config: Dict[str, Any], db: Session) -> Dict[str, Any]:
    job_name = f"workflow_job_{workflow_id}"
    http_session = get_http_session()
    try:
        response = http_session.post(
            DAGSTER_API_URL,
            json={
                "query": """
                mutation LaunchRun($executionParams: ExecutionParams!) {
                    launchRun(executionParams: $executionParams) {
                        __typename
                        ... on LaunchRunSuccess {
                            run {
                                runId
                                status
                            }
                        }
                        ... on JobNotFoundError {
                            message
                        }
                        ... on RunConfigValidationInvalid {
                            errors {
                                message
                                reason
                            }
                        }
                        ... on PythonError {
                            message
                        }
                    }
                }
                """,
                "variables": {
                    "executionParams": {
                        "selector": {
                            "repositoryLocationName": "server.app.dagster.repo",
                            "repositoryName": "workflow_repository",
                            "jobName": job_name
                        },
                        "runConfigData": run_config,
                        "mode": "default"
                    }
                }
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if "errors" in data and data["errors"]:
            raise HTTPException(status_code=500, detail=f"GraphQL errors: {json.dumps(data['errors'])}")

        execution = data["data"]["launchRun"]
        if execution["__typename"] == "LaunchRunSuccess":
            return {
                "run_id": execution["run"]["runId"],
                "status": execution["run"]["status"]
            }
        elif execution["__typename"] == "JobNotFoundError":
            raise HTTPException(status_code=404, detail=f"Job not found: {execution['message']}")
        elif execution["__typename"] == "RunConfigValidationInvalid":
            errors = [f"{err['message']} (Reason: {err['reason']})" for err in execution["errors"]]
            raise HTTPException(status_code=400, detail=f"Invalid run config: {'; '.join(errors)}")
        else:
            raise HTTPException(status_code=500, detail=f"Execution failed: {execution.get('message', 'Unknown error')}")

    except requests.RequestException as e:
        logger.error(f"Dagster API request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Dagster API error: {str(e)}")

def validate_dagster_config(job_name: str, config: Dict[str, Any]) -> tuple[bool, str]:
    http_session = get_http_session()
    try:
        response = http_session.post(
            DAGSTER_API_URL,
            json={
                "query": """
                query ValidateConfig($selector: JobSelector!, $runConfigData: RunConfigData!) {
                    runConfigValidation(selector: $selector, runConfigData: $runConfigData) {
                        __typename
                        ... on RunConfigValidationValid {
                            __typename
                        }
                        ... on RunConfigValidationInvalid {
                            errors {
                                message
                                reason
                            }
                        }
                    }
                }
                """,
                "variables": {
                    "selector": {
                        "repositoryLocationName": "server.app.dagster.repo",
                        "repositoryName": "workflow_repository",
                        "jobName": job_name
                    },
                    "runConfigData": config
                }
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if "errors" in data and data["errors"]:
            return False, f"GraphQL errors: {json.dumps(data['errors'])}"

        validation = data.get("data", {}).get("runConfigValidation", {})
        if validation.get("__typename") == "RunConfigValidationValid":
            return True, "Configuration is valid"
        elif validation.get("__typename") == "RunConfigValidationInvalid":
            errors = [f"{err['message']} (Reason: {err['reason']})" for err in validation.get("errors", [])]
            return False, f"Invalid config: {'; '.join(errors)}"
        else:
            return False, f"Unexpected validation response: {json.dumps(validation)}"

    except requests.RequestException as e:
        return False, f"Request failed: {str(e)}"
    except Exception as e:
        return False, f"Validation failed: {str(e)}"
