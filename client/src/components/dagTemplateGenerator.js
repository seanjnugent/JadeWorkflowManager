// dagTemplateGenerator.js
export const generateDAGTemplate = (workflowConfig) => {
  const {
    workflowId,
    workflowName,
    sourceType,
    sourceConfig,
    destinationType,
    destinationConfig,
    parameters
  } = workflowConfig;

  const sanitizedName = workflowName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  
  return `from dagster import job, op, Field, String, Int, Float, Bool, resource, Out, In
import pandas as pd
import boto3
from botocore.exceptions import ClientError
import tempfile
import os
import logging
from datetime import datetime
import requests
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Resources ---
@resource(
    config_schema={
        "S3_ACCESS_KEY_ID": Field(String),
        "S3_SECRET_ACCESS_KEY": Field(String),
        "S3_REGION": Field(String, default_value="eu-west-2"),
        "S3_ENDPOINT": Field(String, is_required=False),
        "S3_BUCKET": Field(String, default_value="jade-files"),
    }
)
def s3_resource(init_context):
    """S3 resource returning client directly"""
    config = init_context.resource_config
    client_kwargs = {
        'aws_access_key_id': config['S3_ACCESS_KEY_ID'],
        'aws_secret_access_key': config['S3_SECRET_ACCESS_KEY'],
        'region_name': config['S3_REGION']
    }
    
    if config.get('S3_ENDPOINT'):
        client_kwargs['endpoint_url'] = config['S3_ENDPOINT']
    
    try:
        client = boto3.client('s3', **client_kwargs)
        client.list_buckets()  # Test connection
        return client
    except ClientError as e:
        init_context.log.error(f"S3 connection failed: {str(e)}")
        raise

# --- Operations ---
${generateSourceOperation(sourceType, sourceConfig, workflowId)}

${generateProcessOperation(workflowId, parameters)}

${generateDestinationOperation(destinationType, destinationConfig, workflowId)}

# --- Job Definition ---
${generateJobDefinition(workflowId, sanitizedName, sourceType, destinationType, parameters)}
`;
};

const generateSourceOperation = (sourceType, sourceConfig, workflowId) => {
  switch (sourceType) {
    case 'file':
      return `@op(
    required_resource_keys={"s3"},
    config_schema={
        "input_file_path": Field(String, is_required=True),
        "workflow_id": Field(Int),
        "bucket": Field(String, default_value="jade-files")
    },
    out=Out(dict)
)
def load_input_data_${workflowId}(context):
    """Load input data from S3 file"""
    s3_client = context.resources.s3
    config = context.op_config
    bucket = config["bucket"]
    input_path = config["input_file_path"]
    
    try:
        # Extract key from S3 path
        if input_path.startswith(f"s3://{bucket}/"):
            key = input_path[len(f"s3://{bucket}/"):]
        elif input_path.startswith(f"{bucket}/"):
            key = input_path[len(bucket)+1:]
        else:
            key = input_path
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temp_file:
            temp_file_name = temp_file.name
        
        # Download the file
        s3_client.download_file(bucket, key, temp_file_name)
        context.log.info(f"Downloaded s3://{bucket}/{key} to {temp_file_name}")
        
        # Load data
        df = pd.read_csv(temp_file_name)
        context.log.info(f"Loaded {len(df)} rows from input file")
        
        return {
            "data": df,
            "temp_file": temp_file_name,
            "source_path": f"s3://{bucket}/{key}"
        }
    except Exception as e:
        context.log.error(f"Failed to load input data: {str(e)}")
        raise`;

    case 'api':
      return `@op(
    config_schema={
        "api_endpoint": Field(String, is_required=True),
        "auth_token": Field(String, is_required=False),
        "workflow_id": Field(Int),
    },
    out=Out(dict)
)
def load_input_data_${workflowId}(context):
    """Load input data from API"""
    config = context.op_config
    endpoint = config["api_endpoint"]
    auth_token = config.get("auth_token")
    
    try:
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        response = requests.get(endpoint, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        df = pd.DataFrame(data)
        context.log.info(f"Loaded {len(df)} rows from API")
        
        return {
            "data": df,
            "source_path": endpoint
        }
    except Exception as e:
        context.log.error(f"Failed to load data from API: {str(e)}")
        raise`;

    default:
      return `@op(
    config_schema={
        "workflow_id": Field(Int)
    },
    out=Out(dict)
)
def load_input_data_${workflowId}(context):
    """Load input data - placeholder implementation"""
    context.log.info("Loading input data...")
    # TODO: Implement data loading logic
    return {"data": pd.DataFrame(), "source_path": "placeholder"}`;
  }
};

