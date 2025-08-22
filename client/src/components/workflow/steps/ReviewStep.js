import React, { forwardRef } from 'react';
import { ChevronLeft, CheckCircle2, Edit, Code, Database, Upload, Settings2 } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';

const ReviewStep = forwardRef(({ onPrevious, onSave, onJumpTo, isVisible }, ref) => {
  const { state } = useWorkflowContext();

  const getSourceIcon = () => {
    switch (state.sourceType) {
      case 'file': return <Upload className="h-4 w-4" />;
      case 'api': return <Code className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      default: return <Upload className="h-4 w-4" />;
    }
  };

  const getProcessingTypeLabel = () => {
    switch (state.etlConfig.processingType) {
      case 'custom': return 'Custom Logic';
      case 'aggregation': return 'Data Aggregation';
      case 'filtering': return 'Data Filtering';
      case 'transformation': return 'Data Transformation';
      default: return 'Custom Logic';
    }
  };

  const getSourceStatus = () => {
    if (state.sourceType === 'file') {
      if (state.inputFiles && state.inputFiles.length > 0) {
        const configuredFiles = state.inputFiles.filter(file => file.name && file.format);
        if (configuredFiles.length > 0) {
          return `${configuredFiles.length} input file${configuredFiles.length !== 1 ? 's' : ''} configured`;
        }
      }
      if (state.isFileUploaded) {
        return 'File uploaded successfully';
      }
      return 'Generic file processing (no template required)';
    } else if (state.sourceType === 'api') {
      return state.sourceConfig.api.endpoint ? `Endpoint: ${state.sourceConfig.api.endpoint}` : 'No endpoint configured';
    }
    return 'Not configured';
  };

  const isSourceConfigured = () => {
    if (state.sourceType === 'file') {
      // File source is always considered configured - either with uploaded files, 
      // defined input files, or for generic processing
      return true;
    } else if (state.sourceType === 'api') {
      return state.sourceConfig.api.endpoint && state.sourceConfig.api.endpoint.trim() !== '';
    }
    return false;
  };

  if (!isVisible) return null;

  return (
    <section id="review" ref={ref} className="sg-dataset-tile">
      <div className="sg-section-separator">
        <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#0065bd]" />
          Review & Create Workflow
        </h2>
      </div>
      <p className="sg-dataset-description mb-6">
        Review your workflow configuration before creating the DAG scaffold
      </p>

      <div className="space-y-6">
        {/* Workflow Details */}
        <div className="sg-dataset-tile">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="sg-dataset-title">Workflow Details</h3>
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Name:</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {state.workflowName || <span className="text-red-600">Not set</span>}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Description:</span>
                  <span className="text-sm text-gray-700">
                    {state.workflowDescription || <span className="text-red-600">Not set</span>}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">User ID:</span>
                  <span className="text-sm text-gray-700">{state.userId}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onJumpTo('workflow-details')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Source Configuration */}
        <div className="sg-dataset-tile">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="sg-dataset-title flex items-center gap-2">
                {getSourceIcon()}
                Source Configuration
              </h3>
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Type:</span>
                  <span className="text-sm text-gray-900 capitalize font-medium">{state.sourceType}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Status:</span>
                  <span className={`text-sm ${isSourceConfigured() ? 'text-green-700' : 'text-red-600'}`}>
                    {getSourceStatus()}
                  </span>
                </div>
                {state.sourceType === 'file' && (
                  <>
                    {state.inputFiles && state.inputFiles.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24">Input Files:</span>
                        <span className="text-sm text-gray-700">{state.inputFiles.length} configured</span>
                      </div>
                    )}
                    {state.parsedFileStructure && state.parsedFileStructure.length > 0 && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24">Columns:</span>
                        <span className="text-sm text-gray-700">{state.parsedFileStructure.length} detected</span>
                      </div>
                    )}
                    {(!state.inputFiles || state.inputFiles.length === 0) && 
                     (!state.parsedFileStructure || state.parsedFileStructure.length === 0) && (
                      <div className="flex items-start gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24">Mode:</span>
                        <span className="text-sm text-blue-700">Generic file processing enabled</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => onJumpTo('source-configuration')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Parameters */}
        <div className="sg-dataset-tile">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="sg-dataset-title flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Parameters
              </h3>
              <div className="mt-3">
                {state.parameterSections.length === 0 ? (
                  <p className="text-sm text-gray-600">No parameters configured</p>
                ) : (
                  <div className="space-y-3">
                    {state.parameterSections.map((section, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-3">
                        <p className="text-sm font-medium text-gray-800">{section.name}</p>
                        <p className="text-xs text-gray-600">
                          {section.parameters.length} parameter{section.parameters.length !== 1 ? 's' : ''}
                          {section.parameters.length > 0 && (
                            <span className="ml-2">
                              ({section.parameters.map(p => p.name).join(', ')})
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onJumpTo('parameters')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* Destination Configuration */}
        <div className="sg-dataset-tile">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="sg-dataset-title flex items-center gap-2">
                <Database className="h-4 w-4" />
                Destination Configuration
              </h3>
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Outputs:</span>
                  <span className="text-sm text-gray-900 font-medium">{state.destinationOutputs.length}</span>
                </div>
                <div className="space-y-2">
                  {state.destinationOutputs.map((dest, index) => (
                    <div key={dest.id} className="border-l-2 border-green-200 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{dest.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {dest.type.toUpperCase()}
                        </span>
                      </div>
                      {dest.type === 'csv' && dest.config.csv.filename && (
                        <p className="text-xs text-gray-600">
                          → {dest.config.csv.path}{dest.config.csv.filename}
                        </p>
                      )}
                      {dest.type === 'api' && dest.config.api.endpoint && (
                        <p className="text-xs text-gray-600">
                          → {dest.config.api.endpoint}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => onJumpTo('destination-configuration')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* ETL Logic */}
        <div className="sg-dataset-tile">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="sg-dataset-title flex items-center gap-2">
                <Code className="h-4 w-4" />
                ETL Logic Configuration
              </h3>
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-24">Type:</span>
                  <span className="text-sm text-gray-900 font-medium">{getProcessingTypeLabel()}</span>
                </div>
                {state.etlConfig.functionName && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-24">Function:</span>
                    <span className="text-sm text-gray-700 font-mono">{state.etlConfig.functionName}()</span>
                  </div>
                )}
                {state.etlConfig.githubPath && (
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-600 w-24">GitHub:</span>
                    <span className="text-sm text-gray-700 font-mono">{state.etlConfig.githubPath}</span>
                  </div>
                )}
                {state.etlConfig.processingType === 'aggregation' && state.etlConfig.aggregationConfig.groupBy?.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-gray-600 w-24">Group By:</span>
                    <span className="text-sm text-gray-700">{state.etlConfig.aggregationConfig.groupBy.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => onJumpTo('etl-logic')}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-3 w-3" />
              Edit
            </button>
          </div>
        </div>

        {/* DAG Generation Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-medium text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            DAG Generation Summary
          </h3>
          <div className="space-y-2 text-sm text-green-800">
            <p>✓ Complete Dagster DAG scaffold will be generated</p>
            <p>✓ Source loading operation ({state.sourceType}) configured</p>
            <p>✓ ETL processing operation ({getProcessingTypeLabel()}) ready</p>
            <p>✓ {state.destinationOutputs.length} output operation{state.destinationOutputs.length !== 1 ? 's' : ''} configured</p>
            <p>✓ Processing receipt and metadata tracking included</p>
            <p>✓ S3 resource configuration and error handling built-in</p>
            {state.sourceType === 'file' && (!state.inputFiles || state.inputFiles.length === 0) && (
              <p>✓ Generic file processing enabled - supports dynamic structures</p>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-white border border-green-200 rounded">
            <p className="text-sm font-medium text-green-900 mb-1">Generated Components:</p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>Load operation: <code>_1_load_input_{state.workflowId || 'XXXX'}</code></li>
              <li>Process operation: <code>_2_process_data_{state.workflowId || 'XXXX'}</code></li>
              {state.destinationOutputs.map((dest, i) => (
                <li key={dest.id}>Save operation: <code>_3_{i+1}_save_{dest.type}_{dest.name}_{state.workflowId || 'XXXX'}</code></li>
              ))}
              <li>Receipt operation: <code>_4_save_receipt_{state.workflowId || 'XXXX'}</code></li>
              <li>Job definition: <code>workflow_job_{state.workflowId || 'XXXX'}</code></li>
            </ul>
          </div>
        </div>

        {/* Validation Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Ready to Create</h4>
          <div className="space-y-1 text-sm">
            <div className={`flex items-center gap-2 ${state.workflowName && state.workflowDescription ? 'text-green-700' : 'text-red-700'}`}>
              <div className={`h-2 w-2 rounded-full ${state.workflowName && state.workflowDescription ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Workflow details configured
            </div>
            <div className={`flex items-center gap-2 ${isSourceConfigured() ? 'text-green-700' : 'text-red-700'}`}>
              <div className={`h-2 w-2 rounded-full ${isSourceConfigured() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Source configuration valid
            </div>
            <div className={`flex items-center gap-2 ${state.destinationOutputs.length > 0 ? 'text-green-700' : 'text-red-700'}`}>
              <div className={`h-2 w-2 rounded-full ${state.destinationOutputs.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              At least one destination configured
            </div>
            <div className={`flex items-center gap-2 ${state.etlConfig.processingType ? 'text-green-700' : 'text-red-700'}`}>
              <div className={`h-2 w-2 rounded-full ${state.etlConfig.processingType ? 'bg-green-500' : 'bg-red-500'}`}></div>
              ETL processing type selected
            </div>
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
          onClick={onSave}
          disabled={!state.workflowName || !state.workflowDescription || !isSourceConfigured() || !state.etlConfig.processingType}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4" />
          Create Workflow & Generate DAG
        </button>
      </div>
    </section>
  );
});

ReviewStep.displayName = 'ReviewStep';

export default ReviewStep;