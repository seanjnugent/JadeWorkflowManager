// workflowSteps/WorkflowDetailsStep.jsx
import React from 'react';
import { FileInput } from 'lucide-react';

export const WorkflowDetailsStep = ({ 
  workflowName, 
  setWorkflowName, 
  workflowDescription, 
  setWorkflowDescription, 
  userId, 
  setUserId,
  uploadError,
  setUploadError 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Workflow Name</label>
        <div className="relative">
          <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="e.g., Monthly Sales Report"
            className="w-full pl-10"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
        <div className="relative">
          <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <textarea
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="e.g., Processes monthly sales data for reporting"
            className="w-full pl-10 min-h-[100px]"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">User ID</label>
        <div className="relative">
          <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="e.g., 1001"
            className="w-full pl-10"
          />
        </div>
      </div>
    </div>
  );
};

