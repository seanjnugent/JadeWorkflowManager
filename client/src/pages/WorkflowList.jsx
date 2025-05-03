import React, { useState, useEffect } from 'react';
import { Play, Edit, History } from 'lucide-react';

const WorkflowList = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/workflows/`);
        if (!response.ok) throw new Error('Failed to fetch workflows');
        const data = await response.json();
        setWorkflows(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflows();
  }, []);

  const handleRunWorkflow = async (workflowId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/runs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, triggered_by: 1 }), // Replace with actual user ID
      });
      if (!response.ok) throw new Error('Failed to run workflow');
      alert('Workflow started successfully!');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">Workflows</h2>
      <div className="space-y-4">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">{workflow.name}</h3>
              <p className="text-sm text-gray-600">{workflow.description}</p>
              <p className="text-xs text-gray-500">Status: {workflow.status}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunWorkflow(workflow.id)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Run Workflow"
              >
                <Play size={16} />
              </button>
              <button
                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                title="Edit Workflow"
              >
                <Edit size={16} />
              </button>
              <button
                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                title="View History"
              >
                <History size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowList;