import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, Clock, ChevronLeft, Play, FileText, CircleCheckBig, CircleAlert, GitBranch, CircleHelp, Github, X, Pencil } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

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
        <div className="absolute z-10 w-64 p-2 text-sm text-white bg-gray-900 border border-gray-700">
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
      <div className="bg-white border border-gray-300 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-900">Input File Structure</h4>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow">
          <div className="relative w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left font-medium text-gray-900 py-4 px-6">Column Name</th>
                  <th className="text-left font-medium text-gray-900 py-4 px-6">Type</th>
                  <th className="text-left font-medium text-gray-900 py-4 px-6">Required</th>
                  <th className="text-left font-medium text-gray-900 py-4 px-6">Description</th>
                </tr>
              </thead>
              <tbody>
                {inputStructure.columns.map((col) => (
                  <tr key={col.name} className="border-b border-gray-200 hover:bg-gray-50 bg-white">
                    <td className="py-4 px-6 text-gray-900">{col.name}</td>
                    <td className="py-4 px-6 text-gray-900">{col.type}</td>
                    <td className="py-4 px-6 text-gray-900">{col.required ? 'Yes' : 'No'}</td>
                    <td className="py-4 px-6 text-gray-600">{col.description}</td>
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

// JSON Edit Modal Component
const JsonEditModal = ({ isOpen, onClose, title, jsonData, onSave }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(jsonData, null, 2));
  const [error, setError] = useState(null);
  

  const handleSave = () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      onSave(parsedJson);
      setError(null);
      onClose();
    } catch (e) {
      setError('Invalid JSON format');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-900">{title}</h4>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow">
          <textarea
            className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
              onClick={handleSave}
            >
              Save
            </button>
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

  const extractJobName = (path) => {
    if (!path) return null;
    const match = path.match(/workflow_job_(\d+)/);
    if (match) return match[0];
    const segments = [...path.split('.'), ...path.replace(/\\/g, '/').split('/')];
    for (let seg of segments.reverse()) {
      const jobMatch = seg.match(/workflow_job_\d+/);
      if (jobMatch) return jobMatch[0];
    }
    return null;
  };

  const dagJobName = extractJobName(dagPath);
  const filePath = dagJobName || 'unknown';
  const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/main/DAGs/${filePath}.py`;

  useEffect(() => {
    const fetchDagInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/workflows/github-dag-info?dag_path=${filePath}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setDagInfo(data);
        if (data.authorized && setVersionControl) {
          setVersionControl({
            version: 'v' + data.version,
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
    return (
      <div className="flex justify-center items-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-900 animate-spin"></div>
      </div>
    );
  }

  const tooltipContent = dagInfo.authorized ? (
    <div className="space-y-1">
      <p>View DAG in GitHub</p>
      <p className="text-xs">Last updated: {new Date(dagInfo.last_updated).toLocaleString()}</p>
      <p className="text-xs">Author: {dagInfo.author}</p>
      <p className="text-xs">Commit: {dagInfo.commit_message?.split('\n')[0]}</p>
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
        className={`inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 ${!dagInfo.authorized ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={(e) => {
          if (!dagInfo.authorized) e.preventDefault();
        }}
      >
        <Github className="h-4 w-4" />
        View on GitHub
      </a>
    </CustomTooltip>
  );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    completed: {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <CircleCheckBig className="h-4 w-4 text-green-600" />,
      text: 'Completed'
    },
    success: {
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: <CircleCheckBig className="h-4 w-4 text-green-600" />,
      text: 'Completed'
    },
    failed: {
      color: 'bg-red-50 text-red-700 border-red-200',
      icon: <CircleAlert className="h-4 w-4 text-red-600" />,
      text: 'Failed'
    },
    running: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />,
      text: 'Running'
    }
  };

  const config = statusConfig[status?.toLowerCase()] || {
    color: 'bg-gray-50 text-gray-700 border-gray-200',
    icon: <Clock className="h-4 w-4 text-gray-600" />,
    text: status || 'Unknown'
  };

  return (
    <div className="flex items-center space-x-2">
      {config.icon}
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${config.color}`}>
        {config.text}
      </span>
    </div>
  );
};

function formatDuration(ms) {
  const msAbs = Math.abs(ms);
  const hours = Math.floor(msAbs / 3600000);
  const minutes = Math.floor((msAbs % 3600000) / 60000);
  const seconds = Math.floor((msAbs % 60000) / 1000);
  const milliseconds = msAbs % 1000;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  if (hours === 0 && minutes === 0 && seconds === 0) parts.push(`${milliseconds}ms`);

  return parts.join(' ');
}

// Function to limit JSON display lines
const getLimitedJsonLines = (jsonData) => {
  const jsonString = JSON.stringify(jsonData, null, 2);
  const lines = jsonString.split('\n');
  return lines.slice(0, 6).join('\n');
};

// Main Workflow Component
const Workflow = () => {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [showConfigTemplateModal, setShowConfigTemplateModal] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [isDestinationConfigExpanded, setIsDestinationConfigExpanded] = useState(false);
  const [versionControl, setVersionControl] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  const GITHUB_REPO_OWNER = 'seanjnugent';
  const GITHUB_REPO_NAME = 'DataWorkflowTool-Workflows';

useEffect(() => {
  setLoading(true);
  const accessToken = localStorage.getItem('access_token');
  const userId = localStorage.getItem('userId');
  if (!userId || !accessToken) {
    navigate('/login', { replace: true });
    return;
  }
  fetch(`${API_BASE_URL}/workflows/workflow/${workflowId}`, {
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    }
  })
    .then(response => response.json())
    .then(data => setWorkflowDetails(data))
    .catch(error => console.error('Error:', error))
    .finally(() => setLoading(false));
}, [workflowId, navigate]);


  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };


  const handleStartRun = () => {
    if (workflowDetails?.workflow?.dag_status === 'ready' && !running) {
      setRunning(true);
      navigate(`/runs/new/${workflowId}`);
    }
  };

  // DestinationConfigModal.jsx (new component)
const DestinationConfigModal = ({ 
  isOpen, 
  onClose, 
  initialConfig,
  onSave
}) => {
  const [apiUrl, setApiUrl] = useState(initialConfig?.api_url || '');
  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(initialConfig?.api_url || '');
      setApiToken('');
    }
  }, [isOpen, initialConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!apiUrl) {
      setError('API URL is required');
      return;
    }

    try {
      await onSave({
        api_url: apiUrl,
        api_token: apiToken
      });
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save configuration');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-gray-300 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-900">Edit Destination Configuration</h4>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-auto flex-grow space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">API URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full p-3 bg-white border border-gray-200 rounded text-sm text-gray-900"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">API Token</label>
            <CustomTooltip content="The API token will be encrypted when saved. Leave blank to keep existing token.">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Leave blank to keep existing token"
                className="w-full p-3 bg-white border border-gray-200 rounded text-sm text-gray-900"
              />
            </CustomTooltip>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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

const handleSaveParameters = async (updatedParams) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/workflows/workflow/update_parameters`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        parameters: updatedParams
      })
    });
    if (!response.ok) throw new Error('Failed to update parameters');
    const data = await response.json();
    setWorkflowDetails(prev => ({
      ...prev,
      workflow: { ...prev.workflow, parameters: updatedParams }
    }));
  } catch (error) {
    setError('Failed to update parameters: ' + error.message);
  }
};


