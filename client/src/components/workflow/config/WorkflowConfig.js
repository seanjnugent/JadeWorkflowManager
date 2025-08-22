import { FileInput, Upload, File, Settings2, Database, ArrowDownToLine, Code, CheckCircle2, FileSpreadsheet, FileText, Link } from 'lucide-react';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export const steps = [
  { id: 'workflow-details', title: 'Workflow Details', icon: <FileInput className="h-4 w-4" /> },
  { id: 'source-configuration', title: 'Source Configuration', icon: <Upload className="h-4 w-4" /> },
  { id: 'structure-preview', title: 'Structure Preview', icon: <File className="h-4 w-4" /> },
  { id: 'parameters', title: 'Parameters', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'destination-configuration', title: 'Destination', icon: <ArrowDownToLine className="h-4 w-4" /> },
  { id: 'etl-logic', title: 'Transformation', icon: <Code className="h-4 w-4" /> },
  { id: 'review', title: 'Review', icon: <CheckCircle2 className="h-4 w-4" /> },
];

export const DATABASE_CONNECTIONS = [
  { id: '1', name: 'Production DB' },
  { id: '2', name: 'Staging DB' },
  { id: '3', name: 'Analytics DB' },
];

// Enhanced file type support
export const SUPPORTED_FILE_TYPES = ['csv', 'xlsx', 'json', 'pdf'];

export const INPUT_FILE_TYPES = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel files', icon: <FileSpreadsheet className="h-4 w-4" /> },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation', icon: <FileText className="h-4 w-4" /> },
  { value: 'pdf', label: 'PDF', description: 'Portable Document Format', icon: <FileText className="h-4 w-4" /> }
];

export const OUTPUT_FORMATS = [
  { 
    value: 'csv', 
    label: 'CSV File', 
    icon: <FileSpreadsheet className="h-4 w-4" />, 
    description: 'Comma-separated values for data analysis' 
  },
  { 
    value: 'json', 
    label: 'JSON File', 
    icon: <FileText className="h-4 w-4" />, 
    description: 'JavaScript Object Notation for APIs' 
  },
  { 
    value: 'xlsx', 
    label: 'Excel File', 
    icon: <FileSpreadsheet className="h-4 w-4" />, 
    description: 'Microsoft Excel format for reports' 
  },
  { 
    value: 'api', 
    label: 'API Endpoint', 
    icon: <Link className="h-4 w-4" />, 
    description: 'Send data to REST API endpoints' 
  },
  { 
    value: 'receipt', 
    label: 'Processing Receipt', 
    icon: <FileText className="h-4 w-4" />, 
    description: 'JSON metadata and processing details' 
  }
];

// ETL Processing Types
export const ETL_PROCESSING_TYPES = [
  {
    value: 'custom',
    label: 'Custom Logic',
    description: 'Write custom Python code for data processing',
    icon: <Code className="h-5 w-5" />
  },
  {
    value: 'aggregation',
    label: 'Data Aggregation',
    description: 'Group and aggregate data using common functions',
    icon: <Database className="h-5 w-5" />
  },
  {
    value: 'filtering',
    label: 'Data Filtering',
    description: 'Filter data based on conditions',
    icon: <File className="h-5 w-5" />
  },
  {
    value: 'transformation',
    label: 'Data Transformation',
    description: 'Apply transformations like calculations, column mapping',
    icon: <Settings2 className="h-5 w-5" />
  }
];

// Aggregation functions
export const AGGREGATION_FUNCTIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'mean', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'std', label: 'Standard Deviation' },
  { value: 'median', label: 'Median' },
  { value: 'first', label: 'First Value' },
  { value: 'last', label: 'Last Value' },
  { value: 'nunique', label: 'Unique Count' }
];

// Filter operators
export const FILTER_OPERATORS = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'ne', label: 'Not Equals (≠)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater Than or Equal (≥)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less Than or Equal (≤)' },
  { value: 'contains', label: 'Contains' },
  { value: 'startswith', label: 'Starts With' },
  { value: 'endswith', label: 'Ends With' },
  { value: 'isnull', label: 'Is Null/Empty' },
  { value: 'notnull', label: 'Is Not Null/Empty' },
  { value: 'in', label: 'In List' },
  { value: 'between', label: 'Between Values' }
];

