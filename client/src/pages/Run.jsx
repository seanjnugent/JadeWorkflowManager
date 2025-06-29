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
  Loader2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Timer,
  HardDriveDownload,
  RefreshCw,
  FileJson,
  File
} from 'lucide-react';

// StatusBadge Component
const StatusBadge = ({ status }) => {
  const statusMap = {
    queued: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Clock className="h-4 w-4" />, label: 'Queued' },
    pending: { color: 'bg-gray-50 text-gray-700 border-gray-200', icon: <Clock className="h-4 w-4" />, label: 'Pending' },
    running: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <RefreshCw className="h-4 w-4 animate-spin" />, label: 'Running' },
    success: { color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="h-4 w-4" />, label: 'Success' },
    failed: { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" />, label: 'Failed' },
    failure: { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircle className="h-4 w-4" />, label: 'Failed' },
    skipped: { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: <SkipForward className="h-4 w-4" />, label: 'Skipped' }
  };

  const current = statusMap[status?.toLowerCase()] || statusMap.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium border ${current.color}`}>
      {current.icon}
      {current.label}
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
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
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
    <div className="bg-white border border-gray-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>
      {isOpen && (
        <div className="p-6 pt-0">
          {children}
        </div>
      )}
    </div>
  );
};

// FileDownloadComponent
const FileDownloadComponent = ({ filePath, fileName, fileType, onDownload, isLoading }) => {
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
      <div className="flex items-center justify-center bg-gray-50 w-12 h-12 border border-gray-200">
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
          <Loader2 className="h-4 w-4 animate-spin text-blue-900" />
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
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>{event.__typename === 'ExecutionStepInputEvent' ? 'Input' : 'Output'} Name:</strong>{' '}
              {event.event_data.inputName || event.event_data.outputName || 'N/A'}
            </p>
            {event.event_data.typeCheck && (
              <div>
                <strong className="text-sm text-gray-600">Type Check:</strong>
                <ul className="list-disc pl-5 text-sm text-gray-600">
                  <li>Label: {event.event_data.typeCheck.label || 'N/A'}</li>
                  <li>Description: {event.event_data.typeCheck.description || 'None'}</li>
                  <li>Success: <StatusBadge status={event.event_data.typeCheck.success ? 'success' : 'failed'} /></li>
                </ul>
              </div>
            )}
          </div>
        );
      case 'ExecutionStepFailureEvent':
        return (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Error Message:</strong> {event.event_data.error?.message || 'No error message'}
            </p>
            {event.event_data.error?.stack && (
              <div>
                <strong className="text-sm text-gray-600">Error Stack:</strong>
                <pre className="text-xs bg-red-50 p-3 border border-red-200 text-red-700 overflow-auto">
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
              <pre className="text-xs bg-gray-50 p-3 border border-gray-200 text-gray-700 overflow-auto">
                {JSON.stringify(event.event_data, null, 2)}
              </pre>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 text-sm text-gray-600">
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

  const fetchRunData = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem('access_token');
      const userId = localStorage.getItem('userId');

      if (!userId || !accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      const response = await fetch(`http://localhost:8000/runs/run/${runId}`, {
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
      const response = await fetch(`http://localhost:8000/runs/sync/${runData.dagsterRunId}`, {
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
      const response = await fetch(`http://localhost:8000/files/download-url`, {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-900 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading run details...</p>
        </div>
      </main>
    );
  }

  if (error && !runData) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="max-w-md bg-white border border-red-200 p-6">
          <h2 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Error Loading Run
          </h2>
          <p className="text-sm text-gray-600 mb-4">{error || 'Run data not available'}</p>
          <button
            onClick={() => navigate('/runs')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
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
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/runs')}
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to all runs
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Run #{runId}: {pipeline?.name || 'Untitled Workflow'}
          </h1>
          <p className="text-gray-600 text-sm mb-6">{pipeline?.description || 'No description available'}</p>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <div className="flex justify-between items-center mb-6">
            <StatusBadge status={status} />
            <button
              onClick={handleSync}
              disabled={syncLoading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2 disabled:opacity-50"
            >
              {syncLoading ? (
                <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent"></div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Status
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-gray-300 p-6">
                <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-6 w-6 text-blue-600" />
                  Run Summary
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Triggered By</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 flex items-center justify-center border border-gray-200">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-gray-900">{runData.triggered_by_username || getFirstNameFromEmail(runData.triggered_by_email)}</p>
                        <p className="text-sm text-gray-600">{runData.triggered_by_email || 'Unknown user'}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Execution Timeline</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Started:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {runData.started_at ? new Date(runData.started_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }) : 'Not started'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Finished:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {runData.finished_at ? new Date(runData.finished_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }) : status === 'RUNNING' ? <StatusBadge status="running" /> : 'Not finished'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <DurationDisplay start={runData.started_at} end={runData.finished_at} />
                      </div>
                    </div>
                  </div>
                  {runData.error_message && (
                    <div className="bg-red-50 border border-red-200 p-3">
                      <h4 className="text-sm font-medium text-red-700 mb-2">Error Message</h4>
                      <p className="text-sm text-gray-600">{runData.error_message}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white border border-gray-300 p-6">
                <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <HardDriveDownload className="h-6 w-6 text-blue-600" />
                  Data Files
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Input File</h3>
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
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Output File</h3>
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
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <CollapsibleSection
                title="Step Execution Timeline"
                icon={<Zap className="h-6 w-6 text-blue-600" />}
              >
                {steps.length > 0 ? (
                  <div className="space-y-4">
                    {steps.map((step, index) => {
                      const stepStatus = steps.find(s => s.key === step.key) || {};
                      return (
                        <div key={step.key} className="relative pl-8">
                          {index < steps.length - 1 && (
                            <div className="absolute left-3 top-4 w-1 h-full bg-gray-200"></div>
                          )}
                          <div className="absolute left-1.5 top-4 w-4 h-4 border-2 border-gray-300 flex items-center justify-center">
                            <div className={`w-2 h-2 ${
                              stepStatus.status?.toLowerCase() === 'queued' ? 'bg-gray-400' :
                              stepStatus.status?.toLowerCase() === 'pending' ? 'bg-gray-400' :
                              stepStatus.status?.toLowerCase() === 'running' ? 'bg-blue-900 animate-pulse' :
                              stepStatus.status?.toLowerCase() === 'success' ? 'bg-green-600' :
                              stepStatus.status?.toLowerCase() === 'failed' ? 'bg-red-600' :
                              stepStatus.status?.toLowerCase() === 'skipped' ? 'bg-orange-500' : 'bg-gray-400'
                            }`} />
                          </div>
                          <div className="bg-white border border-gray-300 p-4">
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
                              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-sm text-gray-600">
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
              </CollapsibleSection>
              <CollapsibleSection
                title="Execution Logs"
                icon={<Code className="h-6 w-6 text-blue-600" />}
              >
                {events.length > 0 ? (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="bg-white border border-gray-300">
                        <button
                          onClick={() => toggleLogExpansion(event.id)}
                          className="w-full flex justify-between items-center p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 ${
                              event.level?.toUpperCase() === 'ERROR' ? 'bg-red-600' :
                              event.level?.toUpperCase() === 'WARNING' ? 'bg-orange-500' :
                              event.level?.toUpperCase() === 'DEBUG' ? 'bg-blue-900' : 'bg-green-600'
                            }`} />
                            <span className="text-sm font-medium text-gray-900">{event.stepKey || 'System'}</span>
                            <span className={`text-xs px-2 py-0.5 font-medium border ${
                              event.level?.toUpperCase() === 'ERROR' ? 'bg-red-50 text-red-700 border-red-200' :
                              event.level?.toUpperCase() === 'WARNING' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              event.level?.toUpperCase() === 'DEBUG' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'
                            }`}>
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
                            {expandedLogs[event.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>
                        {expandedLogs[event.id] && (
                          <div className="p-4 bg-gray-50 border-t border-gray-200">
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">No execution logs available for this run</p>
                  </div>
                )}
              </CollapsibleSection>
            </div>
          </div>
          <div className="mt-4">
            <div className="bg-white border border-gray-300 p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Code className="h-6 w-6 text-blue-600" />
                Configuration
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Workflow ID</h3>
                    <p className="text-sm font-mono bg-gray-50 px-2 py-1 border border-gray-200">{runData.workflow_id || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-1">Dagster Run ID</h3>
                    <p className="text-sm font-mono bg-gray-50 px-2 py-1 border border-gray-200">{dagsterRunId || 'N/A'}</p>
                  </div>
                </div>
                {runData.config_used && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase mb-2">Operations Config</h3>
                    <pre className="text-xs bg-gray-50 p-3 border border-gray-200 text-gray-600 overflow-auto">
                      {JSON.stringify(runData.config_used?.ops, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Run;