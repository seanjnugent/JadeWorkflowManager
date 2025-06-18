import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Play,
  FileText,
  CircleCheckBig,
  CircleAlert,
  GitBranch,
  CircleHelp,
  Github
} from 'lucide-react';

// Custom Tooltip Component
const CustomTooltip = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
};

// Input Structure Modal Component
const InputStructureModal = ({ isOpen, onClose, inputStructure }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="font-semibold text-lg">Input File Structure</h4>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow">
          <div className="relative w-full overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-gray-50">
                <tr className="border-b-2 border-gray-200">
                  <th className="h-10 text-left align-middle font-semibold text-gray-900 py-4 px-6">Column Name</th>
                  <th className="h-10 text-left align-middle font-semibold text-gray-900 py-4 px-6">Type</th>
                  <th className="h-10 text-left align-middle font-semibold text-gray-900 py-4 px-6">Required</th>
                  <th className="h-10 text-left align-middle font-semibold text-gray-900 py-4 px-6">Description</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {inputStructure.columns.map((col) => (
                  <tr key={col.name} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">{col.name}</td>
                    <td className="py-4 px-6">{col.type}</td>
                    <td className="py-4 px-6">{col.required ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-6">{col.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// GitHub DAG Link Component
const GitHubDagLink = ({ dagPath, repoOwner, repoName, setVersionControl }) => {
  const [dagInfo, setDagInfo] = useState({ authorized: false });
  const [loading, setLoading] = useState(true);

  // Construct file path and GitHub URL
  const filePath = dagPath.split('.').pop(); // e.g., 'workflow_job_2' from 'server.app.dagster.jobs.workflow_job_2'
  const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/main/DAGs/${filePath}.py`;

  useEffect(() => {
    const fetchDagInfo = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/github-dag-info?dag_path=${filePath}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setDagInfo(data);
        if (data.authorized) {
          setVersionControl({
            version: 'v2.1.0', // Hardcoded; replace with dynamic version if available
            lastModified: new Date(data.last_updated).toLocaleDateString(),
            modifiedBy: data.author
          });
        }
      } catch (error) {
        console.error('Error fetching GitHub DAG info:', error);
        setDagInfo({ authorized: false });
      } finally {
        setLoading(false);
      }
    };
    fetchDagInfo();
  }, [filePath, repoOwner, repoName, setVersionControl]);

  if (loading) {
    return <span className="inline-block h-8 w-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></span>;
  }

  // Format tooltip content with metadata
  const tooltipContent = dagInfo.authorized ? (
    <div className="space-y-1">
      <p>View DAG in GitHub</p>
      <p className="text-xs">Last updated: {new Date(dagInfo.last_updated).toLocaleString()}</p>
      <p className="text-xs">Author: {dagInfo.author}</p>
      <p className="text-xs">Commit: {dagInfo.commit_message.split('\n')[0]}</p>
    </div>
  ) : (
    'No access to GitHub repository'
  );

  return (
    <CustomTooltip content={tooltipContent}>
      <a
        href={dagInfo.authorized ? githubUrl : '#'}
        target={dagInfo.authorized ? '_blank' : undefined}
        rel={dagInfo.authorized ? 'noopener noreferrer' : undefined}
        className={`w-full inline-flex items-center justify-center bg-white border rounded-md px-3 py-2 text-sm no-underline hover:no-underline ${!dagInfo.authorized ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Github className="h-4 w-4 mr-2" aria-hidden="true" />
        View on GitHub
      </a>
    </CustomTooltip>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    completed: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CircleCheckBig className="h-4 w-4 text-green-600" aria-hidden="true" />,
      text: 'Completed'
    },
    success: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <CircleCheckBig className="h-4 w-4 text-green-600" aria-hidden="true" />,
      text: 'Completed'
    },
    failed: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <CircleAlert className="h-4 w-4 text-red-600" aria-hidden="true" />,
      text: 'Failed'
    },
    running: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <svg className="h-4 w-4 text-blue-600 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>,
      text: 'Running'
    }
  };
  const config = statusConfig[status?.toLowerCase()] || {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <svg className="h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    text: status || 'Unknown'
  };
  return (
    <div className="flex items-center space-x-2">
      {config.icon}
      <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 border ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};

const Workflow = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [versionControl, setVersionControl] = useState(null);

  // GitHub configuration
  const GITHUB_REPO_OWNER = 'seanjnugent';
  const GITHUB_REPO_NAME = 'DataWorkflowTool-Workflows';

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/workflows/workflow/${workflowId}`, {
      headers: { 'accept': 'application/json' }
    })
      .then(response => response.json())
      .then(data => setWorkflowDetails(data))
      .catch(error => console.error('Error:', error))
      .finally(() => setLoading(false));
  }, [workflowId]);

  const handleStartRun = () => {
    if (workflowDetails?.workflow?.dag_status === 'ready' && !running) {
      setRunning(true);
      navigate(`/runs/new/${workflowId}`);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = workflowDetails?.workflow?.input_structure?.columns.map(col => col.name).join(',');
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowDetails?.workflow?.name}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="py-8 bg-gray-50 min-h-screen">
        <div className="container mx-auto flex justify-center items-center">
          <span className="inline-block h-10 w-10 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></span>
        </div>
      </main>
    );
  }

  if (!workflowDetails) {
    return (
      <main className="py-8 bg-gray-50 min-h-screen">
        <div className="container mx-auto flex justify-center items-center">
          <div className="text-gray-600">No workflow details available.</div>
        </div>
      </main>
    );
  }

  const { workflow, destination, recent_runs } = workflowDetails;
  const isDagReady = workflow?.dag_status === 'ready';

  return (
    <motion.main
      className="py-8 bg-gray-50 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 focus-visible:bg-yellow-50 h-9 px-4 py-2"
              onClick={() => navigate('/workflows')}
            >
              <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Back to Workflows
            </button>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">{workflow?.name}</h1>
              <p className="text-gray-600 mt-2 mb-4 text-sm">{workflow?.description || 'No description provided.'}</p>
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 border bg-blue-100 text-blue-800 border-blue-200">
                  {workflow?.destination || 'API'}
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {versionControl?.modifiedBy || 'Health Analytics Team'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
                  </svg>
                  Last updated: {new Date(workflow.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
              <CustomTooltip content={!isDagReady ? 'DAG not ready' : 'Execute this workflow now'}>
                <button
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 rounded-sm px-6 py-3 bg-blue-600 text-white ${!isDagReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleStartRun}
                  disabled={!isDagReady || running}
                >
                  {running ? (
                    <svg className="h-4 w-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  )}
                  Begin Workflow
                </button>
              </CustomTooltip>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Latest Run Status */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border border-l-4 border-l-green-600">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 pb-3">
              <h4 className="leading-none flex items-center">
                <CircleCheckBig className="h-5 w-5 mr-2 text-green-600" aria-hidden="true" />
                Latest Run Status
              </h4>
            </div>
            <div className="px-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <StatusBadge status={recent_runs?.[0]?.status || 'Unknown'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium text-gray-900">{recent_runs?.[0]?.duration || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Records processed:</span>
                  <span className="text-sm font-medium text-gray-900">{recent_runs?.[0]?.records?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last run:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {recent_runs?.[0]?.started_at ? new Date(recent_runs[0].started_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Version Control */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border border-l-4 border-l-blue-600">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 pb-3">
              <h4 className="leading-none flex items-center">
                <GitBranch className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                Version Control
              </h4>
            </div>
            <div className="px-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current version:</span>
                  <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 border bg-blue-100 text-blue-800 border-blue-200">
                    {versionControl?.version || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last modified:</span>
                  <span className="text-sm font-medium text-gray-900">{versionControl?.lastModified || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Modified by:</span>
                  <span className="text-sm font-medium text-gray-900">{versionControl?.modifiedBy || 'N/A'}</span>
                </div>
                {workflow?.dag_path && (
                  <GitHubDagLink
                    dagPath={workflow.dag_path}
                    repoOwner={GITHUB_REPO_OWNER}
                    repoName={GITHUB_REPO_NAME}
                    setVersionControl={setVersionControl}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Support & Documentation */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border border-l-4 border-l-orange-500">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 pb-3">
              <h4 className="leading-none flex items-center">
                <CircleHelp className="h-5 w-5 mr-2 text-orange-500" aria-hidden="true" />
                Support & Documentation
              </h4>
            </div>
            <div className="px-6">
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Need help with this workflow? Access documentation and support resources.</p>
                <div className="space-y-2">
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 w-full h-8 rounded-md gap-1.5 px-3 bg-white border hover:bg-gray-100"
                  >
                    <CircleHelp className="h-4 w-4 mr-2" aria-hidden="true" />
                    Contact Support
                  </button>
                  <button
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 w-full h-8 rounded-md gap-1.5 px-3 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  >
                    View Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border lg-col-span-3">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-4">
              <h4 className="leading-none">Recent Activity</h4>
              <p className="text-gray-600 text-sm">Last 5 executions of this workflow</p>
            </div>
            <div className="p-0">
              <div className="relative w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b bg-gray-50">
                    <tr className="hover:bg-muted/50 transition-colors border-b-2 border-gray-200">
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Run ID</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Date & Time</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Status</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Duration</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">User</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Records</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Version</th>
                      <th className="h-10 align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {recent_runs?.length > 0 ? (
                      recent_runs.slice(0, 5).map((run) => (
                        <tr
                          key={run.id}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-white"
                          onClick={() => navigate(`/runs/run/${run.id}`)}
                        >
                          <td className="py-4 px-6"><div className="font-medium text-gray-900">{run.id}</div></td>
                          <td className="py-4 px-6"><div className="text-sm text-gray-900">{new Date(run.started_at).toLocaleString()}</div></td>
                          <td className="py-4 px-6"><StatusBadge status={run.status} /></td>
                          <td className="py-4 px-6"><div className="text-sm text-gray-900">{run.duration || 'N/A'}</div></td>
                          <td className="py-4 px-6"><div className="text-sm text-gray-900">{run.user || 'Unknown'}</div></td>
                          <td className="py-4 px-6"><div className="text-sm text-gray-900">{run.records?.toLocaleString() || 'N/A'}</div></td>
                          <td className="py-4 px-6">
                            <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 border bg-gray-100 text-gray-800 border-gray-200">
                              {run.version || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 h-8 rounded-md gap-1.5 px-3 bg-white border hover:bg-gray-100"
                              onClick={(e) => { e.stopPropagation(); navigate(`/runs/run/${run.id}`); }}
                            >
                              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                              View Run Log
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-4 px-6 text-center text-sm text-gray-600">No recent runs</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Input File Structure (Sidebar) */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border lg-col-span-3">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-4">
              <h4 className="leading-none">Input File Structure</h4>
              <p className="text-gray-600 text-sm">Required input format for this workflow</p>
            </div>
            <div className="px-6 pb-6">
              <div className="space-y-2">
                <button
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 w-full h-8 rounded-md gap-1.5 px-3 bg-white border hover:bg-gray-100"
                  onClick={() => setShowInputModal(true)}
                >
                  <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                  View Input Structure
                </button>
                <button
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 w-full h-8 rounded-md gap-1.5 px-3 bg-white border hover:bg-gray-100"
                  onClick={handleDownloadTemplate}
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Template
                </button>
              </div>
              <InputStructureModal
                isOpen={showInputModal}
                onClose={() => setShowInputModal(false)}
                inputStructure={workflow?.input_structure || { columns: [] }}
              />
            </div>
          </div>

          {/* Parameters */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border lg-col-span-3">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-4">
              <h4 className="leading-none">Parameters</h4>
              <p className="text-gray-600 text-sm">Configuration parameters for this workflow</p>
            </div>
            <div className="px-6 pb-6">
              {workflow?.parameters?.length > 0 ? (
                <div className="space-y-2">
                  {workflow.parameters.map((param) => (
                    <CustomTooltip key={param.name} content={`${param.type} • ${param.mandatory ? 'Required' : 'Optional'}`}>
                      <span
                        className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 border bg-gray-100 text-gray-800 border-gray-200"
                      >
                        {param.name}
                      </span>
                    </CustomTooltip>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No parameters defined</p>
              )}
            </div>
          </div>

          {/* Destination */}
          <div className="bg-white text-gray-900 flex flex-col gap-6 rounded-xl border lg-col-span-3">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-4">
              <h4 className="leading-none">Destination</h4>
              <p className="text-gray-600 text-sm">Output destination for this workflow</p>
            </div>
            <div className="px-6 pb-6">
              {destination ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium text-gray-900">{destination.destination_type}</span>
                  </div>
                  {destination.table_name && (
                    <div>
                      <span className="text-sm text-gray-600">Table:</span>
                      <span className="text-sm font-medium text-gray-900">{destination.table_name}</span>
                    </div>
                  )}
                  {destination.file_path && (
                    <div>
                      <span className="text-sm text-gray-600">Path:</span>
                      <span className="text-sm font-medium text-gray-900">{destination.file_path}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No destination defined</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
};

export default Workflow;