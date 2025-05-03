import React, { useState, useCallback } from 'react';
import { ChevronLeft, FileInput, Settings2, Save, CheckCircle2, Code } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import FileStructurePreview from '../components/FileStructurePreview';
import ParametersForm from '../components/ParametersForm';
import StepsForm from '../components/StepsForm';
import WorkflowSummary from '../components/WorkflowSummary';
import StepNavigator from '../components/StepNavigator';

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
            <FileUpload
              workflowName={workflowName}
              workflowDescription={workflowDescription}
              userId={userId}
              isDragging={isDragging}
              isUploading={isUploading}
              uploadError={uploadError}
              handleFileUpload={handleFileUpload}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
            />
          </div>
        )}

        {step === 1 && (
          <FileStructurePreview
            parsedFileStructure={parsedFileStructure}
            handleTypeChange={handleTypeChange}
          />
        )}

        {step === 2 && (
          <ParametersForm
            parameters={parameters}
            handleAddParameter={handleAddParameter}
            handleParameterChange={handleParameterChange}
          />
        )}

        {step === 3 && (
          <StepsForm
            workflowSteps={workflowSteps}
            handleAddStep={handleAddStep}
            handleStepChange={handleStepChange}
            handleDeleteStep={handleDeleteStep}
            codeError={codeError}
            parameters={parameters}
            parsedFileStructure={parsedFileStructure}
          />
        )}

        {step === 4 && (
          <WorkflowSummary
            workflowName={workflowName}
            workflowDescription={workflowDescription}
            userId={userId}
          />
        )}
      </div>

      <StepNavigator
        step={step}
        setStep={setStep}
        steps={steps}
        handleSaveWorkflow={handleSaveWorkflow}
        isFileUploaded={isFileUploaded}
        workflowName={workflowName}
        workflowDescription={workflowDescription}
        userId={userId}
        parameters={parameters}
        workflowSteps={workflowSteps}
      />
    </div>
  );
};

export default NewWorkflow;
