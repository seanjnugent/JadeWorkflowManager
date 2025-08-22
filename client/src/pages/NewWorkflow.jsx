import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import axios from 'axios';

// Import step components
import WorkflowDetailsStep from '../components/workflow/steps/WorkflowDetailsStep';
import SourceConfigurationStep from '../components/workflow/steps/SourceConfigurationStep';
import StructurePreviewStep from '../components/workflow/steps/StructurePreviewStep';
import ParametersStep from '../components/workflow/steps/ParametersStep';
import DestinationConfigurationStep from '../components/workflow/steps/DestinationConfigurationStep';
import ETLLogicStep from '../components/workflow/steps/ETLLogicStep';
import ReviewStep from '../components/workflow/steps/ReviewStep';

// Import configuration
import { steps, API_BASE_URL } from '../components/workflow/config/WorkflowConfig';
import { useWorkflowContext, WorkflowProvider } from '../components/workflow/context/WorkflowContext';

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

const NewWorkflowContent = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useWorkflowContext();
  const [successMessage, setSuccessMessage] = useState(null);
  const [isScrolledIntoView, setIsScrolledIntoView] = useState(false);

  const sectionRefs = {
    'workflow-details': useRef(null),
    'source-configuration': useRef(null),
    'structure-preview': useRef(null),
    'parameters': useRef(null),
    'destination-configuration': useRef(null),
    'etl-logic': useRef(null),
    'review': useRef(null),
  };

  useEffect(() => {
    document.title = "Jade | New Workflow";
  }, []);

  useEffect(() => {
    if (isScrolledIntoView && sectionRefs[steps[state.currentStep - 1].id]?.current) {
      sectionRefs[steps[state.currentStep - 1].id].current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, [state.currentStep, isScrolledIntoView]);

  const handleSaveWorkflow = async () => {
    if (!state.workflowName) {
      dispatch({ type: 'SET_ERROR', payload: 'Workflow name is required' });
      return;
    }
    if (!state.workflowDescription) {
      dispatch({ type: 'SET_ERROR', payload: 'Workflow description is required' });
      return;
    }

    dispatch({ type: 'SET_UPLOADING', payload: true });

    try {
      const response = await api.post('/workflows/workflow/create-full', {
        name: state.workflowName,
        description: state.workflowDescription,
        created_by: parseInt(state.userId),
        status: 'Draft',
        source_type: state.sourceType,
        source_config: state.sourceConfig[state.sourceType],
        input_files: state.inputFiles.length > 0 ? state.inputFiles : undefined,
        parameters: state.parameterSections,
        destinations: state.destinationOutputs,
        etl_config: state.etlConfig,
        include_receipt: state.includeReceipt
      });

      setSuccessMessage('Workflow created successfully! DAG scaffold generated.');
      setTimeout(() => {
        navigate('/workflows');
      }, 2000);
    } catch (error) {
      console.error('Save error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.detail || error.message 
      });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  const validateCurrentStep = () => {
  switch (state.currentStep) {
    case 1:
      if (!state.workflowName.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter a workflow name' });
        return false;
      }
      if (!state.workflowDescription.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter a workflow description' });
        return false;
      }
      break;
    case 2:
      // Source configuration validation
      if (state.sourceType === 'api' && !state.sourceConfig.api.endpoint.trim()) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter an API endpoint' });
        return false;
      }
      // File source type is always valid - supports:
      // 1. Uploaded files with detected structure
      // 2. Manually configured input files
      // 3. Generic file processing without templates
      break;
    case 4:
      // Parameters validation
      for (const section of state.parameterSections) {
        if (!section.name.trim()) {
          dispatch({ type: 'SET_ERROR', payload: 'All sections must have a name' });
          return false;
        }
        for (const param of section.parameters) {
          if (!param.name.trim()) {
            dispatch({ type: 'SET_ERROR', payload: 'All parameters must have a name' });
            return false;
          }
          if (param.type === 'select' && (!param.options || param.options.length === 0)) {
            dispatch({ type: 'SET_ERROR', payload: 'Select parameters must have at least one option' });
            return false;
          }
        }
      }
      break;
    case 5:
      // Destination validation
      for (const dest of state.destinationOutputs) {
        if (!dest.name.trim()) {
          dispatch({ type: 'SET_ERROR', payload: 'All destinations must have a name' });
          return false;
        }
        if (dest.type === 'api' && !dest.config.api.endpoint.trim()) {
          dispatch({ type: 'SET_ERROR', payload: 'Please complete API endpoint configuration' });
          return false;
        }
      }
      break;
    case 6:
      // ETL Logic validation
      if (!state.etlConfig.processingType) {
        dispatch({ type: 'SET_ERROR', payload: 'Please select a processing type' });
        return false;
      }
      break;
  }
  dispatch({ type: 'SET_ERROR', payload: '' });
  return true;
};

  const handleNextStep = () => {
    if (!validateCurrentStep()) return;
    if (state.currentStep === steps.length) {
      handleSaveWorkflow();
    } else {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep + 1 });
      dispatch({ type: 'SET_ERROR', payload: '' });
      setIsScrolledIntoView(true);
    }
  };

  const handlePreviousStep = () => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: state.currentStep - 1 });
      dispatch({ type: 'SET_ERROR', payload: '' });
      setIsScrolledIntoView(true);
    }
  };

  const handleJumpLinkClick = (sectionId) => {
    const currentIndex = steps.findIndex(step => step.id === steps[state.currentStep - 1].id);
    const targetIndex = steps.findIndex(step => step.id === sectionId);
    if (targetIndex <= currentIndex) {
      dispatch({ type: 'SET_CURRENT_STEP', payload: targetIndex + 1 });
      setIsScrolledIntoView(true);
    }
  };

  const renderCurrentStep = () => {
    const stepId = steps[state.currentStep - 1].id;
    const commonProps = {
      ref: sectionRefs[stepId],
      onNext: handleNextStep,
      onPrevious: handlePreviousStep,
      isVisible: true
    };

    switch (stepId) {
      case 'workflow-details':
        return <WorkflowDetailsStep {...commonProps} />;
      case 'source-configuration':
        return <SourceConfigurationStep {...commonProps} />;
      case 'structure-preview':
        return <StructurePreviewStep {...commonProps} />;
      case 'parameters':
        return <ParametersStep {...commonProps} />;
      case 'destination-configuration':
        return <DestinationConfigurationStep {...commonProps} />;
      case 'etl-logic':
        return <ETLLogicStep {...commonProps} />;
      case 'review':
        return <ReviewStep {...commonProps} onSave={handleSaveWorkflow} onJumpTo={handleJumpLinkClick} />;
      default:
        return null;
    }
  };

  if (state.isUploading || successMessage) {
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
          border: none;
          background: none;
          width: 100%;
          text-align: left;
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
          opacity: 0.6;
        }

        .sg-contents-link-disabled::before {
          color: var(--sg-gray);
        }

        .sg-contents-link-disabled:hover {
          background-color: transparent;
          border-left-color: transparent;
        }

        .sg-error {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: var(--sg-space-md);
          border-radius: var(--radius);
          font-family: var(--sg-font-family);
          font-size: 0.875rem;
          line-height: 1.25;
        }

        .sg-error-text {
          color: #991b1b;
        }
      `}</style>

      {/* Page Header */}
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
          <h1 className="sg-page-header-title">New Workflow</h1>
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Create a new workflow with auto-generated DAG scaffold and custom ETL logic
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8 flex gap-8">
        {/* Navigation Sidebar */}
        <div className="w-1/4 shrink-0">
          <div className="sg-contents-sticky">
            <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">Contents</h2>
            <nav>
              <ul className="sg-contents-nav">
                {steps.map((step, index) => (
                  <li key={step.id} className="sg-contents-item">
                    <button
                      onClick={() => handleJumpLinkClick(step.id)}
                      disabled={index > state.currentStep - 1}
                      className={`sg-contents-link ${
                        state.currentStep === index + 1
                          ? 'sg-contents-link-active'
                          : index < state.currentStep
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

        {/* Main Content */}
        <div className="w-3/4">
          {/* Error Display */}
          {state.uploadError && (
            <div className="sg-error mb-6">
              <div className="flex justify-between items-center">
                <span className="sg-error-text">{state.uploadError}</span>
                <button 
                  onClick={() => dispatch({ type: 'SET_ERROR', payload: '' })} 
                  className="text-red-700 hover:text-red-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

const NewWorkflow = () => {
  return (
    <WorkflowProvider>
      <NewWorkflowContent />
    </WorkflowProvider>
  );
};

export default NewWorkflow;