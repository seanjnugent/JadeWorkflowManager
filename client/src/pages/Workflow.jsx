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
    Code as CodeIcon,
    Plug,
    ChevronLeft,
    Play,
    UploadCloud,
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    AlertCircle
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
                <div className="absolute z-10 w-48 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg">
                    {content}
                </div>
            )}
        </div>
    );
};

// Discreet Dagster Status Component
const DagsterStatus = ({ status }) => {
    const statusConfig = {
        not_published: {
            color: 'bg-gray-200',
            text: 'Not Published',
            textColor: 'text-gray-600'
        },
        created: {
            color: 'bg-amber-100',
            text: 'DAG Created',
            textColor: 'text-amber-800'
        },
        ready: {
            color: 'bg-green-100',
            text: 'Ready',
            textColor: 'text-green-800'
        }
    };

    const config = statusConfig[status] || statusConfig.not_published;

    return (
        <div className={`inline-flex items-center rounded-full ${config.color} ${config.textColor} text-xs font-medium px-3 py-1`}>
            <span className="text-xs">{config.text}</span>
        </div>
    );
};

// Code Snippet Component with Modal
const CodeSnippet = ({ code, language = 'python' }) => {
    const [expanded, setExpanded] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const previewLines = 5;

    const codeLines = code ? code.split('\n') : [];
    const previewCode = codeLines.slice(0, previewLines).join('\n');
    const hasMore = codeLines.length > previewLines;

    return (
        <>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {expanded ? code : previewCode}
                </pre>
                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-600 hover:text-blue-800 mt-1 flex items-center"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp className="w-3 h-3 mr-1" /> Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-3 h-3 mr-1" /> Show more
                            </>
                        )}
                    </button>
                )}
                {code && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-xs text-gray-500 hover:text-gray-700 mt-2 flex items-center"
                    >
                        <MoreHorizontal className="w-3 h-3 mr-1" /> Expand in modal
                    </button>
                )}
            </div>

            {/* Modal for full code view */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-medium">Code Details</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-auto flex-grow">
                            <pre className="text-sm bg-gray-50 p-4 rounded whitespace-pre-wrap font-mono">
                                {code}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const Workflow = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const [workflowDetails, setWorkflowDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`http://localhost:8000/workflows/${workflowId}`, {
            headers: { 'accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => setWorkflowDetails(data))
            .catch(error => console.error('Error:', error))
            .finally(() => setLoading(false));
    }, [workflowId]);

    const handlePublishDag = async () => {
        if (!publishing && workflowDetails?.workflow?.dag_status !== 'ready') {
            setPublishing(true);
            try {
                await fetch(`http://localhost:8000/workflows/${workflowId}/publish_dag`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                // Refetch or update state as needed
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setPublishing(false);
            }
        }
    };

    const handleStartRun = async () => {
        if (!running) {
            setRunning(true);
            try {
                await fetch(`http://localhost:8000/runs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workflow_id: workflowId }),
                });
                navigate('/runs');
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setRunning(false);
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen"><span className="loader"></span></div>;
    }

    if (!workflowDetails) {
        return <div className="min-h-screen flex justify-center items-center">No workflow details available.</div>;
    }

    const { workflow, steps, destination, recent_runs } = workflowDetails;
    const isDagReady = workflow.dag_status === 'ready';
    const isPublished = workflow.is_published;

    return (
        <motion.div
            className="min-h-screen bg-gray-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="container mx-auto px-4 py-8">
                {/* Header Section - More Prominent */}
                <div className="mb-8 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <button
                                onClick={() => navigate('/workflows')}
                                className="text-gray-600 hover:text-gray-800 text-sm flex items-center mb-4"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Workflows
                            </button>

                            <div className="mb-6">
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">{workflow.name}</h1>
                                <p className="text-lg text-gray-700">{workflow.description || 'No description provided.'}</p>
                            </div>
                        </div>

                        {/* Start Run Button - Prominent like home page */}
                        <div className="ml-4">
                            <CustomTooltip content={!isDagReady ? "DAG not ready - Publish to Dagster first" : ""}>
                                <motion.button
                                    whileHover={isDagReady ? { scale: 1.05 } : {}}
                                    whileTap={isDagReady ? { scale: 0.95 } : {}}
                                    onClick={isDagReady ? handleStartRun : undefined}
                                    className={`bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg p-4 shadow-lg shadow-blue-500/20 transition-all flex items-center ${!isDagReady ? 'opacity-50 cursor-not-allowed from-gray-400 to-gray-500 shadow-gray-400/20' : 'hover:from-blue-700 hover:to-cyan-600'}`}
                                    disabled={!isDagReady}
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                                        {running ? (
                                            <Clock className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Play className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold">Start Run</h3>
                                        <p className="text-sm text-white/80">
                                            {isDagReady ? 'Execute this workflow now' : 'DAG not ready'}
                                        </p>
                                    </div>
                                </motion.button>
                            </CustomTooltip>
                        </div>
                    </div>

                    {/* Status Bar */}
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Status</p>
                                <p className="font-medium capitalize">{workflow.status}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Last Run</p>
                                <p className="font-medium">
                                    {workflow.last_run_at ? new Date(workflow.last_run_at).toLocaleString() : 'Never'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Schedule</p>
                                <p className="font-medium">{workflow.schedule || 'None'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Dagster</p>
                                <div className="flex items-center space-x-2">
                                    <DagsterStatus status={workflow.dag_status || 'not_published'} />
                                    {!isPublished && (
                                        <button
                                            onClick={handlePublishDag}
                                            className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                                            disabled={publishing}
                                        >
                                            {publishing ? (
                                                <Clock className="animate-spin w-3 h-3 mr-1" />
                                            ) : (
                                                <UploadCloud className="w-3 h-3 mr-1" />
                                            )}
                                            Publish
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Workflow Steps */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <CodeIcon className="w-5 h-5 text-gray-500 mr-2" />
                                Workflow Steps
                            </h2>
                            <div className="space-y-3">
                                {steps?.length > 0 ? (
                                    steps.map((step) => (
                                        <div key={step.id} className="border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-medium text-gray-800">{step.label}</h3>
                                            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                            <div className="mt-3">
                                                <CodeSnippet code={step.code} language={step.code_type} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No steps defined</p>
                                )}
                            </div>
                        </div>

                        {/* Recent Runs */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <Clock className="w-5 h-5 text-gray-500 mr-2" />
                                Recent Runs
                            </h2>
                            <div className="space-y-3">
                                {recent_runs?.length > 0 ? (
                                    recent_runs.map((run) => (
                                        <div key={run.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-gray-800">Run #{run.id}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {new Date(run.started_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    {run.status === 'completed' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Completed
                                                        </span>
                                                    )}
                                                    {run.status === 'failed' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            Failed
                                                        </span>
                                                    )}
                                                    {run.status === 'running' && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            Running
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {run.error_message && (
                                                <p className="text-xs text-red-600 mt-2">{run.error_message}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500">No recent runs</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Destination */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <Database className="w-5 h-5 text-gray-500 mr-2" />
                                Destination
                            </h2>
                            {destination ? (
                                <div className="space-y-2">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider">Type</p>
                                        <p className="font-medium">{destination.destination_type}</p>
                                    </div>
                                    {destination.table_name && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Table</p>
                                            <p className="font-medium">{destination.table_name}</p>
                                        </div>
                                    )}
                                    {destination.file_path && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider">Path</p>
                                            <p className="font-medium">{destination.file_path}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No destination defined</p>
                            )}
                        </div>

                        {/* Schedule */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
                            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                                <Clock className="w-5 h-5 text-gray-500 mr-2" />
                                Schedule
                            </h2>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Next Run</p>
                                    <p className="font-medium">
                                        {workflow.next_run_at ? new Date(workflow.next_run_at).toLocaleString() : 'Not scheduled'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Workflow;
