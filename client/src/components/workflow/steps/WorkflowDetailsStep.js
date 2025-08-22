import React, { forwardRef } from 'react';
import { ChevronRight, FileInput } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';

const WorkflowDetailsStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();

  const handleWorkflowNameChange = (value) => {
    dispatch({ type: 'SET_WORKFLOW_NAME', payload: value });
  };

  const handleWorkflowDescriptionChange = (value) => {
    dispatch({ type: 'SET_WORKFLOW_DESCRIPTION', payload: value });
  };

  const handleUserIdChange = (value) => {
    dispatch({ type: 'SET_USER_ID', payload: value });
  };

  if (!isVisible) return null;

  return (
    <section id="workflow-details" ref={ref} className="sg-dataset-tile">
      <div className="sg-section-separator">
        <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
          <FileInput className="h-5 w-5 text-[#0065bd]" />
          Workflow Details
        </h2>
      </div>
      <p className="sg-dataset-description mb-6">
        Enter the basic details for the new workflow
      </p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Workflow Name *
          </label>
          <div className="relative">
            <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={state.workflowName}
              onChange={(e) => handleWorkflowNameChange(e.target.value)}
              placeholder="e.g., Monthly Sales Report Processing"
              className="w-full pl-10"
              required
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            A descriptive name for your workflow that will be used in the DAG
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Description *
          </label>
          <div className="relative">
            <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <textarea
              value={state.workflowDescription}
              onChange={(e) => handleWorkflowDescriptionChange(e.target.value)}
              placeholder="e.g., Processes monthly sales data, applies business rules, and generates reports for stakeholders"
              className="w-full pl-10 min-h-[100px]"
              required
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Detailed description of what this workflow does and its purpose
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            User ID
          </label>
          <div className="relative">
            <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={state.userId}
              onChange={(e) => handleUserIdChange(e.target.value)}
              placeholder="e.g., 1001"
              className="w-full pl-10"
            />
          </div>
          <p className="text-sm text-gray-600 mt-1">
            User identifier for tracking workflow ownership
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Configure your data source (file upload, API, or database)</li>
            <li>Define processing parameters and business rules</li>
            <li>Set up output destinations for your processed data</li>
            <li>Configure ETL logic with visual builders or custom code</li>
            <li>Auto-generate a complete Dagster DAG with scaffolding</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={onNext}
          disabled={!state.workflowName.trim() || !state.workflowDescription.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
});

WorkflowDetailsStep.displayName = 'WorkflowDetailsStep';

export default WorkflowDetailsStep;