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
  HardDriveDownload
} from 'lucide-react';

// Custom Components
const StatusBadge = ({ status }) => {
  const statusMap = {
    pending: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-4 h-4" />, label: 'Pending' },
    running: { color: 'bg-blue-100 text-blue-800', icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Running' },
    success: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, label: 'Success' },
    failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, label: 'Failed' },
    skipped: { color: 'bg-yellow-100 text-yellow-800', icon: <SkipForward className="w-4 h-4" />, label: 'Skipped' }
  };

  const current = statusMap[status?.toLowerCase()] || statusMap.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${current.color}`}>
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
  
  // Format duration
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
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-t border-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Run = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [runData, setRunData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLogs, setExpandedLogs] = useState({});

  useEffect(() => {
    const fetchRunData = async () => {
      try {
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

    fetchRunData();
  }, [runId]);

  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !runData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 bg-white rounded-lg shadow-sm border border-red-200">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <h2 className="text-lg font-medium">Error Loading Run</h2>
          </div>
          <p className="text-gray-700 mb-4">{error || 'Run data not available'}</p>
          <button
            onClick={() => navigate('/runs')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
          >
            Back to Runs
          </button>
        </div>
      </div>
    );
  }

  const { run, logs = [], step_statuses: stepStatuses = [] } = runData;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/runs')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to all runs
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Run #{run.id}: {run.workflow_name || 'Untitled Workflow'}
              </h1>
              <p className="text-gray-600 mt-1">
                {run.workflow_description || 'No description available'}
              </p>
            </div>
            <StatusBadge status={run.status} />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Run Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Run Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Run Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Triggered By</p>
                  <p className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{run.triggered_by_email || 'Unknown user'}</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Timing</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Started</p>
                      <p>{run.started_at ? new Date(run.started_at).toLocaleString() : 'Not started'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Finished</p>
                      <p>{run.finished_at ? new Date(run.finished_at).toLocaleString() : run.status === 'running' ? 'In progress' : 'Not finished'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Duration</p>
                  <DurationDisplay start={run.started_at} end={run.finished_at} />
                </div>
                
                {run.error_message && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-100">
                    <p className="text-sm font-medium text-red-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Error Message
                    </p>
                    <p className="text-sm text-red-700 mt-1">{run.error_message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Input/Output Files */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <HardDriveDownload className="w-5 h-5 text-gray-500" />
                Data Files
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Input File</p>
                  <p className="text-sm text-gray-600 truncate">{run.input_file_path || 'No input file'}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Output File</p>
                  <p className="text-sm text-gray-600 truncate">{run.output_file_path || 'No output generated'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Execution Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step Execution Timeline */}
            <CollapsibleSection 
              title="Step Execution" 
              icon={<Zap className="w-5 h-5 text-gray-500" />}
            >
              {stepStatuses.length > 0 ? (
                <div className="space-y-4">
                  {stepStatuses.map((step) => (
                    <div key={step.id} className="border-l-2 border-gray-200 pl-4 pb-4 relative">
                      <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                        <div className={`w-2 h-2 rounded-full ${{
                          pending: 'bg-gray-400',
                          running: 'bg-blue-500 animate-pulse',
                          success: 'bg-green-500',
                          failed: 'bg-red-500',
                          skipped: 'bg-yellow-500'
                        }[step.status] || 'bg-gray-400'}`} />
                      </div>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{step.step_label || 'Unnamed Step'}</h4>
                            {step.step_description && (
                              <p className="text-sm text-gray-600 mt-1">{step.step_description}</p>
                            )}
                          </div>
                          <StatusBadge status={step.status} />
                        </div>
                        
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
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
                          <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                            {step.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No step execution data available</p>
              )}
            </CollapsibleSection>

            {/* Execution Logs */}
            <CollapsibleSection 
              title="Execution Logs" 
              icon={<Code className="w-5 h-5 text-gray-500" />}
            >
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="bg-white rounded border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        className="w-full flex justify-between items-center p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            log.log_level === 'error' ? 'bg-red-500' : log.log_level === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`} />
                          <span className="text-sm font-medium">{log.step_label || 'System'}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
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
                            <div className="p-3 bg-gray-50 border-t border-gray-200">
                              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{log.message}</pre>
                              {log.dagster_run_id && (
                                <p className="text-xs text-gray-500 mt-2">Run ID: {log.dagster_run_id}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No logs available for this run</p>
              )}
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Run;