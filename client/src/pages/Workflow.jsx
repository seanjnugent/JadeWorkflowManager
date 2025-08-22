import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, RefreshCw, Clock, ChevronLeft, Play, FileText, CircleCheckBig, CircleAlert, GitBranch, CircleHelp, Github, X, Pencil, FileSpreadsheet, Download, Eye, Settings, ArrowRight } from 'lucide-react';
import { GridLoader } from 'react-spinners';

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
const InputStructureModal = ({ isOpen, onClose, fileName, structure }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">Input File Structure: {fileName}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 overflow-auto flex-grow">
          <div className="overflow-x-auto">
            <table className="sg-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {(structure || []).map((col, index) => (
                  <tr key={`${fileName}-${col.name}-${index}`}>
                    <td className="font-medium">{col.name}</td>
                    <td>{col.type}</td>
                    <td>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${col.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {col.required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{col.description}</td>
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
// GitHub DAG Link Component - FIXED VERSION
const GitHubDagLink = ({ dagPath, repoOwner, repoName, setVersionControl }) => {
  const [dagInfo, setDagInfo] = useState({ authorized: false });
  const [loading, setLoading] = useState(true);

  const extractJobName = (path) => {
    if (!path) return null;
    
    // Try to extract workflow_job_X pattern from the path
    const match = path.match(/workflow_job_(\d+)/);
    if (match) return match[0];
    
    // If no match, try to extract from filename or segments
    const segments = [...path.split('.'), ...path.replace(/\\/g, '/').split('/')];
    for (let seg of segments.reverse()) {
      const jobMatch = seg.match(/workflow_job_\d+/);
      if (jobMatch) return jobMatch[0];
    }
    
    return null;
  };

  const dagJobName = extractJobName(dagPath);
  const filePath = dagJobName || 'unknown';
  
  // Build the correct GitHub URL
  const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/main/DAGs/${filePath}.py`;

  useEffect(() => {
    const fetchDagInfo = async () => {
      if (!dagJobName) {
        console.warn('No valid DAG job name extracted from path:', dagPath);
        setDagInfo({ authorized: false });
        setLoading(false);
        return;
      }

      try {
        // Updated API call with proper error handling
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/api/api/github-dag-info?dag_path=${filePath}`, {
          headers: { 
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}` // Add auth header if needed
          }
        });
        
        if (!response.ok) {
          console.error(`GitHub API error: HTTP ${response.status}`);
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('GitHub DAG info received:', data); // Debug log
        
        setDagInfo(data);
        
        // Update version control info if data is available and authorized
        if (data.authorized && setVersionControl && data.last_updated) {
          setVersionControl({
            version: data.version ? `v${data.version}` : 'N/A',
            lastModified: new Date(data.last_updated).toLocaleDateString('en-GB'),
            modifiedBy: data.author || 'Unknown'
          });
        }
      } catch (error) {
        console.error('Error fetching GitHub DAG info:', error);
        setDagInfo({ authorized: false, error: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDagInfo();
  }, [dagPath, filePath, repoOwner, repoName, setVersionControl]); // Add dagPath to dependencies

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Enhanced tooltip content with better error handling
  const tooltipContent = dagInfo.authorized ? (
    <div className="space-y-1">
      <p>View DAG in GitHub</p>
      {dagInfo.last_updated && (
        <p className="text-xs">Last updated: {new Date(dagInfo.last_updated).toLocaleString('en-GB')}</p>
      )}
      {dagInfo.author && (
        <p className="text-xs">Author: {dagInfo.author}</p>
      )}
      {dagInfo.commit_message && (
        <p className="text-xs">Commit: {dagInfo.commit_message?.split('\n')[0]}</p>
      )}
      <p className="text-xs">File: {filePath}.py</p>
    </div>
  ) : (
    <div className="space-y-1">
      <p>GitHub repository access</p>
      <p className="text-xs">File: {filePath}.py</p>
      {dagInfo.error && (
        <p className="text-xs text-red-300">Error: {dagInfo.error}</p>
      )}
      <p className="text-xs">Click to view on GitHub</p>
    </div>
  );

  return (
    <CustomTooltip content={tooltipContent}>
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200`}
        onClick={(e) => {
          // Always allow the click to go through to GitHub
          console.log('GitHub link clicked:', githubUrl);
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
  const [showInputModal, setShowInputModal] = useState({ isOpen: false, fileName: '', structure: [] });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showParamsModal, setShowParamsModal] = useState(false);
  const [showConfigTemplateModal, setShowConfigTemplateModal] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [versionControl, setVersionControl] = useState(null);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const userId = localStorage.getItem('userId');



  useEffect(() => {
    const sections = ['overview', 'run-history', 'input-structure', 'parameters', 'destination-config', 'config-template', 'version-control'];
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

  const handleDownloadTemplate = (file) => {
    const headers = file?.structure?.map(col => col.name).join(',');
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


   useEffect(() => {
        document.title = "Jade | Workflow";
        if (!userId) {
          navigate('/login', { replace: true });
        }
      }, [userId, navigate]);


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
              <div className="min-h-screen bg-white flex justify-center items-center">
                      <div className="text-center">
                        <div className="flex justify-center items-center">
                          <GridLoader color="#0065bd" size={17.5} margin={7.5} />
                        </div>
                      </div>
                    </div>
  );
}


  if (!workflowDetails) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
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
  const inputFiles = Array.isArray(workflow?.input_file_path) ? workflow.input_file_path : [];

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        :root {
          --sg-blue: #0065bd;
          --sg-blue-dark: #005eb8;
          --sg-blue-darker: #00437d;
          --sg-blue-light: #d9eeff;
          --sg-blue-lighter: #f0f8ff;
          --sg-blue-lightest: #e6f3ff;
          --sg-blue-border: rgba(0,101,189,0.64);
          --sg-blue-text: #00437d;
          --sg-blue-hover: #004a9f;
          --sg-gray: #5e5e5e;
          --sg-gray-dark: #333333;
          --sg-gray-light: #ebebeb;
          --sg-gray-lighter: #f8f8f8;
          --sg-gray-border: #b3b3b3;
          --sg-gray-bg: #f8f8f8;
          --sg-text-primary: #333333;
          --sg-text-secondary: #5e5e5e;
          --sg-text-inverse: #ffffff;
          --sg-space-xs: 4px;
          --sg-space-sm: 8px;
          --sg-space-md: 16px;
          --sg-space-lg: 24px;
          --sg-space-xl: 32px;
          --sg-space-xxl: 48px;
          --sg-font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --radius: 4px;
        }

        .sg-page-header {
          background: var(--sg-blue-dark);
          color: var(--sg-text-inverse);
          padding: var(--sg-space-xl) 0;
          padding-bottom: var(--sg-space-lg);
        }

        .sg-page-header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--sg-space-lg);
        }

        .sg-page-header-breadcrumb {
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-title {
          font-family: var(--sg-font-family);
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.25;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-description {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-contents-sticky {
          position: sticky;
          top: var(--sg-space-lg);
          align-self: flex-start;
          background: white;
          border-radius: var(--radius);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: var(--sg-space-lg);
          max-height: calc(100vh - var(--sg-space-xl));
          overflow-y: auto;
        }

        .sg-contents-nav {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sg-contents-item {
          margin: 0;
          padding: 0;
        }

        .sg-contents-link {
          display: flex;
          align-items: center;
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-decoration: none;
          color: var(--sg-blue);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          border-left: 4px solid transparent;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          margin: 2px 0;
        }

        .sg-contents-link::before {
          content: '–';
          margin-right: var(--sg-space-sm);
          color: var(--sg-blue);
          font-weight: 400;
        }

        .sg-contents-link:hover {
          background-color: var(--sg-blue-light);
          border-left-color: var(--sg-blue);
          text-decoration: none;
        }

        .sg-contents-link-active {
          background-color: var(--sg-blue-lightest);
          border-left-color: var(--sg-blue);
          font-weight: 500;
          color: var(--sg-blue);
        }

        .sg-contents-link-active::before {
          font-weight: 700;
        }

        .sg-section-separator {
          border-bottom: 1px solid #b3b3b3;
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-dataset-tile {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--sg-gray-light);
          border-radius: var(--radius);
          padding: var(--sg-space-lg);
          display: block;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .sg-dataset-title {
          font-family: var(--sg-font-family);
          font-size: 1.375rem;
          font-weight: 700;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-blue);
          margin-bottom: 8px;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover .sg-dataset-title {
          color: var(--sg-blue-hover);
          text-decoration: underline;
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: 8px;
          text-decoration: none;
        }

        .sg-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          border: 1px solid var(--sg-gray-border);
        }

        .sg-table th,
        .sg-table td {
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-align: left;
          border-bottom: 1px solid var(--sg-gray-border);
          vertical-align: top;
        }

        .sg-table thead th {
          background-color: var(--sg-gray-bg);
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody th {
          background-color: transparent;
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody tr:hover td,
        .sg-table tbody tr:hover th {
          background-color: var(--sg-blue-lightest);
        }
      `}</style>

      {/* Blue page header section */}
      <div className="sg-page-header">
        <div className="sg-page-header-container">
          {/* Breadcrumb */}
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
              <button 
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Workflows
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">{workflow?.name}</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            {workflow?.name}
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              {workflow?.description || 'This workflow manages data processing tasks with configurable parameters and API integration.'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - 25% width with sticky contents */}
          <div className="w-1/4 shrink-0">
            <div className="sg-contents-sticky">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
                Contents
              </h2>
              
              <nav>
                <ul className="sg-contents-nav">
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('overview')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('overview') ? 'sg-contents-link-active' : ''}`}
                    >
                      Overview
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('run-history')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('run-history') ? 'sg-contents-link-active' : ''}`}
                    >
                      Run history
                    </button>
                  </li>
                  {workflow?.requires_file && (
                    <li className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick('input-structure')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('input-structure') ? 'sg-contents-link-active' : ''}`}
                      >
                        Input structure
                      </button>
                    </li>
                  )}
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('parameters')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('parameters') ? 'sg-contents-link-active' : ''}`}
                    >
                      Parameters
                    </button>
                  </li>
                  {workflow?.destination?.toLowerCase() === 'api' && (
                    <li className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick('destination-config')}
                        className={`sg-contents-link w-full text-left ${isActiveSection('destination-config') ? 'sg-contents-link-active' : ''}`}
                      >
                        Destination config
                      </button>
                    </li>
                  )}
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('config-template')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('config-template') ? 'sg-contents-link-active' : ''}`}
                    >
                      Config template
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('version-control')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('version-control') ? 'sg-contents-link-active' : ''}`}
                    >
                      Version Control
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Main content - 75% width */}
          <div className="w-3/4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Overview Section */}
            <section id="overview" className="mb-12 pt-6">
              <div className="sg-section-separator">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                    Overview
                  </h2>
                  <CustomTooltip content={!isDagReady ? 'DAG not ready' : 'Execute this workflow now'}>
                    <button
                      className={`inline-flex items-center gap-2 px-5 py-3 text-[18px] leading-[24px] font-medium rounded transition-colors duration-200 ${
                        !isDagReady || running
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-[#0065bd] text-white hover:bg-[#004a9f]'
                      }`}
                      onClick={handleStartRun}
                      disabled={!isDagReady || running}
                    >
                      {running ? (
                        <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Run workflow
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </CustomTooltip>
                </div>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-8">
                  {workflow?.description || 'This workflow manages data processing tasks with configurable parameters and API integration. To begin, click the \'Run workflow\' button.'}
                </p>
                
                {/* Workflow information table */}
                <table className="sg-table mb-8">
                  <tbody>
                    <tr>
                      <th className="w-1/2">Workflow name</th>
                      <td>{workflow?.name}</td>
                    </tr>
                    <tr>
                      <th>Workflow ID</th>
                      <td>WF0{workflow?.id || workflowId}</td>
                    </tr>
                    <tr>
                      <th>Workflow maintainer</th>
                      <td>{workflow?.user_name}</td>
                    </tr>
                    <tr>
                      <th>Workflow created</th>
                      <td>{workflow?.created_at ? new Date(workflow.created_at).toLocaleDateString('en-GB') : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Last run</th>
                      <td>{recent_runs?.[0]?.started_at ? new Date(recent_runs[0].started_at).toLocaleDateString('en-GB') : 'N/A'}</td>
                    </tr>
                    <tr>
                      <th>Last Run Status</th>
                      <td><StatusBadge status={recent_runs?.[0]?.status || 'Unknown'} /></td>
                    </tr>
                    <tr>
                      <th>Destination</th>
                      <td>{workflow?.destination || 'API'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Run History Section */}
            <section id="run-history" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Run history
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Here are the latest runs of this workflow. Click on a run for more information.
                </p>
                <div className="space-y-6">
                  {recent_runs?.length > 0 ? (
                    recent_runs.slice(0, 3).map((run) => (
                      <button
                        key={run.id}
                        onClick={() => navigate(`/runs/run/${run.id}`)}
                        className="sg-dataset-tile block w-full text-left"
                      >
                        <h3 className="sg-dataset-title">
                          Run ID #{run.id}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#374151]">Status:</span>
                            <StatusBadge status={run.status} />
                          </span>
                          <span>Date: {new Date(run.started_at).toLocaleDateString('en-GB')}</span>
                          <span>Run by: {run.triggered_by_name || 'User ID ' + run.triggered_by}</span>
                          <span>Workflow ID: {run.workflow_id}</span>
                          {run.duration_ms != null && (
                            <span>Duration: {formatDuration(run.duration_ms)}</span>
                          )}
                        </div>

                        <p className="sg-dataset-description">
                          {run.error_message || 'Run completed successfully.'}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                      <CircleCheckBig className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No runs found</h3>
                      <p className="text-sm text-gray-500">No recent runs for this workflow.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Input Structure Section */}
           {/* Input Structure Section */}
{workflow?.requires_file && (
  <section id="input-structure" className="mb-12">
    <div className="sg-section-separator">
      <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
        Input structure
      </h2>
    </div>
    
    <div className="prose prose-lg max-w-none">
      <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
        Required input files and their formats for this workflow. You can view the structure details or download a template file for each.
      </p>
      
      <div className="space-y-6">
        {Array.isArray(inputFiles) && inputFiles.length > 0 ? (
          inputFiles.map((file, index) => {
            // Safely extract file properties with defaults
            const fileName = file?.name || `Input File ${index + 1}`;
            const fileFormat = (file?.format || file?.supported_types?.[0] || 'unknown').toUpperCase();
            const fileStructure = Array.isArray(file?.structure) ? file.structure : [];
            const requiredFieldsCount = fileStructure.filter(col => col?.required).length;
            const hasStructure = fileStructure.length > 0;
            const supportedTypes = Array.isArray(file?.supported_types) 
              ? file.supported_types.join(', ') 
              : 'Not specified';

            return (
              <div key={`${fileName}-${index}`} className="sg-dataset-tile">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="sg-dataset-title flex-1 mr-4">
                    {fileName}
                  </h3>
                  <div className="flex gap-3 flex-wrap justify-end">
  {hasStructure && (
    <button
      onClick={() => setShowInputModal({
        isOpen: true,
        fileName,
        structure: fileStructure
      })}
      className="px-4 py-2 bg-[#0065bd] text-white text-sm font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
    >
      <Eye className="h-4 w-4 mr-2" />
      View Structure
    </button>
  )}
  {hasStructure && (
    <button
      onClick={() => handleDownloadTemplate({
        name: fileName,
        structure: fileStructure,
        format: fileFormat.toLowerCase()
      })}
      className="px-4 py-2 bg-[#0065bd] text-white text-sm font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
      disabled={!hasStructure}
    >
      <Download className="h-4 w-4 mr-2" />
      Download Template
    </button>
  )}
</div>


                </div>
                
                <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3 flex-wrap">
                  <span>Format: {fileFormat}</span>
                  {hasStructure && (
                    <>
                      <span>Columns: {fileStructure.length}</span>
                      <span>Required fields: {requiredFieldsCount}</span>
                    </>
                  )}
                  <span>Supported types: {supportedTypes}</span>
                </div>

                <p className="sg-dataset-description">
                  {hasStructure ? 
                    'View the detailed structure of required input columns or download a template with the correct headers.' :
                    'No structure defined. Please contact the workflow maintainer for file specifications.'
                  }
                </p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {inputFiles === undefined ? 'Loading input structure...' : 'No input files defined'}
            </h3>
            <p className="text-sm text-gray-500">
              {inputFiles === undefined 
                ? 'Please wait while we load the input requirements' 
                : 'This workflow does not specify any input files.'}
            </p>
          </div>
        )}
      </div>
    </div>

    {/* Input Structure Modal */}
    <InputStructureModal
      isOpen={showInputModal.isOpen}
      onClose={() => setShowInputModal({ isOpen: false, fileName: '', structure: [] })}
      fileName={showInputModal.fileName}
      structure={showInputModal.structure}
    />
  </section>
)}

            {/* Parameters Section */}
            <section id="parameters" className="mb-12">
              <div className="sg-section-separator">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                    Parameters
                  </h2>
                  <button 
                    onClick={() => setShowParamsModal(true)}
                    className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Configuration parameters for this workflow. These parameters control the workflow execution behavior.
                </p>
                {workflow?.parameters?.length > 0 && workflow.parameters.some(section => section.parameters?.length > 0) ? (
                  <div className="overflow-x-auto">
                    {workflow.parameters.map((section, index) => (
                      <div key={index} className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.section || 'Unnamed Section'}</h3>
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
                            {section.parameters.map((param) => (
                              <tr key={param.name}>
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No parameters configured</h3>
                    <p className="text-sm text-gray-500">This workflow does not have any configurable parameters.</p>
                  </div>
                )}
              </div>
              <JsonEditModal
                isOpen={showParamsModal}
                onClose={() => setShowParamsModal(false)}
                title="Edit Workflow Parameters"
                jsonData={workflow?.parameters || []}
                onSave={handleSaveParameters}
              />
            </section>

            {/* Destination Config Section */}
            {workflow?.destination?.toLowerCase() === 'api' && (
              <section id="destination-config" className="mb-12">
                <div className="sg-section-separator">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                      Destination config
                    </h2>
                    <button 
                      onClick={() => setShowConfigModal(true)}
                      className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  </div>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                    Configuration for the API destination. This defines where workflow results are sent.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="sg-table">
                      <tbody>
                        <tr>
                          <th className="w-1/3">API URL</th>
                          <td>{workflow?.destination_config?.api_url || 'Not configured'}</td>
                        </tr>
                        <tr>
                          <th>API Token</th>
                          <td>
                            <CustomTooltip content="The API token is encrypted at the database level with a Fernet key and is decrypted only at runtime.">
                              <span className="text-sm text-gray-500">
                                {workflow?.destination_config?.api_token ? 'Configured (encrypted)' : 'N/A'}
                              </span>
                            </CustomTooltip>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <DestinationConfigModal
                  isOpen={showConfigModal}
                  onClose={() => setShowConfigModal(false)}
                  initialConfig={workflow?.destination_config || {}}
                  onSave={handleSaveDestinationConfig}
                />
              </section>
            )}

            {/* Configuration Template Section */}
            <section id="config-template" className="mb-12">
              <div className="sg-section-separator">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                    Config template
                  </h2>
                  <button 
                    onClick={() => setShowConfigTemplateModal(true)}
                    className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Dagster configuration template for this workflow. This JSON configuration defines the workflow's execution parameters.
                </p>
                <div className="space-y-6">
                  <div className="sg-dataset-tile">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="sg-dataset-title flex-1 mr-4">
                        Workflow configuration template
                      </h3>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                          className="px-4 py-2 bg-[#0065bd] text-white font-medium rounded hover:bg-[#004a9f] transition-colors duration-200 flex items-center"
                        >
                          {isConfigExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                          {isConfigExpanded ? 'Show Less' : 'Show More'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3">
                      <span>Format: JSON</span>
                      <span>Last updated: {workflow?.updated_at ? new Date(workflow.updated_at).toLocaleDateString('en-GB') : 'N/A'}</span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
                      <pre className="text-sm text-gray-900 font-mono mb-0">
                        <code>{isConfigExpanded ? JSON.stringify(workflow?.config_template || {}, null, 2) : getLimitedJsonLines(workflow?.config_template || {})}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              <JsonEditModal
                isOpen={showConfigTemplateModal}
                onClose={() => setShowConfigTemplateModal(false)}
                title="Edit Configuration Template"
                jsonData={workflow?.config_template || {}}
                onSave={handleSaveConfigTemplate}
              />
            </section>

            {/* Version Control Section */}
            <section id="version-control" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Version control
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-4">
                  We use GitHub to manage, share, and maintain our workflows and platform. This allows us to share what we build, knowing things are consistent, version controlled and transparent.
                </p>
                
                <div className="space-y-6">
                  <div className="sg-dataset-tile">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="sg-dataset-title flex-1 mr-4">
                        GitHub repository access
                      </h3>
                      <GitHubDagLink
                        dagPath={workflow?.dag_path}
                        repoOwner="seanjnugent"
                        repoName="DataWorkflowTool-Workflows"
                        setVersionControl={setVersionControl}
                      />
                    </div>
                    
                    <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3">
                      <span>Version: {versionControl?.version || 'N/A'}</span>
                      <span>Last modified: {versionControl?.lastModified || 'N/A'}</span>
                      <span>Modified by: {versionControl?.modifiedBy || 'N/A'}</span>
                    </div>

                    <p className="sg-dataset-description">
                      Access the source code and version history for this workflow on GitHub. View commits, changes, and collaborate with the development team.
                    </p>
                    <div className="mt-4">
                      <ul className="list-disc list-inside space-y-2 mb-8 ml-4 text-[19px] leading-[32px] tracking-[0.15px] text-[#333333]">
                        <li>
                          <a 
                            href="#/github-workflow" 
                            className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline transition-colors duration-200"
                          >
                            GitHub repository: {workflow?.name} workflow
                          </a>
                        </li>
                        <li>
                          <a 
                            href="#/github-platform" 
                            className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline transition-colors duration-200"
                          >
                            GitHub repository: Workflow manager platform
                          </a>
                        </li>
                        <li>
                          <a 
                            href="#/github-guide" 
                            className="text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline transition-colors duration-200"
                          >
                            GitHub user guide
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflow;