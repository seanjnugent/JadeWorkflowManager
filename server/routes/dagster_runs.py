from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, Dict
import logging
import pandas as pd
import io
import json
import uuid
from dagster import (
    Definitions,
    RunRequest,
    DagsterInstance,
    resource,
    job,
    op,
    graph,
    GraphDefinition,
    OpExecutionContext
)
from .get_health_check import get_db, supabase, engine
from supabase import Client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runs", tags=["runs"])

# Pydantic Model for Run Creation
class RunCreate(BaseModel):
    workflow_id: int
    triggered_by: int
    parameters: Optional[Dict] = None

# Dagster Pipeline Factory
def create_workflow_pipeline(workflow_id, steps, destination, input_file_path):
    @op
    def load_input(context: OpExecutionContext):
        supabase_client = context.resources.supabase
        file_content = supabase_client.storage.from_("bucket").download(input_file_path)
        df = pd.read_csv(io.BytesIO(file_content))
        context.log.info(f"Loaded input file: {input_file_path}")
        return df

    @op
    def transform(context: OpExecutionContext, input_df, step_data, run_parameters):
        supabase_client = context.resources.supabase
        code = step_data["code"]
        parameters = run_parameters or {"Title": "Untitled Report"}

        # Define the transformation function
        local_vars = {"pd": pd, "json": json}
        exec(code, local_vars)
        transform_func = local_vars["csv_to_json_transformation"]

        # Execute transformation
        result = transform_func(parameters, input_file_path)
        
        # Log to run_log
        context.log.info(f"Step {step_data['label']} executed successfully")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                    INSERT INTO workflow.run_log (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, :log_level, :message, NOW())
                """),
                {
                    "run_id": context.run_id,
                    "step_id": step_data["id"],
                    "log_level": "info",
                    "message": f"Step {step_data['label']} executed successfully"
                }
            )
            conn.commit()

        return result

    @op
    def save_output(context: OpExecutionContext, input_data):
        if "error" in input_data:
            raise Exception(input_data["error"])
        
        df = pd.DataFrame(input_data["data"])
        output_path = destination["file_path"] or f"workflow-files/output/{workflow_id}_{uuid.uuid4()}.csv"
        df.to_csv(output_path, index=False)
        context.log.info(f"Output saved to CSV: {output_path}")

        # Update run with output path
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text("""
                    UPDATE workflow.run 
                    SET output_file_path = :output_file_path
                    WHERE id = :run_id
                """),
                {"run_id": context.run_id, "output_file_path": output_path}
            )
            conn.commit()

    @graph
    def workflow_graph():
        input_df = load_input()
        for step in steps:
            step_data = {
                "id": step["id"],
                "label": step["label"],
                "code_type": step["code_type"],
                "code": step["code"],
                "parameters": step["parameters"]
            }
            transformed = transform(input_df, step_data=step_data, run_parameters=None)
        save_output(transformed)

    return GraphDefinition(
        name=f"workflow_pipeline_{workflow_id}",
        node_defs=[load_input, transform, save_output],
        graph_fn=workflow_graph
    )

# Dagster Resources
@resource
def supabase_resource(init_context):
    return supabase

@resource
def db_engine_resource(init_context):
    return engine

@router.post("/")
async def create_run(run: RunCreate, db: Session = Depends(get_db)):
    """Trigger a Dagster pipeline run for a workflow"""
    try:
        logger.info(f"Creating run for workflow {run.workflow_id}")
        # Get workflow details
        workflow = db.execute(
            text("SELECT * FROM workflow.workflow WHERE id = :id"),
            {"id": run.workflow_id}
        ).fetchone()
        if not workflow:
            logger.error(f"Workflow {run.workflow_id} not found")
            raise HTTPException(404, "Workflow not found")

        steps = db.execute(
            text("SELECT * FROM workflow.workflow_step WHERE workflow_id = :workflow_id ORDER BY step_order"),
            {"workflow_id": run.workflow_id}
        ).fetchall()

        destination = db.execute(
            text("SELECT * FROM workflow.workflow_destination WHERE workflow_id = :workflow_id"),
            {"workflow_id": run.workflow_id}
        ).fetchone()

        input_file_path = workflow.input_file_path
        if not input_file_path:
            logger.error(f"No input file found for workflow {run.workflow_id}")
            raise HTTPException(400, "No input file found for workflow")

        # Create run
        result = db.execute(
            text("""
                INSERT INTO workflow.run (workflow_id, triggered_by, status, started_at)
                VALUES (:workflow_id, :triggered_by, :status, NOW())
                RETURNING id
            """),
            {"workflow_id": run.workflow_id, "triggered_by": run.triggered_by, "status": "running"}
        )
        run_id = result.fetchone()[0]
        db.commit()

        # Create and execute Dagster pipeline
        pipeline_def = create_workflow_pipeline(
            run.workflow_id,
            [dict(step._mapping) for step in steps],
            dict(destination._mapping) if destination else {"file_path": None, "file_format": workflow.destination},
            input_file_path
        )
        
        defs = Definitions(
            jobs=[pipeline_def],
            resources={
                "supabase": supabase_resource,
                "db_engine": db_engine_resource
            }
        )
        
        job_def = defs.get_job_def(f"workflow_pipeline_{run.workflow_id}")
        result = job_def.execute_in_process(
            run_config={
                "ops": {
                    "transform": {
                        "inputs": {
                            "run_parameters": run.parameters or {"Title": "Untitled Report"}
                        }
                    }
                }
            }
        )

        # Update run status
        status = "completed" if result.success else "failed"
        error_message = None if result.success else str(result.get_step_failure_events()[0].step_failure_data.error)
        db.execute(
            text("""
                UPDATE workflow.run 
                SET status = :status, finished_at = NOW(), error_message = :error_message
                WHERE id = :run_id
            """),
            {"run_id": run_id, "status": status, "error_message": error_message}
        )
        db.commit()

        logger.info(f"Run {run_id} for workflow {run.workflow_id} completed with status {status}")
        return {"run_id": run_id, "status": status}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        db.execute(
            text("""
                UPDATE workflow.run 
                SET status = :status, finished_at = NOW(), error_message = :error_message
                WHERE id = :run_id
            """),
            {"run_id": run_id, "status": "failed", "error_message": str(e)}
        )
        db.commit()
        logger.error(f"Failed to run workflow {run.workflow_id}: {str(e)}")
        raise HTTPException(500, f"Error running workflow: {str(e)}")

@router.get("/")
async def list_runs(db: Session = Depends(get_db)):
    """List all workflow runs"""
    try:
        logger.info("Fetching all runs")
        result = db.execute(
            text("SELECT id, workflow_id, status, started_at, finished_at, error_message, output_file_path FROM workflow.run")
        )
        runs = [dict(run._mapping) for run in result.fetchall()]
        logger.info(f"Retrieved {len(runs)} runs")
        return runs
    except Exception as e:
        logger.error(f"Failed to fetch runs: {str(e)}")
        raise HTTPException(500, f"Failed to fetch runs: {str(e)}")