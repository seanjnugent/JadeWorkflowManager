import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileInput, Settings2, Save, CheckCircle2, File, Database, Waypoints, FileSpreadsheet, FileX } from 'lucide-react';
import { GridLoader } from 'react-spinners';

// Placeholder database connections for demo purposes
const DATABASE_CONNECTIONS = [
  { id: '1', name: 'Production DB' },
  { id: '2', name: 'Staging DB' },
  { id: '3', name: 'Analytics DB' },
];

const NewWorkflow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [userId, setUserId] = useState('1001');
  const [parsedFileStructure, setParsedFileStructure] = useState([]);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
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
  const [successMessage, setSuccessMessage] = useState(null);
  const [skipFileUpload, setSkipFileUpload] = useState(false);

  const steps = [
    { id: 1, title: 'Workflow Details', icon: FileInput },
    { id: 2, title: 'Input File', icon: File },
    { id: 3, title: 'Structure Preview', icon: Settings2 },
    { id: 4, title: 'Parameters', icon: Settings2 },
    { id: 5, title: 'Steps', icon: Save },
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
        let response;
        if (skipFileUpload) {
          response = await fetch('http://localhost:8000/workflows/workflow/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: workflowName,
              description: workflowDescription,
              created_by: parseInt(userId),
              status: 'Draft',
              skip_structure: true,
            }),
          });
        } else {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('name', workflowName);
          formData.append('description', workflowDescription);
          formData.append('created_by', userId);
          formData.append('status', 'Draft');
          formData.append('skip_structure', skipFileUpload);

          response = await fetch('http://localhost:8000/workflows/workflow/new', {
            method: 'POST',
            body: formData,
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        setWorkflowId(data.workflow.id);

        if (!skipFileUpload && data.file_info) {
          const structure = Object.entries(data.file_info.schema).map(([column, typeInfo]) => ({
            column,
            detectedType: typeInfo.type,
            type: typeInfo.type,
            format: typeInfo.format || 'none',
            samples: data.file_info.preview.slice(0, 3).map((row) => row[column]),
          }));
          setParsedFileStructure(structure);
        }

        setIsFileUploaded(true);
        setUploadError(null);
        setCurrentStep(3);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadError(error.message);
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
      const workflowResponse = await fetch(
        workflowId ? `http://localhost:8000/workflows/workflow/update` : `http://localhost:8000/workflows/workflow/new`,
        {
          method: workflowId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(workflowId && { workflow_id: workflowId }),
            name: workflowName,
            description: workflowDescription,
            created_by: parseInt(userId),
            status: 'Draft',
            parameters: parameters.filter((param) => param.name),
            destination: destinationType,
            destination_config: destinationType === 'database' ? databaseConfig : destinationType === 'api' ? apiConfig : null,
            skip_structure: skipFileUpload,
          }),
        }
      );

      if (!workflowResponse.ok) {
        const errorText = await workflowResponse.text();
        throw new Error(`Failed to ${workflowId ? 'update' : 'create'} workflow: ${errorText}`);
      }

      const workflowData = await workflowResponse.json();
      const finalWorkflowId = workflowData.workflow?.id || workflowId;

      const stepPromises = workflowSteps.map((step, index) => {
        return fetch(`http://localhost:8000/workflows/workflow/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: finalWorkflowId,
            label: step.label,
            description: step.description,
            code_type: step.code_type,
            code: step.code,
            step_order: index + 1,
          }),
        });
      });

      const stepResponses = await Promise.all(stepPromises);
      for (const response of stepResponses) {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create step: ${errorText}`);
        }
      }

      setSuccessMessage('Workflow saved successfully!');
      setTimeout(() => {
        setCurrentStep(1);
        setWorkflowName('');
        setWorkflowDescription('');
        setParsedFileStructure([]);
        setIsFileUploaded(false);
        setParameters([]);
        setWorkflowSteps([]);
        setWorkflowId(null);
        setDestinationType('csv');
        setDatabaseConfig({ connectionId: '', schema: '', tableName: '', createIfNotExists: false });
        setApiConfig({ endpoint: '', authToken: '' });
        setSuccessMessage(null);
        setSkipFileUpload(false);
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setUploadError(error.message);
    }
  };

  const handleTypeChange = (column, newType) => {
    setParsedFileStructure((prev) =>
      prev.map((col) => (col.column === column ? { ...col, type: newType } : col))
    );
  };

  const handleAddParameter = () => {
    setParameters((prev) => [...prev, { name: '', type: 'text', description: '', mandatory: false }]);
  };

  const handleParameterChange = (index, field, value) => {
    setParameters((prev) => {
      const newParams = [...prev];
      newParams[index] = { ...newParams[index], [field]: value };
      return newParams;
    });
  };

  const handleAddStep = () => {
    setWorkflowSteps((prev) => [
      ...prev,
      {
        label: '',
        description: '',
        code_type: 'python',
        code: '',
        step_order: prev.length + 1,
      },
    ]);
  };

  const handleStepChange = (index, field, value) => {
    setWorkflowSteps((prev) => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return newSteps;
    });
  };

  const handleDeleteStep = (index) => {
    setWorkflowSteps((prev) => {
      const newSteps = prev.filter((_, i) => i !== index);
      return newSteps.map((step, i) => ({ ...step, step_order: i + 1 }));
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
        if (parameters.some((param) => param.name.trim() === '')) {
          setUploadError('All parameters must have a name');
          return false;
        }
        break;
      case 5:
        if (workflowSteps.some((step) => !step.label.trim() || !step.code.trim())) {
          setUploadError('All steps must have a label and code');
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
          <div className="bg-white p-6 flex flex-col items-center">
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
              {currentStep === 5 && 'Add processing steps for the workflow'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="e.g., Monthly Sales Report"
                    className="w-full p-2 bg-white border border-gray-300 text-gray-700"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    placeholder="e.g., Processes monthly sales data for reporting"
                    className="w-full p-2 bg-white border border-gray-300 text-gray-700 h-24"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g., 1001"
                    className="w-full p-2 bg-white border border-gray-300 text-gray-700"
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
                    className="h-4 w-4 text-blue-900"
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
                      onChange={(e) => handleFileUpload(e.target.files[0])}
                      disabled={isUploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`block text-sm font-medium ${uploadError ? 'text-red-600' : 'text-gray-600'} cursor-pointer`}
                    >
                      {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </label>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File Structure Preview</label>
                {skipFileUpload ? (
                  <div className="p-6 text-center bg-gray-50 border border-gray-200">
                    <FileX className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-700">No file structure preview</p>
                    <p className="mt-1 text-gray-500 text-sm">This workflow doesn't require a fixed file structure.</p>
                  </div>
                ) : parsedFileStructure.length > 0 ? (
                  <div className="border border-gray-300">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Column</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedFileStructure.map((col) => (
                          <tr key={col.column}>
                            <td className="px-4 py-2 text-sm text-gray-700">{col.column}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">
                              <select
                                value={col.type}
                                onChange={(e) => handleTypeChange(col.column, e.target.value)}
                                className="p-2 border border-gray-300 text-sm"
                              >
                                <option value="string">String</option>
                                <option value="integer">Integer</option>
                                <option value="float">Float</option>
                                <option value="boolean">Boolean</option>
                                <option value="date">Date</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700">{col.samples?.join(', ') || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-gray-50 border border-gray-200">
                    <File className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-700">No file uploaded</p>
                    <p className="mt-1 text-gray-500 text-sm">Upload a file to preview its structure.</p>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Parameters</label>
                {parameters.map((param, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 border border-gray-200">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                        placeholder="Parameter name"
                        className="w-full p-2 bg-white border border-gray-300 text-sm"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={param.type}
                        onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                        className="w-full p-2 border border-gray-300 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="textbox">Textbox</option>
                        <option value="numeric">Numeric</option>
                        <option value="integer">Integer</option>
                        <option value="date">Date</option>
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={param.description}
                        onChange={(e) => handleParameterChange(index, 'description', e.target.value)}
                        placeholder="Parameter description"
                        className="w-full p-2 bg-white border border-gray-300 text-sm"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={param.mandatory}
                          onChange={(e) => handleParameterChange(index, 'mandatory', e.target.checked)}
                          className="h-4 w-4 text-blue-900"
                        />
                        <span className="text-sm text-gray-700">Req.</span>
                      </label>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddParameter}
                  className="mt-4 px-4 py-2 bg-blue-900 text-white border border-blue-900 hover:bg-blue-800 text-sm font-medium"
                >
                  Add Parameter
                </button>
              </div>
            )}

            {currentStep === 5 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Steps</label>
                {workflowSteps.map((step, index) => (
                  <div key={index} className="border border-gray-300 p-4 space-y-4 mb-4">
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) => handleStepChange(index, 'label', e.target.value)}
                        placeholder="Step label"
                        className="flex-1 p-2 bg-white border border-gray-300 text-sm"
                      />
                      <button
                        onClick={() => handleDeleteStep(index)}
                        className="ml-4 text-red-500 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                    <textarea
                      value={step.description}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      placeholder="Step description"
                      className="w-full p-2 bg-white border border-gray-300 text-sm h-24"
                    />
                    <select
                      value={step.code_type}
                      onChange={(e) => handleStepChange(index, 'code_type', e.target.value)}
                      className="w-full p-2 border border-gray-300 text-sm"
                    >
                      <option value="python">Python</option>
                      <option value="sql">SQL</option>
                      <option value="r">R</option>
                    </select>
                    <textarea
                      value={step.code}
                      onChange={(e) => handleStepChange(index, 'code', e.target.value)}
                      placeholder="Enter your code here"
                      className="w-full p-2 bg-white border border-gray-300 text-sm h-48 font-mono"
                    />
                  </div>
                ))}
                <button
                  onClick={handleAddStep}
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 text-sm font-medium"
                >
                  Add Step
                </button>
              </div>
            )}

            {currentStep === 6 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Output Destination</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setDestinationType('csv')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'csv' ? 'border-blue-900 bg-blue-50' : ''
                    }`}
                  >
                    <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm">CSV File</span>
                  </button>
                  <button
                    onClick={() => setDestinationType('database')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'database' ? 'border-blue-900 bg-blue-50' : ''
                    }`}
                  >
                    <Database className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm">Database</span>
                  </button>
                  <button
                    onClick={() => setDestinationType('api')}
                    className={`p-4 border border-gray-300 flex flex-col items-center text-center ${
                      destinationType === 'api' ? 'border-blue-900 bg-blue-50' : ''
                    }`}
                  >
                    <Waypoints className="w-6 h-6 mb-2 text-gray-600" />
                    <span className="text-sm">API</span>
                  </button>
                </div>

                {destinationType === 'database' && (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Database Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Database Connection</label>
                      <select
                        value={databaseConfig.connectionId}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, connectionId: e.target.value }))}
                        className="w-full p-2 border border-gray-300 text-sm"
                      >
                        <option value="">Select a connection</option>
                        {DATABASE_CONNECTIONS.map((conn) => (
                          <option key={conn.id} value={conn.id}>{conn.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Schema</label>
                      <input
                        type="text"
                        value={databaseConfig.schema}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, schema: e.target.value }))}
                        placeholder="e.g., public"
                        className="w-full p-2 border border-gray-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Table Name</label>
                      <input
                        type="text"
                        value={databaseConfig.tableName}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, tableName: e.target.value }))}
                        placeholder="e.g., sales_data"
                        className="w-full p-2 border border-gray-300 text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={databaseConfig.createIfNotExists}
                        onChange={(e) => setDatabaseConfig((prev) => ({ ...prev, createIfNotExists: e.target.checked }))}
                        className="h-4 w-4 text-blue-900"
                      />
                      <span className="text-sm text-gray-700">Create table if it doesn't exist</span>
                    </label>
                    <p className="text-sm text-gray-500">Note: If the table exists, records will be appended.</p>
                  </div>
                )}

                {destinationType === 'api' && (
                  <div className="space-y-4 mt-4 p-4 bg-gray-50 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Configuration</label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">API Endpoint</label>
                      <input
                        type="text"
                        value={apiConfig.endpoint}
                        onChange={(e) => setApiConfig((prev) => ({ ...prev, endpoint: e.target.value }))}
                        placeholder="e.g., https://api.example.com/endpoint"
                        className="w-full p-2 border border-gray-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Authorization Token</label>
                      <input
                        type="text"
                        value={apiConfig.authToken}
                        onChange={(e) => setApiConfig((prev) => ({ ...prev, authToken: e.target.value }))}
                        placeholder="e.g., Bearer xyz123..."
                        className="w-full p-2 border border-gray-300 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 7 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review</label>
                <div className="bg-gray-50 p-4 border border-gray-200 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Workflow Name</p>
                    <p className="text-sm text-gray-600">{workflowName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Description</p>
                    <p className="text-sm text-gray-600">{workflowDescription}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">User ID</p>
                    <p className="text-sm text-gray-600">{userId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Input File</p>
                    <p className="text-sm text-gray-600">
                      {skipFileUpload ? 'Skipped (no fixed structure)' : isFileUploaded ? 'File uploaded' : 'No file uploaded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Parameters</p>
                    {parameters.length === 0 ? (
                      <p className="text-sm text-gray-600">No parameters set</p>
                    ) : (
                      <div className="space-y-2">
                        {parameters.map((param, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            {param.name} ({param.type}, {param.mandatory ? 'Required' : 'Optional'}): {param.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Steps</p>
                    {workflowSteps.length === 0 ? (
                      <p className="text-sm text-gray-600">No steps defined</p>
                    ) : (
                      <div className="space-y-2">
                        {workflowSteps.map((step, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            Step {index + 1}: {step.label} ({step.code_type})
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Output Destination</p>
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