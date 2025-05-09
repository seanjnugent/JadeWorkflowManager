import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Database,
  Code,
  ChevronLeft} from 'lucide-react';

const Workflow = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [expandedCode, setExpandedCode] = useState(null);

  useEffect(() => {
    // Fetch workflow details from the API
    fetch(`http://localhost:8000/workflows/${workflowId}`, {
      headers: {
        'accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      setWorkflowDetails(data);
    })
    .catch(error => console.error('Error fetching workflow details:', error));
  }, [workflowId]);

  if (!workflowDetails) {
    return <div>Loading...</div>;
  }

  const { workflow, steps, destination, recent_runs } = workflowDetails;

  const toggleCodeExpansion = (stepId) => {
    setExpandedCode(expandedCode === stepId ? null : stepId);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{workflow.name}</h2>
          <button
            onClick={() => navigate('/workflows')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            Back to Workflows <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workflow Details Section */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <div className="space-y-4">
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800">Description</h3>
                <p className="text-sm text-gray-600">{workflow.description}</p>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800">Status</h3>
                <p className="text-sm text-gray-600">{workflow.status}</p>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800">Schedule</h3>
                <p className="text-sm text-gray-600">{workflow.schedule || 'No schedule'}</p>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800">Last Run</h3>
                <p className="text-sm text-gray-600">{workflow.last_run_at ? new Date(workflow.last_run_at).toLocaleString() : 'Never run'}</p>
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-800">Next Run</h3>
                <p className="text-sm text-gray-600">{workflow.next_run_at ? new Date(workflow.next_run_at).toLocaleString() : 'No scheduled runs'}</p>
              </div>
            </div>
          </div>

          {/* Workflow Steps Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Workflow Steps</h2>
            <div className="space-y-4">
              {steps.length > 0 ? (
                steps.map((step) => (
                  <div key={step.id} className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-800">{step.label}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                    <p className="text-sm text-gray-600"><strong>Code Type:</strong> {step.code_type}</p>
                    <div className="text-sm text-gray-600 bg-gray-200 p-2 rounded mt-2 overflow-hidden">
                      <pre className={`whitespace-pre-wrap ${expandedCode === step.id ? '' : 'truncate'}`}>
                        {step.code}
                      </pre>
                      <button
                        onClick={() => toggleCodeExpansion(step.id)}
                        className="text-blue-600 hover:text-blue-700 text-xs mt-2"
                      >
                        {expandedCode === step.id ? 'Show less' : 'Show more'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No steps defined.</p>
              )}
            </div>
          </div>

          {/* Workflow Destination Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Workflow Destination</h2>
            {destination ? (
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600"><strong>Type:</strong> {destination.destination_type}</p>
                {destination.table_name && <p className="text-sm text-gray-600"><strong>Table Name:</strong> {destination.table_name}</p>}
                {destination.file_path && <p className="text-sm text-gray-600"><strong>File Path:</strong> {destination.file_path}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No destination defined.</p>
            )}
          </div>

          {/* Recent Runs Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Runs</h2>
            <div className="space-y-4">
              {recent_runs.length > 0 ? (
                recent_runs.map((run) => (
                  <div key={run.id} className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">Run ID: {run.id}</h3>
                      <p className="text-sm text-gray-600"><strong>Status:</strong> {run.status}</p>
                      <p className="text-sm text-gray-600"><strong>Started At:</strong> {new Date(run.started_at).toLocaleString()}</p>
                      <p className="text-sm text-gray-600"><strong>Finished At:</strong> {run.finished_at ? new Date(run.finished_at).toLocaleString() : 'Still running'}</p>
                      {run.error_message && <p className="text-sm text-red-600"><strong>Error:</strong> {run.error_message}</p>}
                    </div>
                    <div>
                      {run.status === 'completed' && <CheckCircle className="w-6 h-6 text-green-600" />}
                      {run.status === 'failed' && <XCircle className="w-6 h-6 text-red-600" />}
                      {run.status === 'running' && <Clock className="w-6 h-6 text-blue-600" />}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No recent runs.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflow;
