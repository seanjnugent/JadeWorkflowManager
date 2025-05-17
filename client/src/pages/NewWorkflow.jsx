import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, FileInput, Settings2, Save, CheckCircle2, Code, 
  File, Database, Waypoints, FileSpreadsheet
} from 'lucide-react';
import { 
  StepCard, FileUploadArea, ErrorAlert, StepNavigation, SuccessAlert 
} from '../components/WorkflowComponents';

// Placeholder database connections for demo purposes
const DATABASE_CONNECTIONS = [
  { id: '1', name: 'Production DB' },
  { id: '2', name: 'Staging DB' },
  { id: '3', name: 'Analytics DB' }
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
  const [isDragging, setIsDragging] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [codeError, setCodeError] = useState(null);
  const [destinationType, setDestinationType] = useState('csv');
  const [databaseConfig, setDatabaseConfig] = useState({
    connectionId: '',
    schema: '',
    tableName: '',
    createIfNotExists: false
  });
  const [apiConfig, setApiConfig] = useState({
    endpoint: '',
    authToken: ''
  });
  const [successMessage, setSuccessMessage] = useState(null);

  const steps = [
    { id: 1, title: 'Workflow Details', icon: FileInput },
    { id: 2, title: 'Input File', icon: File },
    { id: 3, title: 'Structure Preview', icon: Settings2 },
    { id: 4, title: 'Parameters', icon: Settings2 },
    { id: 5, title: 'Steps', icon: Code },
    { id: 6, title: 'Destination', icon: Save },
  ];

  const handleFileUpload = useCallback(async (file) => {
    if (!workflowName) {
      setUploadError('Please enter a workflow name');
      return;
    }
    if (!workflowDescription) {
      setUploadError('Please enter a workflow description');
      return;
    }
    if (!userId) {
      setUploadError('Please enter a user ID');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', workflowName);
    formData.append('description', workflowDescription);
    formData.append('created_by', userId);
    formData.append('status', 'Draft');
    formData.append('destination', destinationType);

    try {
      const response = await fetch('http://localhost:8000/workflows/workflow/new', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.workflow || !data.file_info || !data.file_info.schema || !data.file_info.preview) {
        throw new Error('Invalid response format from server');
      }

      setWorkflowId(data.workflow.id);
      const structure = Object.entries(data.file_info.schema).map(([column, typeInfo]) => ({
        column,
        detectedType: typeInfo.type,
        type: typeInfo.type,
        format: typeInfo.format || 'none',
        samples: data.file_info.preview.slice(0, 3).map(row => row[column]),
      }));

      setParsedFileStructure(structure);
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
  }, [workflowName, workflowDescription, userId, destinationType]);

  const handleTypeChange = (column, newType) => {
    setParsedFileStructure(prev =>
      prev.map(col =>
        col.column === column ? { ...col, type: newType } : col
      )
    );
  };

  const handleAddParameter = () => {
    setParameters(prev => [
      ...prev,
      { name: '', type: 'string', mandatory: false }
    ]);
  };

  const handleParameterChange = (index, field, value) => {
    setParameters(prev => {
      const newParams = [...prev];
      newParams[index] = { ...newParams[index], [field]: value };
      return newParams;
    });
  };

  const handleAddStep = () => {
    setWorkflowSteps(prev => [
      ...prev,
      {
        label: '',
        description: '',
        code_type: 'python',
        code: '',
        step_order: prev.length + 1,
      }
    ]);
  };

  const handleStepChange = (index, field, value) => {
    setWorkflowSteps(prev => {
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return newSteps;
    });
  };

  const handleDeleteStep = (index) => {
    setWorkflowSteps(prev => {
      const newSteps = prev.filter((_, i) => i !== index);
      return newSteps.map((step, i) => ({ ...step, step_order: i + 1 }));
    });
  };

  const validateCode = (code, codeType) => {
    if (!code) return null;
    try {
      if (codeType === 'python') {
        return null;
      } else if (codeType === 'sql') {
        return null;
      } else if (codeType === 'r') {
        return null;
      }
      return null;
    } catch (error) {
      return `Invalid ${codeType} code: ${error.message}`;
    }
  };

  const handleSaveWorkflow = async () => {
    if (!workflowId) {
      setUploadError('No workflow ID available. Please upload a file first.');
      return;
    }

    for (const step of workflowSteps) {
      if (!step.label || !step.code) {
        setUploadError('All steps must have a label and code.');
        return;
      }
      const error = validateCode(step.code, step.code_type);
      if (error) {
        setCodeError(error);
        return;
      }
    }

    const workflowData = {
      workflow_id: workflowId,
      name: workflowName,
      description: workflowDescription,
      created_by: parseInt(userId),
      status: 'Draft',
      parameters: parameters.filter(param => param.name),
      destination: destinationType,
      destination_config: destinationType === 'database' 
        ? databaseConfig 
        : destinationType === 'api' 
        ? apiConfig 
        : null
    };

    try {
      for (const step of workflowSteps) {
        const response = await fetch(`http://localhost:8000/workflows/workflow/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow_id: workflowId,
            label: step.label,
            description: step.description,
            code_type: step.code_type,
            code: step.code,
            step_order: step.step_order,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create step: ${response.status} - ${errorText}`);
        }
      }

      const response = await fetch(`http://localhost:8000/workflows/workflow/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      setSuccessMessage('Workflow saved successfully!');
      setTimeout(() => {
        setCurrentStep(1);
        setWorkflowName('');
        setWorkflowDescription('');
        setUserId('1001');
        setParsedFileStructure([]);
        setIsFileUploaded(false);
        setParameters([]);
        setWorkflowSteps([]);
        setWorkflowId(null);
        setDestinationType('csv');
        setDatabaseConfig({ connectionId: '', schema: '', tableName: '', createIfNotExists: false });
        setApiConfig({ endpoint: '', authToken: '' });
        setSuccessMessage(null);
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      setUploadError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto flex gap-8">
        {/* Sidebar */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-80 p-6 rounded-xl bg-white border border-gray-200 shadow-sm sticky top-8 h-fit"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Workflow</h2>
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              id={step.id}
              title={step.title}
              icon={step.icon}
              index={index + 1}
              isActive={currentStep === step.id}
              completed={currentStep > step.id}
              onClick={setCurrentStep}
            />
          ))}
        </motion.aside>

        {/* Main Content */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 p-8 bg-white rounded-xl border border-gray-200 shadow-sm"
        >
          <button
            onClick={() => navigate('/workflows')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Workflows
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{steps[currentStep - 1].title}</h1>
              
              {uploadError && <ErrorAlert message={uploadError} onDismiss={() => setUploadError('')} />}
              {successMessage && <SuccessAlert message={successMessage} />}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Workflow Name</label>
                    <input
                      type="text"
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g., Monthly Sales Report"
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={workflowDescription}
                      onChange={(e) => setWorkflowDescription(e.target.value)}
                      placeholder="e.g., Processes monthly sales data for reporting"
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition h-32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="e.g., 1001"
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <FileUploadArea
                    onFileUpload={handleFileUpload}
                    isUploading={isUploading}
                    isDragging={isDragging}
                    error={uploadError}
                  />
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">Detected File Structure</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Column</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Sample Values</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {parsedFileStructure.map((col) => (
                          <tr key={col.column}>
                            <td className="px-6 py-4 text-sm text-gray-700">{col.column}</td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <select
                                value={col.type}
                                onChange={(e) => handleTypeChange(col.column, e.target.value)}
                                className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="string">String</option>
                                <option value="integer">Integer</option>
                                <option value="float">Float</option>
                                <option value="boolean">Boolean</option>
                                <option value="date">Date</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {col.samples?.join(', ') || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">Workflow Parameters</h3>
                  {parameters.map((param, index) => (
                    <div key={index} className="flex gap-4 items-center">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                        placeholder="Parameter name"
                        className="flex-1 p-3 bg-white border border-gray-300 rounded-lg"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                        className="p-3 border rounded-lg"
                      >
                        <option value="string">String</option>
                        <option value="integer">Integer</option>
                        <option value="float">Float</option>
                        <option value="boolean">Boolean</option>
                      </select>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={param.mandatory}
                          onChange={(e) => handleParameterChange(index, 'mandatory', e.target.checked)}
                        />
                        Mandatory
                      </label>
                    </div>
                  ))}
                  <button
                    onClick={handleAddParameter}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add Parameter
                  </button>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">Workflow Steps</h3>
                  {workflowSteps.map((step, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => handleStepChange(index, 'label', e.target.value)}
                          placeholder="Step label"
                          className="flex-1 p-3 bg-white border border-gray-300 rounded-lg"
                        />
                        <button
                          onClick={() => handleDeleteStep(index)}
                          className="ml-4 text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                      <textarea
                        value={step.description}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                        placeholder="Step description"
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg h-24"
                      />
                      <select
                        value={step.code_type}
                        onChange={(e) => handleStepChange(index, 'code_type', e.target.value)}
                        className="p-3 border rounded-lg"
                      >
                        <option value="python">Python</option>
                        <option value="sql">SQL</option>
                        <option value="r">R</option>
                      </select>
                      <textarea
                        value={step.code}
                        onChange={(e) => handleStepChange(index, 'code', e.target.value)}
                        placeholder="Enter your code here"
                        className="w-full p-3 bg-white border border-gray-300 rounded-lg h-48 font-mono"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleAddStep}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Add Step
                  </button>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">Output Destination</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setDestinationType('csv')}
                      className={`p-4 border rounded-lg flex flex-col items-center ${
                        destinationType === 'csv' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-8 h-8 mb-2 text-gray-600" />
                      <span>CSV File</span>
                    </button>
                    <button
                      onClick={() => setDestinationType('database')}
                      className={`p-4 border rounded-lg flex flex-col items-center ${
                        destinationType === 'database' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Database className="w-8 h-8 mb-2 text-gray-600" />
                      <span>Database</span>
                    </button>
                    <button
                      onClick={() => setDestinationType('api')}
                      className={`p-4 border rounded-lg flex flex-col items-center ${
                        destinationType === 'api' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <Waypoints className="w-8 h-8 mb-2 text-gray-600" />
                      <span>API</span>
                    </button>
                  </div>

                  {destinationType === 'database' && (
                    <div className="space-y-4 mt-6 p-4 border rounded-lg bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700">Database Configuration</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Database Connection</label>
                        <select
                          value={databaseConfig.connectionId}
                          onChange={(e) => setDatabaseConfig(prev => ({ ...prev, connectionId: e.target.value }))}
                          className="w-full p-3 border rounded-lg"
                        >
                          <option value="">Select a connection</option>
                          {DATABASE_CONNECTIONS.map(conn => (
                            <option key={conn.id} value={conn.id}>{conn.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Schema</label>
                        <input
                          type="text"
                          value={databaseConfig.schema}
                          onChange={(e) => setDatabaseConfig(prev => ({ ...prev, schema: e.target.value }))}
                          placeholder="e.g., public"
                          className="w-full p-3 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Table Name</label>
                        <input
                          type="text"
                          value={databaseConfig.tableName}
                          onChange={(e) => setDatabaseConfig(prev => ({ ...prev, tableName: e.target.value }))}
                          placeholder="e.g., sales_data"
                          className="w-full p-3 border rounded-lg"
                        />
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={databaseConfig.createIfNotExists}
                          onChange={(e) => setDatabaseConfig(prev => ({ ...prev, createIfNotExists: e.target.checked }))}
                        />
                        Create table if it doesn't exist
                      </label>
                      <p className="text-sm text-gray-500">
                        Note: If the table exists, records will be appended.
                      </p>
                    </div>
                  )}

                  {destinationType === 'api' && (
                    <div className="space-y-4 mt-6 p-4 border rounded-lg bg-gray-50">
                      <h4 className="text-sm font-medium text-gray-700">API Configuration</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
                        <input
                          type="text"
                          value={apiConfig.endpoint}
                          onChange={(e) => setApiConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                          placeholder="e.g., https://api.example.com/endpoint"
                          className="w-full p-3 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Authorization Token</label>
                        <input
                          type="text"
                          value={apiConfig.authToken}
                          onChange={(e) => setApiConfig(prev => ({ ...prev, authToken: e.target.value }))}
                          placeholder="e.g., Bearer xyz123..."
                          className="w-full p-3 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={steps.length}
                onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
                onNext={() => {
                  if (currentStep === steps.length) {
                    handleSaveWorkflow();
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                nextLabel={currentStep === steps.length ? 'Save Workflow' : 'Next'}
              />
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
};

export default NewWorkflow;