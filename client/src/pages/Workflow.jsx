import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, Clock, ChevronLeft, Play, FileText, CircleCheckBig, CircleAlert, GitBranch, CircleHelp, Github, X, Pencil, FileSpreadsheet, Download, Eye, Settings } from 'lucide-react';

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
        <div className="absolute z-10 w-64 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700 -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
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
      <div className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">Input File Structure</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-semibold py-3 px-4 text-gray-900">Column Name</th>
                  <th className="text-left font-semibold py-3 px-4 text-gray-900">Type</th>
                  <th className="text-left font-semibold py-3 px-4 text-gray-900">Required</th>
                  <th className="text-left font-semibold py-3 px-4 text-gray-900">Description</th>
                </tr>
              </thead>
              <tbody>
                {inputStructure.columns.map((col, index) => (
                  <tr key={col.name} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                    <td className="py-3 px-4 font-medium text-gray-900">{col.name}</td>
                    <td className="py-3 px-4 text-gray-600">{col.type}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${col.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {col.required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{col.description}</td>
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
      <div className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">{title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow space-y-4">
          <textarea
            className="w-full h-64 p-4 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Enter valid JSON..."
          />
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSave}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Destination Config Modal Component
const DestinationConfigModal = ({ isOpen, onClose, initialConfig, onSave }) => {
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
      await onSave({ api_url: apiUrl, api_token: apiToken });
      onClose();
    } catch (error) {
      setError(error.message || 'Failed to save configuration');
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">Edit Destination Configuration</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">API URL</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="https://api.example.com/endpoint"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">API Token</label>
            <CustomTooltip content="The API token will be encrypted when saved. Leave blank to keep existing token.">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Leave blank to keep existing token"
                className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </CustomTooltip>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleSubmit}
            >
              Save Changes
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
        const response = await fetch(`${API_BASE_URL}/workflows/github-dag-info?dag_path=${filePath}`, {
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
  }, [filePath, repoOwner, repoName]);

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-600 animate-spin rounded-full"></div>
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
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${!dagInfo.authorized ? 'opacity-50 cursor-not-allowed' : ''}`}
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
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CircleCheckBig className="h-4 w-4 text-emerald-600" />,
      text: 'Completed'
    },
    success: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CircleCheckBig className="h-4 w-4 text-emerald-600" />,
      text: 'Completed'
    },
    failed: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <CircleAlert className="h-4 w-4 text-red-600" />,
      text: 'Failed'
    },
    failure: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <CircleAlert className="h-4 w-4 text-red-600" />,
      text: 'Failed'
    },
    running: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />,
      text: 'Running'
    }
  };

  const config = statusConfig[status?.toLowerCase()] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: <Clock className="h-4 w-4 text-gray-600" />,
    text: status || 'Unknown'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </span>
  );
};

const formatDuration = (ms) => {
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
};

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
  const [versionControl, setVersionControl] = useState(null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    const sections = ['summary', 'recent-activity', 'input-structure', 'parameters', 'destination-config', 'config-template'];
    const observerOptions = {
      root: null,
      rootMargin: '-45px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) observer.observe(element);
    });

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

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
      .catch(error => {
        console.error('Error:', error);
        setError('Failed to fetch workflow details');
      })
      .finally(() => setLoading(false));
  }, [workflowId, navigate]);

  const handleJumpLinkClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

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
      if (api_token) formData.append('api_token', api_token);

      const response = await fetch(`${API_BASE_URL}/admin/workflows/${workflowId}/destination_config`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update destination config');
      }

      setWorkflowDetails(prev => ({
        ...prev,
        workflow: {
          ...prev.workflow,
          destination_config: {
            api_url: api_url,
            api_token: prev.workflow.destination_config?.api_token
          }
        }
      }));
    } catch (error) {
      setError('Failed to update destination config: ' + error.message);
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
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-600 animate-spin rounded-full"></div>
      </div>
    );
  }

  if (!workflowDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No workflow details available.</p>
        </div>
      </div>
    );
  }

  const { workflow, recent_runs } = workflowDetails;
  const isDagReady = workflow?.dag_status === 'ready';
  const isActiveSection = (sectionId) => activeSection === sectionId;

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`
        .sg-workflow-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sg-workflow-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0065bd, #004a9f);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .sg-workflow-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
        .sg-workflow-card:hover::before {
          transform: scaleX(1);
        }
        .sg-workflow-title {
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-title {
          color: #0065bd;
        }
        .sg-workflow-description {
          font-size: 16px;
          line-height: 24px;
          color: #6b7280;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-description {
          color: #4b5563;
        }
        .sg-sidebar {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          height: fit-content;
          position: sticky;
          top: 24px;
        }
        .sg-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sg-table th {
          text-align: left;
          font-weight: 600;
          padding: 12px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        .sg-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        .sg-json-preview-container {
          position: relative;
          max-height: 160px;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        .sg-json-preview-container.expanded {
          max-height: none;
        }
        .sg-json-preview-container .fade-out {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,1));
        }
        .sg-json-preview-container.expanded .fade-out {
          display: none;
        }
        .sg-show-more-btn {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 4px 12px;
          font-size: 12px;
          cursor: pointer;
          z-index: 10;
          color: #374151;
          transition: background-color 0.3s ease;
        }
        .sg-show-more-btn:hover {
          background: #f3f4f6;
        }
        .sg-run-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
          display: block;
          text-decoration: none;
        }
        .sg-run-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0065bd, #004a9f);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .sg-run-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
        .sg-run-card:hover::before {
          transform: scaleX(1);
        }
        .sg-run-title {
          font-size: 18px;
          line-height: 26px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        .sg-run-card:hover .sg-run-title {
          color: #0065bd;
        }
        .sg-run-description {
          font-size: 14px;
          line-height: 20px;
          color: #6b7280;
          transition: color 0.3s ease;
        }
        .sg-run-card:hover .sg-run-description {
          color: #4b5563;
        }
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '32px 0' }}>
        <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button 
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Workflows
              </button>
              <span>></span>
              <span className="text-white font-medium">{workflow?.name}</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            {workflow?.name}
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              {workflow?.description || 'This workflow manages data processing tasks with configurable parameters and API integration.'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-1/4 shrink-0">
          <div className="sg-sidebar">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contents</h2>
            <nav className="space-y-2">
              {[
                { id: 'summary', label: 'Summary' },
                { id: 'recent-activity', label: 'Recent Activity' },
                ...(workflow.requires_file ? [{ id: 'input-structure', label: 'Input Structure' }] : []),
                { id: 'parameters', label: 'Parameters' },
                { id: 'destination-config', label: 'Destination Config' },
                { id: 'config-template', label: 'Config Template' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => handleJumpLinkClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActiveSection(section.id) 
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-3/4 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Summary Section */}
          <section id="summary" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Summary</h2>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    {workflow?.destination || 'API'}
                  </span>
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <GitBranch className="h-4 w-4" />
                    {versionControl?.modifiedBy || 'Health Analytics Team'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Latest Status:</span>
                    <StatusBadge status={recent_runs?.[0]?.status || 'Unknown'} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Duration:</span>
                    <span className="text-sm text-gray-600">
                      {recent_runs?.[0]?.duration_ms != null ? formatDuration(recent_runs[0].duration_ms) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">Last Run:</span>
                    <span className="text-sm text-gray-600">
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
              <div className="flex flex-col sm:flex-row gap-3 mt-6 md:mt-0">
                <CustomTooltip content={!isDagReady ? 'DAG not ready' : 'Execute this workflow now'}>
                  <button
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                      !isDagReady || running 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                    }`}
                    onClick={handleStartRun}
                    disabled={!isDagReady || running}
                  >
                    {running ? (
                      <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Start Workflow
                  </button>
                </CustomTooltip>
                <GitHubDagLink
                  dagPath={workflow?.dag_path}
                  repoOwner="health-analytics"
                  repoName="workflows"
                  setVersionControl={setVersionControl}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Current Version:</span>
                <span className="text-sm text-gray-600">{versionControl?.version || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-900">Last Updated:</span>
                <span className="text-sm text-gray-600">{new Date(workflow.updated_at).toLocaleDateString()}</span>
              </div>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                <CircleHelp className="h-4 w-4" />
                Contact Support
              </button>
            </div>
          </section>

          {/* Recent Activity Section */}
          <section id="recent-activity" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Recent Activity</h2>
            <p className="sg-workflow-description mb-6">Last 5 executions of this workflow</p>
            <div className="space-y-6">
              {recent_runs?.length > 0 ? (
                recent_runs.slice(0, 5).map((run) => (
                  <a
                    key={run.id}
                    href={`/runs/run/${run.id}`}
                    className="sg-run-card"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/runs/run/${run.id}`);
                    }}
                  >
                    <h3 className="sg-run-title">Run #{run.id}</h3>
                    <div className="flex items-center gap-6 text-[14px] text-[#6b7280] leading-[20px] tracking-[0.15px] mb-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[#374151]">Workflow ID:</span> {run.workflow_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[#374151]">Status:</span>
                        <StatusBadge status={run.status} />
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[#374151]">Started:</span> 
                        {new Date(run.started_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-[#374151]">Triggered By:</span> {run.triggered_by_name || 'User ID ' + run.triggered_by}
                      </span>
                    </div>
                    <p className="sg-run-description">
                      {run.error_message || 'No error message'}
                    </p>
                  </a>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                  <CircleCheckBig className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No runs found</h3>
                  <p className="text-sm text-gray-500">No recent runs for this workflow.</p>
                </div>
              )}
            </div>
          </section>

          {/* Input File Structure Section */}
          {workflow.requires_file && (
            <section id="input-structure" className="sg-workflow-card">
              <h2 className="sg-workflow-title">Input File Structure</h2>
              <p className="sg-workflow-description mb-6">Required input format for this workflow</p>
              <div className="space-y-3">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 w-full transition-colors"
                  onClick={() => setShowInputModal(true)}
                >
                  <Eye className="h-4 w-4" />
                  View Input Structure
                </button>
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 w-full transition-colors"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </button>
              </div>
              <InputStructureModal
                isOpen={showInputModal}
                onClose={() => setShowInputModal(false)}
                inputStructure={workflow?.input_structure || { columns: [] }}
              />
            </section>
          )}

          {/* Parameters Section */}
          <section id="parameters" className="sg-workflow-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="sg-workflow-title">Parameters</h2>
              <button className="text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setShowParamsModal(true)}>
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="sg-workflow-description mb-6">Configuration parameters for this workflow</p>
            {workflow?.parameters?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Requirement</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflow.parameters.map((param) => (
                      <tr key={param.name} className="hover:bg-blue-50 transition-colors">
                        <td className="font-medium">{param.name}</td>
                        <td>{param.type}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${param.mandatory ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {param.mandatory ? 'Required' : 'Optional'}
                          </span>
                        </td>
                        <td>
                          {param.description || 'No description'}
                          {param.options && (
                            <p className="text-sm text-gray-600 mt-1">
                              Options: {param.options.map(opt => opt.label).join(', ')}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No parameters for this workflow</p>
            )}
            <JsonEditModal
              isOpen={showParamsModal}
              onClose={() => setShowParamsModal(false)}
              title="Edit Workflow Parameters"
              jsonData={workflow?.parameters || []}
              onSave={handleSaveParameters}
            />
          </section>

          {/* Destination Config Section */}
          <section id="destination-config" className="sg-workflow-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="sg-workflow-title">Destination Config</h2>
              <button className="text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setShowConfigModal(true)}>
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="sg-workflow-description mb-6">Configuration for the API destination</p>
            <div className="overflow-x-auto">
              <table className="sg-table">
                <tbody>
                  <tr>
                    <th className="w-1/3">API URL</th>
                    <td>{workflow?.destination_config?.api_url || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>API Token</th>
                    <td>
                      <CustomTooltip content="The API token is encrypted at the database level with a Fernet key and is decrypted only at runtime.">
                        <span className="text-sm text-gray-500">Encrypted</span>
                      </CustomTooltip>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <DestinationConfigModal
              isOpen={showConfigModal}
              onClose={() => setShowConfigModal(false)}
              initialConfig={workflow?.destination_config || {}}
              onSave={handleSaveDestinationConfig}
            />
          </section>

          {/* Configuration Template Section */}
          <section id="config-template" className="sg-workflow-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="sg-workflow-title">Configuration Template</h2>
              <button className="text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setShowConfigTemplateModal(true)}>
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="sg-workflow-description mb-6">Dagster configuration template for this workflow</p>
            <div className={`sg-json-preview-container bg-gray-50 p-4 rounded-lg border border-gray-200 ${isConfigExpanded ? 'expanded' : ''}`}>
              <pre className="text-sm text-gray-900 font-mono overflow-x-auto mb-0">
                <code>{isConfigExpanded ? JSON.stringify(workflow?.config_template || {}, null, 2) : getLimitedJsonLines(workflow?.config_template || {})}</code>
              </pre>
              {!isConfigExpanded && (
                <>
                  <div className="fade-out"></div>
                  <button className="sg-show-more-btn" onClick={() => setIsConfigExpanded(true)}>
                    Show More
                  </button>
                </>
              )}
              {isConfigExpanded && (
                <button className="sg-show-more-btn" onClick={() => setIsConfigExpanded(false)}>
                  Show Less
                </button>
              )}
            </div>
            <JsonEditModal
              isOpen={showConfigTemplateModal}
              onClose={() => setShowConfigTemplateModal(false)}
              title="Edit Configuration Template"
              jsonData={workflow?.config_template || {}}
              onSave={handleSaveConfigTemplate}
            />
          </section>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/workflows/new')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105"
      >
        <Settings className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Workflow;