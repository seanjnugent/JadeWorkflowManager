import React, { createContext, useContext, useReducer } from 'react';

const WorkflowContext = createContext();

const initialState = {
  currentStep: 1,
  workflowName: '',
  workflowDescription: '',
  userId: localStorage.getItem('userId') || '1001',
  workflowId: null,
  parsedFileStructure: [],
  isFileUploaded: false,
  uploadError: '',
  isUploading: false,
  
  // Source configuration
  sourceType: 'file',
  sourceConfig: {
    file: { supportedTypes: ['csv', 'xlsx', 'json', 'pdf'] },
    api: { endpoint: '', authToken: '', method: 'GET', headers: {} },
    database: { connectionId: '', query: '', schema: '', tableName: '' }
  },
  
  // Multiple input files support
  inputFiles: [], // Array of InputFileConfig objects
  
  // Parameters
  parameterSections: [],
  
  // Destination configuration with receipt support
  destinationOutputs: [
    { 
      id: 1, 
      name: 'primary_output', 
      type: 'csv', 
      config: {
        csv: { filename: 'output.csv', path: 'outputs/', delimiter: ',', includeHeaders: true },
        json: { filename: 'output.json', path: 'outputs/', pretty_print: true },
        api: { endpoint: '', authToken: '', method: 'POST', headers: {} },
        database: { connectionId: '', schema: '', tableName: '', createIfNotExists: false }
      },
      description: '',
      is_receipt: false
    }
  ],
  
  // Receipt configuration
  includeReceipt: true,
  
  // ETL Configuration
  etlConfig: {
    processingType: 'custom',
    customLogic: '',
    aggregationConfig: {
      groupBy: [],
      aggregations: []
    },
    filteringConfig: {
      conditions: []
    },
    transformationConfig: {
      operations: []
    },
    githubPath: '',
    functionName: 'process_data'
  }
};

const workflowReducer = (state, action) => {
  switch (action.type) {
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_WORKFLOW_NAME':
      return { ...state, workflowName: action.payload };
    
    case 'SET_WORKFLOW_DESCRIPTION':
      return { ...state, workflowDescription: action.payload };
    
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    
    case 'SET_WORKFLOW_ID':
      return { ...state, workflowId: action.payload };
    
    case 'SET_PARSED_FILE_STRUCTURE':
      return { ...state, parsedFileStructure: action.payload };
    
    case 'SET_FILE_UPLOADED':
      return { ...state, isFileUploaded: action.payload };
    
    case 'SET_ERROR':
      return { ...state, uploadError: action.payload };
    
    case 'SET_UPLOADING':
      return { ...state, isUploading: action.payload };
    
    case 'SET_SOURCE_TYPE':
      return { ...state, sourceType: action.payload };
    
    case 'UPDATE_SOURCE_CONFIG':
      return {
        ...state,
        sourceConfig: {
          ...state.sourceConfig,
          [state.sourceType]: {
            ...state.sourceConfig[state.sourceType],
            ...action.payload
          }
        }
      };
    
    case 'SET_PARAMETER_SECTIONS':
      return { ...state, parameterSections: action.payload };
    
    case 'ADD_PARAMETER_SECTION':
      return {
        ...state,
        parameterSections: [
          ...state.parameterSections,
          {
            name: '',
            parameters: [{ name: '', type: 'text', description: '', mandatory: false, options: [] }]
          }
        ]
      };
    
    case 'UPDATE_PARAMETER_SECTION':
      return {
        ...state,
        parameterSections: state.parameterSections.map((section, index) =>
          index === action.payload.index ? { ...section, ...action.payload.updates } : section
        )
      };
    
    case 'SET_INPUT_FILES':
      return { ...state, inputFiles: action.payload };
    
    case 'ADD_INPUT_FILE':
      return {
        ...state,
        inputFiles: [
          ...state.inputFiles,
          {
            name: '',
            path: '',
            format: 'csv',
            structure: [],
            required: true,
            description: ''
          }
        ]
      };
    
    case 'UPDATE_INPUT_FILE':
      return {
        ...state,
        inputFiles: state.inputFiles.map((file, index) =>
          index === action.payload.index ? { ...file, ...action.payload.updates } : file
        )
      };
    
    case 'REMOVE_INPUT_FILE':
      return {
        ...state,
        inputFiles: state.inputFiles.filter((_, index) => index !== action.payload)
      };
    
    case 'SET_INCLUDE_RECEIPT':
      return { ...state, includeReceipt: action.payload };
    
    case 'SET_DESTINATION_OUTPUTS':
      return { ...state, destinationOutputs: action.payload };
    
    case 'ADD_DESTINATION_OUTPUT':
      const newId = Math.max(...state.destinationOutputs.map(d => d.id)) + 1;
      return {
        ...state,
        destinationOutputs: [
          ...state.destinationOutputs,
          {
            id: newId,
            name: `output_${newId}`,
            type: 'csv',
            config: {
              csv: { filename: `output_${newId}.csv`, path: 'outputs/', delimiter: ',', includeHeaders: true },
              json: { filename: `output_${newId}.json`, path: 'outputs/', pretty_print: true },
              api: { endpoint: '', authToken: '', method: 'POST', headers: {} },
              database: { connectionId: '', schema: '', tableName: '', createIfNotExists: false }
            },
            description: '',
            is_receipt: false
          }
        ]
      };
    
    case 'UPDATE_DESTINATION_OUTPUT':
      return {
        ...state,
        destinationOutputs: state.destinationOutputs.map(dest =>
          dest.id === action.payload.id ? { ...dest, ...action.payload.updates } : dest
        )
      };
    
    case 'REMOVE_DESTINATION_OUTPUT':
      return {
        ...state,
        destinationOutputs: state.destinationOutputs.filter(dest => dest.id !== action.payload)
      };
    
    case 'SET_ETL_CONFIG':
      return { ...state, etlConfig: { ...state.etlConfig, ...action.payload } };
    
    case 'UPDATE_ETL_CONFIG':
      return {
        ...state,
        etlConfig: {
          ...state.etlConfig,
          [action.payload.field]: action.payload.value
        }
      };
    
    case 'RESET_WORKFLOW':
      return initialState;
    
    default:
      return state;
  }
};

export const WorkflowProvider = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  
  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflowContext = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflowContext must be used within a WorkflowProvider');
  }
  return context;
};