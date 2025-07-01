import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const WorkflowHistory = () => {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRuns = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/runs/`);
        if (!response.ok) throw new Error('Failed to fetch runs');
        const data = await response.json();
        setRuns(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRuns();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-semibold mb-6">Workflow Run History</h2>
      <div className="space-y-4">
        {runs.map((run) => (
          <div key={run.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Run #{run.id} - Workflow ID: {run.workflow_id}</h3>
                <p className="text-sm text-gray-600">
                  Started: {new Date(run.started_at).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  Status: 
                  <span className={`ml-2 inline-flex items-center gap-1 ${
                    run.status === 'completed' ? 'text-green-600' :
                    run.status === 'failed' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {run.status === 'completed' && <CheckCircle2 size={14} />}
                    {run.status === 'failed' && <AlertCircle size={14} />}
                    {run.status === 'running' && <Clock size={14} />}
                    {run.status}
                  </span>
                </p>
                {run.error_message && (
                  <p className="text-sm text-red-600">Error: {run.error_message}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkflowHistory;