import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

class WorkflowConfig:
    def __init__(self, workflow_id: int, config_template: Dict[str, Any], default_params: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.config_template = config_template.get("ops", config_template)  # Handle both ops-wrapped and non-wrapped templates
        self.default_params = default_params
        self.job_name = f"workflow_job_{workflow_id}"

    def build_config(self, input_file_path: Optional[str], parameters: Dict[str, Any]) -> Dict[str, Any]:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_file_path = f"workflow-files/outputs/{self.workflow_id}/{timestamp}_{uuid.uuid4()}.json"

        run_config = {"ops": {}}
        for op_name, op_config in self.config_template.items():
            config = op_config.get("config", op_config)  # Handle nested config
            new_config = {}
            for key, value in config.items():
                if value == "{{input_file_path}}":
                    new_config[key] = input_file_path
                elif value == "{{output_file_path}}":
                    new_config[key] = output_file_path
                elif value == "{{workflow_id}}":
                    new_config[key] = self.workflow_id
                elif key == "parameters":
                    new_config[key] = parameters
                else:
                    new_config[key] = value
            run_config["ops"][op_name] = {"config": new_config}

        return run_config