// Transformation operations
export const TRANSFORMATION_OPERATIONS = [
  { value: 'add_column', label: 'Add Column' },
  { value: 'rename_column', label: 'Rename Column' },
  { value: 'drop_column', label: 'Drop Column' },
  { value: 'calculate', label: 'Calculate Expression' },
  { value: 'convert_type', label: 'Convert Data Type' },
  { value: 'fill_na', label: 'Fill Missing Values' },
  { value: 'sort', label: 'Sort Data' },
  { value: 'deduplicate', label: 'Remove Duplicates' },
  { value: 'merge', label: 'Merge/Join Data' },
  { value: 'pivot', label: 'Pivot Table' }
];

// Data types
export const DATA_TYPES = [
  { value: 'string', label: 'String (Text)' },
  { value: 'integer', label: 'Integer (Whole Numbers)' },
  { value: 'float', label: 'Float (Decimal Numbers)' },
  { value: 'boolean', label: 'Boolean (True/False)' },
  { value: 'date', label: 'Date (YYYY-MM-DD)' },
  { value: 'datetime', label: 'DateTime (YYYY-MM-DD HH:MM:SS)' },
  { value: 'time', label: 'Time (HH:MM:SS)' },
  { value: 'category', label: 'Category (Categorical)' }
];

// File structure field types (for input file configuration)
export const FILE_STRUCTURE_TYPES = [
  { value: 'string', label: 'Text/String', description: 'Textual data, names, descriptions' },
  { value: 'integer', label: 'Integer', description: 'Whole numbers (1, 2, 3...)' },
  { value: 'float', label: 'Decimal', description: 'Numbers with decimals (1.5, 2.7...)' },
  { value: 'boolean', label: 'True/False', description: 'Boolean values (Yes/No, True/False)' },
  { value: 'date', label: 'Date', description: 'Date values (YYYY-MM-DD)' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time (YYYY-MM-DD HH:MM:SS)' },
  { value: 'email', label: 'Email', description: 'Email addresses' },
  { value: 'url', label: 'URL', description: 'Web addresses' },
  { value: 'phone', label: 'Phone', description: 'Phone numbers' },
  { value: 'id', label: 'Identifier', description: 'Unique identifiers, keys' }
];

// Receipt configuration options
export const RECEIPT_CONTENT_OPTIONS = [
  { value: 'basic', label: 'Basic Info', description: 'Workflow ID, timestamps, row counts' },
  { value: 'detailed', label: 'Detailed Stats', description: 'Column info, data quality metrics' },
  { value: 'full', label: 'Complete Audit', description: 'Full processing log, parameters, lineage' }
];

// Default ETL template
export const DEFAULT_ETL_TEMPLATE = `def process_data(df, parameters=None):
    """
    Custom ETL processing function
    
    Args:
        df (pd.DataFrame): Input dataframe (or dict of dataframes for multiple inputs)
        parameters (dict): Processing parameters from workflow configuration
    
    Returns:
        pd.DataFrame or dict: Processed dataframe(s)
    """
    
    # Handle multiple input files
    if isinstance(df, dict):
        # Multiple input files - access by name
        # hearings_df = df.get('hearings_file')
        # disposals_df = df.get('disposals_file')
        
        # Example: Merge multiple files
        processed_df = pd.DataFrame()  # Your merge logic here
    else:
        # Single input file
        processed_df = df.copy()
    
    # Example: Basic data cleaning
    processed_df = processed_df.dropna()
    
    # Example: Use parameters if provided
    if parameters:
        # Add parameter-based processing logic
        pass
    
    # TODO: Add your specific transformations here
    
    return processed_df`;

// Dagster operation template with multiple file support
export const DAGSTER_OPERATION_TEMPLATE = `@op(
    config_schema={{
        "workflow_id": Field(Int),
        "created_at": Field(String),
        "parameters": Field(dict, default_value={{}})
    }},
    out=Out(dict)
)
def process_data_{workflow_id}(context, input_data: dict):
    """Process loaded data with custom ETL logic"""
    config = context.op_config
    workflow_id = config["workflow_id"]
    created_at = config.get("created_at", datetime.now().strftime("%Y%m%d_%H%M%S"))
    parameters = config.get("parameters", {{}})
    
    try:
        # Handle multiple input files
        if len(input_data) > 1:
            # Multiple files - pass as dictionary
            df_dict = {{name: data["dataframe"] for name, data in input_data.items()}}
            {etl_logic_placeholder}
        else:
            # Single file - pass dataframe directly
            df = next(iter(input_data.values()))["dataframe"]
            {etl_logic_placeholder}
        
        context.log.info(f"Processing completed for workflow {{workflow_id}}")
        
        return {{
            "processed_data": processed_df,
            "input_info": {{name: data["info"] for name, data in input_data.items()}},
            "processing_info": {{
                "workflow_id": workflow_id,
                "created_at": created_at,
                "parameters_used": parameters,
                "processing_type": "{processing_type}"
            }}
        }}
        
    except Exception as e:
        context.log.error(f"Data processing failed: {{str(e)}}")
        raise`;

// Path templates for different file types
export const FILE_PATH_TEMPLATES = {
  input: {
    csv: 'inputs/{workflow_id}/{file_name}.csv',
    json: 'inputs/{workflow_id}/{file_name}.json',
    xlsx: 'inputs/{workflow_id}/{file_name}.xlsx',
    pdf: 'inputs/{workflow_id}/{file_name}.pdf'
  },
  output: {
    csv: 'outputs/{workflow_id}/{file_name}_{created_at}.csv',
    json: 'outputs/{workflow_id}/{file_name}_{created_at}.json',
    xlsx: 'outputs/{workflow_id}/{file_name}_{created_at}.xlsx',
    receipt: 'receipts/{workflow_id}_receipt_{created_at}.json'
  }
};

// Default configurations for different output types
export const DEFAULT_OUTPUT_CONFIGS = {
  csv: {
    delimiter: ',',
    includeHeaders: true,
    encoding: 'utf-8',
    quoteChar: '"'
  },
  json: {
    pretty_print: true,
    ensure_ascii: false,
    indent: 2
  },
  xlsx: {
    sheetName: 'ProcessedData',
    includeHeaders: true,
    autofit: true
  },
  receipt: {
    include_metadata: true,
    include_lineage: true,
    include_statistics: true,
    format: 'json'
  }
};

// Validation rules for different data types
export const DATA_TYPE_VALIDATION = {
  string: { regex: null, maxLength: null },
  integer: { min: null, max: null },
  float: { min: null, max: null, precision: null },
  boolean: { trueValues: ['true', '1', 'yes', 'y'], falseValues: ['false', '0', 'no', 'n'] },
  date: { format: 'YYYY-MM-DD', minDate: null, maxDate: null },
  datetime: { format: 'YYYY-MM-DD HH:mm:ss', timezone: 'UTC' },
  email: { requireDomain: true, allowLocalhost: false },
  url: { requireHttps: false, allowLocalhost: false }
};

// Common parameter types for workflows
export const PARAMETER_TYPES = [
  { value: 'text', label: 'Text Input', description: 'Single line text field' },
  { value: 'textbox', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'numeric', label: 'Number', description: 'Numeric values (integer or decimal)' },
  { value: 'integer', label: 'Integer', description: 'Whole numbers only' },
  { value: 'date', label: 'Date', description: 'Date picker input' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'select', label: 'Dropdown', description: 'Select from predefined options' },
  { value: 'multiselect', label: 'Multi-Select', description: 'Select multiple options' },
  { value: 'boolean', label: 'True/False', description: 'Checkbox or toggle' },
  { value: 'file', label: 'File Upload', description: 'File upload input' },
  { value: 'color', label: 'Color Picker', description: 'Color selection input' }
];

// Export all constants as default
export default {
  API_BASE_URL,
  steps,
  DATABASE_CONNECTIONS,
  SUPPORTED_FILE_TYPES,
  INPUT_FILE_TYPES,
  OUTPUT_FORMATS,
  ETL_PROCESSING_TYPES,
  AGGREGATION_FUNCTIONS,
  FILTER_OPERATORS,
  TRANSFORMATION_OPERATIONS,
  DATA_TYPES,
  FILE_STRUCTURE_TYPES,
  RECEIPT_CONTENT_OPTIONS,
  DEFAULT_ETL_TEMPLATE,
  DAGSTER_OPERATION_TEMPLATE,
  FILE_PATH_TEMPLATES,
  DEFAULT_OUTPUT_CONFIGS,
  DATA_TYPE_VALIDATION,
  PARAMETER_TYPES
};