const handleSaveDestinationConfig = async ({ api_url, api_token }) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('api_url', api_url);
    if (api_token) {
      formData.append('api_token', api_token);
    }

    const response = await fetch(`${API_BASE_URL}/admin/workflows/${workflowId}/destination_config`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to update destination config');
    }

    const data = await response.json();
    
    // Update local state with the new config (note: we don't get the encrypted token back)
    setWorkflowDetails(prev => ({
      ...prev,
      workflow: { 
        ...prev.workflow, 
        destination_config: {
          api_url: api_url,
          api_token: prev.workflow.destination_config?.api_token // Keep existing encrypted token
        }
      }
    }));
    
    return data;
  } catch (error) {
    setError('Failed to update destination config: ' + error.message);
    throw error;
  }
};

const handleSaveConfigTemplate = async (updatedConfig) => {
  try {
    const accessToken = localStorage.getItem('access_token');
    const response = await fetch(`${API_BASE_URL}/workflows/workflow/update_config_template`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        config_template: updatedConfig
      })
    });
    if (!response.ok) throw new Error('Failed to update config template');
    const data = await response.json();
    setWorkflowDetails(prev => ({
      ...prev,
      workflow: { ...prev.workflow, config_template: updatedConfig }
    }));
  } catch (error) {
    setError('Failed to update config template: ' + error.message);
  }
};


  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-900 animate-spin"></div>
      </main>
    );
  }

  if (!workflowDetails) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-600 text-sm">No workflow details available.</p>
      </main>
    );
  }

  const { workflow, destination, recent_runs } = workflowDetails;
  const isDagReady = workflow?.dag_status === 'ready';

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`
        .json-preview-container {
          position: relative;
          max-height: 160px;
          overflow: hidden;
        }
        .json-preview-container.expanded {
          max-height: none;
        }
        .json-preview-container .fade-out {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to bottom, rgba(249, 250, 251, 0), rgba(249, 250, 251, 1));
        }
        .json-preview-container.expanded .fade-out {
          display: none;
        }
        .show-more-btn {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 12px;
          cursor: pointer;
          z-index: 10;
        }
        .show-more-btn:hover {
          background: #f3f4f6;
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/workflows')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Workflows
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">{workflow?.name}</h1>
            <p className="text-gray-600 text-sm mt-1">{workflow?.description || 'No description provided.'}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                  {workflow?.destination || 'API'}
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {versionControl?.modifiedBy || 'Health Analytics Team'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v4" />
                    <path d="M16 2v4" />
                    <rect width="18" height="18" x="3" y="4" rx="2" />
                    <path d="M3 10h18" />
                  </svg>
                  Last updated: {new Date(workflow.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
              <CustomTooltip content={!isDagReady ? 'DAG not ready' : 'Execute this workflow now'}>
                <button
                  className={`inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2 ${!isDagReady || running ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleStartRun}
                  disabled={!isDagReady || running}
                >
                  {running ? (
                    <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Start Workflow
                </button>
              </CustomTooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Latest Run Status */}
            <div className="bg-white border border-gray-300 p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                <CircleCheckBig className="h-6 w-6 text-green-600 mr-2" />
                Latest Run Status
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <StatusBadge status={recent_runs?.[0]?.status || 'Unknown'} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium text-gray-900">{recent_runs?.[0]?.duration_ms != null ? formatDuration(recent_runs[0].duration_ms) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last run:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {recent_runs?.[0]?.started_at ? new Date(recent_runs[0].started_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Version Control */}
            <div className="bg-white border border-gray-300 p-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                <GitBranch className="h-6 w-6 text-blue-600 mr-2" />
                Version Control
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current version:</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
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

            {/* Support & Documentation */}
            <div className="bg-white border border-gray-300 p-6">
              <h4 className="text-sm font-medium text-gray-900 mb四大 flex items-center">
                <CircleHelp className="h-6 w-6 text-orange-500 mr-2" />
                Support & Documentation
              </h4>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Need help with this workflow? Access documentation and support resources.</p>
                <div className="space-y-2">
                  <button
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 w-full px-4 py-2"
                  >
                    <CircleHelp className="h-4 w-4" />
                    Contact Support
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 w-full px-4 py-2"
                  >
                    View Documentation
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
<div className="bg-white border border-gray-300 p-6" style={{ marginBottom: 24 }}>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900">Recent Activity</h4>
              <p className="text-gray-600 text-sm mt-1">Last 5 executions of this workflow</p>
            </div>
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Run ID</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[150px]">Date & Time</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Status</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Duration</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[120px]">User</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_runs?.length > 0 ? (
                    recent_runs.slice(0, 5).map((run) => (
                      <tr
                        key={run.id}
                        className="border-b border-gray-200 hover:bg-gray-50 bg-white"
                        onClick={() => navigate(`/runs/run/${run.id}`)}
                      >
                        <td className="py-4 px-6 w-[100px]"><div className="font-medium text-gray-900">{run.id}</div></td>
                        <td className="py-4 px-6 w-[150px]">
                          <div className="text-xs text-gray-900 whitespace-nowrap">
                            {new Date(run.started_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </div>
                        </td>
                        <td className="py-4 px-6 w-[100px]"><StatusBadge status={run.status} /></td>
                        <td className="py-4 px-6 w-[100px]">
                          <div className="text-xs text-gray-900">
                            {run.duration_ms != null ? formatDuration(run.duration_ms) : 'N/A'}
                          </div>
                        </td>
                        <td className="py-4 px-6 w-[120px]"><div className="text-xs text-gray-900">{run.triggered_by_name || 'Unknown'}</div></td>
                        <td className="py-4 px-6 w-[120px] text-right">
                          <button
                            className="inline-flex items-center justify-center gap-1 text-xs font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-2.5 py-1.5 whitespace-nowrap"
                            onClick={(e) => { e.stopPropagation(); navigate(`/runs/run/${run.id}`); }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View Log
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

          {/* Input File Structure */}
<div className="bg-white border border-gray-300 p-6" style={{ marginBottom: 24 }}>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900">Input File Structure</h4>
              <p className="text-gray-600 text-sm mt-1">Required input format for this workflow</p>
            </div>
            <div className="space-y-2">
              <button
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 w-full px-4 py-2"
                onClick={() => setShowInputModal(true)}
              >
                <FileText className="h-4 w-4" />
                View Input Structure
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 w-full px-4 py-2"
                onClick={handleDownloadTemplate}
              >
                <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
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

          {/* Parameters */}
<div className="bg-white border border-gray-300 p-6" style={{ marginBottom: 24 }}>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Parameters</h4>
              <p className="text-gray-600 text-sm mt-1">Configuration parameters for this workflow</p>
            </div>
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setShowParamsModal(true)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          {workflow?.parameters?.length > 0 ? (
            <div className="space-y-4">
              {workflow.parameters[0]?.section ? (
                workflow.parameters.map((section, index) => (
                  <div key={section.section} className="border border-gray-200 rounded">
                    <button
                      className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100"
                      onClick={() => toggleSection(section.section)}
                    >
                      <h5 className="text-sm font-medium text-gray-900">{section.section}</h5>
                      {expandedSections[section.section] ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    {expandedSections[section.section] && (
                      <div className="p-4 space-y-4">
                        {section.parameters.map((param) => (
                          <div key={param.name} className="flex items-start gap-4 p-3 bg-gray-50 rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{param.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${param.mandatory ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                  {param.mandatory ? 'Required' : 'Optional'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{param.description || 'No description'}</p>
                              {param.options && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Options: {param.options.map(opt => opt.label).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">{param.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                workflow.parameters.map((param) => (
                  <div key={param.name} className="flex items-start gap-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{param.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${param.mandatory ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                          {param.mandatory ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{param.description || 'No description'}</p>
                      {param.options && (
                        <p className="text-sm text-gray-600 mt-1">
                          Options: {param.options.map(opt => opt.label).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{param.type}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No parameters for this run</p>
          )}
          <JsonEditModal
            isOpen={showParamsModal}
            onClose={() => setShowParamsModal(false)}
            title="Edit Workflow Parameters"
            jsonData={workflow?.parameters || []}
            onSave={handleSaveParameters}
          />
        </div>
{/* destination config */}
<div className="bg-white border border-gray-300 p-6" style={{ marginBottom: 24 }}>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Destination Config</h4>
              <p className="text-gray-600 text-sm mt-1">Configuration for the API destination</p>
            </div>
            <button
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setShowConfigModal(true)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">API URL</label>
                <input
                  type="text"
                  value={workflow?.destination_config?.api_url || ''}
                  readOnly
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">API Token</label>
                <CustomTooltip content="The API token is encrypted at the database level with a Fernet key and is decrypted only at runtime.">
                  <div className="relative">
                    <input
                      type="text"
                      value="Encrypted"
                      readOnly
                      className="w-full p-3 bg-gray-100 border border-gray-200 rounded text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </CustomTooltip>
              </div>
            </div>
          </div>
<DestinationConfigModal
  isOpen={showConfigModal}
  onClose={() => setShowConfigModal(false)}
  initialConfig={workflow?.destination_config || {}}
  onSave={handleSaveDestinationConfig}
/>
        </div>

          {/* Configuration Template */}
          <div className="bg-white border border-gray-300 p-6">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Configuration Template</h4>
                <p className="text-gray-600 text-sm mt-1">Dagster configuration template for this workflow</p>
              </div>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setShowConfigTemplateModal(true)}
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className={`json-preview-container relative bg-gray-50 p-4 rounded border border-gray-200 ${isConfigExpanded ? 'expanded' : ''}`}>
                <pre className="text-sm text-gray-900 overflow-x-auto mb-0">
                  <code>{isConfigExpanded ? JSON.stringify(workflow?.config_template || {}, null, 2) : getLimitedJsonLines(workflow?.config_template || {})}</code>
                </pre>
                {!isConfigExpanded && (
                  <>
                    <div className="fade-out"></div>
                    <button
                      className="show-more-btn"
                      onClick={() => setIsConfigExpanded(true)}
                    >
                      Show More
                    </button>
                  </>
                )}
                {isConfigExpanded && (
                  <button
                    className="show-more-btn"
                    onClick={() => setIsConfigExpanded(false)}
                  >
                    Show Less
                  </button>
                )}
              </div>
            </div>
            <JsonEditModal
              isOpen={showConfigTemplateModal}
              onClose={() => setShowConfigTemplateModal(false)}
              title="Edit Configuration Template"
              jsonData={workflow?.config_template || {}}
              onSave={handleSaveConfigTemplate}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Workflow;