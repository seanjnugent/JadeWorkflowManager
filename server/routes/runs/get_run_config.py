import os
import json
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Define the DAGSTER_API_URL using an environment variable or a default value
DAGSTER_API_URL = os.getenv('DAGSTER_API_URL', 'http://localhost:3500')

logger = logging.getLogger(__name__)

def get_validated_config(job_name: str, config: dict) -> tuple[bool, str]:
    """Validate a Dagster job configuration via GraphQL API."""
    try:
        session = requests.Session()
        retries = Retry(total=3, backoff_factor=0.5, status_forcelist=[502, 503, 504])
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        response = session.post(
            f"{DAGSTER_API_URL}/graphql",
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
            timeout=10
        )

        response.raise_for_status()
        data = response.json()
        logger.debug(f"Validation response: {json.dumps(data, indent=2)}")

        if "errors" in data and data["errors"]:
            error_msg = f"GraphQL errors: {json.dumps(data['errors'], indent=2)}"
            logger.error(error_msg)
            return False, error_msg

        validation = data.get("data", {}).get("runConfigValidation", {})

        if validation.get("__typename") == "RunConfigValidationValid":
            return True, "Configuration is valid"
        elif validation.get("__typename") == "RunConfigValidationInvalid":
            errors = [f"{err['message']} (Reason: {err['reason']})" for err in validation.get("errors", [])]
            error_msg = f"Invalid config: {'; '.join(errors)}"
            logger.error(error_msg)
            return False, error_msg
        else:
            error_msg = f"Unexpected validation response: {json.dumps(validation, indent=2)}"
            logger.error(error_msg)
            return False, error_msg

    except requests.RequestException as e:
        error_msg = f"Request failed: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"Validation failed: {str(e)}"
        logger.error(error_msg)
        return False, error_msg
