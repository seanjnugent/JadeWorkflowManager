from dagster import job, op, resource, In, Out, InputDefinition, OpExecutionContext
import pandas as pd
import io
import json
import uuid
from supabase import Client
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Define resources
@resource
def supabase_resource(init_context):
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
    return Client(supabase_url, supabase_key)

@resource
def db_engine_resource(init_context):
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL must be set")
    return create_engine(db_url)

# Define operations (ops)
@op(config_schema={"input_file_path": str}, out=Out(pd.DataFrame))
def load_input_op(context: OpExecutionContext) -> pd.DataFrame:
    input_file_path = context.op_config["input_file_path"]
    supabase_client = context.resources.supabase
    bucket = "workflow-files"
    file_content = supabase_client.storage.from_(bucket).download(input_file_path)
    df = pd.read_csv(io.BytesIO(file_content))
    context.log.info(f"Loaded input file: {input_file_path}")
    return df

@op(
    config_schema={
        "step_data": dict,
        "parameters": dict
    },
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict)
)
def transform_op(context: OpExecutionContext, input_df: pd.DataFrame) -> dict:
    step_data = context.op_config["step_data"]
    parameters = context.op_config["parameters"]
    code = '''import pandas as pd
import json
import os
from typing import Dict, Any, List, Optional, Union

def csv_to_json_transformation(params: Dict[str, Any], file_path: str) -> Dict[str, Any]:
    try:
        df = pd.read_csv(file_path)
        if "columns" in params and params["columns"]:
            columns = [col for col in params["columns"] if col in df.columns]
            if columns:
                df = df[columns]
        if "filter_by" in params and isinstance(params["filter_by"], dict):
            for col, value in params["filter_by"].items():
                if col in df.columns:
                    df = df[df[col] == value]
        result = {
            "title": params.get("title", "CSV Data Report"),
            "metadata": {
                "source_file": os.path.basename(file_path),
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns)
            },
            "data": []
        }
        if params.get("include_metadata") is False:
            del result["metadata"]
        group_by = params.get("group_by")
        if group_by and group_by in df.columns:
            result["data"] = {}
            for group_name, group_df in df.groupby(group_by):
                result["data"][str(group_name)] = group_df.drop(columns=[group_by] if params.get("exclude_group_column") else []).to_dict(orient="records")
        else:
            result["data"] = df.to_dict(orient="records")
        return result
    except pd.errors.EmptyDataError:
        return {
            "title": params.get("title", "Empty CSV Report"),
            "error": "The CSV file is empty",
            "data": []
        }
    except pd.errors.ParserError as e:
        return {
            "error": f"CSV parsing error: {str(e)}",
            "params": params,
            "file": file_path
        }
    except Exception as e:
        return {
            "error": f"Transformation error: {str(e)}",
            "params": params,
            "file": file_path
        }'''
    local_vars = {"pd": pd, "json": json, "os": os}
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
def save_output_op(context: OpExecutionContext, input_data: dict, workflow_id: int, destination: dict):
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

# Define the job
@job(
    name="workflow_job_23",
    resource_defs={"supabase": supabase_resource, "db_engine": db_engine_resource},
)
def workflow_job():
    input_file_path = "path/to/input.csv"  # Replace with actual input file path
    workflow_id = 23  # Replace with actual workflow ID
    destination = {"file_path": "path/to/output.csv"}  # Replace with actual destination path
    input_df = load_input_op(input_file_path)
    transformed = transform_op(input_df)
    save_output_op(transformed, workflow_id, destination)
