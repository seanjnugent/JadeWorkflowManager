
from dagster import job, op, resource, In, Out, InputDefinition
import pandas as pd
import io
import json
import uuid
from supabase import Client
from sqlalchemy import create_engine, text

@resource
def supabase_resource(init_context):
    supabase_url = "https://cxdfynepqojqrvfdbuaf.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4ZGZ5bmVwcW9qcXJ2ZmRidWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg1NDc3MTIsImV4cCI6MjAyNDEyMzcxMn0.COv9BBfQUP1LF41X9rGANKKwl0s_yM6JBRIvSgNIb_k"
    return Client(supabase_url, supabase_key)

@resource
def db_engine_resource(init_context):
    return create_engine("postgresql://postgres.cxdfynepqojqrvfdbuaf:ConduitDB2025!@aws-0-eu-west-2.pooler.supabase.com:5432/postgres")

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
    code = '''import pandas as pd

import json

import os

from typing import Dict, Any, List, Optional, Union



def csv_to_json_transformation(params: Dict[str, Any], file_path: str) -> Dict[str, Any]:

    """

    Transforms CSV data to a structured JSON format with configurable parameters.

    

    Args:

        params (Dict[str, Any]): Parameters for the transformation, such as:

            - title: Title for the JSON document

            - include_metadata: Whether to include file metadata (default: True)

            - group_by: Column name to group data by (optional)

            - filter_by: Dict of column:value pairs to filter rows (optional)

            - columns: List of columns to include (optional, default: all)

        file_path (str): Path to the input CSV file

        

    Returns:

        Dict[str, Any]: Transformed data in JSON format with the structure:

        {

            "title": str,

            "metadata": {

                "source_file": str,

                "row_count": int,

                "column_count": int,

                "columns": List[str]

            },

            "data": List[Dict] or Dict[str, List[Dict]] if grouped

        }

    """

    try:

        # Read CSV file

        df = pd.read_csv(file_path)

        

        # Apply column filtering if specified

        if "columns" in params and params["columns"]:

            columns = [col for col in params["columns"] if col in df.columns]

            if columns:

                df = df[columns]

        

        # Apply row filtering if specified

        if "filter_by" in params and isinstance(params["filter_by"], dict):

            for col, value in params["filter_by"].items():

                if col in df.columns:

                    df = df[df[col] == value]

        

        # Create basic result structure

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

        

        # Remove metadata if not requested

        if params.get("include_metadata") is False:

            del result["metadata"]

        

        # Handle grouping if specified

        group_by = params.get("group_by")

        if group_by and group_by in df.columns:

            result["data"] = {}

            for group_name, group_df in df.groupby(group_by):

                result["data"][str(group_name)] = group_df.drop(columns=[group_by] if params.get("exclude_group_column") else []).to_dict(orient="records")

        else:

            # Convert each row to dictionary

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
    name="workflow_job_23",
    resource_defs={"supabase": supabase_resource, "db_engine": db_engine_resource},
    input_defs=[InputDefinition("input_file_path", str), InputDefinition("workflow_id", int), InputDefinition("destination", dict)]
)
def workflow_job(input_file_path: str, workflow_id: int, destination: dict):
    input_df = load_input_op(input_file_path)
    transformed = transform_op(input_df)
    save_output_op(transformed, workflow_id, destination)
