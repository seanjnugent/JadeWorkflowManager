import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, UploadCloud, Plug, Clock, CheckCircle, Download, ChevronDown, ChevronUp, X, ChevronRight, ChevronFirst, ChevronLast, ChevronDownCircle } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Card = ({ children, title, icon }) => (
  <div className="sg-workflow-card">
    <h2 className="sg-workflow-title flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

const NewRun = () => {
  const navigate = useNavigate();
  const { workflowId } = useParams();
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runName, setRunName] = useState('');
  const [file, setFile] = useState(null);
  const [parameters, setParameters] = useState({});
  const [scheduleType, setScheduleType] = useState('none');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeSection, setActiveSection] = useState('run-configuration');
  const [isScrolledIntoView, setIsScrolledIntoView] = useState(false); // Prevent auto scroll on load

  const sectionRefs = {
    'run-configuration': useRef(null),
    'input-file': useRef(null),
    'parameters': useRef(null),
    'schedule': useRef(null),
    'review': useRef(null),
  };

  const scheduleOptions = ['none', 'daily', 'weekly', 'monthly'];

  const steps = [
    { id: 'run-configuration', label: 'Run Configuration', icon: <Play /> },
    ...(workflowDetails?.workflow?.requires_file ? [{ id: 'input-file', label: 'Input File', icon: <UploadCloud /> }] : []),
    { id: 'parameters', label: 'Parameters', icon: <Plug /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock /> },
    { id: 'review', label: 'Review', icon: <CheckCircle /> },
  ];

  useEffect(() => {
    document.title = "Jade | New Workflow Run";
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setError('User not authenticated');
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/workflows/workflow/${workflowId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            navigate('/login', { replace: true });
            return;
          }
          throw new Error(`Failed to fetch workflow details: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setWorkflowDetails(data);
        const workflowParams = data.workflow?.parameters || [];
        const initialParams = {};
        const initialExpanded = {};
        if (Array.isArray(workflowParams) && workflowParams.length > 0) {
          workflowParams.forEach(section => {
            initialExpanded[section.section] = true;
            section.parameters.forEach(param => {
              initialParams[param.name] = param.default ?? '';
            });
          });
        }
        setParameters(initialParams);
        setExpandedSections(initialExpanded);
        if (data.workflow?.name) {
          setRunName(`${data.workflow.name} Run - ${new Date().toLocaleDateString()}`);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError(`Failed to load workflow details: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkflowDetails();
  }, [workflowId, navigate]);

  // Scroll to active section when it changes (after initial load)
  useEffect(() => {
    if (isScrolledIntoView && sectionRefs[activeSection]?.current) {
      sectionRefs[activeSection].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeSection, isScrolledIntoView]);

  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const validateCurrentSection = () => {
    switch (activeSection) {
      case 'run-configuration':
        if (!runName.trim()) {
          setError('Please enter a run name');
          return false;
        }
        break;
      case 'input-file':
        if (workflowDetails?.workflow?.requires_file && !file) {
          setError('Please upload an input file');
          return false;
        }
        break;
      case 'parameters':
        const workflowParams = workflowDetails?.workflow?.parameters || [];
        if (!Array.isArray(workflowParams) || workflowParams.length === 0) {
          setError('No parameters available for this workflow');
          return false;
        }
        let hasError = false;
        workflowParams.forEach(section => {
          section.parameters.forEach(param => {
            if (param.mandatory && (!parameters[param.name] || parameters[param.name].trim() === '')) {
              setError(`Parameter "${param.name}" is required`);
              hasError = true;
            }
          });
        });
        if (hasError) return false;
        break;
      case 'review':
        if (!runName.trim()) {
          setError('Please complete the run name');
          return false;
        }
        if (workflowDetails?.workflow?.requires_file && !file) {
          setError('Please upload an input file');
          return false;
        }
        if (!Array.isArray(workflowDetails?.workflow?.parameters) || workflowDetails.workflow.parameters.length === 0) {
          setError('No parameters available for this workflow');
          return false;
        }
        const mandatoryError = workflowDetails.workflow.parameters.some(section =>
          section.parameters.some(param => param.mandatory && (!parameters[param.name] || parameters[param.name].trim() === '')),
        );
        if (mandatoryError) {
          setError('Please complete all required parameters');
          return false;
        }
        break;
      default:
        return true;
    }
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) return;
    const currentIndex = steps.findIndex(step => step.id === activeSection);
    if (currentIndex < steps.length - 1) {
      const nextSection = steps[currentIndex + 1].id;
      setActiveSection(nextSection);
      setIsScrolledIntoView(true); // Enable scrolling after first interaction
    }
  };

  const handleStartRun = async () => {
    if (!validateCurrentSection()) return;
    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('workflow_id', workflowId);
      formData.append('triggered_by', userId);
      formData.append('name', runName);
      if (file) {
        formData.append('file', file);
      }
      
      const workflowParams = workflowDetails?.workflow?.parameters || [];
      const validParameters = {};
      if (Array.isArray(workflowParams)) {
        workflowParams.forEach(section => {
          section.parameters.forEach(param => {
            if (parameters[param.name] !== undefined) {
              validParameters[param.name] = parameters[param.name];
            }
          });
        });
      }
      
      if (Object.keys(validParameters).length) {
        formData.append('parameters', JSON.stringify(validParameters));
      }
      
      if (scheduleType !== 'none') {
        formData.append('schedule', scheduleType);
      }

      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/runs/trigger`, {
        method: 'POST',
        body: formData,
        headers: {
           'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Run failed');
      }
      
      navigate('/runs');
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to start run');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJumpLinkClick = (sectionId) => {
    const currentIndex = steps.findIndex(step => step.id === activeSection);
    const targetIndex = steps.findIndex(step => step.id === sectionId);
    if (targetIndex <= currentIndex) {
      setActiveSection(sectionId);
      setIsScrolledIntoView(true); // Enable scrolling after first interaction
    }
  };

  const renderParameters = () => {
    const workflowParams = workflowDetails?.workflow?.parameters || [];
    if (!Array.isArray(workflowParams) || workflowParams.length === 0) {
      return (
        <div className="bg-red-50 p-4 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">Error: No parameters available for this workflow.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {workflowParams.map(section => (
          <div key={section.section} className="sg-workflow-card p-4">
            <button
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
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
                {section.parameters.map(param => (
                  <div key={param.name} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {param.description || param.name}
                      {param.mandatory && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {param.type === 'select' && Array.isArray(param.options) ? (
                      <div className="relative">
                        <Plug className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <select
                          value={parameters[param.name] ?? ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                        >
                          <option value="" disabled>
                            Select an option
                          </option>
                          {param.options.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="relative">
                        <Plug className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={parameters[param.name] ?? ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          placeholder={param.placeholder || `Enter ${param.description || param.name}`}
                          className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                        />
                      </div>
                    )}
                    {param.description && (
                      <p className="text-gray-500 text-xs mt-1">{param.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <GridLoader color="#0065bd" size={17.5} margin={7.5} />
      </div>
    );
  }

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
        .sg-page-header {
          background-color: #0065bd;
          color: white;
          padding: 32px 0;
        }
        .sg-page-header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .sg-page-header-title {
          font-size: 44px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        .sg-page-header-description {
          font-size: 16px;
          line-height: 24px;
        }
        .sg-hidden {
          display: none;
        }
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header">
        <div className="sg-page-header-container">
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button
                onClick={() => navigate(`/workflows/workflow/${workflowId}`)}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Workflow
              </button>
              <span>></span>
              <span className="text-white font-medium">New Run</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title">
            New Workflow Run
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Configure and start a new run for {workflowDetails?.workflow?.name || 'Unnamed Workflow'}
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
              {steps.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => handleJumpLinkClick(section.id)}
                  disabled={index > steps.findIndex(step => step.id === activeSection)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm flex items-center gap-2 ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold'
                      : index <= steps.findIndex(step => step.id === activeSection)
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                        : 'text-gray-400 font-medium cursor-not-allowed'
                  }`}
                >
                  {section.icon}
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content - Only show active section */}
        <div className="w-3/4 space-y-8">
          {/* Run Configuration Section */}
          <section
            id="run-configuration"
            ref={sectionRefs['run-configuration']}
            className={`sg-workflow-card ${activeSection !== 'run-configuration' ? 'sg-hidden' : ''}`}
          >
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Play className="h-6 w-6 text-blue-600" />
              Run Configuration
            </h2>
            <p className="sg-workflow-description mb-6">Configure the basic settings for this workflow run</p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                <span className="text-red-700 text-sm">{error}</span>
                <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Run Name</label>
                <div className="relative">
                  <Play className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="Enter a unique name for this run"
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Workflow Details</label>
                <div className="sg-workflow-card p-4">
                  <p className="font-medium text-gray-800">{workflowDetails?.workflow?.name || 'Unnamed Workflow'}</p>
                  <p className="text-gray-600 text-sm mt-1">{workflowDetails?.workflow?.description || 'No description available'}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNextSection}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
              >
                <ChevronDown className="h-8 w-8" />
              </button>
            </div>
          </section>

          {/* Input File Section */}
          {workflowDetails?.workflow?.requires_file && (
            <section
              id="input-file"
              ref={sectionRefs['input-file']}
              className={`sg-workflow-card ${activeSection !== 'input-file' ? 'sg-hidden' : ''}`}
            >
              <h2 className="sg-workflow-title flex items-center gap-2">
                <UploadCloud className="h-6 w-6 text-blue-600" />
                Input File
              </h2>
              <p className="sg-workflow-description mb-6">Upload the input file required for this workflow</p>
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                  <span className="text-red-700 text-sm">{error}</span>
                  <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input File</label>
                  <div className="sg-workflow-card p-6 text-center">
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      disabled={isSubmitting}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`block text-sm font-medium ${error ? 'text-red-600' : 'text-gray-600'} cursor-pointer`}
                    >
                      {isSubmitting ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </label>
                  </div>
                  {file && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-900 text-sm">
                        File selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() => handleJumpLinkClick('run-configuration')}
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={handleNextSection}
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
                >
                <ChevronDown className="h-8 w-8" />
                </button>
              </div>
            </section>
          )}

          {/* Parameters Section */}
          <section
            id="parameters"
            ref={sectionRefs['parameters']}
            className={`sg-workflow-card ${activeSection !== 'parameters' ? 'sg-hidden' : ''}`}
          >
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Plug className="h-6 w-6 text-blue-600" />
              Parameters
            </h2>
            <p className="sg-workflow-description mb-6">Set parameters for this workflow run</p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                <span className="text-red-700 text-sm">{error}</span>
                <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parameters</label>
                {renderParameters()}
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => handleJumpLinkClick(workflowDetails?.workflow?.requires_file ? 'input-file' : 'run-configuration')}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextSection}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
              >
                <ChevronDown className="h-8 w-8" />
              </button>
            </div>
          </section>

          {/* Schedule Section */}
          <section
            id="schedule"
            ref={sectionRefs['schedule']}
            className={`sg-workflow-card ${activeSection !== 'schedule' ? 'sg-hidden' : ''}`}
          >
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-600" />
              Schedule
            </h2>
            <p className="sg-workflow-description mb-6">Configure when this workflow should run</p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                <span className="text-red-700 text-sm">{error}</span>
                <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduleOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => setScheduleType(option)}
                      className={`sg-workflow-card p-4 text-center cursor-pointer transition-colors ${
                        scheduleType === option ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-4 h-4 mr-2 rounded-full ${
                            scheduleType === option ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        ></div>
                        <span className="capitalize font-medium text-sm">
                          {option === 'none' ? 'No Schedule' : option}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {option === 'none'
                          ? 'Run once immediately'
                          : option === 'daily'
                            ? 'Run once every day'
                            : option === 'weekly'
                              ? 'Run once every week'
                              : 'Run once every month'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => handleJumpLinkClick('parameters')}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextSection}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 p-3 rounded-full transition-colors"
              >
                <ChevronDown className="h-8 w-8" />
              </button>
            </div>
          </section>

          {/* Review Section */}
          <section
            id="review"
            ref={sectionRefs['review']}
            className={`sg-workflow-card ${activeSection !== 'review' ? 'sg-hidden' : ''}`}
          >
            <h2 className="sg-workflow-title flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              Review Configuration
            </h2>
            <p className="sg-workflow-description mb-6">Review your workflow run configuration</p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                <span className="text-red-700 text-sm">{error}</span>
                <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="space-y-6">
              <div className="sg-workflow-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Run Name</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {runName || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('run-configuration')}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              {workflowDetails?.workflow?.requires_file && (
                <div className="sg-workflow-card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Input File</h3>
                      <p className="text-base text-gray-700 mt-1">
                        {file ? (
                          <>
                            <Download className="inline h-5 w-5 mr-2 text-gray-600" />
                            {file.name} ({(file.size / 1024).toFixed(2)} KB)
                          </>
                        ) : (
                          <span className="text-red-600 font-medium">No file uploaded</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleJumpLinkClick('input-file')}
                      className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
              <div className="sg-workflow-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Parameters</h3>
                    <div className="mt-4 space-y-5">
                      {Array.isArray(workflowDetails?.workflow?.parameters) && workflowDetails.workflow.parameters.length > 0 ? (
                        workflowDetails.workflow.parameters.map((section) => (
                          <div key={section.section}>
                            <h4 className="text-md font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
                              {section.section}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                              {section.parameters.map((param) => (
                                <div key={param.name}>
                                  <p className="text-sm font-medium text-gray-600">{param.description || param.name}</p>
                                  <p className="text-base text-gray-800 mt-0.5">
                                    {parameters[param.name] || <span className="text-red-600 font-medium">Not set</span>}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-base text-gray-700 mt-1">No parameters available</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('parameters')}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-workflow-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
                    <p className="text-base text-gray-700 mt-1 capitalize">
                      {scheduleType === 'none' ? 'No Schedule (Run once)' : scheduleType}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('schedule')}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => handleJumpLinkClick('schedule')}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleStartRun}
                disabled={isSubmitting}
                className={`inline-flex items-center justify-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors ${
                  isSubmitting 
                    ? 'bg-gray-400 border-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 border border-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Starting...' : 'Start Run'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default NewRun;
