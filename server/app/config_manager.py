import json
import logging
import os
import requests
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
import uuid

logger = logging.getLogger(__name__)

class ConfigTemplateManager:
    """Handles config template generation and validation"""
    
    def __init__(self, dagster_api_url: str):
        self.dagster_api_url = dagster_api_url
    
    async def generate_template(self, workflow_id: int) -> Dict[str, Any]:
        """Generate config template by introspecting Dagster job"""
        job_name = f"workflow_job_{workflow_id}"
        try:
            # Query Dagster for job structure
            response = requests.post(
                self.dagster_api_url,
                json={
                    "query": self._get_introspection_query(),
                    "variables": {"pipelineName": job_name}
                },
                timeout=10
            )
            if response.status_code != 200:
                raise Exception(f"Dagster API error: {response.status_code}")
            
            data = response.json()
            if "errors" in data:
                raise Exception(f"GraphQL errors: {data['errors']}")
            
            return self._parse_job_structure(data, workflow_id)
            
        except Exception as e:
            logger.warning(f"Couldn't introspect job: {str(e)}")
            return self._create_default_template(workflow_id)
    
    def _get_introspection_query(self) -> str:
        return """
        query GetJobStructure($pipelineName: String!) {
            pipeline(pipelineName: $pipelineName) {
                solids {
                    name
                    definition {
                        configField {
                            configType {
                                key
                                fields { name }
                            }
                        }
                    }
                }
            }
        }
        """
    
    def _parse_job_structure(self, data: Dict, workflow_id: int) -> Dict:
        """Convert Dagster job structure to config template"""
        template = {}
        for solid in data.get('data', {}).get('pipeline', {}).get('solids', []):
            op_name = solid['name']
            template[op_name] = self._create_op_config(op_name, workflow_id)
        return template or self._create_default_template(workflow_id)
    
    def _create_op_config(self, op_name: str, workflow_id: int) -> Dict:
        """Create config for a single operation"""
        config = {"workflow_id": "{{workflow_id}}"}
        
        if 'load' in op_name.lower():
            config.update({
                "input_file_path": "{{input_file_path}}",
                "output_file_path": "{{output_file_path}}"
            })
        elif 'transform' in op_name.lower():
            config["parameters"] = {}
        elif 'save' in op_name.lower():
            config["output_file_path"] = "{{output_file_path}}"
            
        return config
    
    def _create_default_template(self, workflow_id: int) -> Dict:
        return {
            f"load_input_workflow_job_{workflow_id}": {
                "input_file_path": "{{input_file_path}}",
                "workflow_id": "{{workflow_id}}"
            },
            f"transform_workflow_job_{workflow_id}": {
                "workflow_id": "{{workflow_id}}",
                "parameters": {}
            },
            f"save_output_workflow_job_{workflow_id}": {
                "output_file_path": "{{output_file_path}}",
                "workflow_id": "{{workflow_id}}"
            }
        }

class WorkflowConfig:
    """Represents a workflow's configuration"""
    
    def __init__(self, workflow_id: int, template: Dict, defaults: Dict):
        self.workflow_id = workflow_id
        self.job_name = f"workflow_job_{workflow_id}"
        self.template = template
        self.default_params = defaults
    
    def build_config(self, input_path: str, params: Dict) -> Dict:
        """Populate template with runtime values"""
        output_path = f"workflow-files/outputs/{uuid.uuid4()}.json"
        config = {"ops": {}}
        
        for op_name, op_config in self.template.items():
            populated = {}
            for key, val in op_config.items():
                if isinstance(val, str):
                    populated[key] = val \
                        .replace("{{input_file_path}}", input_path) \
                        .replace("{{output_file_path}}", output_path) \
                        .replace("{{workflow_id}}", str(self.workflow_id))
                elif key == "parameters":
                    populated[key] = {**val, **params}
                else:
                    populated[key] = val
            config["ops"][op_name] = {"config": populated}
        
        return config