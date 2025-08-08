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
  File
} from 'lucide-react';
import { GridLoader, ClipLoader } from 'react-spinners';

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
      icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      text: 'Success'
    },
    completed: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      text: 'Completed'
    },
    failed: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      text: 'Failed'
    },
    failure: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: <XCircle className="h-4 w-4 text-red-600" />,
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

// CollapsibleSection Component
const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="sg-workflow-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="sg-workflow-title">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="p-4 pt-0">
          {children}
        </div>
      )}
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
    <div className="flex items-center gap-4">
      <div className="flex items-center justify-center bg-gray-50 w-12 h-12 border border-gray-200 rounded-lg">
        {getFileIcon(fileType)}
      </div>
      <div className="flex-1">
        <button
          onClick={() => onDownload(filePath, fileType)}
          disabled={isLoading}
          className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
        >
          {fileName}
        </button>
        <p className="text-xs text-gray-600">{getFileTypeDisplay(fileType)}</p>
      </div>
      {isLoading && (
        <div className="ml-auto">
          <GridLoader color="#0065bd" size={4} margin={2} />
        </div>
      )}
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <GridLoader color="#0065bd" size={17.5} margin={7.5} />
          </div>
          <p className="text-gray-600 text-sm mt-2">Loading run details...</p>
        </div>
      </main>
    );
  }

  if (error && !runData) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="sg-workflow-card max-w-md">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Loading Run
          </h2>
          <p className="sg-workflow-description mb-4">{error || 'Run data not available'}</p>
          <button
            onClick={() => navigate('/runs')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Runs
          </button>
        </div>
      </main>
    );
  }

  const { dagsterRunId, status, pipeline, executionPlan, eventConnection } = runData;
  const steps = executionPlan?.steps || [];
  const events = eventConnection?.events || [];

  return (
    <main className="min-h-screen bg-gray-50">
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
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '32px 0' }}>
        <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button
                onClick={() => navigate('/runs')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Runs
              </button>
              <span>></span>
              <span className="text-white font-medium">Run #{runId}</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Run #{runId}: {pipeline?.name || 'Untitled Workflow'}
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              {pipeline?.description || 'This run executes a data processing workflow with detailed execution logs and file outputs.'}
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
                { id: 'summary', label: 'Run Summary' },
                { id: 'data-files', label: 'Data Files' },
                { id: 'steps', label: 'Step Execution' },
                { id: 'logs', label: 'Execution Logs' },
                { id: 'config', label: 'Configuration' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => handleJumpLinkClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    activeSection === section.id
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

          {/* Run Summary Section */}
          <section id="summary" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Run Summary</h2>
            <div className="flex justify-between items-center mb-6">
              <StatusBadge status={status} />
              <CustomTooltip content="Refresh the run status and logs">
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className={`inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors ${syncLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Triggered By
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex-0 w-8 h-8 bg-gray-100 flex items-center justify-center border border-gray-200 rounded-lg">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-900">{runData.triggered_by_username || getFirstNameFromEmail(runData.triggered_by_email)}</p>
                    <p className="text-sm text-gray-600">{runData.triggered_by_email || 'Unknown user'}</p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                  Execution Timeline
                </h3>
                <table className="sg-table text-sm">
                  <tbody>
                    <tr>
                      <th className="w-1/3">Started</th>
                      <td>
                        {runData.started_at ? new Date(runData.started_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }) : 'Not started'}
                      </td>
                    </tr>
                    <tr>
                      <th>Finished</th>
                      <td>
                        {runData.finished_at ? new Date(runData.finished_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }) : status === 'running' ? <StatusBadge status="running" /> : 'Not finished'}
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
              </div>
              {runData.error_message && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Error Message</h4>
                  <p className="text-sm text-gray-600">{runData.error_message}</p>
                </div>
              )}
            </div>
          </section>

          {/* Data Files Section */}
          <section id="data-files" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Data Files</h2>
            <p className="sg-workflow-description mb-6">Input and output files for this run</p>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Input File</h4>
                {runData.input_file_path ? (
                  <FileDownloadComponent
                    filePath={runData.input_file_path}
                    fileName={getFileNameFromPath(runData.input_file_path)}
                    fileType={getFileType(runData.input_file_path)}
                    onDownload={handleDownload}
                    isLoading={downloadLoading.input}
                  />
                ) : (
                  <p className="text-sm text-gray-600 italic">No input file available</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Output File</h4>
                {runData.output_file_path ? (
                  <FileDownloadComponent
                    filePath={runData.output_file_path}
                    fileName={getFileNameFromPath(runData.output_file_path)}
                    fileType={getFileType(runData.output_file_path)}
                    onDownload={handleDownload}
                    isLoading={downloadLoading.output}
                  />
                ) : (
                  <p className="text-sm text-gray-600 italic">No output file generated</p>
                )}
              </div>
            </div>
          </section>

          {/* Step Execution Section */}
          <section id="steps" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Step Execution</h2>
            <p className="sg-workflow-description mb-6">Timeline of step execution for this run</p>

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
                        <div className="absolute left-1.5 top-4 w-4 h-4 border-2 border-gray-300 flex items-center justify-center rounded-full">
                          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                        </div>
                        <div className="sg-workflow-card">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">{stepStatus.step_label || step.key || 'Unnamed Step'}</h4>
                              {stepStatus.step_description && (
                                <p className="text-sm text-gray-600 mt-1">{stepStatus.step_description}</p>
                              )}
                            </div>
                            <StatusBadge status={stepStatus.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {stepStatus.started_at ? new Date(stepStatus.started_at).toLocaleTimeString('en-GB', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                }) : 'Not started'}
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
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">No step execution data available</p>
                </div>
              )}
          </section>

          {/* Execution Logs Section */}
          <section id="logs" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Execution Logs</h2>
            <p className="sg-workflow-description mb-6">Detailed logs for this run</p>
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
                      <div key={event.id} className="sg-workflow-card">
                        <button
                          onClick={() => toggleLogExpansion(event.id)}
                          className="w-full flex justify-between items-center p-4 hover:bg-gray-50 rounded-lg"
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
                              {event.timestamp ? new Date(parseInt(event.timestamp)).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              }) : 'Unknown time'}
                            </span>
                            {expandedLogs[event.id] ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                          </div>
                        </button>
                        {expandedLogs[event.id] && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                            <pre className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                              {event.message || 'No message'}
                            </pre>
                            <LogEventDetails event={event} />
                            {event.dagster_run_id && (
                              <p className="text-xs text-gray-600 mt-2 font-mono">Run ID: {event.dagster_run_id}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600">No execution logs available for this run</p>
                </div>
              )}
          </section>

          {/* Configuration Section */}
          <section id="config" className="sg-workflow-card">
            <h2 className="sg-workflow-title">Configuration</h2>
            <p className="sg-workflow-description mb-6">Configuration details for this run</p>
                      <div className="space-y-4">
                <table className="sg-table text-sm">
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
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Operations Config</h3>
                    <pre className="text-xs bg-gray-50 p-3 border border-gray-200 rounded-lg text-gray-600 overflow-x-auto">
                      {JSON.stringify(runData.config_used?.ops, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Run;