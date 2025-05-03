import React, { useState, useCallback } from 'react';
import { ChevronLeft, FileInput, Settings2, Save, CheckCircle2, Plus, Trash2, Code } from 'lucide-react';

const NewWorkflow = () => {
  const [step, setStep] = useState(0);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [userId, setUserId] = useState('1001'); // Temporary user ID
  const [parsedFileStructure, setParsedFileStructure] = useState([]);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [parameters, setParameters] = useState([]);
  const [workflowId, setWorkflowId] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [codeError, setCodeError] = useState(null);

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

    try {
      const response = await fetch('http://localhost:8000/workflow/new', {
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
      setStep(1);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
      setIsFileUploaded(false);
    } finally {
      setIsUploading(false);
    }
  }, [workflowName, workflowDescription, userId]);

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
        // Basic Python syntax check using fetch to a validation endpoint (or client-side if feasible)
        // For simplicity, we'll assume a server-side validation endpoint
        return null; // Replace with actual validation
      } else if (codeType === 'sql') {
        // Basic SQL syntax check (e.g., using a library like sqlparse client-side or server-side)
        return null; // Replace with actual validation
      } else if (codeType === 'r') {
        // R validation is complex client-side; skip for now or use server-side
        return null;
      }
      return null;
    } catch (error) {
      return `Invalid ${codeType} code: ${error.message}`;
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSaveWorkflow = async () => {
    if (!workflowId) {
      setUploadError('No workflow ID available. Please upload a file first.');
      return;
    }

    // Validate steps
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
    };

    try {
      // Save steps
      for (const step of workflowSteps) {
        await fetch('http://localhost:8000/workflow/steps', {
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
      }

      // Update workflow
      const response = await fetch('http://localhost:8000/workflow/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow');
      }

      alert('Workflow saved successfully!');
      setStep(0);
      setWorkflowName('');
      setWorkflowDescription('');
      setUserId('1001');
      setParsedFileStructure([]);
      setIsFileUploaded(false);
      setParameters([]);
      setWorkflowSteps([]);
      setWorkflowId(null);
    } catch (error) {
      console.error('Save error:', error);
      setUploadError(error.message);
    }
  };

  const steps = [
    { title: 'Load File & Details', icon: <FileInput size={18} /> },
    { title: 'Structure Preview', icon: <Settings2 size={18} /> },
    { title: 'Define Parameters', icon: <Settings2 size={18} /> },
    { title: 'Define Steps', icon: <Code size={18} /> },
    { title: 'Save Workflow', icon: <Save size={18} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          {steps.map((s, index) => (
            <div key={s.title} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${index <= step ? 'bg-blue-600 text-white' : 'bg ospiti-gray-100'}`}>
                {index < step ? <CheckCircle2 size={16} /> : s.icon}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-px w-12 ${index < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        
        <h2 className="text-2xl font-semibold mb-2">{steps[step].title}</h2>
        <p className="text-gray-600">
          {step === 0 && "Upload your source data file and provide workflow details"}
          {step === 1 && "Review the detected data structure"}
          {step === 2 && "Define parameters for the workflow"}
          {step === 3 && "Define processing steps with code"}
          {step === 4 && "Save your workflow"}
        </p>
      </div>

      <div className="mb-8">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <label className="block font-medium mb-2">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g., Monthly Sales Report"
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Description</label>
              <textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="e.g., Processes monthly sales data for reporting"
                className="w-full border rounded px-4 py-2 h-24"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g., 1001"
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-blue-600 bg-blue-50' : 
                isUploading ? 'border-blue-300 bg-blue-50' : 
                'border-gray-200'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mb-4 relative">
                <FileInput className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-600 mt-2">
                  {isDragging ? 'Drop file here' : 'Drag & drop CSV/Excel/Parquet file or'}
                </p>
                {isUploading && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="text-blue-600 animate-pulse">
                      <svg className="animate-spin h-5 w-5 mr-3 inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Uploading and parsing file...
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="file-input"
                className="hidden"
                accept=".csv,.xlsx,.xls,.parquet,.json"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-input"
                className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Browse Files
              </label>
              {uploadError && (
                <p className="text-red-600 text-sm mt-4">{uploadError}</p>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Supports CSV, XLSX, Parquet, JSON
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="border border-gray-100 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 font-medium text-sm">
              Detected File Structure (First 3 Samples)
            </div>
            <div className="p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Column</th>
                    <th className="border p-2 text-left">Type</th>
                    <th className="border p-2 text-left">Format</th>
                    <th className="border p-2 text-left">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedFileStructure.map((col) => {
                    const samples = col.samples || ['No samples available'];
                    const typeOptions = ['string', 'integer', 'float', 'datetime', 'boolean'];

                    return (
                      <tr key={col.column} className="border-b">
                        <td className="border p-2 font-medium">{col.column}</td>
                        <td className="border p-2">
                          <select
                            className="w-full border rounded px-2 py-1"
                            value={col.type}
                            onChange={(e) => handleTypeChange(col.column, e.target.value)}
                          >
                            {typeOptions.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border p-2">{col.format}</td>
                        <td className="border p-2">
                          <div className="space-y-1">
                            {samples.map((sample, idx) => (
                              <div key={idx} className="text-sm truncate">
                                {typeof sample === 'object' ? JSON.stringify(sample) : String(sample)}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Workflow Parameters</h3>
              <button
                onClick={handleAddParameter}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                New Parameter
              </button>
            </div>
            {parameters.length === 0 && (
              <p className="text-gray-500">No parameters defined. Click "New Parameter" to add one.</p>
            )}
            {parameters.map((param, index) => (
              <div key={index} className="flex items-center gap-4 border p-4 rounded-lg">
                <div className="w-1/3">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={param.name}
                    onChange={(e) => handleParameterChange(index, 'name', e.target.value)}
                    placeholder="e.g., multiplier"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={param.type}
                    onChange={(e) => handleParameterChange(index, 'type', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="string">String</option>
                    <option value="numeric">Numeric</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium mb-1">Mandatory</label>
                  <select
                    value={param.mandatory.toString()}
                    onChange={(e) => handleParameterChange(index, 'mandatory', e.target.value === 'true')}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Workflow Steps</h3>
              <button
                onClick={handleAddStep}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={16} />
                New Step
              </button>
            </div>
            {workflowSteps.length === 0 && (
              <p className="text-gray-500">No steps defined. Click "New Step" to add one.</p>
            )}
            {workflowSteps.map((step, index) => (
              <div key={index} className="border p-4 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium">Step {index + 1}</h4>
                  <button
                    onClick={() => handleDeleteStep(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Label</label>
                  <input
                    type="text"
                    value={step.label}
                    onChange={(e) => handleStepChange(index, 'label', e.target.value)}
                    placeholder="e.g., Clean Data"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={step.description}
                    onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                    placeholder="e.g., Removes null values and formats dates"
                    className="w-full border rounded px-3 py-2 h-24"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code Type</label>
                  <select
                    value={step.code_type}
                    onChange={(e) => handleStepChange(index, 'code_type', e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="python">Python</option>
                    <option value="sql">SQL</option>
                    <option value="r">R</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <textarea
                    value={step.code}
                    onChange={(e) => handleStepChange(index, 'code', e.target.value)}
                    placeholder={
                      step.code_type === 'python'
                        ? '# Example: df = df.dropna()\n# Use params["multiplier"] for parameters'
                        : step.code_type === 'sql'
                        ? 'SELECT * FROM input_table WHERE column IS NOT NULL'
                        : '# R code here'
                    }
                    className="w-full border rounded px-3 py-2 h-48 font-mono"
                  />
                </div>
                {codeError && (
                  <p className="text-red-600 text-sm">{codeError}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={18} />
                Workflow ready to save
              </div>
            </div>
            <div className="space-y-4">
              <label className="block font-medium">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                className="w-full border rounded px-4 py-2"
                disabled
              />
            </div>
            <div className="space-y-4">
              <label className="block font-medium">Description</label>
              <textarea
                value={workflowDescription}
                className="w-full border rounded px-4 py-2 h-24"
                disabled
              />
            </div>
            <div className="space-y-4">
              <label className="block font-medium">User ID</label>
              <input
                type="text"
                value={userId}
                className="w-full border rounded px-4 py-2"
                disabled
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t pt-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ChevronLeft size={16} className="mr-2 inline" />
          Back
        </button>
        
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={(step === 0 && (!isFileUploaded || !workflowName || !workflowDescription || !userId)) || 
                      (step === 2 && parameters.some(param => !param.name)) ||
                      (step === 3 && workflowSteps.some(step => !step.label || !step.code))}
            className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 ${
              ((step === 0 && (!isFileUploaded || !workflowName || !workflowDescription || !userId)) || 
               (step === 2 && parameters.some(param => !param.name)) ||
               (step === 3 && workflowSteps.some(step => !step.label || !step.code))) 
                ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSaveWorkflow}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save size={16} />
            Save Workflow
          </button>
        )}
      </div>
    </div>
  );
};

export default NewWorkflow;