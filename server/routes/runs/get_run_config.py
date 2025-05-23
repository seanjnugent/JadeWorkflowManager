from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
import json
import logging
import requests
import os

logger = logging.getLogger(__name__)

class ConfigTemplateManager:
    """Manages configuration templates for workflows"""
    
    def __init__(self, dagster_api_url: str):
        self.dagster_api_url = dagster_api_url
    
    async def auto_generate_config_template(self, workflow_id: int, job_name: str) -> Dict[str, Any]:
        """
        Auto-generate config template by introspecting the Dagster job
        This queries Dagster to get the actual job structure and required configs
        """
        
        query = """
        query GetJobConfig($selector: PipelineSelector!) {
          pipeline(selector: $selector) {
            name
            solids {
              name
              definition {
                configField {
                  configType {
                    key
                    ... on CompositeConfigType {
                      fields {
                        name
                        configType {
                          key
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        
        variables = {
            "selector": {
                "repositoryLocationName": "server.app.dagster.repo",
                "repositoryName": "workflow_repository",
                "pipelineName": job_name
            }
        }
        
        try:
            response = requests.post(
                self.dagster_api_url,
                json={"query": query, "variables": variables},
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to introspect job {job_name}, using default template")
                return self._create_default_template(workflow_id)
            
            result = response.json()
            
            if "errors" in result or not result.get("data", {}).get("pipeline"):
                logger.warning(f"Job {job_name} not found or error occurred, using default template")
                return self._create_default_template(workflow_id)
            
            # Parse the job structure and create config template
            pipeline = result["data"]["pipeline"]
            return self._parse_dagster_job_to_template(pipeline, workflow_id)
            
        except Exception as e:
            logger.error(f"Error introspecting job {job_name}: {str(e)}")
            return self._create_default_template(workflow_id)
    
    def _parse_dagster_job_to_template(self, pipeline_data: Dict, workflow_id: int) -> Dict[str, Any]:
        """Parse Dagster job data to create a config template"""
        
        template = {}
        
        for solid in pipeline_data.get("solids", []):
            op_name = solid["name"]
            config_field = solid.get("definition", {}).get("configField")
            
            if config_field and config_field.get("configType"):
                # Extract the config structure
                config_type = config_field["configType"]
                
                if config_type.get("key") == "Shape" and "fields" in config_type:
                    # This is a structured config
                    op_config = {}
                    
                    for field in config_type["fields"]:
                        field_name = field["name"]
                        
                        # Create template values based on common field names
                        if "file_path" in field_name.lower():
                            if "input" in field_name.lower():
                                op_config[field_name] = "{{input_file_path}}"
                            elif "output" in field_name.lower():
                                op_config[field_name] = "{{output_file_path}}"
                            else:
                                op_config[field_name] = "{{file_path}}"
                        elif "workflow_id" in field_name.lower():
                            op_config[field_name] = "{{workflow_id}}"
                        elif "parameters" in field_name.lower():
                            op_config[field_name] = {}  # Will be replaced with actual parameters
                        else:
                            # For other fields, use a placeholder or default
                            op_config[field_name] = f"{{{{{field_name}}}}}"
                    
                    template[op_name] = op_config
                else:
                    # Simple config or unknown structure, use basic template
                    template[op_name] = self._create_basic_op_config(op_name, workflow_id)
            else:
                # No config field, but still include the op
                template[op_name] = {}
        
        # If no ops found, use default template
        if not template:
            return self._create_default_template(workflow_id)
        
        return template
    
    def _create_basic_op_config(self, op_name: str, workflow_id: int) -> Dict[str, Any]:
        """Create basic config for an operation based on naming patterns"""
        
        config = {}
        
        # Common patterns based on operation names
        if "load" in op_name.lower() or "input" in op_name.lower():
            config.update({
                "input_file_path": "{{input_file_path}}",
                "workflow_id": "{{workflow_id}}"
            })
        
        if "transform" in op_name.lower() or "process" in op_name.lower():
            config.update({
                "workflow_id": "{{workflow_id}}",
                "parameters": {}
            })
        
        if "save" in op_name.lower() or "output" in op_name.lower():
            config.update({
                "output_file_path": "{{output_file_path}}",
                "workflow_id": "{{workflow_id}}"
            })
        
        # If none of the patterns match, add basic config
        if not config:
            config["workflow_id"] = "{{workflow_id}}"
        
        return config
    
    def _create_default_template(self, workflow_id: int) -> Dict[str, Any]:
        """Create the default template when introspection fails"""
        return {
            f"load_input_workflow_job_{workflow_id}": {
                "input_file_path": "{{input_file_path}}",
                "output_file_path": "{{output_file_path}}",
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

# Enhanced WorkflowConfigManager with auto-generation
class EnhancedWorkflowConfigManager(WorkflowConfigManager):
    """Enhanced version with auto-generation capabilities"""
    
    def __init__(self, dagster_api_url: str):
        super().__init__()
        self.template_manager = ConfigTemplateManager(dagster_api_url)
    
    async def load_workflow_config(self, workflow_id: int, db: Session, 
                                 auto_generate: bool = True) -> WorkflowConfig:
        """Load workflow config with optional auto-generation"""
        
        if workflow_id in self.configs:
            return self.configs[workflow_id]
        
        # Load from database
        result = await execute_db_query(
            db,
            """
            SELECT id, name, input_file_path, input_structure, destination, dag_path,
                   config_template, default_parameters
            FROM workflow.workflow 
            WHERE id = :workflow_id
            """,
            {"workflow_id": workflow_id}
        )
        
        workflow = result.fetchone()
        if not workflow:
            raise HTTPException(404, f"Workflow {workflow_id} not found")
        
        # Try to load saved config template
        config_template = None
        if hasattr(workflow, 'config_template') and workflow.config_template:
            try:
                config_template = json.loads(workflow.config_template) if isinstance(workflow.config_template, str) else workflow.config_template
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Invalid config_template for workflow {workflow_id}")
        
        # Auto-generate if no template exists and auto_generate is True
        if not config_template and auto_generate:
            job_name = f"workflow_job_{workflow_id}"
            logger.info(f"Auto-generating config template for workflow {workflow_id}")
            
            config_template = await self.template_manager.auto_generate_config_template(
                workflow_id, job_name
            )
            
            # Save the auto-generated template
            await self.save_workflow_config(workflow_id, config_template, {}, db)
        
        # Fallback to default if still no template
        if not config_template:
            config_template = self.template_manager._create_default_template(workflow_id)
        
        # Load default parameters
        default_params = {}
        if hasattr(workflow, 'default_parameters') and workflow.default_parameters:
            try:
                default_params = json.loads(workflow.default_parameters) if isinstance(workflow.default_parameters, str) else workflow.default_parameters
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Invalid default_parameters for workflow {workflow_id}")
        
        workflow_config = WorkflowConfig(
            workflow_id=workflow_id,
            job_name=f"workflow_job_{workflow_id}",
            op_configs=config_template,
            required_ops=list(config_template.keys()),
            input_file_required=bool(workflow.input_file_path or workflow.input_structure),
            default_parameters=default_params
        )
        
        self.configs[workflow_id] = workflow_config
        return workflow_config

# Initialize enhanced config manager
enhanced_config_manager = EnhancedWorkflowConfigManager(os.getenv("DAGSTER_API_URL"))

# API endpoints for config management
config_router = APIRouter(prefix="/config", tags=["configuration"])

@config_router.post("/workflows/{workflow_id}/generate")
async def generate_workflow_config(
    workflow_id: int, 
    force_regenerate: bool = False,
    db: Session = Depends(get_db)
):
    """Generate configuration template for a workflow by introspecting Dagster job"""
    
    try:
        job_name = f"workflow_job_{workflow_id}"
        
        # Check if config already exists and force_regenerate is False
        if not force_regenerate:
            try:
                existing_config = await enhanced_config_manager.load_workflow_config(workflow_id, db, auto_generate=False)
                if existing_config.op_configs:
                    return {
                        "message": "Configuration already exists",
                        "workflow_id": workflow_id,
                        "config_template": existing_config.op_configs,
                        "regenerated": False
                    }
            except:
                pass  # Config doesn't exist, continue with generation
        
        # Generate new config template
        template_manager = ConfigTemplateManager(os.getenv("DAGSTER_API_URL"))
        config_template = await template_manager.auto_generate_config_template(workflow_id, job_name)
        
        # Save the generated template
        await enhanced_config_manager.save_workflow_config(workflow_id, config_template, {}, db)
        
        return {
            "message": "Configuration template generated successfully",
            "workflow_id": workflow_id,
            "job_name": job_name,
            "config_template": config_template,
            "regenerated": True
        }
        
    except Exception as e:
        logger.error(f"Failed to generate config for workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Config generation failed: {str(e)}")

@config_router.post("/workflows/{workflow_id}/manual")
async def set_manual_config(
    workflow_id: int,
    config_template: Dict[str, Any],
    default_parameters: Dict[str, Any] = {},
    db: Session = Depends(get_db)
):
    """Manually set configuration template for a workflow"""
    
    try:
        # Validate the config structure
        if not isinstance(config_template, dict):
            raise ValueError("config_template must be a dictionary")
        
        # Save the manual configuration
        await enhanced_config_manager.save_workflow_config(
            workflow_id, config_template, default_parameters, db
        )
        
        return {
            "message": "Manual configuration saved successfully",
            "workflow_id": workflow_id,
            "config_template": config_template,
            "default_parameters": default_parameters
        }
        
    except Exception as e:
        logger.error(f"Failed to save manual config for workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Manual config save failed: {str(e)}")

@config_router.get("/workflows/{workflow_id}")
async def get_workflow_config(
    workflow_id: int, 
    auto_generate: bool = True,
    db: Session = Depends(get_db)
):
    """Get workflow configuration, optionally auto-generating if missing"""
    
    try:
        workflow_config = await enhanced_config_manager.load_workflow_config(
            workflow_id, db, auto_generate
        )
        
        return {
            "workflow_id": workflow_config.workflow_id,
            "job_name": workflow_config.job_name,
            "op_configs": workflow_config.op_configs,
            "required_ops": workflow_config.required_ops,
            "input_file_required": workflow_config.input_file_required,
            "default_parameters": workflow_config.default_parameters
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get config for workflow {workflow_id}: {str(e)}")
        raise HTTPException(500, f"Config retrieval failed: {str(e)}")

@config_router.post("/workflows/bulk-generate")
async def bulk_generate_configs(
    workflow_ids: List[int] = None,
    force_regenerate: bool = False,
    db: Session = Depends(get_db)
):
    """Generate configuration templates for multiple workflows"""
    
    try:
        # If no specific IDs provided, get all workflows
        if not workflow_ids:
            result = await execute_db_query(
                db,
                "SELECT id FROM workflow.workflow ORDER BY id",
                {}
            )
            workflow_ids = [row.id for row in result.fetchall()]
        
        results = []
        template_manager = ConfigTemplateManager(os.getenv("DAGSTER_API_URL"))
        
        for workflow_id in workflow_ids:
            try:
                # Check if config exists
                needs_generation = force_regenerate
                if not force_regenerate:
                    try:
                        existing_config = await enhanced_config_manager.load_workflow_config(
                            workflow_id, db, auto_generate=False
                        )
                        needs_generation = not existing_config.op_configs
                    except:
                        needs_generation = True
                
                if needs_generation:
                    job_name = f"workflow_job_{workflow_id}"
                    config_template = await template_manager.auto_generate_config_template(
                        workflow_id, job_name
                    )
                    
                    await enhanced_config_manager.save_workflow_config(
                        workflow_id, config_template, {}, db
                    )
                    
                    results.append({
                        "workflow_id": workflow_id,
                        "status": "generated",
                        "config_template": config_template
                    })
                else:
                    results.append({
                        "workflow_id": workflow_id,
                        "status": "already_exists",
                        "config_template": None
                    })
                    
            except Exception as e:
                logger.error(f"Failed to generate config for workflow {workflow_id}: {str(e)}")
                results.append({
                    "workflow_id": workflow_id,
                    "status": "failed",
                    "error": str(e)
                })
        
        return {
            "message": f"Bulk generation completed for {len(workflow_ids)} workflows",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Bulk config generation failed: {str(e)}")
        raise HTTPException(500, f"Bulk generation failed: {str(e)}")
