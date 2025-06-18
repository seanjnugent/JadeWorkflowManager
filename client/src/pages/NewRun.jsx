import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Play, UploadCloud, Plug, Clock, Download } from 'lucide-react';
import { StepCard, FileUploadArea, ErrorAlert, StepNavigation } from '../components/WorkflowComponents';

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
  const [scheduleOptions, setScheduleOptions] = useState(['none', 'daily', 'weekly', 'monthly']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    { id: 1, title: 'Run Configuration', icon: Play },
    { id: 2, title: 'Input File', icon: UploadCloud },
    { id: 3, title: 'Parameters', icon: Plug },
    { id: 4, title: 'Schedule', icon: Clock },
  ];

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
        console.log('API response:', data); // Debug log
        setWorkflowDetails(data);

        const initialParams = {};
        // Safely handle missing or non-array parameters
        const workflowParams = data.workflow?.parameters || [];
        if (Array.isArray(workflowParams)) {
          workflowParams.forEach((p) => {
            initialParams[p.name] = p.default || '';
          });
        } else if (typeof workflowParams === 'object') {
          // Handle case where parameters might be a JSON object
          Object.keys(workflowParams).forEach(key => {
            initialParams[key] = workflowParams[key]?.default || '';
          });
        }
        setParameters(initialParams);
        
        // Set default run name based on workflow name
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
        if (!file && !workflowDetails?.workflow?.input_file_path) {
          setError('Please upload an input file');
          return false;
        }
        break;
      case 3:
        // If there are required parameters, validate them
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
    }
    return true;
  };

  const handleStartRun = async () => {
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    try {
        const formData = new FormData();
        formData.append('workflow_id', workflowId);
        formData.append('triggered_by', 1); // Replace with actual user ID when available
        
        if (file) {
            formData.append('file', file);
        }
        
        if (Object.keys(parameters).length) {
            formData.append('parameters', JSON.stringify(parameters));
        }
        
        if (scheduleType !== 'none') {
            formData.append('schedule', scheduleType);
        }

        const response = await fetch(`http://localhost:8000/runs/trigger`, { // Changed from /runs/run/new to /runs/trigger
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Run failed');
        }

        const result = await response.json();
        console.log('Run created successfully:', result);
        
        // Navigate to the runs page
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
      setError(''); // Clear errors when moving to next step
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Run Configuration</h2>
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
            onClick={() => navigate(`/workflows/workflow/${workflowId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Workflow
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {steps[currentStep - 1].title}
              </h1>
              
              {error && (
                <ErrorAlert message={error} onDismiss={() => setError('')} />
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Run Name
                    </label>
                    <input
                      type="text"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      placeholder="Enter a unique name for this run"
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workflow Details
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-800">
                        {workflowDetails?.workflow?.name || 'Unnamed Workflow'}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        {workflowDetails?.workflow?.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Input File
                    </label>
                    <FileUploadArea
                      onFileUpload={setFile}
                      isUploading={false}
                      error={error}
                    />
                    {file && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-700 text-sm">
                          File selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button 
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                        onClick={() => {
                          // Logic to view template
                          console.log('View template clicked');
                        }}
                      >
                        View Template
                      </button>
                      <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                        onClick={() => {
                          // Logic to download template
                          console.log('Download template clicked');
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Parameters
                    </label>
                    
                    {Object.keys(parameters).length === 0 ? (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-600">No parameters available for this workflow.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {Object.entries(parameters).map(([name, value]) => {
                          // Find parameter details if available
                          const paramDetails = Array.isArray(workflowDetails?.workflow?.parameters) 
                            ? workflowDetails?.workflow?.parameters.find(p => p.name === name)
                            : null;
                          
                          return (
                            <div key={name} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {paramDetails?.label || name}
                                {paramDetails?.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              
                              {paramDetails?.type === 'select' && Array.isArray(paramDetails?.options) ? (
                                <select
                                  value={value}
                                  onChange={(e) => handleParameterChange(name, e.target.value)}
                                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
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
                                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                              )}
                              
                              {paramDetails?.description && (
                                <p className="text-gray-500 text-sm mt-1">{paramDetails.description}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {scheduleOptions.map((option) => (
                        <div 
                          key={option}
                          onClick={() => setScheduleType(option)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            scheduleType === option 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded-full mr-2 ${
                              scheduleType === option ? 'bg-blue-500' : 'bg-gray-200'
                            }`}></div>
                            <span className="capitalize font-medium">
                              {option === 'none' ? 'No Schedule' : option}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 pl-6">
                            {option === 'none' 
                              ? 'Run once immediately' 
                              : option === 'daily' 
                                ? 'Run once every day'
                                : option === 'weekly'
                                  ? 'Run once every week'
                                  : 'Run once every month'
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={steps.length}
                onBack={() => {
                  setCurrentStep(Math.max(1, currentStep - 1));
                  setError('');
                }}
                onNext={handleNextStep}
                nextLabel={currentStep === steps.length ? 'Start Run' : 'Next'}
                isLoading={isSubmitting}
                disabled={isSubmitting}
              />
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
};

export default NewRun;