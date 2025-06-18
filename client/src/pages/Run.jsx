import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Play,
  Pause,
  SkipForward,
  Zap,
  Loader2,
  ChevronDown,
  ChevronUp,
  Gauge,
  Timer,
  HardDriveDownload,
  RefreshCw,
  Download,
  FileJson,
  File
} from 'lucide-react';

// Custom Components
const StatusBadge = ({ status }) => {
  const statusMap = {
    pending: { color: 'ds-tag ds-tag--grey', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
    running: { color: 'ds-tag ds-tag--blue', icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Running' },
    success: { color: 'ds-tag ds-tag--green', icon: <CheckCircle className="w-4 h-4" />, label: 'Success' },
    failed: { color: 'ds-tag ds-tag--red', icon: <XCircle className="w-4 h-4" />, label: 'Failed' },
    failure: { color: 'ds-tag ds-tag--red', icon: <XCircle className="w-4 h-4" />, label: 'Failed' },
    skipped: { color: 'ds-tag ds-tag--orange', icon: <SkipForward className="w-4 h-4" />, label: 'Skipped' }
  };

  const current = statusMap[status?.toLowerCase()] || statusMap.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 ${current.color}`}>
      {current.icon}
      {current.label}
    </span>
  );
};

const DurationDisplay = ({ start, end }) => {
  if (!start) return <span className="text-gray-500">Not started</span>;
  
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  const durationMs = endDate - startDate;
  
  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <Timer className="w-4 h-4 text-gray-500" />
      <span>{formatTime(durationMs)}</span>
    </div>
  );
};

const CollapsibleSection = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <details className="ds-details" open={defaultOpen}>
      <summary className="ds-details__summary">
        <span className="ds-details__summary-text">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        </span>
      </summary>
      <div className="ds-details__text">
        {children}
      </div>
    </details>
  );
};

const FileDownloadComponent = ({ filePath, fileName, fileType, onDownload, isLoading }) => {
  const getFileIcon = (type) => {
    if (type === 'json') return <FileJson className="w-8 h-8 text-blue-600" />;
    return <File className="w-8 h-8 text-gray-600" />;
  };

  const getFileSize = (path) => {
    // This would normally come from the API
    return "Unknown size";
  };

  const getFileTypeDisplay = (type) => {
    switch(type) {
      case 'json': return 'JSON file';
      case 'csv': return 'CSV file';
      case 'txt': return 'Text file';
      default: return 'File';
    }
  };

  if (!filePath) return null;

  return (
    <div className="ds_file-download">
      <div className="ds_file-download__thumbnail">
        <div className="ds_file-download__thumbnail-link flex items-center justify-center bg-gray-50 w-16 h-16 rounded">
          {getFileIcon(fileType)}
        </div>
      </div>
      <div className="ds_file-download__content">
        <button 
          onClick={() => onDownload(filePath, fileType)}
          disabled={isLoading}
          className="ds_file-download__title ds-link text-left hover:underline disabled:opacity-50"
        >
          {fileName}
        </button>
        <div className="ds_file-download__details">
          <dl className="ds_metadata ds_metadata--inline">
            <div className="ds_metadata__item">
              <dt className="ds_metadata__key visually-hidden">File type</dt>
              <dd className="ds_metadata__value">
                {getFileTypeDisplay(fileType)}
                <span className="visually-hidden">,</span>
              </dd>
            </div>
            <div className="ds_metadata__item">
              <dt className="ds_metadata__key visually-hidden">File size</dt>
              <dd className="ds_metadata__value">{getFileSize(filePath)}</dd>
            </div>
          </dl>
        </div>
      </div>
      {isLoading && (
        <div className="ml-auto">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        </div>
      )}
    </div>
  );
};

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
      const response = await fetch(`http://localhost:8000/runs/run/${runId}`);
      if (!response.ok) throw new Error('Failed to fetch run data');
      const data = await response.json();
      setRunData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRunData();
  }, [runId]);

  const handleSync = async () => {
    if (!runData?.run?.dagster_run_id) return;
    try {
      setSyncLoading(true);
      const response = await fetch(`http://localhost:8000/runs/sync/${runData.run.dagster_run_id}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to sync run status');
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
      const response = await fetch(`http://localhost:8000/files/download-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: filePath })
      });
      if (!response.ok) throw new Error(`Failed to get download URL for ${type} file`);
      const { url } = await response.json();
      
      // Force download instead of opening in browser
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileNameFromPath(filePath);
      link.target = '_blank'; // Fallback
      link.rel = 'noopener noreferrer';
      
      // Force download attribute
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh' }} className="flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading run details...</p>
        </div>
      </div>
    );
  }

  if (error || !runData) {
    return (
      <div style={{ minHeight: '100vh' }} className="flex items-center justify-center bg-gray-50">
        <div className="max-w-md">
          <div className="ds_notification ds_notification--negative" role="alert">
            <div className="ds_notification__content">
              <h2 className="ds_notification__title">Error Loading Run</h2>
              <p>{error || 'Run data not available'}</p>
              <button
                onClick={() => navigate('/runs')}
                className="ds_button ds_button--secondary ds_button--small mt-4"
              >
                Back to Runs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { run, logs = [], step_statuses: stepStatuses = [] } = runData;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f8f8' }}>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/runs')}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-4 bg-none border-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to all runs
          </button>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Run #{run.id}: {run.workflow_name || 'Untitled Workflow'}
              </h1>
              <p className="text-gray-600 text-lg">
                {run.workflow_description || 'No description available'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={run.status} />
              <button
                onClick={handleSync}
                disabled={syncLoading}
                className="ds_button ds_button--primary"
              >
                {syncLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync Status
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Run Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Run Summary Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Run Summary
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Triggered By</h3>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">{run.triggered_by_email || 'Unknown user'}</p>
                      <p className="text-sm text-gray-500">({run.triggered_by_username || 'N/A'})</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Execution Timeline</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Started:</span>
                      <span className="text-sm font-medium">
                        {run.started_at ? new Date(run.started_at).toLocaleString() : 'Not started'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Finished:</span>
                      <span className="text-sm font-medium">
                        {run.finished_at ? new Date(run.finished_at).toLocaleString() : 
                         run.status === 'running' ? 'In progress' : 'Not finished'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <DurationDisplay start={run.started_at} end={run.finished_at} />
                    </div>
                  </div>
                </div>
                
                {run.error_message && (
                  <div className="ds_notification ds_notification--negative">
                    <div className="ds_notification__content">
                      <h4 className="ds_notification__title">Error Message</h4>
                      <p className="text-sm">{run.error_message}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Files Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <HardDriveDownload className="w-5 h-5 text-blue-600" />
                Data Files
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Input File</h3>
                  {run.input_file_path ? (
                    <FileDownloadComponent
                      filePath={run.input_file_path}
                      fileName={getFileNameFromPath(run.input_file_path)}
                      fileType={getFileType(run.input_file_path)}
                      onDownload={handleDownload}
                      isLoading={downloadLoading.input}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No input file available</p>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Output File</h3>
                  {run.output_file_path ? (
                    <FileDownloadComponent
                      filePath={run.output_file_path}
                      fileName={getFileNameFromPath(run.output_file_path)}
                      fileType={getFileType(run.output_file_path)}
                      onDownload={handleDownload}
                      isLoading={downloadLoading.output}
                    />
                  ) : (
                    <p className="text-gray-500 italic">No output file generated</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-600" />
                Configuration
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Workflow ID</h3>
                  <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">{run.workflow_id || 'N/A'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Dagster Run ID</h3>
                  <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">{run.dagster_run_id || 'N/A'}</p>
                </div>
                {run.config_used && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Operations Config</h3>
                    <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto border">
                      {JSON.stringify(run.config_used.ops, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Execution Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Execution Timeline */}
            <CollapsibleSection 
              title="Step Execution Timeline" 
              icon={<Zap className="w-5 h-5 text-blue-600" />}
            >
              {stepStatuses.length > 0 ? (
                <div className="space-y-4">
                  {stepStatuses.map((step, index) => (
                    <div key={step.id} className="relative">
                      {index < stepStatuses.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-12 bg-gray-200"></div>
                      )}
                      
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                          <div className={`w-3 h-3 rounded-full ${
                            step.status === 'pending' ? 'bg-gray-400' :
                            step.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            step.status === 'success' ? 'bg-green-500' :
                            step.status === 'failed' ? 'bg-red-500' :
                            step.status === 'skipped' ? 'bg-yellow-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{step.step_label || 'Unnamed Step'}</h4>
                              {step.step_description && (
                                <p className="text-sm text-gray-600 mt-1">{step.step_description}</p>
                              )}
                            </div>
                            <StatusBadge status={step.status} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {step.started_at ? new Date(step.started_at).toLocaleTimeString() : 'Not started'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Gauge className="w-4 h-4" />
                              <DurationDisplay start={step.started_at} end={step.finished_at} />
                            </div>
                          </div>
                          
                          {step.error_message && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Error:</strong> {step.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No step execution data available</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Execution Logs */}
            <CollapsibleSection 
              title="Execution Logs" 
              icon={<Code className="w-5 h-5 text-blue-600" />}
            >
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${
                            log.log_level === 'error' ? 'bg-red-500' : 
                            log.log_level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <span className="font-medium">{log.step_label || 'System'}</span>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            log.log_level === 'error' ? 'bg-red-100 text-red-800' : 
                            log.log_level === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.log_level?.toUpperCase() || 'INFO'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                          </span>
                          {expandedLogs[log.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {expandedLogs[log.id] && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="p-4 bg-gray-50 border-t border-gray-200">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{log.message}</pre>
                              {log.dagster_run_id && (
                                <p className="text-xs text-gray-500 mt-2 font-mono">Run ID: {log.dagster_run_id}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No execution logs available for this run</p>
                </div>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Run;