const generateProcessOperation = (workflowId, parameters) => {
  const parameterSchema = {};
  
  if (parameters && parameters.length > 0) {
    parameters.forEach(section => {
      section.parameters?.forEach(param => {
        const fieldType = getFieldType(param.type);
        parameterSchema[param.name] = `Field(${fieldType}, is_required=${param.mandatory})`;
      });
    });
  }
  
  const configSchema = {
    "workflow_id": "Field(Int)",
    ...parameterSchema
  };
  
  return `@op(
    config_schema={
        ${Object.entries(configSchema).map(([key, value]) => `"${key}": ${value}`).join(',\n        ')}
    },
    out=Out(dict)
)
def process_data_${workflowId}(context, input_data: dict):
    """Process the loaded data"""
    config = context.op_config
    df = input_data["data"]
    
    try:
        context.log.info(f"Processing {len(df)} rows of data")
        
        # TODO: Implement your data processing logic here
        # You can access parameters like: config["parameter_name"]
        
        processed_df = df.copy()  # Placeholder - replace with actual processing
        
        context.log.info(f"Processing complete. Output: {len(processed_df)} rows")
        
        return {
            "processed_data": processed_df,
            "source_path": input_data["source_path"]
        }
    except Exception as e:
        context.log.error(f"Data processing failed: {str(e)}")
        raise
    finally:
        # Clean up temporary files
        if "temp_file" in input_data and os.path.exists(input_data["temp_file"]):
            os.unlink(input_data["temp_file"])`;
};

const generateDestinationOperation = (destinationType, destinationConfig, workflowId) => {
  switch (destinationType) {
    case 'csv':
      return `@op(
    required_resource_keys={"s3"},
    config_schema={
        "output_path": Field(String, is_required=True),
        "workflow_id": Field(Int),
        "bucket": Field(String, default_value="jade-files")
    },
    out=Out(dict)
)
def save_output_${workflowId}(context, processed_data: dict):
    """Save processed data to CSV file in S3"""
    s3_client = context.resources.s3
    config = context.op_config
    bucket = config["bucket"]
    output_path = config["output_path"]
    df = processed_data["processed_data"]
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as temp_file:
            temp_file_name = temp_file.name
        
        # Save DataFrame to temporary file
        df.to_csv(temp_file_name, index=False)
        
        # Extract key from output path
        if output_path.startswith(f"s3://{bucket}/"):
            key = output_path[len(f"s3://{bucket}/"):]
        elif output_path.startswith(f"{bucket}/"):
            key = output_path[len(bucket)+1:]
        else:
            key = output_path
        
        # Upload to S3
        with open(temp_file_name, "rb") as f:
            s3_client.put_object(
                Bucket=bucket,
                Key=key,
                Body=f,
                ContentType="text/csv"
            )
        
        # Clean up
        os.unlink(temp_file_name)
        
        output_url = f"s3://{bucket}/{key}"
        context.log.info(f"Output saved to {output_url}")
        
        return {
            "output_path": output_url,
            "row_count": len(df)
        }
    except Exception as e:
        context.log.error(f"Failed to save output: {str(e)}")
        raise`;

    case 'api':
      return `@op(
    config_schema={
        "api_endpoint": Field(String, is_required=True),
        "auth_token": Field(String, is_required=False),
        "workflow_id": Field(Int)
    },
    out=Out(dict)
)
def save_output_${workflowId}(context, processed_data: dict):
    """Save processed data to API endpoint"""
    config = context.op_config
    endpoint = config["api_endpoint"]
    auth_token = config.get("auth_token")
    df = processed_data["processed_data"]
    
    try:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        
        # Convert DataFrame to JSON
        data = df.to_dict(orient="records")
        
        response = requests.post(endpoint, json=data, headers=headers)
        response.raise_for_status()
        
        context.log.info(f"Successfully sent {len(data)} records to API")
        
        return {
            "output_path": endpoint,
            "row_count": len(df),
            "response_status": response.status_code
        }
    except Exception as e:
        context.log.error(f"Failed to send data to API: {str(e)}")
        raise`;

    default:
      return `@op(
    config_schema={
        "workflow_id": Field(Int)
    },
    out=Out(dict)
)
def save_output_${workflowId}(context, processed_data: dict):
    """Save output data - placeholder implementation"""
    df = processed_data["processed_data"]
    context.log.info(f"Saving {len(df)} rows of processed data...")
    # TODO: Implement output saving logic
    return {"output_path": "placeholder", "row_count": len(df)}`;
  }
};

