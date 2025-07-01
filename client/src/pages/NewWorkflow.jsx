import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileInput, File, Settings2, Database, Waypoints, FileSpreadsheet, FileX, CheckCircle2, GitBranch } from 'lucide-react';
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

  const steps = [
    { id: 1, title: 'Workflow Details', icon: FileInput },
    { id: 2, title: 'Input File', icon: File },
    { id: 3, title: 'Structure Preview', icon: File },
    { id: 4, title: 'Parameters', icon: Settings2 },
    { id: 5, title: 'DAG Configuration', icon: GitBranch },
    { id: 6, title: 'Destination', icon: Database },
    { id: 7, title: 'Review', icon: CheckCircle2 },
  ];

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
    }
  };

  if (isUploading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <GridLoader color="#1e3a8a" size={15} margin={2} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border border-gray-300 p-6 flex flex-col items-center">
            <GridLoader color="#1e3a8a" size={15} margin={2} />
            <p className="mt-4 text-gray-700 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/workflows')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Workflows
            </button>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900">{steps[currentStep - 1].title}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {currentStep === 1 && 'Enter the basic details for the new workflow'}
              {currentStep === 2 && 'Upload an input file or skip for flexible structure'}
              {currentStep === 3 && 'Review and adjust the file structure'}
              {currentStep === 4 && 'Define parameters for the workflow'}
              {currentStep === 5 && 'Configure the DAG location in GitHub'}
              {currentStep === 6 && 'Configure the output destination'}
              {currentStep === 7 && 'Review your workflow configuration'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="w-full h-1 bg-gray-200">
              <div
                className="h-1 bg-blue-900"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={`font-medium ${currentStep > index ? 'text-blue-900' : ''}`}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          {uploadError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 flex justify-between items-center">
              <span className="text-red-700 text-sm">{uploadError}</span>
              <button onClick={() => setUploadError('')} className="text-red-700 hover:text-red-900">
                ✕
              </button>
            </div>
          )}

          <div className="space-y-6">
            {currentStep === 1 && (
              <div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="e.g., Monthly Sales Report"
                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    placeholder="e.g., Processes monthly sales data for reporting"
                    className="w-full h-24 p-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">User ID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., 1001"
                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="flex items-center gap-3 mb-4 p-4 bg-blue-50 border border-blue-200">
                  <input
                    type="checkbox"
                    id="skipFileUpload"
                    checked={skipFileUpload}
                    onChange={(e) => setSkipFileUpload(e.target.checked)}
                    className="h-4 w-4 border-gray-300 text-blue-900 focus:ring-blue-900"
                  />
                  <label htmlFor="skipFileUpload" className="flex items-center gap-2 text-gray-700 text-sm">
                    <FileX className="w-4 h-4 text-gray-500" />
                    No fixed file structure (skip file upload)
                  </label>
                </div>
                {!skipFileUpload && (
                  <div className="border border-gray-300 p-6 text-center">
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
            )}

            {currentStep === 3 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">File Structure Preview</label>
                {skipFileUpload ? (
                  <div className="p-6 text-center bg-gray-50 border border-gray-200">
                    <FileX className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-700">No file structure preview</p>
                    <p className="mt-1 text-sm text-gray-600">This workflow doesn't require a fixed file structure.</p>
                  </div>
                ) : parsedFileStructure.length > 0 ? (
                  <div className="border border-gray-300">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Column</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Type</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-900">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedFileStructure.map((col) => (
                          <tr key={col.column}>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{col.column}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <select
                                value={col.type}
                                onChange={(e) => handleTypeChange(col.column, e.target.value)}
                                className="h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                              >
                                <option value="string">String</option>
                                <option value="integer">Integer</option>
                                <option value="float">Float</option>
                                <option value="boolean">Boolean</option>
                                <option value="date">Date</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 truncate">{col.samples?.join(', ') || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-gray-50 border border-gray-200">
                    <File className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-900">No file uploaded</p>
                    <p className="mt-1 text-sm text-gray-600">Upload a file to preview its structure.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Workflow Parameters</label>
                {parameterSections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="p-4 bg-gray-50 border border-gray-200 mb-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Section Name</label>
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                        placeholder="e.g., Report Metadata"
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      />
                    </div>
                    {section.parameters.map((param, paramIndex) => (
                      <div key={paramIndex} className="grid grid-cols-12 gap-4 p-4 bg-white border border-gray-200">
                        <div className="col-span-3">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
                          <input
                            type="text"
                            value={param.name}
                            onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'name', e.target.value)}
                            placeholder="e.g., Report Type"
                            className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Type</label>
                          <select
                            value={param.type}
                            onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'type', e.target.value)}
                            className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                          >
                            <option value="text">Text</option>
                            <option value="textbox">Textbox</option>
                            <option value="numeric">Numeric</option>
                            <option value="integer">Integer</option>
                            <option value="date">Date</option>
                            <option value="select">Select</option>
                          </select>
                        </div>
                        <div className="col-span-4">
                          <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                          <input
                            type="text"
                            value={param.description}
                            onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'description', e.target.value)}
                            placeholder="e.g., Type of the report"
                            className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                          />
                        </div>
                        <div className="col-span-2 flex items-center justify-center mt-6">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={param.mandatory}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'mandatory', e.target.checked)}
                              className="h-4 w-4 border-gray-300 text-blue-900 focus:ring-blue-900"
                            />
                            <span className="text-sm text-gray-900">Req.</span>
                          </label>
                        </div>
                        {param.type === 'select' && (
                          <div className="col-span-12 space-y-2">
                            <label className="block text-sm font-medium text-gray-900">Options</label>
                            {param.options?.map((option, optIndex) => (
                              <div key={optIndex} className="grid grid-cols-12 gap-4">
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'label', e.target.value)}
                                    placeholder="Option label"
                                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                                  />
                                </div>
                                <div className="col-span-5">
                                  <input
                                    type="text"
                                    value={option.value}
                                    onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'value', e.target.value)}
                                    placeholder="Option value"
                                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => handleAddOption(sectionIndex, paramIndex)}
                              className="mt-2 text-sm text-blue-900 hover:underline"
                            >
                              Add Option
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddParameter(sectionIndex)}
                      className="mt-4 px-4 py-2 bg-blue-900 text-white border border-blue-900 hover:bg-blue-800 text-sm font-medium"
                    >
                      Add Parameter
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddSection}
                  className="mt-4 px-4 py-2 bg-blue-900 text-white border border-blue-900 hover:bg-blue-800 text-sm font-medium"
                >
                  Add Section
                </button>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">DAG Configuration</label>
                <div className="p-4 bg-gray-50 border border-gray-200">
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
            )}

            {currentStep === 6 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Output Destination</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setDestinationType('csv')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'csv' ? 'border-blue-900 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm text-gray-900">CSV File</span>
                  </button>
                  <button
                    onClick={() => setDestinationType('database')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'database' ? 'border-blue-900 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Database className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm text-gray-900">Database</span>
                  </button>
                  <button
                    onClick={() => setDestinationType('api')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'api' ? 'border-blue-900 bg-blue-50' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Waypoints className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm text-gray-900">API</span>
                  </button>
                </div>

                {destinationType === 'database' && (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Database Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Database Connection</label>
                      <select
                        value={databaseConfig.connectionId}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, connectionId: e.target.value }))}
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      >
                        <option value="">Select a connection</option>
                        {DATABASE_CONNECTIONS.map((conn) => (
                          <option key={conn.id} value={conn.id}>{conn.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Schema</label>
                      <input
                        type="text"
                        value={databaseConfig.schema}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, schema: e.target.value }))}
                        placeholder="e.g., public"
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Table Name</label>
                      <input
                        type="text"
                        value={databaseConfig.tableName}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, tableName: e.target.value }))}
                        placeholder="e.g., sales_data"
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={databaseConfig.createIfNotExists}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, createIfNotExists: e.target.checked }))}
                        className="h-4 w-4 border-gray-300 text-blue-900 focus:ring-blue-900"
                      />
                      <span className="text-sm text-gray-900">Create table if it doesn't exist</span>
                    </label>
                    <p className="text-sm text-gray-600">Note: If the table exists, records will be appended.</p>
                  </div>
                )}

                {destinationType === 'api' && (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-900 mb-1">API Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">API Endpoint</label>
                      <input
                        type="text"
                        value={apiConfig.endpoint}
                        onChange={(e) => setApiConfig((prev) => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="e.g., https://api.example.com/endpoint"
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Authorization Token</label>
                      <input
                        type="text"
                        value={apiConfig.authToken}
                        onChange={(e) => setApiConfig((prev) => ({ ...prev, authToken: e.target.value }))}
                        placeholder="e.g., Bearer xyz123..."
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-900 focus:border-blue-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 7 && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Review</label>
                <div className="bg-gray-50 p-4 border border-gray-200 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Workflow Name</p>
                    <p className="text-sm text-gray-600">{workflowName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Description</p>
                    <p className="text-sm text-gray-600">{workflowDescription}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">User ID</p>
                    <p className="text-sm text-gray-600">{userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Input File</p>
                    <p className="text-sm text-gray-600">
                      {skipFileUpload ? 'Skipped (no fixed structure)' : isFileUploaded ? 'File uploaded' : 'No file uploaded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Parameters</p>
                    {parameterSections.length === 0 ? (
                      <p className="text-sm text-gray-600">No parameters set</p>
                    ) : (
                      <div className="space-y-2">
                        {parameterSections.map((section, sectionIndex) => (
                          <div key={sectionIndex}>
                            <p className="text-sm font-medium text-gray-900">{section.name}</p>
                            {section.parameters.map((param, paramIndex) => (
                              <p key={paramIndex} className="text-sm text-gray-600">
                                {param.name} ({param.type}, {param.mandatory ? 'Required' : 'Optional'}): {param.description}
                                {param.type === 'select' && param.options?.length > 0 && (
                                  <span> [Options: {param.options.map(opt => `${opt.label} (${opt.value})`).join(', ')}]</span>
                                )}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">DAG Path</p>
                    <p className="text-sm text-gray-600">{dagPath || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Output Destination</p>
                    <p className="text-sm text-gray-600 capitalize">{destinationType}</p>
                    {destinationType === 'database' && (
                      <div className="space-y-2 mt-2">
                        <p className="text-sm text-gray-600">
                          Connection: {DATABASE_CONNECTIONS.find((conn) => conn.id === databaseConfig.connectionId)?.name || 'None'}
                        </p>
                        <p className="text-sm text-gray-600">Schema: {databaseConfig.schema}</p>
                        <p className="text-sm text-gray-600">Table: {databaseConfig.tableName}</p>
                        <p className="text-sm text-gray-600">
                          Create if not exists: {databaseConfig.createIfNotExists ? 'Yes' : 'No'}
                        </p>
                      </div>
                    )}
                    {destinationType === 'api' && (
                      <div className="space-y-2 mt-2">
                        <p className="text-sm text-gray-600">Endpoint: {apiConfig.endpoint}</p>
                        <p className="text-sm text-gray-600">Token: {apiConfig.authToken ? 'Set' : 'Not set'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() => {
                setCurrentStep(Math.max(1, currentStep - 1));
                setUploadError('');
              }}
              disabled={currentStep === 1}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={handleNextStep}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 border border-blue-900 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length ? 'Save Workflow' : 'Next Step'}
              {currentStep < steps.length && <ChevronLeft className="h-4 w-4 transform rotate-180" />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NewWorkflow;