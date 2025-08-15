import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileInput, File, Settings2, Database, Waypoints, FileSpreadsheet, FileX, CheckCircle2, GitBranch, ChevronRight, X, ChevronDown, ChevronUp, Upload, Link, Plus, Trash2 } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import axios from 'axios';
import { generateDAGTemplate, generateConfigTemplate } from '../components/dagTemplateGenerator';

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
  
  // Source configuration
  const [sourceType, setSourceType] = useState('file');
  const [sourceConfig, setSourceConfig] = useState({
    file: { supportedTypes: ['csv', 'xlsx', 'json'] },
    api: { endpoint: '', authToken: '', method: 'GET' },
    database: { connectionId: '', query: '' }
  });
  
  // Destination configuration
  const [destinationOutputs, setDestinationOutputs] = useState([
    { 
      id: 1, 
      name: 'output', 
      type: 'csv', 
      config: {
        csv: { filename: 'output.csv', path: 'outputs/' },
        api: { endpoint: '', authToken: '', method: 'POST' },
        database: { connectionId: '', schema: '', tableName: '', createIfNotExists: false }
      }
    }
  ]);
  
  const [dagPath, setDagPath] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [isScrolledIntoView, setIsScrolledIntoView] = useState(false);

  const sectionRefs = {
    'workflow-details': useRef(null),
    'source-configuration': useRef(null),
    'structure-preview': useRef(null),
    'parameters': useRef(null),
    'destination-configuration': useRef(null),
    'dag-configuration': useRef(null),
    'review': useRef(null),
  };

  const steps = [
    { id: 'workflow-details', title: 'Workflow Details', icon: <FileInput className="h-4 w-4" /> },
    { id: 'source-configuration', title: 'Source Configuration', icon: <Upload className="h-4 w-4" /> },
    { id: 'structure-preview', title: 'Structure Preview', icon: <File className="h-4 w-4" /> },
    { id: 'parameters', title: 'Parameters', icon: <Settings2 className="h-4 w-4" /> },
    { id: 'destination-configuration', title: 'Destination Configuration', icon: <Database className="h-4 w-4" /> },
    { id: 'dag-configuration', title: 'DAG Configuration', icon: <GitBranch className="h-4 w-4" /> },
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
        setUploadError('Please enter a workflow name first');
        return;
      }
      if (!workflowDescription) {
        setUploadError('Please enter a workflow description first');
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', workflowName);
        formData.append('description', workflowDescription);
        formData.append('created_by', userId);
        formData.append('status', 'Draft');

        const response = await api.post('/workflows/workflow/new', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const { workflow, file_info } = response.data;
        setWorkflowId(workflow.id);

        if (file_info) {
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
    [workflowName, workflowDescription, userId]
  );

  const generateDagTemplate = () => {
    const workflowConfig = {
      workflowId,
      workflowName,
      sourceType,
      sourceConfig: sourceConfig[sourceType],
      destinationType: destinationOutputs[0]?.type || 'csv',
      destinationConfig: destinationOutputs[0]?.config || {},
      parameters: parameterSections
    };

    return generateDAGTemplate(workflowConfig);
  };

  const generateWorkflowConfig = () => {
    const workflowConfig = {
      workflowId,
      workflowName,
      sourceType,
      sourceConfig: sourceConfig[sourceType],
      destinationType: destinationOutputs[0]?.type || 'csv',
      destinationConfig: destinationOutputs[0]?.config || {},
      parameters: parameterSections
    };

    return generateConfigTemplate(workflowConfig);
  };

  const handleSaveWorkflow = async () => {
    if (!workflowName) {
      setUploadError('Workflow name is required');
      return;
    }
    if (!workflowDescription) {
      setUploadError('Workflow description is required');
      return;
    }

    try {
      const configTemplate = generateWorkflowConfig();
      const dagTemplate = generateDagTemplate();

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
        source_type: sourceType,
        source_config: sourceConfig[sourceType],
        destination_outputs: destinationOutputs,
        dag_path: dagPath,
        config_template: configTemplate,
        dag_template: dagTemplate
      });

      setSuccessMessage('Workflow saved successfully!');
      setTimeout(() => {
        navigate('/workflows');
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

  const handleAddDestination = () => {
    const newId = Math.max(...destinationOutputs.map(d => d.id)) + 1;
    setDestinationOutputs(prev => [...prev, {
      id: newId,
      name: `output_${newId}`,
      type: 'csv',
      config: {
        csv: { filename: `output_${newId}.csv`, path: 'outputs/' },
        api: { endpoint: '', authToken: '', method: 'POST' },
        database: { connectionId: '', schema: '', tableName: '', createIfNotExists: false }
      }
    }]);
  };

  const handleRemoveDestination = (id) => {
    if (destinationOutputs.length > 1) {
      setDestinationOutputs(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleDestinationChange = (id, field, value) => {
    setDestinationOutputs(prev => prev.map(dest => 
      dest.id === id ? { ...dest, [field]: value } : dest
    ));
  };

  const handleDestinationConfigChange = (id, configType, field, value) => {
    setDestinationOutputs(prev => prev.map(dest => 
      dest.id === id ? {
        ...dest,
        config: {
          ...dest.config,
          [configType]: {
            ...dest.config[configType],
            [field]: value
          }
        }
      } : dest
    ));
  };

  const handleSourceConfigChange = (field, value) => {
    setSourceConfig(prev => ({
      ...prev,
      [sourceType]: {
        ...prev[sourceType],
        [field]: value
      }
    }));
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
        if (sourceType === 'file' && !isFileUploaded) {
          setUploadError('Please upload a file or choose a different source type');
          return false;
        }
        if (sourceType === 'api' && !sourceConfig.api.endpoint.trim()) {
          setUploadError('Please enter an API endpoint');
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
        for (const dest of destinationOutputs) {
          if (!dest.name.trim()) {
            setUploadError('All destinations must have a name');
            return false;
          }
          if (dest.type === 'api' && !dest.config.api.endpoint.trim()) {
            setUploadError('Please complete API endpoint configuration');
            return false;
          }
          if (dest.type === 'database' && (!dest.config.database.connectionId || !dest.config.database.schema || !dest.config.database.tableName)) {
            setUploadError('Please complete database configuration');
            return false;
          }
        }
        break;
      case 6:
        if (!workflowId) {
          setUploadError('Workflow must be created before generating DAG');
          return false;
        }
        break;
    }
    setUploadError('');
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
              Create a new workflow by defining its details, source, parameters, and destinations
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
          {/* Workflow Details */}
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

          {/* Source Configuration */}
          <section
            id="source-configuration"
            ref={sectionRefs['source-configuration']}
            className={`sg-dataset-tile ${currentStep !== 2 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#0065bd]" />
                Source Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure the data source for your workflow
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Source Type</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div
                    onClick={() => setSourceType('file')}
                    className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                      sourceType === 'file' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                    }`}
                  >
                    <File className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                    <span className="text-sm font-medium text-gray-900">File Upload</span>
                  </div>
                  <div
                    onClick={() => setSourceType('api')}
                    className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                      sourceType === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                    }`}
                  >
                    <Link className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                    <span className="text-sm font-medium text-gray-900">API Endpoint</span>
                  </div>
                  <div
                    className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed"
                  >
                    <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
                    <span className="text-sm font-medium text-gray-400">Database (Coming Soon)</span>
                  </div>
                </div>
              </div>

              {sourceType === 'file' && (
                <div className="sg-dataset-tile p-6">
                  <h3 className="text-lg font-medium mb-4">File Upload Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Upload File</label>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.json"
                        onChange={(e) => handleFileUpload(e.target.files[0])}
                        disabled={isUploading}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      <p className="text-sm text-gray-600 mt-1">Supported formats: CSV, XLSX, JSON</p>
                    </div>
                    {isFileUploaded && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">✓ File uploaded successfully</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sourceType === 'api' && (
                <div className="sg-dataset-tile p-6">
                  <h3 className="text-lg font-medium mb-4">API Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">API Endpoint</label>
                      <input
                        type="url"
                        value={sourceConfig.api.endpoint}
                        onChange={(e) => handleSourceConfigChange('endpoint', e.target.value)}
                        placeholder="https://api.example.com/data"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Authorization Token (Optional)</label>
                      <input
                        type="password"
                        value={sourceConfig.api.authToken}
                        onChange={(e) => handleSourceConfigChange('authToken', e.target.value)}
                        placeholder="Bearer token or API key"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">HTTP Method</label>
                      <select
                        value={sourceConfig.api.method}
                        onChange={(e) => handleSourceConfigChange('method', e.target.value)}
                        className="w-full"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
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

          {/* Structure Preview */}
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
              Review and adjust the data structure
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Data Structure Preview</label>
                {sourceType === 'file' && parsedFileStructure.length > 0 ? (
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
                    {sourceType === 'api' ? (
                      <>
                        <Link className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="sg-dataset-title mt-2">API Data Structure</h3>
                        <p className="text-sm text-gray-600 mt-1">Data structure will be determined at runtime from the API response.</p>
                      </>
                    ) : (
                      <>
                        <File className="mx-auto h-8 w-8 text-gray-400" />
                        <h3 className="sg-dataset-title mt-2">No file uploaded</h3>
                        <p className="text-sm text-gray-600 mt-1">Upload a file to preview its structure.</p>
                      </>
                    )}
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

          {/* Parameters */}
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

          {/* Destination Configuration */}
          <section
            id="destination-configuration"
            ref={sectionRefs['destination-configuration']}
            className={`sg-dataset-tile ${currentStep !== 5 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <Database className="h-5 w-5 text-[#0065bd]" />
                Destination Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Configure output destinations for your workflow
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
              {destinationOutputs.map((destination, index) => (
                <div key={destination.id} className="sg-dataset-tile p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Output {index + 1}</h3>
                    {destinationOutputs.length > 1 && (
                      <button
                        onClick={() => handleRemoveDestination(destination.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Output Name</label>
                      <input
                        type="text"
                        value={destination.name}
                        onChange={(e) => handleDestinationChange(destination.id, 'name', e.target.value)}
                        placeholder="e.g., processed_data"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Destination Type</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                          onClick={() => handleDestinationChange(destination.id, 'type', 'csv')}
                          className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                            destination.type === 'csv' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                          }`}
                        >
                          <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                          <span className="text-sm font-medium text-gray-900">CSV File</span>
                        </div>
                        <div
                          onClick={() => handleDestinationChange(destination.id, 'type', 'api')}
                          className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                            destination.type === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                          }`}
                        >
                          <Waypoints className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                          <span className="text-sm font-medium text-gray-900">API Endpoint</span>
                        </div>
                        <div
                          className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed"
                        >
                          <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
                          <span className="text-sm font-medium text-gray-400">Database (Coming Soon)</span>
                        </div>
                      </div>
                    </div>

                    {destination.type === 'csv' && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded">
                        <h4 className="font-medium">CSV Configuration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Filename</label>
                            <input
                              type="text"
                              value={destination.config.csv.filename}
                              onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'filename', e.target.value)}
                              placeholder="output.csv"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Path</label>
                            <input
                              type="text"
                              value={destination.config.csv.path}
                              onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'path', e.target.value)}
                              placeholder="outputs/"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {destination.type === 'api' && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded">
                        <h4 className="font-medium">API Configuration</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">API Endpoint</label>
                            <input
                              type="url"
                              value={destination.config.api.endpoint}
                              onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'endpoint', e.target.value)}
                              placeholder="https://api.example.com/data"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Authorization Token</label>
                            <input
                              type="password"
                              value={destination.config.api.authToken}
                              onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'authToken', e.target.value)}
                              placeholder="Bearer token or API key"
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">HTTP Method</label>
                            <select
                              value={destination.config.api.method}
                              onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'method', e.target.value)}
                              className="w-full"
                            >
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                              <option value="PATCH">PATCH</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                onClick={handleAddDestination}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0065bd] border border-[#0065bd] rounded hover:bg-[#0065bd] hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Output Destination
              </button>
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

          {/* DAG Configuration */}
          <section
            id="dag-configuration"
            ref={sectionRefs['dag-configuration']}
            className={`sg-dataset-tile ${currentStep !== 6 ? 'sg-hidden' : ''}`}
          >
            <div className="sg-section-separator">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-[#0065bd]" />
                DAG Configuration
              </h2>
            </div>
            <p className="sg-dataset-description mb-6">
              Review the generated DAG configuration
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
                <h3 className="text-lg font-medium mb-4">DAG Template Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  A DAG template will be generated based on your configuration. The workflow will include:
                </p>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                  <li><strong>Source Operation:</strong> {sourceType === 'file' ? 'Load data from uploaded file' : sourceType === 'api' ? 'Fetch data from API endpoint' : 'Load data from database'}</li>
                  <li><strong>Processing Operation:</strong> Transform and process the data with your defined parameters</li>
                  <li><strong>Output Operations:</strong> Save results to {destinationOutputs.length} destination{destinationOutputs.length > 1 ? 's' : ''}</li>
                </ul>
                
                {workflowId && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      ✓ DAG will be created at: <code>dags/workflow_job_{workflowId}.py</code>
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Repository: <code>seanjnugent/DataWorkflowTool-Workflows</code>
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Configuration Summary:</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div><strong>Source:</strong> {sourceType}</div>
                    <div><strong>Parameters:</strong> {parameterSections.length} section{parameterSections.length !== 1 ? 's' : ''}</div>
                    <div><strong>Outputs:</strong> {destinationOutputs.map(d => `${d.name} (${d.type})`).join(', ')}</div>
                  </div>
                </div>
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

          {/* Review */}
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
              Review your workflow configuration before saving
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
                    <h3 className="sg-dataset-title">Workflow Details</h3>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Name:</strong> {workflowName || <span className="text-red-600 font-medium">Not set</span>}
                    </p>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Description:</strong> {workflowDescription || <span className="text-red-600 font-medium">Not set</span>}
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
                    <h3 className="sg-dataset-title">Source Configuration</h3>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Type:</strong> {sourceType}
                    </p>
                    {sourceType === 'file' && (
                      <p className="text-base text-gray-700 mt-1">
                        <strong>Status:</strong> {isFileUploaded ? 'File uploaded' : <span className="text-red-600 font-medium">No file uploaded</span>}
                      </p>
                    )}
                    {sourceType === 'api' && (
                      <p className="text-base text-gray-700 mt-1">
                        <strong>Endpoint:</strong> {sourceConfig.api.endpoint || <span className="text-red-600 font-medium">Not set</span>}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('source-configuration')}
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
                    {parameterSections.length === 0 ? (
                      <p className="text-base text-gray-700 mt-1">No parameters configured</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {parameterSections.map((section, index) => (
                          <div key={index}>
                            <p className="text-sm font-medium text-gray-800">{section.name}</p>
                            <p className="text-sm text-gray-600 ml-4">
                              {section.parameters.length} parameter{section.parameters.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
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
                    <h3 className="sg-dataset-title">Destination Configuration</h3>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Number of outputs:</strong> {destinationOutputs.length}
                    </p>
                    <div className="mt-2 space-y-2">
                      {destinationOutputs.map((dest, index) => (
                        <div key={dest.id} className="text-sm">
                          <span className="font-medium">{dest.name}</span> ({dest.type})
                          {dest.type === 'csv' && dest.config.csv.filename && (
                            <span className="text-gray-600 ml-2">→ {dest.config.csv.path}{dest.config.csv.filename}</span>
                          )}
                          {dest.type === 'api' && dest.config.api.endpoint && (
                            <span className="text-gray-600 ml-2">→ {dest.config.api.endpoint}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJumpLinkClick('destination-configuration')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="sg-dataset-tile">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="sg-dataset-title">DAG Configuration</h3>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Template:</strong> Auto-generated based on configuration
                    </p>
                    <p className="text-base text-gray-700 mt-1">
                      <strong>Operations:</strong> Load → Process → Save ({destinationOutputs.length} output{destinationOutputs.length !== 1 ? 's' : ''})
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