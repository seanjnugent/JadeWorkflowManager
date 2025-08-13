import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, UploadCloud, Plug, Clock, CheckCircle, Download, ChevronDown, ChevronUp, X, ChevronRight, Settings } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const NewRun = () => {
  const navigate = useNavigate();
  const { workflowId } = useParams();
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runName, setRunName] = useState('');
  const [files, setFiles] = useState({});
  const [parameters, setParameters] = useState({});
  const [scheduleType, setScheduleType] = useState('none');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeSection, setActiveSection] = useState('run-configuration');
  const [isScrolledIntoView, setIsScrolledIntoView] = useState(false);

  const sectionRefs = {
    'run-configuration': useRef(null),
    'input-file': useRef(null),
    'parameters': useRef(null),
    'schedule': useRef(null),
    'review': useRef(null),
  };

  const scheduleOptions = ['none', 'daily', 'weekly', 'monthly'];

const steps = [
  { id: 'run-configuration', label: 'Run Configuration', icon: <Play className="h-4 w-4" /> },
  ...(workflowDetails?.workflow?.requires_file
    ? [{ id: 'input-file', label: 'Input Files', icon: <UploadCloud className="h-4 w-4" /> }]
    : []),
  { id: 'parameters', label: 'Parameters', icon: <Plug className="h-4 w-4" /> },
  { id: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
  { id: 'review', label: 'Review', icon: <CheckCircle className="h-4 w-4" /> },
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
        
        // Initialize files state based on input_file_path structure
        const inputConfig = Array.isArray(data.workflow?.input_file_path) ? data.workflow.input_file_path : [];
        const initialFiles = {};
        inputConfig.forEach(fileConfig => {
          initialFiles[fileConfig.name] = null;
        });
        setFiles(initialFiles);

        const workflowParams = Array.isArray(data.workflow?.parameters) ? data.workflow.parameters : [];
        const initialParams = {};
        const initialExpanded = {};
        workflowParams.forEach(section => {
          initialExpanded[section.section] = true;
          section.parameters.forEach(param => {
            initialParams[param.name] = param.default ?? '';
          });
        });
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

  const handleFileChange = (fileName, file) => {
    setFiles(prev => ({
      ...prev,
      [fileName]: file
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
        const inputConfig = Array.isArray(workflowDetails?.workflow?.input_file_path) ? workflowDetails.workflow.input_file_path : [];
        if (inputConfig.length > 0) {
          for (const fileConfig of inputConfig) {
            if (fileConfig.required && !files[fileConfig.name]) {
              setError(`Please upload required file: ${fileConfig.description || fileConfig.name}`);
              return false;
            }
            if (files[fileConfig.name]) {
              const fileExt = files[fileConfig.name].name.split('.').pop().toLowerCase();
              const supportedTypes = Array.isArray(fileConfig.supported_types) ? fileConfig.supported_types : ['csv', 'xlsx', 'json'];
              if (!supportedTypes.includes(fileExt)) {
                setError(`Unsupported file type for ${fileConfig.description || fileConfig.name}: ${fileExt}. Supported types: ${supportedTypes.join(', ')}`);
                return false;
              }
            }
          }
        }
        break;
      case 'parameters':
        const workflowParams = Array.isArray(workflowDetails?.workflow?.parameters) ? workflowDetails.workflow.parameters : [];
        if (workflowParams.length === 0) {
          return true; // No parameters to validate
        }
        for (const section of workflowParams) {
          for (const param of section.parameters) {
            if (param.mandatory && (!parameters[param.name] || parameters[param.name].toString().trim() === '')) {
              setError(`Parameter "${param.description || param.name}" is required`);
              return false;
            }
            if (param.type === 'select' && Array.isArray(param.options)) {
              const validValues = param.options.map(opt => opt.value);
              if (parameters[param.name] && !validValues.includes(parameters[param.name])) {
                setError(`Parameter "${param.description || param.name}" must be one of: ${validValues.join(', ')}`);
                return false;
              }
            }
          }
        }
        break;
      case 'review':
        if (!runName.trim()) {
          setError('Please complete the run name');
          return false;
        }
        const inputConfigReview = Array.isArray(workflowDetails?.workflow?.input_file_path) ? workflowDetails.workflow.input_file_path : [];
        if (inputConfigReview.length > 0) {
          for (const fileConfig of inputConfigReview) {
            if (fileConfig.required && !files[fileConfig.name]) {
              setError(`Please upload required file: ${fileConfig.description || fileConfig.name}`);
              return false;
            }
            if (files[fileConfig.name]) {
              const fileExt = files[fileConfig.name].name.split('.').pop().toLowerCase();
              const supportedTypes = Array.isArray(fileConfig.supported_types) ? fileConfig.supported_types : ['csv', 'xlsx', 'json'];
              if (!supportedTypes.includes(fileExt)) {
                setError(`Unsupported file type for ${fileConfig.description || fileConfig.name}: ${fileExt}. Supported types: ${supportedTypes.join(', ')}`);
                return false;
              }
            }
          }
        }
        const workflowParamsReview = Array.isArray(workflowDetails?.workflow?.parameters) ? workflowDetails.workflow.parameters : [];
        if (workflowParamsReview.length > 0) {
          for (const section of workflowParamsReview) {
            for (const param of section.parameters) {
              if (param.mandatory && (!parameters[param.name] || parameters[param.name].toString().trim() === '')) {
                setError(`Please complete required parameter: ${param.description || param.name}`);
                return false;
              }
              if (param.type === 'select' && Array.isArray(param.options)) {
                const validValues = param.options.map(opt => opt.value);
                if (parameters[param.name] && !validValues.includes(parameters[param.name])) {
                  setError(`Parameter "${param.description || param.name}" must be one of: ${validValues.join(', ')}`);
                  return false;
                }
              }
            }
          }
        }
        break;
      default:
        return true;
    }
    return true;
  };

  const handleNextSection = () => {
    if (!validateCurrentSection()) return;
    setError('');
    const currentIndex = steps.findIndex(step => step.id === activeSection);
    if (currentIndex < steps.length - 1) {
      const nextSection = steps[currentIndex + 1].id;
      setActiveSection(nextSection);
      setIsScrolledIntoView(true);
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
      formData.append('run_name', runName);
      
      const inputConfig = Array.isArray(workflowDetails?.workflow?.input_file_path) ? workflowDetails.workflow.input_file_path : [];
      const fileMapping = {};
      if (inputConfig.length > 0) {
        if (inputConfig.length === 1 && inputConfig[0].name === 'input_file' && files['input_file']) {
          formData.append('file', files['input_file']);
        } else {
          Object.entries(files).forEach(([name, file]) => {
            if (file) {
              const fieldName = `file_${name}`;
              formData.append(fieldName, file);
              fileMapping[name] = fieldName;
            }
          });
          if (Object.keys(fileMapping).length > 0) {
            formData.append('file_mapping', JSON.stringify(fileMapping));
          }
        }
      }
      
      const workflowParams = Array.isArray(workflowDetails?.workflow?.parameters) ? workflowDetails.workflow.parameters : [];
      const validParameters = {};
      if (workflowParams.length > 0) {
        workflowParams.forEach(section => {
          section.parameters.forEach(param => {
            if (parameters[param.name] !== undefined && parameters[param.name] !== '') {
              validParameters[param.name] = parameters[param.name];
            }
          });
        });
      }
      
      if (Object.keys(validParameters).length > 0) {
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

      const responseData = await response.json();
      console.log('Run triggered successfully:', responseData);
      if (responseData.run_name) {
        console.log(`Run Name saved: ${responseData.run_name}`);
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
      setIsScrolledIntoView(true);
    }
  };

  const renderParameters = () => {
    const workflowParams = Array.isArray(workflowDetails?.workflow?.parameters) ? workflowDetails.workflow.parameters : [];
    if (workflowParams.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Settings className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No parameters configured</h3>
          <p className="text-sm text-gray-500">This workflow does not have any configurable parameters.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {workflowParams.map(section => (
          <div key={section.section} className="sg-dataset-tile">
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
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {param.description || param.name}
                      {param.mandatory && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {param.type === 'select' && Array.isArray(param.options) ? (
                      <div className="relative">
                        <Plug className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <select
                          value={parameters[param.name] ?? ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:border-[#0065bd] focus:ring-2 focus:ring-[#d9eeff]"
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
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:border-[#0065bd] focus:ring-2 focus:ring-[#d9eeff]"
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

  const renderFileUploads = () => {
    const inputConfig = Array.isArray(workflowDetails?.workflow?.input_file_path) ? workflowDetails.workflow.input_file_path : [];
    
    if (inputConfig.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">No file uploads required for this workflow.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {inputConfig.map(fileConfig => (
          <div key={fileConfig.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {fileConfig.description || fileConfig.name}
              {fileConfig.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            <div className="sg-dataset-tile p-6 text-center relative">
              <input
                type="file"
                accept={Array.isArray(fileConfig.supported_types) ? fileConfig.supported_types.map(type => `.${type}`).join(',') : '*'}
                onChange={(e) => handleFileChange(fileConfig.name, e.target.files[0])}
                disabled={isSubmitting}
                className="hidden"
                id={`file-upload-${fileConfig.name}`}
              />
              <label
                htmlFor={`file-upload-${fileConfig.name}`}
                className={`block text-sm font-medium ${isSubmitting ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 cursor-pointer hover:text-gray-800'} transition-colors`}
              >
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-8 w-8 mb-2 text-gray-400" />
                  <span>{isSubmitting ? 'Uploading...' : 'Click to upload or drag and drop'}</span>
                </div>
              </label>
              
              <p className="text-xs text-gray-500 mt-2">
                Supported types: {Array.isArray(fileConfig.supported_types) ? fileConfig.supported_types.join(', ') : 'All types'}
              </p>
            </div>
            
            {files[fileConfig.name] && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <p className="text-blue-900 text-sm">
                  File selected: {files[fileConfig.name].name} ({(files[fileConfig.name].size / 1024).toFixed(2)} KB)
                </p>
                {!isSubmitting && (
                  <button
                    onClick={() => handleFileChange(fileConfig.name, null)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <GridLoader color="#0065bd" size={17.5} margin={7.5} />
      </div>
    );
  }

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

        .sg-contents-link-disabled {
          color: var(--sg-gray);
          cursor: not-allowed;
        }

        .sg-dataset-tile {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--sg-gray-light);
          border-radius: var(--radius);
          padding: var(--sg-space-lg);
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
          transition: color 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover .sg-dataset-title {
          color: var(--sg-blue-hover);
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: 8px;
        }

        .sg-section-separator {
          border-bottom: 1px solid var(--sg-gray-border);
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
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

        .sg-table tbody tr:hover td,
        .sg-table tbody tr:hover th {
          background-color: var(--sg-blue-lightest);
        }

        .sg-hidden {
          display: none;
        }

        input, select {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          border: 1px solid var(--sg-gray-border);
          border-radius: var(--radius);
          padding: var(--sg-space-sm) var(--sg-space-md);
          transition: all 0.2s ease-in-out;
        }

        input:focus, select:focus {
          outline: none;
          border-color: var(--sg-blue);
          box-shadow: 0 0 0 2px var(--sg-blue-light);
        }

        button {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          border-radius: var(--radius);
          transition: all 0.2s ease-in-out;
        }

        .sg-error {
          background: #fef2f2;
          border: 1px solid #fecdca;
          border-radius: var(--radius);
          padding: var(--sg-space-md);
        }

        .sg-error-text {
          color: #dc2626;
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
      `}</style>

      <div className="sg-page-header">
        <div className="sg-page-header-container">
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
              <button
                onClick={() => navigate(`/workflows/workflow/${workflowId}`)}
                className="text-white hover:text-[#d9eeff] underline hover:no-underline transition-colors duration-200"
              >
                Workflow
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">New Run</span>
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

      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        <div className="w-1/4 shrink-0">
          <div className="sg-contents-sticky">
            <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">Contents</h2>
            <nav>
              <ul className="sg-contents-nav">
                {steps.map((section, index) => (
                  <li key={section.id} className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick(section.id)}
                      disabled={index > steps.findIndex(step => step.id === activeSection)}
                      className={`sg-contents-link w-full text-left flex items-center gap-2 ${
                        activeSection === section.id
                          ? 'sg-contents-link-active'
                          : index <= steps.findIndex(step => step.id === activeSection)
                            ? ''
                            : 'sg-contents-link-disabled'
                      }`}
                    >
                      {section.icon}
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="w-3/4 space-y-8">
          <section
            id="run-configuration"
            ref={sectionRefs['run-configuration']}
            className={`sg-dataset-tile ${activeSection !== 'run-configuration' ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Play className="h-5 w-5 text-[#0065bd]" />
                Run Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure the basic settings for this workflow run
            </p>
            {error && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{error}</span>
                  <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Run Name</label>
                <div className="relative">
                  <Play className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={runName}
                    onChange={(e) => setRunName(e.target.value)}
                    placeholder="Enter a unique name for this run"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:border-[#0065bd] focus:ring-2 focus:ring-[#d9eeff]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Workflow Details</label>
                <div className="sg-dataset-tile">
                  <p className="font-medium text-gray-800">{workflowDetails?.workflow?.name || 'Unnamed Workflow'}</p>
                  <p className="text-gray-600 text-sm mt-1">{workflowDetails?.workflow?.description || 'No description available'}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNextSection}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          {workflowDetails?.workflow?.input_file_path && 
           Array.isArray(workflowDetails.workflow.input_file_path) && 
           workflowDetails.workflow.input_file_path.length > 0 && (
            <section
              id="input-file"
              ref={sectionRefs['input-file']}
              className={`sg-dataset-tile ${activeSection !== 'input-file' ? 'sg-hidden' : ''}`}
            >
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-[#0065bd]" />
                  Input Files
                </h2>
            </div>
              <p className="sg-dataset-description mb-6">
                Upload the required files for this workflow
              </p>
              {error && (
                <div className="sg-error mb-6">
                  <div className="flex justify-between items-center">
                    <span className="sg-error-text">{error}</span>
                    <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {renderFileUploads()}
              
              <div className="flex justify-between items-center mt-8">
                <button
                  onClick={() => handleJumpLinkClick('run-configuration')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={handleNextSection}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          <section
            id="parameters"
            ref={sectionRefs['parameters']}
            className={`sg-dataset-tile ${activeSection !== 'parameters' ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Plug className="h-5 w-5 text-[#0065bd]" />
                Parameters
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Set parameters for this workflow run
            </p>
            {error && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{error}</span>
                  <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Parameters</label>
                {renderParameters()}
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => handleJumpLinkClick(workflowDetails?.workflow?.input_file_path && Array.isArray(workflowDetails.workflow.input_file_path) && workflowDetails.workflow.input_file_path.length > 0 ? 'input-file' : 'run-configuration')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextSection}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="schedule"
            ref={sectionRefs['schedule']}
            className={`sg-dataset-tile ${activeSection !== 'schedule' ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#0065bd]" />
                Schedule
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure when this workflow should run
            </p>
            {error && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{error}</span>
                  <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Schedule</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduleOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => setScheduleType(option)}
                      className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                        scheduleType === option ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-4 h-4 mr-2 rounded-full ${
                            scheduleType === option ? 'bg-[#0065bd]' : 'bg-gray-200'
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
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextSection}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="review"
            ref={sectionRefs['review']}
            className={`sg-dataset-tile ${activeSection !== 'review' ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-[#0065bd]" />
                Review Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Review your workflow run configuration
            </p>
            {error && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{error}</span>
                  <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Run Name</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {runName || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('run-configuration')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
{workflowDetails?.workflow?.requires_file && (
                <div className="sg-dataset-tile">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="sg-dataset-title">Input Files</h3>
                      <div className="mt-4 space-y-2">
                        {workflowDetails.workflow.input_file_path.map(fileConfig => (
                          <p key={fileConfig.name} className="text-base text-gray-700">
                            {fileConfig.description || fileConfig.name}: {files[fileConfig.name] ? (
                              <>
                                <Download className="inline h-5 w-5 mr-2 text-gray-600" />
                                {files[fileConfig.name].name} ({(files[fileConfig.name].size / 1024).toFixed(2)} KB)
                              </>
                            ) : (
                              <span className="text-red-600 font-medium">No file uploaded</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleJumpLinkClick('input-file')}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Parameters</h3>
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
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Schedule</h3>
                    <p className="text-base text-gray-700 mt-1 capitalize">
                      {scheduleType === 'none' ? 'No Schedule (Run once)' : scheduleType}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('schedule')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => handleJumpLinkClick('schedule')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleStartRun}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
                  isSubmitting 
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0065bd] hover:bg-[#004a9f]'
                }`}
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  'Start Run'
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NewRun;