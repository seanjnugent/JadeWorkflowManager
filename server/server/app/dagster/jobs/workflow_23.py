
from dagster import job, op, resource, In, Out, Field, StringSource, OpExecutionContext
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

@op(config_schema={"input_file_path": str}, out=Out(pd.DataFrame))
def load_input_op(context: OpExecutionContext):
    input_file_path = context.op_config["input_file_path"]
    context.log.info(f"Loading input file: {input_file_path}")
    
    try:
        supabase_client = context.resources.supabase

        # Extract bucket and path
        if "/" in input_file_path:
            parts = input_file_path.split("/", 1)
            bucket = parts[0]
            path = parts[1]
        else:
            bucket = "workflow-files"
            path = input_file_path

        # Download file content
        file_content = supabase_client.storage.from_(bucket).download(path)
        
        # Parse CSV
        df = pd.read_csv(io.BytesIO(file_content))
        context.log.info(f"Loaded CSV with {len(df)} rows and {len(df.columns)} columns")
        return df
    except Exception as e:
        context.log.error(f"Error loading input: {str(e)}")
        # Log error to database
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO workflow.run_log
                        (run_id, step_id, log_level, message, timestamp)
                        VALUES (:run_id, null, 'error', :message, NOW())
                    '''),
                    {
                        "run_id": context.run_id,
                        "message": f"Error loading input file: {str(e)}"
                    }
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {str(db_error)}")
        raise

@op(
    config_schema={
        "parameters": dict,
        "step_data": dict,
        "step_label": Field(StringSource, is_required=False, default_value="default_step")
    },
    ins={"input_df": In(pd.DataFrame)},
    out=Out(dict)
)
def transform_op(context: OpExecutionContext, input_df: pd.DataFrame):
    parameters = context.op_config["parameters"] or {}
    step_data = context.op_config["step_data"] or {}
    step_label = context.op_config["step_label"]
    step_id = step_data.get("id")
    
    context.log.info(f"Starting transformation for step {step_label}")
    context.log.info(f"Parameters: {parameters}")
    
    # Record start in database
    try:
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, 'info', :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "step_id": step_id,
                    "message": f"Starting step {step_label}"
                }
            )
            conn.commit()
    except Exception as e:
        context.log.error(f"Database error logging step start: {str(e)}")
    
    # Execute transformation code
    try:
        # Extract transformation code
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
        
        # Create execution environment
        local_vars = {
            "pd": pd,
            "json": json,
            "input_df": input_df
        }
        
        # Execute code
        exec(code, {}, local_vars)
        
        # Call transformation function
        transform_func = local_vars["csv_to_json_transformation"]
        result = transform_func(parameters, step_data.get("input_file_path", "unknown"))
        
        # Log success
        context.log.info(f"Transformation completed successfully")
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    INSERT INTO workflow.run_log
                    (run_id, step_id, log_level, message, timestamp)
                    VALUES (:run_id, :step_id, :log_level, :message, NOW())
                '''),
                {
                    "run_id": context.run_id,
                    "step_id": step_id,
                    "log_level": "info",
                    "message": "Transformation executed successfully"
                }
            )
            conn.commit()
        
        return result
    except Exception as e:
        error_msg = f"Transformation error: {str(e)}"
        context.log.error(error_msg)
        
        # Log error to database
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO workflow.run_log
                        (run_id, step_id, log_level, message, timestamp)
                        VALUES (:run_id, :step_id, :log_level, :message, NOW())
                    '''),
                    {
                        "run_id": context.run_id,
                        "step_id": step_id,
                        "log_level": "error",
                        "message": error_msg
                    }
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to log error to database: {str(db_error)}")
        
        raise Exception(error_msg)

@op(
    config_schema={
        "workflow_id": int,
        "destination": dict
    },
    ins={"transformed_data": In(dict)}
)
def save_output_op(context: OpExecutionContext, transformed_data: dict):
    workflow_id = context.op_config["workflow_id"]
    destination = context.op_config["destination"] or {}
    
    try:
        context.log.info(f"Saving output for workflow {workflow_id}")
        
        # Check for errors in transformed data
        if "error" in transformed_data:
            error_msg = f"Transformation error: {transformed_data['error']}"
            context.log.error(error_msg)
            raise Exception(error_msg)
        
        # Get destination file path or generate default
        output_path = destination.get("file_path")
        if not output_path:
            output_format = destination.get("file_format", "csv").lower()
            output_path = f"workflow-files/output/{workflow_id}_{uuid.uuid4()}.{output_format}"
        
        # Handle different output formats
        supabase_client = context.resources.supabase
        bucket = "workflow-files"
        
        if output_path.endswith(".json"):
            # JSON output
            json_data = json.dumps(transformed_data, indent=2).encode()
            file_content = io.BytesIO(json_data)
            
            # Upload to Supabase storage
            if "/" in output_path:
                parts = output_path.split("/", 1)
                bucket = parts[0]
                path = parts[1]
            else:
                path = output_path
                
            supabase_client.storage.from_(bucket).upload(path, file_content)
            
        else:
            # Convert to DataFrame and save as CSV
            if isinstance(transformed_data.get("data"), dict):
                # Handle grouped data
                flattened_data = []
                for group_name, group_data in transformed_data["data"].items():
                    for item in group_data:
                        row = {"group": group_name}
                        row.update(item)
                        flattened_data.append(row)
                df = pd.DataFrame(flattened_data)
            else:
                # Regular data list
                df = pd.DataFrame(transformed_data.get("data", []))
            
            # Save DataFrame as CSV and upload
            csv_data = df.to_csv(index=False).encode()
            file_content = io.BytesIO(csv_data)
            
            if "/" in output_path:
                parts = output_path.split("/", 1)
                bucket = parts[0] 
                path = parts[1]
            else:
                path = output_path
                
            supabase_client.storage.from_(bucket).upload(path, file_content)
        
        context.log.info(f"Output saved to: {output_path}")
        
        # Update run record with output file path
        with context.resources.db_engine.connect() as conn:
            conn.execute(
                text('''
                    UPDATE workflow.run
                    SET output_file_path = :output_file_path,
                        status = 'completed',
                        finished_at = NOW()
                    WHERE id = :run_id
                '''),
                {"run_id": context.run_id, "output_file_path": output_path}
            )
            conn.commit()
            context.log.info(f"Run record updated with output path")
        
        return {"output_file_path": output_path}
    except Exception as e:
        error_msg = f"Output save error: {str(e)}"
        context.log.error(error_msg)
        
        # Update run with error status
        try:
            with context.resources.db_engine.connect() as conn:
                conn.execute(
                    text('''
                        UPDATE workflow.run
                        SET status = 'failed',
                            error_message = :error_message,
                            finished_at = NOW()
                        WHERE id = :run_id
                    '''),
                    {"run_id": context.run_id, "error_message": error_msg}
                )
                conn.commit()
        except Exception as db_error:
            context.log.error(f"Failed to update run status: {str(db_error)}")
        
        raise Exception(error_msg)

# Define the job
@job(
    name="workflow_job_23",
    resource_defs={
        "supabase": supabase_resource,
        "db_engine": db_engine_resource
    },
    tags={"workflow_id": "23"}
)
def workflow_job():
    input_df = load_input_op()
    transformed_data = transform_op(input_df)
    save_output_op(transformed_data)
