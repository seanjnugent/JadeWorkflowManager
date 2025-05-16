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
  const [error, setError] = useState('');

  const steps = [
    { id: 1, title: 'Run Configuration', icon: Play },
    { id: 2, title: 'Input File', icon: UploadCloud },
    { id: 3, title: 'Parameters', icon: Plug },
    { id: 4, title: 'Schedule', icon: Clock },
  ];

  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/workflows/workflow/${workflowId}`);
        const data = await response.json();
        setWorkflowDetails(data);
        
        const initialParams = {};
        data.workflow.parameters.forEach((p) => {
          initialParams[p.name] = p.default || '';
        });
        setParameters(initialParams);
      } catch (err) {
        setError('Failed to load workflow details');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflowDetails();
  }, [workflowId]);

  const handleStartRun = async () => {
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      
      const response = await fetch(`/api/runs`, {
        method: 'POST',
        body: JSON.stringify({
          workflowId,
          runName,
          parameters,
          schedule: scheduleType === 'none' ? null : { type: scheduleType }
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Run failed');
      
      navigate('/runs');
    } catch (err) {
      setError(err.message || 'Failed to start run');
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
              <h1 className="text-2xl font-bold text-gray-800 mb-2">{steps[currentStep - 1].title}</h1>
              
              {error && <ErrorAlert message={error} onDismiss={() => setError('')} />}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Run Name</label>
                    <input
                      type="text"
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      placeholder="Enter a unique name for this run"
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Input File</label>
                    <FileUploadArea
                      onFileUpload={setFile}
                      isUploading={false}
                      error={error}
                    />
                    <div className="flex gap-3 mt-4">
                      <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border border-gray-200">
                        View Template
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center">
                        <Download className="w-4 h-4 mr-1" /> Download Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={steps.length}
                onBack={() => setCurrentStep(Math.max(1, currentStep - 1))}
                onNext={() => {
                  if (currentStep === steps.length) {
                    handleStartRun();
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                nextLabel={currentStep === steps.length ? 'Start Run' : 'Next'}
              />
            </motion.div>
          </AnimatePresence>
        </motion.main>
      </div>
    </div>
  );
};
export default NewRun;