const generateJobDefinition = (workflowId, sanitizedName, sourceType, destinationType, parameters) => {
  const resourceDefs = sourceType === 'file' || destinationType === 'csv' ? '{"s3": s3_resource}' : '{}';
  
  return `@job(
    resource_defs=${resourceDefs},
    config={
        "ops": {
            "load_input_data_${workflowId}": {
                "config": {
                    ${generateOpConfig('load', sourceType, workflowId)}
                }
            },
            "process_data_${workflowId}": {
                "config": {
                    "workflow_id": ${workflowId}${parameters && parameters.length > 0 ? ',\n                    # Add your parameter values here' : ''}
                }
            },
            "save_output_${workflowId}": {
                "config": {
                    ${generateOpConfig('save', destinationType, workflowId)}
                }
            }
        }${resourceDefs !== '{}' ? `,
        "resources": {
            "s3": {
                "config": {
                    "S3_ACCESS_KEY_ID": {"env": "S3_ACCESS_KEY_ID"},
                    "S3_SECRET_ACCESS_KEY": {"env": "S3_SECRET_ACCESS_KEY"},
                    "S3_REGION": "eu-west-2",
                    "S3_ENDPOINT": {"env": "S3_ENDPOINT"},
                    "S3_BUCKET": "jade-files"
                }
            }
        }` : ''}
    },
    description="Workflow ${workflowId}: ${sanitizedName}",
    tags={"dagster/max_retries": 3}
)
def workflow_job_${workflowId}():
    """${sanitizedName} workflow"""
    input_data = load_input_data_${workflowId}()
    processed_data = process_data_${workflowId}(input_data)
    save_output_${workflowId}(processed_data)`;
};

const generateOpConfig = (opType, configType, workflowId) => {
  if (opType === 'load') {
    switch (configType) {
      case 'file':
        return `"input_file_path": "jade-files/inputs/${workflowId}/input.csv",
                    "workflow_id": ${workflowId},
                    "bucket": "jade-files"`;
      case 'api':
        return `"api_endpoint": "https://api.example.com/data",
                    "auth_token": "your_auth_token_here",
                    "workflow_id": ${workflowId}`;
      default:
        return `"workflow_id": ${workflowId}`;
    }
  } else if (opType === 'save') {
    switch (configType) {
      case 'csv':
        return `"output_path": "jade-files/outputs/workflow_${workflowId}_output.csv",
                    "workflow_id": ${workflowId},
                    "bucket": "jade-files"`;
      case 'api':
        return `"api_endpoint": "https://api.example.com/results",
                    "auth_token": "your_auth_token_here",
                    "workflow_id": ${workflowId}`;
      default:
        return `"workflow_id": ${workflowId}`;
    }
  }
  return `"workflow_id": ${workflowId}`;
};

const getFieldType = (paramType) => {
  switch (paramType) {
    case 'integer':
      return 'Int';
    case 'numeric':
    case 'float':
      return 'Float';
    case 'boolean':
      return 'Bool';
    case 'text':
    case 'textbox':
    case 'select':
    case 'date':
    default:
      return 'String';
  }
};

export const generateConfigTemplate = (workflowConfig) => {
  const { workflowId, sourceType, destinationType, parameters } = workflowConfig;
  
  const config = {
    ops: {
      [`load_input_data_${workflowId}`]: {
        config: {
          workflow_id: `{workflow_id}`,
          ...(sourceType === 'file' && {
            input_file_path: "{input_file_path}",
            bucket: "jade-files"
          }),
          ...(sourceType === 'api' && {
            api_endpoint: "{api_endpoint}",
            auth_token: "{auth_token}"
          })
        }
      },
      [`process_data_${workflowId}`]: {
        config: {
          workflow_id: `{workflow_id}`,
          ...(parameters && parameters.length > 0 && 
            parameters.reduce((acc, section) => {
              section.parameters?.forEach(param => {
                acc[param.name] = `{${param.name}}`;
              });
              return acc;
            }, {})
          )
        }
      },
      [`save_output_${workflowId}`]: {
        config: {
          workflow_id: `{workflow_id}`,
          ...(destinationType === 'csv' && {
            output_path: "{output_path}",
            bucket: "jade-files"
          }),
          ...(destinationType === 'api' && {
            api_endpoint: "{output_api_endpoint}",
            auth_token: "{output_auth_token}"
          })
        }
      }
    }
  };

  if (sourceType === 'file' || destinationType === 'csv') {
    config.resources = {
      s3: {
        config: {
          S3_ACCESS_KEY_ID: { env: "S3_ACCESS_KEY_ID" },
          S3_SECRET_ACCESS_KEY: { env: "S3_SECRET_ACCESS_KEY" },
          S3_REGION: "eu-west-2",
          S3_ENDPOINT: { env: "S3_ENDPOINT" },
          S3_BUCKET: "jade-files"
        }
      }
    };
  }

  return config;
};