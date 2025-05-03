import React from 'react';
import { CheckCircle2 } from 'lucide-react';

const WorkflowSummary = ({ workflowName, workflowDescription, userId }) => {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 size={18} />
          Workflow ready to save
        </div>
      </div>
      <div className="space-y-4">
        <label className="block font-medium">Workflow Name</label>
        <input
          type="text"
          value={workflowName}
          className="w-full border rounded px-4 py-2"
          disabled
        />
      </div>
      <div className="space-y-4">
        <label className="block font-medium">Description</label>
        <textarea
          value={workflowDescription}
          className="w-full border rounded px-4 py-2 h-24"
          disabled
        />
      </div>
      <div className="space-y-4">
        <label className="block font-medium">User ID</label>
        <input
          type="text"
          value={userId}
          className="w-full border rounded px-4 py-2"
          disabled
        />
      </div>
    </div>
  );
};

export default WorkflowSummary;
