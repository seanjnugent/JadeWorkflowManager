import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight, Code, Database, File, Settings2, Plus, Trash2 } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { 
  ETL_PROCESSING_TYPES, 
  AGGREGATION_FUNCTIONS, 
  FILTER_OPERATORS, 
  TRANSFORMATION_OPERATIONS,
  DATA_TYPES,
  DEFAULT_ETL_TEMPLATE 
} from '../config/WorkflowConfig';

const ETLLogicStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();

  const handleProcessingTypeChange = (type) => {
    dispatch({ 
      type: 'UPDATE_ETL_CONFIG', 
      payload: { field: 'processingType', value: type } 
    });
  };

  const handleCustomLogicChange = (value) => {
    dispatch({ 
      type: 'UPDATE_ETL_CONFIG', 
      payload: { field: 'customLogic', value } 
    });
  };

  const handleGithubPathChange = (value) => {
    dispatch({ 
      type: 'UPDATE_ETL_CONFIG', 
      payload: { field: 'githubPath', value } 
    });
  };

  const handleFunctionNameChange = (value) => {
    dispatch({ 
      type: 'UPDATE_ETL_CONFIG', 
      payload: { field: 'functionName', value } 
    });
  };

  const addAggregation = () => {
    const currentAggregations = state.etlConfig.aggregationConfig.aggregations || [];
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        aggregationConfig: {
          ...state.etlConfig.aggregationConfig,
          aggregations: [...currentAggregations, { column: '', function: 'sum', alias: '' }]
        }
      }
    });
  };

  const updateAggregation = (index, field, value) => {
    const aggregations = [...state.etlConfig.aggregationConfig.aggregations];
    aggregations[index] = { ...aggregations[index], [field]: value };
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        aggregationConfig: {
          ...state.etlConfig.aggregationConfig,
          aggregations
        }
      }
    });
  };

  const removeAggregation = (index) => {
    const aggregations = state.etlConfig.aggregationConfig.aggregations.filter((_, i) => i !== index);
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        aggregationConfig: {
          ...state.etlConfig.aggregationConfig,
          aggregations
        }
      }
    });
  };

  const addFilterCondition = () => {
    const currentConditions = state.etlConfig.filteringConfig.conditions || [];
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        filteringConfig: {
          ...state.etlConfig.filteringConfig,
          conditions: [...currentConditions, { column: '', operator: 'eq', value: '', logicalOperator: 'AND' }]
        }
      }
    });
  };

  const updateFilterCondition = (index, field, value) => {
    const conditions = [...state.etlConfig.filteringConfig.conditions];
    conditions[index] = { ...conditions[index], [field]: value };
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        filteringConfig: {
          ...state.etlConfig.filteringConfig,
          conditions
        }
      }
    });
  };

  const removeFilterCondition = (index) => {
    const conditions = state.etlConfig.filteringConfig.conditions.filter((_, i) => i !== index);
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        filteringConfig: {
          ...state.etlConfig.filteringConfig,
          conditions
        }
      }
    });
  };

  const addTransformationOperation = () => {
    const currentOperations = state.etlConfig.transformationConfig.operations || [];
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        transformationConfig: {
          ...state.etlConfig.transformationConfig,
          operations: [...currentOperations, { type: 'add_column', config: {} }]
        }
      }
    });
  };

  const updateTransformationOperation = (index, field, value) => {
    const operations = [...state.etlConfig.transformationConfig.operations];
    operations[index] = { ...operations[index], [field]: value };
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        transformationConfig: {
          ...state.etlConfig.transformationConfig,
          operations
        }
      }
    });
  };

  const removeTransformationOperation = (index) => {
    const operations = state.etlConfig.transformationConfig.operations.filter((_, i) => i !== index);
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        transformationConfig: {
          ...state.etlConfig.transformationConfig,
          operations
        }
      }
    });
  };

  const updateTransformationConfig = (index, configField, value) => {
    const operations = [...state.etlConfig.transformationConfig.operations];
    operations[index] = {
      ...operations[index],
      config: {
        ...operations[index].config,
        [configField]: value
      }
    };
    dispatch({
      type: 'SET_ETL_CONFIG',
      payload: {
        transformationConfig: {
          ...state.etlConfig.transformationConfig,
          operations
        }
      }
    });
  };

  const generateCodePreview = () => {
    if (state.etlConfig.processingType === 'custom') {
      return state.etlConfig.customLogic || DEFAULT_ETL_TEMPLATE;
    }
    
    let code = `def process_data(df, parameters=None):
    """Generated ETL processing function"""
    processed_df = df.copy()
    
`;

    if (state.etlConfig.processingType === 'filtering') {
      const conditions = state.etlConfig.filteringConfig.conditions || [];
      conditions.forEach((condition, index) => {
        if (condition.column && condition.operator && condition.value !== '') {
          if (index > 0) {
            code += `    # ${condition.logicalOperator} condition\n`;
          }
          code += `    processed_df = processed_df[processed_df['${condition.column}'] ${getOperatorCode(condition.operator)} ${getValueCode(condition.value, condition.operator)}]\n`;
        }
      });
    }

    if (state.etlConfig.processingType === 'aggregation') {
      const groupBy = state.etlConfig.aggregationConfig.groupBy || [];
      const aggregations = state.etlConfig.aggregationConfig.aggregations || [];
      
      if (groupBy.length > 0) {
        code += `    # Group by columns\n`;
        code += `    processed_df = processed_df.groupby([${groupBy.map(col => `'${col}'`).join(', ')}]).agg({\n`;
        aggregations.forEach((agg, index) => {
          if (agg.column && agg.function) {
            code += `        '${agg.column}': '${agg.function}'${index < aggregations.length - 1 ? ',' : ''}\n`;
          }
        });
        code += `    }).reset_index()\n`;
      }
    }

    if (state.etlConfig.processingType === 'transformation') {
      const operations = state.etlConfig.transformationConfig.operations || [];
      operations.forEach(operation => {
        code += getTransformationCode(operation);
      });
    }

    code += `    
    return processed_df`;
    
    return code;
  };

  const getOperatorCode = (operator) => {
    const operatorMap = {
      'eq': '==',
      'ne': '!=',
      'gt': '>',
      'gte': '>=',
      'lt': '<',
      'lte': '<=',
      'contains': '.str.contains',
      'startswith': '.str.startswith',
      'endswith': '.str.endswith'
    };
    return operatorMap[operator] || '==';
  };

  const getValueCode = (value, operator) => {
    if (['contains', 'startswith', 'endswith'].includes(operator)) {
      return `('${value}')`;
    }
    if (isNaN(value)) {
      return `'${value}'`;
    }
    return value;
  };

  const getTransformationCode = (operation) => {
  switch (operation.type) {
    case 'add_column':
      return `    processed_df['${operation.config.columnName || 'new_column'}'] = ${operation.config.expression || '0'}\n`;
    case 'rename_column':
      return `    processed_df = processed_df.rename(columns={'${operation.config.oldName || 'old_name'}': '${operation.config.newName || 'new_name'}'})\n`;
    case 'drop_column':
      return `    processed_df = processed_df.drop(columns=['${operation.config.columnName || 'column_name'}'])\n`;
    case 'fill_na':
      return `    processed_df['${operation.config.columnName || 'column_name'}'] = processed_df['${operation.config.columnName || 'column_name'}'].fillna(${operation.config.fillValue || '0'})\n`;
    case 'convert_type':
      return `    processed_df['${operation.config.columnName || 'column_name'}'] = processed_df['${operation.config.columnName || 'column_name'}'].astype('${operation.config.targetType || 'str'}')\n`;
    case 'sort':
      return `    processed_df = processed_df.sort_values('${operation.config.columnName || 'column_name'}', ascending=${operation.config.ascending || 'True'})\n`;
    default:
      return '';
  }
};


  if (!isVisible) return null;

  return (
    <section id="etl-logic" ref={ref} className="sg-dataset-tile">
      <div className="sg-section-separator">
        <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
          <Code className="h-5 w-5 text-[#0065bd]" />
          ETL Logic Configuration
        </h2>
      </div>
      <p className="sg-dataset-description mb-6">
        Configure the data transformation logic for your workflow. This will generate the processing operation in your Dagster DAG.
      </p>

      <div className="space-y-6">
        {/* Processing Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Processing Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ETL_PROCESSING_TYPES.map((type) => (
              <div
                key={type.value}
                onClick={() => handleProcessingTypeChange(type.value)}
                className={`sg-dataset-tile p-4 cursor-pointer transition-colors border-2 ${
                  state.etlConfig.processingType === type.value 
                    ? 'border-[#0065bd] bg-[#e6f3ff]' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-[#0065bd] mt-1">{type.icon}</div>
                  <div>
                    <h4 className="font-medium text-gray-900">{type.label}</h4>
                    <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Logic */}
        {state.etlConfig.processingType === 'custom' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">GitHub Path (Optional)</label>
              <input
                type="text"
                value={state.etlConfig.githubPath}
                onChange={(e) => handleGithubPathChange(e.target.value)}
                placeholder="e.g., etl/custom_processing.py"
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">
                Path to your custom ETL file in GitHub (leave empty to define inline)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Function Name</label>
              <input
                type="text"
                value={state.etlConfig.functionName}
                onChange={(e) => handleFunctionNameChange(e.target.value)}
                placeholder="process_data"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Custom Processing Code</label>
              <textarea
                value={state.etlConfig.customLogic}
                onChange={(e) => handleCustomLogicChange(e.target.value)}
                placeholder={DEFAULT_ETL_TEMPLATE}
                className="w-full min-h-[300px] font-mono text-sm"
              />
              <p className="text-sm text-gray-600 mt-1">
                Write your custom Python function. Function should accept (df, parameters) and return processed DataFrame.
              </p>
            </div>
          </div>
        )}

        {/* Aggregation Configuration */}
        {state.etlConfig.processingType === 'aggregation' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Group By Columns</label>
              <input
                type="text"
                value={(state.etlConfig.aggregationConfig.groupBy || []).join(', ')}
                onChange={(e) => dispatch({
                  type: 'SET_ETL_CONFIG',
                  payload: {
                    aggregationConfig: {
                      ...state.etlConfig.aggregationConfig,
                      groupBy: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }
                  }
                })}
                placeholder="column1, column2"
                className="w-full"
              />
              <p className="text-sm text-gray-600 mt-1">
                Comma-separated list of columns to group by
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-900">Aggregations</label>
                <button
                  onClick={addAggregation}
                  className="text-sm text-[#0065bd] hover:text-[#004a9f] flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Aggregation
                </button>
              </div>
              
              {(state.etlConfig.aggregationConfig.aggregations || []).map((agg, index) => (
                <div key={index} className="flex gap-3 items-center mb-3 p-3 border border-gray-200 rounded">
                  <select
                    value={agg.column}
                    onChange={(e) => updateAggregation(index, 'column', e.target.value)}
                    className="flex-1"
                  >
                    <option value="">Select Column</option>
                    {state.parsedFileStructure.map(col => (
                      <option key={col.column} value={col.column}>{col.column}</option>
                    ))}
                  </select>
                  
                  <select
                    value={agg.function}
                    onChange={(e) => updateAggregation(index, 'function', e.target.value)}
                    className="flex-1"
                  >
                    {AGGREGATION_FUNCTIONS.map(func => (
                      <option key={func.value} value={func.value}>{func.label}</option>
                    ))}
                  </select>
                  
                  <input
                    type="text"
                    value={agg.alias}
                    onChange={(e) => updateAggregation(index, 'alias', e.target.value)}
                    placeholder="Alias (optional)"
                    className="flex-1"
                  />
                  
                  <button
                    onClick={() => removeAggregation(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtering Configuration */}
        {state.etlConfig.processingType === 'filtering' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-900">Filter Conditions</label>
              <button
                onClick={addFilterCondition}
                className="text-sm text-[#0065bd] hover:text-[#004a9f] flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Condition
              </button>
            </div>
            
            {(state.etlConfig.filteringConfig.conditions || []).map((condition, index) => (
              <div key={index} className="flex gap-3 items-center mb-3 p-3 border border-gray-200 rounded">
                {index > 0 && (
                  <select
                    value={condition.logicalOperator}
                    onChange={(e) => updateFilterCondition(index, 'logicalOperator', e.target.value)}
                    className="w-20"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                )}
                
                <select
                  value={condition.column}
                  onChange={(e) => updateFilterCondition(index, 'column', e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select Column</option>
                  {state.parsedFileStructure.map(col => (
                    <option key={col.column} value={col.column}>{col.column}</option>
                  ))}
                </select>
                
                <select
                  value={condition.operator}
                  onChange={(e) => updateFilterCondition(index, 'operator', e.target.value)}
                  className="flex-1"
                >
                  {FILTER_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                
                {!['isnull', 'notnull'].includes(condition.operator) && (
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateFilterCondition(index, 'value', e.target.value)}
                    placeholder="Value"
                    className="flex-1"
                  />
                )}
                
                <button
                  onClick={() => removeFilterCondition(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Transformation Configuration */}
        {state.etlConfig.processingType === 'transformation' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-900">Transformation Operations</label>
              <button
                onClick={addTransformationOperation}
                className="text-sm text-[#0065bd] hover:text-[#004a9f] flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Operation
              </button>
            </div>
            
            {(state.etlConfig.transformationConfig.operations || []).map((operation, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded space-y-3">
                <div className="flex justify-between items-center">
                  <select
                    value={operation.type}
                    onChange={(e) => updateTransformationOperation(index, 'type', e.target.value)}
                    className="flex-1 mr-3"
                  >
                    {TRANSFORMATION_OPERATIONS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTransformationOperation(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Operation-specific configuration */}
                {operation.type === 'add_column' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={operation.config.columnName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'columnName', e.target.value)}
                      placeholder="New column name"
                      className="w-full"
                    />
                    <input
                      type="text"
                      value={operation.config.expression || ''}
                      onChange={(e) => updateTransformationConfig(index, 'expression', e.target.value)}
                      placeholder="Expression (e.g., df['col1'] + df['col2'])"
                      className="w-full"
                    />
                  </div>
                )}
                
                {operation.type === 'rename_column' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={operation.config.oldName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'oldName', e.target.value)}
                      placeholder="Current column name"
                      className="w-full"
                    />
                    <input
                      type="text"
                      value={operation.config.newName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'newName', e.target.value)}
                      placeholder="New column name"
                      className="w-full"
                    />
                  </div>
                )}
                
                {operation.type === 'drop_column' && (
                  <input
                    type="text"
                    value={operation.config.columnName || ''}
                    onChange={(e) => updateTransformationConfig(index, 'columnName', e.target.value)}
                    placeholder="Column name to drop"
                    className="w-full"
                  />
                )}
                
                {operation.type === 'fill_na' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={operation.config.columnName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'columnName', e.target.value)}
                      placeholder="Column name"
                      className="w-full"
                    />
                    <input
                      type="text"
                      value={operation.config.fillValue || ''}
                      onChange={(e) => updateTransformationConfig(index, 'fillValue', e.target.value)}
                      placeholder="Fill value"
                      className="w-full"
                    />
                  </div>
                )}
                
                {operation.type === 'convert_type' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={operation.config.columnName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'columnName', e.target.value)}
                      placeholder="Column name"
                      className="w-full"
                    />
                    <select
                      value={operation.config.targetType || 'str'}
                      onChange={(e) => updateTransformationConfig(index, 'targetType', e.target.value)}
                      className="w-full"
                    >
                      <option value="str">String</option>
                      <option value="int">Integer</option>
                      <option value="float">Float</option>
                      <option value="bool">Boolean</option>
                      <option value="datetime">DateTime</option>
                    </select>
                  </div>
                )}
                
                {operation.type === 'sort' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={operation.config.columnName || ''}
                      onChange={(e) => updateTransformationConfig(index, 'columnName', e.target.value)}
                      placeholder="Column to sort by"
                      className="w-full"
                    />
                    <select
                      value={operation.config.ascending || 'True'}
                      onChange={(e) => updateTransformationConfig(index, 'ascending', e.target.value)}
                      className="w-full"
                    >
                      <option value="True">Ascending</option>
                      <option value="False">Descending</option>
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Code Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Generated Code Preview</label>
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap overflow-x-auto max-h-96">
              {generateCodePreview()}
            </pre>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            This code will be embedded in your Dagster DAG processing operation. You can further customize it after creation.
          </p>
        </div>

        {/* ETL Integration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">ETL Integration</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>Your ETL configuration will generate:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Dagster Operation:</strong> <code>_2_process_data_{'{workflow_id}'}</code></li>
              <li><strong>Function Signature:</strong> <code>{state.etlConfig.functionName}(df, parameters)</code></li>
              <li><strong>Input:</strong> Pandas DataFrame from source operation</li>
              <li><strong>Output:</strong> Processed DataFrame + metadata</li>
              <li><strong>Parameters:</strong> Access to workflow parameters for dynamic processing</li>
            </ul>
            {state.etlConfig.githubPath && (
              <p className="mt-2">
                <strong>GitHub File:</strong> Separate ETL file will be created at <code>{state.etlConfig.githubPath}</code>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={onPrevious}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
});

ETLLogicStep.displayName = 'ETLLogicStep';

export default ETLLogicStep;