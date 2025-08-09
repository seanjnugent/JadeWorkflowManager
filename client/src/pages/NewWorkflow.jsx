import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileInput, File, Settings2, Database, Waypoints, FileSpreadsheet, FileX, CheckCircle2, GitBranch, ChevronRight, X, ChevronDown, ChevronUp } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import axios from 'axios';

// Placeholder database connections
const DATABASE_CONNECTIONS = [
  { id: '1', name: 'Production DB' },
  { id: '2', name: 'Staging DB' },
  { id: '3', name: 'Analytics DB' },
];

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const NewWorkflow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '1001');
  const [workflowId, setWorkflowId] = useState(null);
  const [parsedFileStructure, setParsedFileStructure] = useState([]);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parameterSections, setParameterSections] = useState([]);
  const [destinationType, setDestinationType] = useState('csv');
  const [databaseConfig, setDatabaseConfig] = useState({
    connectionId: '',
    schema: '',
    tableName: '',
    createIfNotExists: false,
  });
  const [apiConfig, setApiConfig] = useState({
    endpoint: '',
    authToken: '',
  });
  const [dagPath, setDagPath] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [skipFileUpload, setSkipFileUpload] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [isScrolledIntoView, setIsScrolledIntoView] = useState(false);

  const sectionRefs = {
    'workflow-details': useRef(null),
    'input-file': useRef(null),
    'structure-preview': useRef(null),
    'parameters': useRef(null),
    'dag-configuration': useRef(null),
    'destination': useRef(null),
    'review': useRef(null),
  };

  const steps = [
    { id: 'workflow-details', title: 'Workflow Details', icon: <FileInput className="h-4 w-4" /> },
    { id: 'input-file', title: 'Input File', icon: <File className="h-4 w-4" /> },
    { id: 'structure-preview', title: 'Structure Preview', icon: <File className="h-4 w-4" /> },
    { id: 'parameters', title: 'Parameters', icon: <Settings2 className="h-4 w-4" /> },
    { id: 'dag-configuration', title: 'DAG Configuration', icon: <GitBranch className="h-4 w-4" /> },
    { id: 'destination', title: 'Destination', icon: <Database className="h-4 w-4" /> },
    { id: 'review', title: 'Review', icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  useEffect(() => {
    document.title = "Jade | New Workflow";
    const initialExpanded = {};
    parameterSections.forEach(section => {
      initialExpanded[section.name] = true;
    });
    setExpandedSections(initialExpanded);
  }, [parameterSections]);

  useEffect(() => {
    if (isScrolledIntoView && sectionRefs[steps[currentStep - 1].id]?.current) {
      sectionRefs[steps[currentStep - 1].id].current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentStep, isScrolledIntoView]);

  const handleFileUpload = useCallback(
    async (file) => {
      if (!workflowName) {
        setUploadError('Please enter a workflow name');
        return;
      }
      if (!workflowDescription) {
        setUploadError('Please enter a workflow description');
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        if (!skipFileUpload && file) {
          formData.append('file', file);
        }
        formData.append('name', workflowName);
        formData.append('description', workflowDescription);
        formData.append('created_by', userId);
        formData.append('status', 'Draft');
        formData.append('skip_structure', skipFileUpload);

        const response = await api.post('/workflows/workflow/new', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const { workflow, file_info } = response.data;
        setDagPath(workflow.dag_path || '');
        setWorkflowId(workflow.id);

        if (!skipFileUpload && file_info) {
          const structure = Object.entries(file_info.schema).map(([column, typeInfo]) => ({
            column,
            detectedType: typeInfo.type,
            type: typeInfo.type,
            format: typeInfo.format || 'none',
            samples: file_info.preview.slice(0, 3).map((row) => row[column]),
          }));
          setParsedFileStructure(structure);
        }

        setIsFileUploaded(true);
        setUploadError(null);
        setCurrentStep(3);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError(error.response?.data?.detail || error.message);
        setIsFileUploaded(false);
      } finally {
        setIsUploading(false);
      }
    },
    [workflowName, workflowDescription, userId, skipFileUpload]
  );

  const handleSaveWorkflow = async () => {
    if (!workflowName) {
      setUploadError('Workflow name is required');
      return;
    }
    if (!workflowDescription) {
      setUploadError('Workflow description is required');
      return;
    }
    if (currentStep === 7 && destinationType === 'database' && (!databaseConfig.connectionId || !databaseConfig.schema || !databaseConfig.tableName)) {
      setUploadError('Please complete all database configuration fields');
      return;
    }
    if (currentStep === 7 && destinationType === 'api' && (!apiConfig.endpoint || !apiConfig.authToken)) {
      setUploadError('Please complete all API configuration fields');
      return;
    }

    try {
      const response = await api.post('/workflows/workflow/update', {
        workflow_id: workflowId,
        name: workflowName,
        description: workflowDescription,
        created_by: parseInt(userId),
        status: 'Draft',
        parameters: parameterSections.flatMap(section => section.parameters.map(param => ({
          ...param,
          section: section.name
        }))),
        destination: destinationType,
        destination_config: destinationType === 'database' ? databaseConfig : destinationType === 'api' ? apiConfig : null,
        skip_structure: skipFileUpload,
        dag_path: dagPath,
      });

      setSuccessMessage('Workflow saved successfully!');
      setTimeout(() => {
        setCurrentStep(1);
        setWorkflowName('');
        setWorkflowDescription('');
        setParsedFileStructure([]);
        setIsFileUploaded(false);
        setParameterSections([]);
        setWorkflowId(null);
        setDestinationType('csv');
        setDatabaseConfig({ connectionId: '', schema: '', tableName: '', createIfNotExists: false });
        setApiConfig({ endpoint: '', authToken: '' });
        setDagPath('');
        setSuccessMessage(null);
        setSkipFileUpload(false);
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setUploadError(error.response?.data?.detail || error.message);
    }
  };

  const handleTypeChange = (column, newType) => {
    setParsedFileStructure((prev) =>
      prev.map((col) => (col.column === column ? { ...col, type: newType } : col))
    );
  };

  const handleAddSection = () => {
    setParameterSections((prev) => [...prev, {
      name: '',
      parameters: [{ name: '', type: 'text', description: '', mandatory: false, options: [] }]
    }]);
  };

  const handleSectionNameChange = (sectionIndex, value) => {
    setParameterSections((prev) => {
      const newSections = [...prev];
      newSections[sectionIndex] = { ...newSections[sectionIndex], name: value };
      return newSections;
    });
  };

  const handleAddParameter = (sectionIndex) => {
    setParameterSections((prev) => {
      const newSections = [...prev];
      newSections[sectionIndex].parameters.push({
        name: '',
        type: 'text',
        description: '',
        mandatory: false,
        options: []
      });
      return newSections;
    });
  };

  const handleParameterChange = (sectionIndex, paramIndex, field, value) => {
    setParameterSections((prev) => {
      const newSections = [...prev];
      newSections[sectionIndex].parameters[paramIndex] = {
        ...newSections[sectionIndex].parameters[paramIndex],
        [field]: value
      };
      return newSections;
    });
  };

  const handleAddOption = (sectionIndex, paramIndex) => {
    setParameterSections((prev) => {
      const newSections = [...prev];
      const parameters = [...newSections[sectionIndex].parameters];
      parameters[paramIndex] = {
        ...parameters[paramIndex],
        options: [...(parameters[paramIndex].options || []), { label: '', value: '' }]
      };
      newSections[sectionIndex].parameters = parameters;
      return newSections;
    });
  };

  const handleOptionChange = (sectionIndex, paramIndex, optionIndex, field, value) => {
    setParameterSections((prev) => {
      const newSections = [...prev];
      const parameters = [...newSections[sectionIndex].parameters];
      const options = [...parameters[paramIndex].options];
      options[optionIndex] = { ...options[optionIndex], [field]: value };
      parameters[paramIndex] = { ...parameters[paramIndex], options };
      newSections[sectionIndex].parameters = parameters;
      return newSections;
    });
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!workflowName.trim()) {
          setUploadError('Please enter a workflow name');
          return false;
        }
        if (!workflowDescription.trim()) {
          setUploadError('Please enter a workflow description');
          return false;
        }
        break;
      case 2:
        if (!skipFileUpload && !isFileUploaded) {
          setUploadError('Please upload a file or skip file upload');
          return false;
        }
        break;
      case 4:
        for (const section of parameterSections) {
          if (!section.name.trim()) {
            setUploadError('All sections must have a name');
            return false;
          }
          for (const param of section.parameters) {
            if (!param.name.trim()) {
              setUploadError('All parameters must have a name');
              return false;
            }
            if (param.type === 'select' && (!param.options || param.options.length === 0)) {
              setUploadError('Select parameters must have at least one option');
              return false;
            }
          }
        }
        break;
      case 5:
        if (!dagPath || !workflowId) {
          setUploadError('DAG path and workflow ID are required');
          return false;
        }
        break;
      case 6:
        if (destinationType === 'database' && (!databaseConfig.connectionId || !databaseConfig.schema || !databaseConfig.tableName)) {
          setUploadError('Please complete all database configuration fields');
          return false;
        }
        if (destinationType === 'api' && (!apiConfig.endpoint || !apiConfig.authToken)) {
          setUploadError('Please complete all API configuration fields');
          return false;
        }
        break;
      case 7:
        if (!workflowName.trim() || !workflowDescription.trim() || (!skipFileUpload && !isFileUploaded)) {
          setUploadError('Please complete all required fields');
          return false;
        }
        break;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    if (currentStep === steps.length) {
      handleSaveWorkflow();
    } else {
      setCurrentStep(currentStep + 1);
      setUploadError('');
      setIsScrolledIntoView(true);
    }
  };

  const handleJumpLinkClick = (sectionId) => {
    const currentIndex = steps.findIndex(step => step.id === steps[currentStep - 1].id);
    const targetIndex = steps.findIndex(step => step.id === sectionId);
    if (targetIndex <= currentIndex) {
      setCurrentStep(targetIndex + 1);
      setIsScrolledIntoView(true);
    }
  };

  if (isUploading || successMessage) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <GridLoader color="#0065bd" size={17.5} margin={7.5} />
          {successMessage && (
            <p className="mt-4 text-sm text-gray-700">{successMessage}</p>
          )}
        </div>
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

        input, select, textarea {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          border: 1px solid var(--sg-gray-border);
          border-radius: var(--radius);
          padding: var(--sg-space-sm) var(--sg-space-md);
          transition: all 0.2s ease-in-out;
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--sg-blue);
          box-shadow: 0 0 0 2px var(--sg-blue-light);
        }

        textarea {
          resize: vertical;
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
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-[#d9eeff] underline hover:no-underline transition-colors duration-200"
              >
                Workflows
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">New Workflow</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title">
            New Workflow
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Create a new workflow by defining its details, inputs, parameters, and destination
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
                {steps.map((step, index) => (
                  <li key={step.id} className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick(step.id)}
                      disabled={index > currentStep - 1}
                      className={`sg-contents-link w-full text-left flex items-center gap-2 ${
                        currentStep === index + 1
                          ? 'sg-contents-link-active'
                          : index < currentStep
                            ? ''
                            : 'sg-contents-link-disabled'
                      }`}
                    >
                      {step.icon}
                      {step.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="w-3/4 space-y-8">
          <section
            id="workflow-details"
            ref={sectionRefs['workflow-details']}
            className={`sg-dataset-tile ${currentStep !== 1 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <FileInput className="h-5 w-5 text-[#0065bd]" />
                Workflow Details
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Enter the basic details for the new workflow
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Workflow Name</label>
                <div className="relative">
                  <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="e.g., Monthly Sales Report"
                    className="w-full pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                <div className="relative">
                  <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    placeholder="e.g., Processes monthly sales data for reporting"
                    className="w-full pl-10 min-h-[100px]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">User ID</label>
                <div className="relative">
                  <FileInput className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., 1001"
                    className="w-full pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="input-file"
            ref={sectionRefs['input-file']}
            className={`sg-dataset-tile ${currentStep !== 2 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <File className="h-5 w-5 text-[#0065bd]" />
                Input File
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Upload an input file or skip for flexible structure
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <div className="sg-dataset-tile p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <input
                      type="checkbox"
                      id="skipFileUpload"
                      checked={skipFileUpload}
                      onChange={(e) => setSkipFileUpload(e.target.checked)}
                      className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd]"
                    />
                    <FileX className="h-4 w-4 text-gray-500" />
                    No fixed file structure (skip file upload)
                  </label>
                </div>
                {!skipFileUpload && (
                  <div className="sg-dataset-tile p-6 text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.json"
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      disabled={isUploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`block text-sm font-medium ${uploadError ? 'text-red-600' : 'text-gray-600'} cursor-pointer`}
                    >
                      {isUploading ? 'Uploading...' : 'Click to upload or drag and drop (CSV, XLSX, JSON)'}
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextStep}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="structure-preview"
            ref={sectionRefs['structure-preview']}
            className={`sg-dataset-tile ${currentStep !== 3 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <File className="h-5 w-5 text-[#0065bd]" />
                Structure Preview
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Review and adjust the file structure
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">File Structure Preview</label>
                {skipFileUpload ? (
                  <div className="sg-dataset-tile p-6 text-center">
                    <FileX className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="sg-dataset-title mt-2">No file structure preview</h3>
                    <p className="text-sm text-gray-600 mt-1">This workflow doesn't require a fixed file structure.</p>
                  </div>
                ) : parsedFileStructure.length > 0 ? (
                  <div className="sg-table">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="px-4 py-2">Column</th>
                          <th className="px-4 py-2">Type</th>
                          <th className="px-4 py-2">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedFileStructure.map((col) => (
                          <tr key={col.column}>
                            <td className="px-4 py-2 truncate">{col.column}</td>
                            <td className="px-4 py-2">
                              <select
                                value={col.type}
                                onChange={(e) => handleTypeChange(col.column, e.target.value)}
                                className="w-full"
                              >
                                <option value="string">String</option>
                                <option value="integer">Integer</option>
                                <option value="float">Float</option>
                                <option value="boolean">Boolean</option>
                                <option value="date">Date</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 truncate">{col.samples?.join(', ') || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="sg-dataset-tile p-6 text-center">
                    <File className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="sg-dataset-title mt-2">No file uploaded</h3>
                    <p className="text-sm text-gray-600 mt-1">Upload a file to preview its structure.</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(2);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="parameters"
            ref={sectionRefs['parameters']}
            className={`sg-dataset-tile ${currentStep !== 4 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-[#0065bd]" />
                Parameters
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Define parameters for the workflow
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Workflow Parameters</label>
                {parameterSections.length === 0 ? (
                  <div className="sg-dataset-tile p-6 text-center">
                    <Settings2 className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="sg-dataset-title mt-2">No parameters configured</h3>
                    <p className="text-sm text-gray-600 mt-1">Add a section to start configuring parameters.</p>
                  </div>
                ) : (
                  parameterSections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="sg-dataset-tile">
                      <button
                        className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        onClick={() => toggleSection(section.name || `Section ${sectionIndex + 1}`)}
                      >
                        <h5 className="text-sm font-medium text-gray-900">
                          {section.name || `Section ${sectionIndex + 1}`}
                        </h5>
                        {expandedSections[section.name || `Section ${sectionIndex + 1}`] ? (
                          <ChevronUp className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                      {expandedSections[section.name || `Section ${sectionIndex + 1}`] && (
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Section Name</label>
                            <div className="relative">
                              <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                              <input
                                type="text"
                                value={section.name}
                                onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                                placeholder="e.g., Report Metadata"
                                className="w-full pl-10"
                              />
                            </div>
                          </div>
                          {section.parameters.map((param, paramIndex) => (
                            <div key={paramIndex} className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-2">Name</label>
                                  <div className="relative">
                                    <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <input
                                      type="text"
                                      value={param.name}
                                      onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'name', e.target.value)}
                                      placeholder="e.g., Report Type"
                                      className="w-full pl-10"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-2">Type</label>
                                  <div className="relative">
                                    <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <select
                                      value={param.type}
                                      onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'type', e.target.value)}
                                      className="w-full pl-10"
                                    >
                                      <option value="text">Text</option>
                                      <option value="textbox">Textbox</option>
                                      <option value="numeric">Numeric</option>
                                      <option value="integer">Integer</option>
                                      <option value="date">Date</option>
                                      <option value="select">Select</option>
                                    </select>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                                  <div className="relative">
                                    <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                    <input
                                      type="text"
                                      value={param.description}
                                      onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'description', e.target.value)}
                                      placeholder="e.g., Type of the report"
                                      className="w-full pl-10"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center mt-6">
                                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                    <input
                                      type="checkbox"
                                      checked={param.mandatory}
                                      onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'mandatory', e.target.checked)}
                                      className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd]"
                                    />
                                    Required
                                  </label>
                                </div>
                              </div>
                              {param.type === 'select' && (
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-900">Options</label>
                                  {param.options?.map((option, optIndex) => (
                                    <div key={optIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <div className="relative">
                                          <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                          <input
                                            type="text"
                                            value={option.label}
                                            onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'label', e.target.value)}
                                            placeholder="Option label"
                                            className="w-full pl-10"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <div className="relative">
                                          <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                          <input
                                            type="text"
                                            value={option.value}
                                            onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'value', e.target.value)}
                                            placeholder="Option value"
                                            className="w-full pl-10"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => handleAddOption(sectionIndex, paramIndex)}
                                    className="text-sm text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline"
                                  >
                                    Add Option
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddParameter(sectionIndex)}
                            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
                          >
                            Add Parameter
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <button
                  onClick={handleAddSection}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
                >
                  Add Section
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(3);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="dag-configuration"
            ref={sectionRefs['dag-configuration']}
            className={`sg-dataset-tile ${currentStep !== 5 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-[#0065bd]" />
                DAG Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure the DAG location in GitHub
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">DAG Configuration</label>
                <div className="sg-dataset-tile">
                  <p className="text-sm text-gray-600 mb-2">
                    A default DAG will be created in the GitHub repository at:
                  </p>
                  <p className="text-sm font-medium text-gray-900">{dagPath || 'Path will be generated after file upload'}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    The DAG will be stored in <code>dags/workflow_job_{workflowId || 'ID'}.py</code> in the repository
                    <code>seanjnugent/DataWorkflowTool-Workflows</code>. You can edit the DAG code directly in GitHub after creation.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(4);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="destination"
            ref={sectionRefs['destination']}
            className={`sg-dataset-tile ${currentStep !== 6 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Database className="h-5 w-5 text-[#0065bd]" />
                Destination
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure the output destination
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Output Destination</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setDestinationType('csv')}
                    className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                      destinationType === 'csv' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                    <span className="text-sm font-medium text-gray-900">CSV File</span>
                  </div>
                  <div
                    onClick={() => setDestinationType('database')}
                    className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                      destinationType === 'database' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                    }`}
                  >
                    <Database className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                    <span className="text-sm font-medium text-gray-900">Database</span>
                  </div>
                  <div
                    onClick={() => setDestinationType('api')}
                    className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                      destinationType === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                    }`}
                  >
                    <Waypoints className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                    <span className="text-sm font-medium text-gray-900">API</span>
                  </div>
                </div>
                {destinationType === 'database' && (
                  <div className="sg-dataset-tile mt-4 space-y-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">Database Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Database Connection</label>
                      <div className="relative">
                        <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <select
                          value={databaseConfig.connectionId}
                          onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, connectionId: e.target.value }))}
                          className="w-full pl-10"
                        >
                          <option value="">Select a connection</option>
                          {DATABASE_CONNECTIONS.map((conn) => (
                            <option key={conn.id} value={conn.id}>{conn.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Schema</label>
                      <div className="relative">
                        <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          value={databaseConfig.schema}
                          onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, schema: e.target.value }))}
                          placeholder="e.g., public"
                          className="w-full pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Table Name</label>
                      <div className="relative">
                        <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          value={databaseConfig.tableName}
                          onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, tableName: e.target.value }))}
                          placeholder="e.g., sales_data"
                          className="w-full pl-10"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <input
                        type="checkbox"
                        checked={databaseConfig.createIfNotExists}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, createIfNotExists: e.target.checked }))}
                        className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd]"
                      />
                      Create table if it doesn't exist
                    </label>
                    <p className="text-sm text-gray-600">Note: If the table exists, records will be appended.</p>
                  </div>
                )}
                {destinationType === 'api' && (
                  <div className="sg-dataset-tile mt-4 space-y-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">API Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">API Endpoint</label>
                      <div className="relative">
                        <Waypoints className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          value={apiConfig.endpoint}
                          onChange={(e) => setApiConfig((prev) => ({ ...prev, endpoint: e.target.value }))}
                          placeholder="e.g., https://api.example.com/endpoint"
                          className="w-full pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Authorization Token</label>
                      <div className="relative">
                        <Waypoints className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="text"
                          value={apiConfig.authToken}
                          onChange={(e) => setApiConfig((prev) => ({ ...prev, authToken: e.target.value }))}
                          placeholder="e.g., Bearer xyz123..."
                          className="w-full pl-10"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(5);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleNextStep}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>

          <section
            id="review"
            ref={sectionRefs['review']}
            className={`sg-dataset-tile ${currentStep !== 7 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#0065bd]" />
                Review
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Review your workflow configuration
            </p>
            {uploadError && (
              <div className="sg-error mb-6">
                <div className="flex justify-between items-center">
                  <span className="sg-error-text">{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-6">
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Workflow Name</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {workflowName || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('workflow-details')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Description</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {workflowDescription || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('workflow-details')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">User ID</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {userId || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('workflow-details')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Input File</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {skipFileUpload ? 'Skipped (no fixed structure)' : isFileUploaded ? 'File uploaded' : <span className="text-red-600 font-medium">No file uploaded</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('input-file')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Parameters</h3>
                    <div className="mt-4 space-y-5">
                      {parameterSections.length === 0 ? (
                        <p className="text-base text-gray-700 mt-1">No parameters set</p>
                      ) : (
                        parameterSections.map((section, sectionIndex) => (
                          <div key={sectionIndex}>
                            <h4 className="text-md font-medium text-gray-800 mb-2 border-b border-gray-200 pb-1">
                              {section.name || `Section ${sectionIndex + 1}`}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                              {section.parameters.map((param, paramIndex) => (
                                <div key={paramIndex}>
                                  <p className="text-sm font-medium text-gray-600">{param.description || param.name}</p>
                                  <p className="text-base text-gray-800 mt-0.5">
                                    {param.name} ({param.type}, {param.mandatory ? 'Required' : 'Optional'})
                                    {param.type === 'select' && param.options?.length > 0 && (
                                      <span> [Options: {param.options.map(opt => `${opt.label} (${opt.value})`).join(', ')}]</span>
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
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
                    <h3 className="sg-dataset-title">DAG Path</h3>
                    <p className="text-base text-gray-700 mt-1">
                      {dagPath || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('dag-configuration')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">Output Destination</h3>
                    <p className="text-base text-gray-700 mt-1 capitalize">{destinationType}</p>
                    {destinationType === 'database' && (
                      <div className="space-y-2 mt-2">
                        <p className="text-base text-gray-700">
                          Connection: {DATABASE_CONNECTIONS.find((conn) => conn.id === databaseConfig.connectionId)?.name || <span className="text-red-600 font-medium">Not set</span>}
                        </p>
                        <p className="text-base text-gray-700">
                          Schema: {databaseConfig.schema || <span className="text-red-600 font-medium">Not set</span>}
                        </p>
                        <p className="text-base text-gray-700">
                          Table: {databaseConfig.tableName || <span className="text-red-600 font-medium">Not set</span>}
                        </p>
                        <p className="text-base text-gray-700">
                          Create if not exists: {databaseConfig.createIfNotExists ? 'Yes' : 'No'}
                        </p>
                      </div>
                    )}
                    {destinationType === 'api' && (
                      <div className="space-y-2 mt-2">
                        <p className="text-base text-gray-700">
                          Endpoint: {apiConfig.endpoint || <span className="text-red-600 font-medium">Not set</span>}
                        </p>
                        <p className="text-base text-gray-700">
                          Token: {apiConfig.authToken ? 'Set' : <span className="text-red-600 font-medium">Not set</span>}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('destination')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => {
                  setCurrentStep(6);
                  setUploadError('');
                  setIsScrolledIntoView(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={isUploading}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
                  isUploading
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#0065bd] hover:bg-[#004a9f]'
                }`}
              >
                {isUploading ? (
                  <div className="h-5 w-5 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  'Save Workflow'
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NewWorkflow;