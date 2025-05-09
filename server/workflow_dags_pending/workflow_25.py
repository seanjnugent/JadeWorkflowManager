
from dagster import job, op, resource, In, Out, InputDefinition
import pandas as pd
import io
import json
import uuid
from supabase import Client
from sqlalchemy import create_engine

@resource
def supabase_resource(init_context):
    supabase_url = ""
    supabase_key = ""
    return Client(supabase_url, supabase_key)

@resource
def db_engine_resource(init_context):
    return create_engine("")

@op(out=Out(pd.DataFrame))
def load_input_op(context, input_file_path: str) -> pd.DataFrame:
    supabase_client = context.resources.supabase
    bucket = "workflow-files"
    file_content = supabase_client.storage.from_(bucket).download(input_file_path)
    df = pd.read_csv(io.BytesIO(file_content))
    context.log.info(f"Loaded input file: {input_file_path}")
    return df

@op(
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict),
    config_schema={"step_data": dict, "parameters": dict}
)
def transform_op(context, input_df: pd.DataFrame) -> dict:
    step_data = context.op_config["step_data"]
    parameters = context.op_config["parameters"]
    code = '''rm - df["FeatureCode"]df["FeatureName"]

output here
params["Output file name"]'''
    local_vars = {"pd": pd, "json": json}
    exec(code, local_vars)
    transform_func = local_vars["csv_to_json_transformation"]
    result = transform_func(parameters, step_data["input_file_path"])
    context.log.info(f"Step {step_data['label']} executed successfully")
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                INSERT INTO workflow.run_log (run_id, step_id, log_level, message, timestamp)
                VALUES (:run_id, :step_id, :log_level, :message, NOW())
            '''),
            {
                "run_id": context.run_id,
                "step_id": step_data["id"],
                "log_level": "info",
                "message": f"Step {step_data['label']} executed successfully"
            }
        )
        conn.commit()
    return result

@op(ins={"input_data": In(dict)})
def save_output_op(context, input_data: dict, workflow_id: int, destination: dict):
    if "error" in input_data:
        raise Exception(input_data["error"])
    df = pd.DataFrame(input_data["data"])
    output_path = destination.get("file_path") or f"workflow-files/output/{workflow_id}_{uuid.uuid4()}.csv"
    df.to_csv(output_path, index=False)
    context.log.info(f"Output saved to CSV: {output_path}")
    with context.resources.db_engine.connect() as conn:
        conn.execute(
            text('''
                UPDATE workflow.run 
                SET output_file_path = :output_file_path
                WHERE id = :run_id
            '''),
            {"run_id": context.run_id, "output_file_path": output_path}
        )
        conn.commit()

@job(
    name="workflow_job_25",
    resource_defs={"supabase": supabase_resource, "db_engine": db_engine_resource},
    input_defs=[InputDefinition("input_file_path", str), InputDefinition("workflow_id", int), InputDefinition("destination", dict)]
)
def workflow_job(input_file_path: str, workflow_id: int, destination: dict):
    input_df = load_input_op(input_file_path)
    transformed = transform_op(input_df)
    save_output_op(transformed, workflow_id, destination)
