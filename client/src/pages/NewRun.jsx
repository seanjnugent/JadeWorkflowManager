import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, UploadCloud, Plug, Clock, CheckCircle, Download } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const NewRun = () => {
  const navigate = useNavigate();
  const { workflowId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runName, setRunName] = useState('');
  const [file, setFile] = useState(null);
  const [parameters, setParameters] = useState({});
  const [scheduleType, setScheduleType] = useState('none');
  const [scheduleOptions] = useState(['none', 'daily', 'weekly', 'monthly']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState(null);

  const steps = [
    { id: 1, title: 'Run Configuration', icon: Play },
    { id: 2, title: 'Input File', icon: UploadCloud },
    { id: 3, title: 'Parameters', icon: Plug },
    { id: 4, title: 'Schedule', icon: Clock },
    { id: 5, title: 'Review', icon: CheckCircle },
  ];

  useEffect(() => {
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
        const response = await fetch(`http://localhost:8000/workflows/workflow/${workflowId}`, {
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch workflow details: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setWorkflowDetails(data);

        const initialParams = {};
        const workflowParams = data.workflow?.parameters || [];
        if (Array.isArray(workflowParams)) {
          workflowParams.forEach((p) => {
            initialParams[p.name] = p.default || '';
          });
        } else if (typeof workflowParams === 'object') {
          Object.keys(workflowParams).forEach(key => {
            initialParams[key] = workflowParams[key]?.default || '';
          });
        }
        setParameters(initialParams);

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
  }, [workflowId]);

  const handleParameterChange = (name, value) => {
    setParameters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!runName.trim()) {
          setError('Please enter a run name');
          return false;
        }
        break;
      case 2:
        if (!file && workflowDetails?.workflow?.requires_file) {
          setError('Please upload an input file');
          return false;
        }
        break;
      case 3:
        const workflowParams = workflowDetails?.workflow?.parameters || [];
        let hasError = false;
        if (Array.isArray(workflowParams)) {
          workflowParams.forEach(param => {
            if (param.required && (!parameters[param.name] || parameters[param.name].trim() === '')) {
              setError(`Parameter "${param.name}" is required`);
              hasError = true;
            }
          });
        }
        if (hasError) return false;
        break;
      case 5:
        if (
          !runName.trim() ||
          (workflowDetails?.workflow?.requires_file && !file) ||
          (Object.keys(parameters).length && Object.values(parameters).some(value => value === ''))
        ) {
          setError('Please complete all required fields');
          return false;
        }
        break;
    }
    return true;
  };

const handleStartRun = async () => {
  if (!validateCurrentStep()) return;

  setIsSubmitting(true);
  try {
    const formData = new FormData();
    formData.append('workflow_id', workflowId);
    formData.append('triggered_by', userId);

    if (file) {
      formData.append('file', file);
    }

    if (Object.keys(parameters).length) {
      formData.append('parameters', JSON.stringify(parameters));
    }

    if (scheduleType !== 'none') {
      formData.append('schedule', scheduleType);
    }

    const response = await fetch(`http://localhost:8000/runs/trigger`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Run failed');
    }

    navigate('/runs');
  } catch (err) {
    setError(err.message || 'Failed to start run');
  } finally {
    setIsSubmitting(false);
  }
};


  const handleNextStep = () => {
    if (!validateCurrentStep()) return;

    if (currentStep === steps.length) {
      handleStartRun();
    } else {
      setCurrentStep(currentStep + 1);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <GridLoader color="#1e3a8a" size={15} margin={2} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 flex flex-col items-center">
            <GridLoader color="#1e3a8a" size={15} margin={2} />
            <p className="mt-4 text-gray-700 text-sm">Starting workflow run...</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(`/workflows/workflow/${workflowId}`)}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Workflow
            </button>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-gray-900">{steps[currentStep - 1].title}</h1>
            <p className="text-gray-600 text-sm mt-1">
              {currentStep === 1 && 'Configure the basic settings for this workflow run'}
              {currentStep === 2 && 'Upload the input file required for this workflow'}
              {currentStep === 3 && 'Set parameters for this workflow run'}
              {currentStep === 4 && 'Configure when this workflow should run'}
              {currentStep === 5 && 'Review your workflow run configuration'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="w-100 h-1 bg-gray-200">
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
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                ✕
              </button>
            </div>
          )}

          <div className="space-y-6">
            {currentStep === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Run Name
                </label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  placeholder="Enter a unique name for this run"
                  className="w-full p-2 border border-gray-300 text-gray-700 bg-white"
                />
                <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">
                  Workflow Details
                </label>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <p className="font-medium text-gray-800">
                    {workflowDetails?.workflow?.name || 'Unnamed Workflow'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    {workflowDetails?.workflow?.description || 'No description available'}
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Input File
                </label>
                <div className="border border-gray-300 p-6 text-center">
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
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200">
                    <p className="text-blue-900 text-sm">
                      File selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
                <div className="flex gap-3 mt-4 justify-center">
                  <button
                    className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 text-sm font-medium"
                    onClick={() => console.log('View template clicked')}
                  >
                    View Template
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-900 text-white border border-blue-900 hover:bg-blue-800 flex items-center text-sm font-medium"
                    onClick={() => console.log('Download template clicked')}
                  >
                    <Download className="w-4 h-4 mr-1" /> Download Template
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parameters
                </label>
                {Object.keys(parameters).length === 0 ? (
                  <div className="bg-gray-50 p-4 border border-gray-200">
                    <p className="text-gray-600 text-sm">No parameters available for this workflow.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(parameters).map(([name, value]) => {
                      const paramDetails = Array.isArray(workflowDetails?.workflow?.parameters)
                        ? workflowDetails?.workflow?.parameters.find(p => p.name === name)
                        : null;
                      return (
                        <div key={name} className="bg-gray-50 p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {paramDetails?.label || name}
                            {paramDetails?.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          {paramDetails?.type === 'select' && Array.isArray(paramDetails?.options) ? (
                            <select
                              value={value}
                              onChange={(e) => handleParameterChange(name, e.target.value)}
                              className="w-full p-2 bg-white border border-gray-300 text-gray-700 text-sm"
                            >
                              {paramDetails.options.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={paramDetails?.type === 'number' ? 'number' : 'text'}
                              value={value}
                              onChange={(e) => handleParameterChange(name, e.target.value)}
                              placeholder={paramDetails?.placeholder || `Enter ${name}`}
                              className="w-full p-2 bg-white border border-gray-300 text-gray-700 text-sm"
                            />
                          )}
                          {paramDetails?.description && (
                            <p className="text-gray-500 text-xs mt-1">{paramDetails.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduleOptions.map((option) => (
                    <div
                      key={option}
                      onClick={() => setScheduleType(option)}
                      className={`p-4 border border-gray-300 text-center cursor-pointer hover:bg-gray-100 ${
                        scheduleType === option ? 'bg-blue-50 border-blue-900' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center">
                        <div
                          className={`w-4 h-4 mr-2 ${
                            scheduleType === option ? 'bg-blue-900' : 'bg-gray-200'
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
            )}

            {currentStep === 5 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review
                </label>
                <div className="bg-gray-50 p-4 border border-gray-200 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Run Name</p>
                    <p className="text-sm text-gray-600">{runName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Input File</p>
                    <p className="text-sm text-gray-600">
                      {file ? `${file.name} (${(file.size / 1024).toFixed(2)} KB)` : 'No file uploaded'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Parameters</p>
                    {Object.keys(parameters).length === 0 ? (
                      <p className="text-sm text-gray-600">No parameters set</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(parameters).map(([name, value]) => (
                          <p key={name} className="text-sm text-gray-600">
                            {name}: {value}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Schedule</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {scheduleType === 'none' ? 'No Schedule' : scheduleType}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() => {
                setCurrentStep(Math.max(1, currentStep - 1));
                setError('');
              }}
              disabled={currentStep === 1}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 border border-blue-900 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentStep === steps.length ? 'Start Run' : 'Next Step'}
              {currentStep < steps.length && <ChevronLeft className="h-4 w-4 transform rotate-180" />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default NewRun;