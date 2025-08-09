import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Code,
  User,
  Calendar,
  SkipForward,
  Zap,
  ChevronDown,
  ChevronUp,
  Gauge,
  Timer,
  HardDriveDownload,
  RefreshCw,
  FileJson,
  File,
  CircleCheckBig,
  CircleAlert
} from 'lucide-react';
import { GridLoader, ClipLoader } from 'react-spinners';
import { Link } from 'react-router-dom';

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

// StatusBadge Component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    queued: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <Clock className="h-4 w-4 text-gray-600" />,
      text: 'Queued'
    },
    pending: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: <Clock className="h-4 w-4 text-gray-600" />,
      text: 'Pending'
    },
    running: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />,
      text: 'Running'
    },
    success: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CircleCheckBig className="h-4 w-4 text-emerald-600" />,
      text: 'Success'
    },
    completed: {
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
    skipped: {
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: <SkipForward className="h-4 w-4 text-orange-600" />,
      text: 'Skipped'
    },
    cancelled: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: <XCircle className="h-4 w-4 text-purple-600" />,
      text: 'Cancelled'
    }
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </span>
  );
};

// DurationDisplay Component
const DurationDisplay = ({ start, end }) => {
  if (!start) return <span className="text-gray-600 text-sm">Not started</span>;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const durationMs = endDate - startDate;
  const formatTime = (ms) => {
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
  return (
    <div className="flex items-center gap-1 text-sm text-gray-600">
      <Timer className="h-4 w-4" />
      <span>{formatTime(durationMs)}</span>
    </div>
  );
};

// FileDownloadComponent
const FileDownloadComponent = ({ filePath, fileName, fileType, onDownload, isLoading = false }) => {
  const getFileIcon = (type) => {
    if (type === 'json') return <FileJson className="h-6 w-6 text-blue-600" />;
    return <File className="h-6 w-6 text-gray-600" />;
  };
  const getFileTypeDisplay = (type) => {
    switch (type) {
      case 'json': return 'JSON file';
      case 'csv': return 'CSV file';
      case 'txt': return 'Text file';
      default: return 'File';
    }
  };
  if (!filePath) return null;
  return (
    <div className="sg-dataset-tile">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center bg-gray-50 w-12 h-12 border border-gray-200 rounded-lg">
          {getFileIcon(fileType)}
        </div>
        <div className="flex-1">
          <button
            onClick={() => onDownload(filePath, fileType)}
            disabled={isLoading}
            className="sg-dataset-title text-left disabled:opacity-50"
          >
            {fileName}
          </button>
          <p className="sg-dataset-description text-sm">{getFileTypeDisplay(fileType)}</p>
        </div>
        {isLoading && (
          <div className="ml-auto">
            <GridLoader color="#0065bd" size={4} margin={2} />
          </div>
        )}
      </div>
    </div>
  );
};

// LogEventDetails Component
const LogEventDetails = ({ event }) => {
  if (!event.__typename || !event.event_data) return null;
  const renderEventData = () => {
    switch (event.__typename) {
      case 'ExecutionStepInputEvent':
      case 'ExecutionStepOutputEvent':
        return (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <strong>{event.__typename === 'ExecutionStepInputEvent' ? 'Input' : 'Output'} Name:</strong>{' '}
              {event.event_data?.inputName || event.event_data?.outputName || 'N/A'}
            </p>
            {event.event_data?.typeCheck && (
              <div>
                <strong className="text-gray-600">Type Check:</strong>
                <ul className="list-disc pl-5 text-gray-600">
                  <li>Label: {event.event_data.typeCheck?.label || 'N/A'}</li>
                  <li>Description: {event.event_data.typeCheck?.description || 'None'}</li>
                  <li>Success: <StatusBadge status={event.event_data?.typeCheck?.success ? 'success' : 'failed'} /></li>
                </ul>
              </div>
            )}
          </div>
        );
      case 'ExecutionStepFailureEvent':
        return (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <strong>Error Message:</strong> {event.event_data?.error?.message || 'No error message'}
            </p>
            {event.event_data?.error?.stack && (
              <div>
                <strong className="text-gray-600">Error Stack:</strong>
                <pre className="text-xs bg-gray-100 p-3 border border-gray-200 rounded text-gray-600 overflow-x-auto">
                  {event.event_data.error.stack}
                </pre>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-600">
            <p><strong>Event Type:</strong> {event.__typename}</p>
            {Object.keys(event.event_data).length > 0 && (
              <pre className="text-xs bg-gray-100 p-3 border border-gray-200 rounded text-gray-600 overflow-x-auto">
                {JSON.stringify(event.event_data, null, 2)}
              </pre>
            )}
          </div>
        );
    }
  };
  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
      {renderEventData()}
    </div>
  );
};

// Main Run Component
const Run = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [runData, setRunData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState({ input: false, output: false });
  const [error, setError] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});
  const [activeSection, setActiveSection] = useState('summary');

  // Scroll spy functionality
  useEffect(() => {
    const sections = ['summary', 'data-files', 'steps', 'logs', 'config'];

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

  const fetchRunData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      const userId = localStorage.getItem('userId');
      if (!userId || !accessToken) {
        navigate('/login', { replace: true });
        return;
      }
      const response = await fetch(`${API_BASE_URL}/runs/run/${runId}`, {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      if (!response.ok) throw new Error(`Failed to fetch run data: ${response.statusText}`);
      const data = await response.json();
      if (!data.run) {
        throw new Error('Run data not found in response');
      }
      const transformedData = {
        pipelineRunOrError: {
          __typename: 'Run',
          dagsterRunId: data.run.dagster_run_id,
          status: data.run.status,
          pipeline: {
            name: data.run.workflow_name,
            description: data.run.workflow_description
          },
          executionPlan: {
            steps: (data.step_statuses || []).map(step => ({
              key: step.step_code,
              step_label: step.label,
              step_description: step.description,
              status: step.status,
              started_at: step.started_at,
              finished_at: step.finished_at,
              error_message: step.error_message
            }))
          },
          eventConnection: {
            events: (data.logs || []).map(log => ({
              id: log.id,
              __typename: log.event_type || 'UnknownEvent',
              message: log.message || 'No message',
              timestamp: log.timestamp ? String(new Date(log.timestamp).getTime()) : null,
              level: log.log_level || 'INFO',
              stepKey: log.step_code,
              dagster_run_id: log.dagster_run_id,
              event_data: log.event_data || {}
            }))
          },
          workflow_id: data.run.workflow_id,
          triggered_by_email: data.run.triggered_by_email,
          run_name: data.run.run_name,
          triggered_by_username: data.run.triggered_by_username,
          started_at: data.run.started_at,
          finished_at: data.run.finished_at,
          error_message: data.run.error_message,
          input_file_path: data.run.input_file_path,
          output_file_path: data.run.output_file_path,
          config_used: data.run.config_used
        }
      };
      setRunData(transformedData.pipelineRunOrError);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunData();
  }, [runId, navigate]);

  const handleSync = async () => {
    if (!runData?.dagsterRunId) return;
    try {
      setSyncLoading(true);
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/runs/sync/${runData.dagsterRunId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.detail && errorData.detail.includes("could not be found")) {
          console.log("Run not found, doing nothing.");
          return;
        }
        throw new Error(errorData.detail || 'Failed to sync run status');
      }
      await fetchRunData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncLoading(false);
    }
  };

  const getFileNameFromPath = (path) => {
    if (!path) return null;
    const parts = path.split('/');
    return parts[parts.length - 1] || 'Unknown file';
  };

  const getFileType = (path) => {
    if (!path) return 'unknown';
    const extension = path.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  };

  const handleDownload = async (filePath, type) => {
    if (!filePath) return;
    try {
      setDownloadLoading(prev => ({ ...prev, [type]: true }));
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/files/download-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ file_path: filePath })
      });
      if (!response.ok) throw new Error(`Failed to get download URL for ${type} file`);
      const { url } = await response.json();
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileNameFromPath(filePath);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('download', getFileNameFromPath(filePath));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(`Failed to download ${type} file: ${err.message}`);
    } finally {
      setDownloadLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const getFirstNameFromEmail = (email) => {
    if (!email) return 'Unknown';
    const [localPart] = email.split('@');
    const [firstName] = localPart.split('.');
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  };

  const handleJumpLinkClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  const isActiveSection = (sectionId) => activeSection === sectionId;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <GridLoader color="#0065bd" size={17.5} margin={7.5} />
          </div>
          <p className="text-gray-600 text-sm mt-2">Loading run details...</p>
        </div>
      </div>
    );
  }

  if (error && !runData) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="sg-dataset-tile max-w-md">
          <h2 className="sg-dataset-title flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Loading Run
          </h2>
          <p className="sg-dataset-description mb-4">{error || 'Run data not available'}</p>
          <button
            onClick={() => navigate('/runs')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Runs
          </button>
        </div>
      </div>
    );
  }

  const { dagsterRunId, status, pipeline, executionPlan, eventConnection } = runData;
  const steps = executionPlan?.steps || [];
  const events = eventConnection?.events || [];

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        /* Scottish Government Design System CSS variables */
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
                onClick={() => navigate('/runs')}
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Runs
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">Run #{runId}</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
            Run #{runId}: {pipeline?.name || 'Untitled Workflow'}
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              {pipeline?.description || 'This run executes a data processing workflow with detailed execution logs and file outputs.'}
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
                      onClick={() => handleJumpLinkClick('summary')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('summary') ? 'sg-contents-link-active' : ''}`}
                    >
                      Overview
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('data-files')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('data-files') ? 'sg-contents-link-active' : ''}`}
                    >
                      Data files
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('steps')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('steps') ? 'sg-contents-link-active' : ''}`}
                    >
                      Step execution
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('logs')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('logs') ? 'sg-contents-link-active' : ''}`}
                    >
                      Execution logs
                    </button>
                  </li>
                  <li className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick('config')}
                      className={`sg-contents-link w-full text-left ${isActiveSection('config') ? 'sg-contents-link-active' : ''}`}
                    >
                      Config template
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

            {/* Run Summary Section */}
            <section id="summary" className="mb-12 pt-6">
              <div className="sg-section-separator">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px]">
                    Overview
                  </h2>
                  <CustomTooltip content="Refresh the run status and logs">
                    <button
                      onClick={handleSync}
                      disabled={syncLoading}
                      className={`inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-[#0065bd] border border-[#0065bd] hover:bg-[#004a9f] px-4 py-2 rounded transition-colors ${syncLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {syncLoading ? (
                        <ClipLoader color="#ffffff" size={16} />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Sync Status
                    </button>
                  </CustomTooltip>
                </div>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-8">
                  Overview of this workflow run including execution status, timing, and trigger information.
                </p>
                
                {/* Run information table */}
                <table className="sg-table mb-8">
                  <tbody>
                    <tr>
                      <th className="w-1/2">Run ID</th>
                      <td>#{runId}</td>
                    </tr>
                                    <tr>
                      <th>Status</th>
                      <td><StatusBadge status={status} /></td>
                    </tr>
                    <tr>
                      <th className="w-1/2">Run Name</th>
                      <td>{runData.run_name}</td>
                    </tr>
                    <tr>
                      <th>Workflow Name</th>
                      <td>{pipeline?.name || 'Untitled Workflow'}</td>
                    </tr>
<tr>
  <th>Workflow ID</th>
  <td>
    {runData.workflow_id ? (
      <Link to={`/workflows/workflow/${runData.workflow_id}`}>
        {`WF${String(runData.workflow_id).padStart(4, '0')}`}
      </Link>
    ) : (
      'N/A'
    )}
  </td>
</tr>

                    <tr>
                      <th>Dagster Run ID</th>
                      <td>{dagsterRunId || 'N/A'}</td>
                    </tr>
  
                    <tr>
                      <th>Triggered By</th>
                      <td>
                        <div className="flex flex-col">
<span className="font-medium">
  {runData.triggered_by_username}{' '}
  <span className="text-gray-500">{'('}{runData.triggered_by_email}{')'}</span>
</span>                      </div>
                      </td>
                    </tr>
                    <tr>
                      <th>Started At</th>
                      <td>
                        {runData.started_at ? new Date(runData.started_at).toLocaleDateString('en-GB') : 'Not started'}
                      </td>
                    </tr>
                    <tr>
                      <th>Duration</th>
                      <td>
                        <DurationDisplay start={runData.started_at} end={runData.finished_at} />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {runData.error_message && (
                  <div className="sg-dataset-tile bg-red-50 border-red-200">
                    <h3 className="sg-dataset-title text-red-700 mb-2">Error Details</h3>
                    <p className="sg-dataset-description text-red-600">{runData.error_message}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Data Files Section */}
            <section id="data-files" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Data files
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Input and output files associated with this workflow run. Click to download available files.
                </p>
                <div className="space-y-6">
                  <div>
                    <h3 className="sg-dataset-title flex-1 mr-4 mb-3">
                      Input file
                    </h3>
                    {runData.input_file_path ? (
                      <FileDownloadComponent
                        filePath={runData.input_file_path}
                        fileName={getFileNameFromPath(runData.input_file_path)}
                        fileType={getFileType(runData.input_file_path)}
                        onDownload={handleDownload}
                        isLoading={downloadLoading.input}
                      />
                    ) : (
                      <div className="sg-dataset-tile">
                        <p className="sg-dataset-description italic">No input file available</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="sg-dataset-title flex-1 mr-4 mb-3">
                      Output file
                    </h3>
                    {runData.output_file_path ? (
                      <FileDownloadComponent
                        filePath={runData.output_file_path}
                        fileName={getFileNameFromPath(runData.output_file_path)}
                        fileType={getFileType(runData.output_file_path)}
                        onDownload={handleDownload}
                        isLoading={downloadLoading.output}
                      />
                    ) : (
                      <div className="sg-dataset-tile">
                        <p className="sg-dataset-description italic">No output file generated</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Step Execution Section */}
            <section id="steps" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Step execution
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Timeline of workflow step execution showing the progression and status of each processing stage.
                </p>

                {steps.length > 0 ? (
                  <div className="space-y-4">
                    {steps.map((step, index) => {
                      const stepStatus = steps.find(s => s.key === step.key) || {};
                      const statusColor = {
                        queued: 'bg-gray-400',
                        pending: 'bg-gray-400',
                        running: 'bg-blue-600 animate-pulse',
                        success: 'bg-emerald-600',
                        completed: 'bg-emerald-600',
                        failed: 'bg-red-600',
                        failure: 'bg-red-600',
                        skipped: 'bg-orange-500',
                        cancelled: 'bg-purple-500'
                      }[stepStatus.status?.toLowerCase()] || 'bg-gray-400';
                      
                      return (
                        <div key={step.key} className="relative pl-8">
                          {index < steps.length - 1 && (
                            <div className="absolute left-3 top-4 w-1 h-full bg-gray-200"></div>
                          )}
                          <div className="absolute left-1.5 top-4 w-4 h-4 border-2 border-gray-300 flex items-center justify-center rounded-full bg-white">
                            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                          </div>
                          <div className="sg-dataset-tile">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="sg-dataset-title">{stepStatus.step_label || step.key || 'Unnamed Step'}</h3>
                                {stepStatus.step_description && (
                                  <p className="sg-dataset-description text-sm mt-1">{stepStatus.step_description}</p>
                                )}
                              </div>
                              <StatusBadge status={stepStatus.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {stepStatus.started_at ? new Date(stepStatus.started_at).toLocaleDateString('en-GB') : 'Not started'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Gauge className="h-4 w-4" />
                                <DurationDisplay start={stepStatus.started_at} end={stepStatus.finished_at} />
                              </div>
                            </div>
                            {stepStatus.error_message && (
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-gray-600">
                                <strong>Error:</strong> {stepStatus.error_message}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sg-dataset-tile text-center py-12">
                    <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="sg-dataset-title text-gray-500 mb-2">No step execution data available</h3>
                    <p className="sg-dataset-description">No execution steps found for this run.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Execution Logs Section */}
            <section id="logs" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Execution logs
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Detailed execution logs from the workflow run. Click on any log entry to view additional details.
                </p>
                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.map((event) => {
                      const levelColor = {
                        ERROR: 'bg-red-600',
                        WARNING: 'bg-orange-500',
                        DEBUG: 'bg-blue-600',
                        INFO: 'bg-emerald-600'
                      }[event.level?.toUpperCase()] || 'bg-emerald-600';
                      const badgeColor = {
                        ERROR: 'bg-red-100 text-red-700 border-red-200',
                        WARNING: 'bg-orange-100 text-orange-700 border-orange-200',
                        DEBUG: 'bg-blue-100 text-blue-700 border-blue-200',
                        INFO: 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }[event.level?.toUpperCase()] || 'bg-emerald-100 text-emerald-700 border-emerald-200';
                      
                      return (
                        <div key={event.id} className="sg-dataset-tile p-0">
                          <button
                            onClick={() => toggleLogExpansion(event.id)}
                            className="w-full flex justify-between items-center p-6 hover:bg-gray-50 rounded transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-3 h-3 rounded-full ${levelColor}`} />
                              <span className="text-sm font-medium text-gray-900">{event.stepKey || 'System'}</span>
                              <span className={`text-xs px-2 py-0.5 font-medium border rounded-full ${badgeColor}`}>
                                {event.__typename || event.level?.toUpperCase() || 'INFO'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-600">
                                {event.timestamp ? new Date(parseInt(event.timestamp)).toLocaleDateString('en-GB') : 'Unknown time'}
                              </span>
                              {expandedLogs[event.id] ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                            </div>
                          </button>
                          {expandedLogs[event.id] && (
  
                              <LogEventDetails event={event} />
        
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="sg-dataset-tile text-center py-12">
                    <Code className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="sg-dataset-title text-gray-500 mb-2">No execution logs available</h3>
                    <p className="sg-dataset-description">No logs found for this workflow run.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Configuration Section */}
            <section id="config" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Config template
                </h2>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Configuration details and parameters used for this specific workflow run.
                </p>
                <div className="space-y-6">
                  <table className="sg-table">
                    <tbody>
                      <tr>
                        <th className="w-1/3">Workflow ID</th>
                        <td>{runData.workflow_id || 'N/A'}</td>
                      </tr>
                      <tr>
                        <th>Dagster Run ID</th>
                        <td>{dagsterRunId || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {runData.config_used && (
                    <div className="sg-dataset-tile">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="sg-dataset-title flex-1 mr-4">
                          Operations configuration
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3">
                        <span>Format: JSON</span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 overflow-x-auto">
                        <pre className="text-sm text-gray-900 font-mono mb-0">
                          <code>{JSON.stringify(runData.config_used?.ops || {}, null, 2)}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Run;