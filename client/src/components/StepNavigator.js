import React from 'react';
import { ChevronLeft, Save } from 'lucide-react';

const StepNavigator = ({ step, setStep, steps, handleSaveWorkflow, isFileUploaded, workflowName, workflowDescription, userId, parameters, workflowSteps }) => {
  const isContinueDisabled =
    (step === 0 && (!isFileUploaded || !workflowName || !workflowDescription || !userId)) ||
    (step === 2 && parameters.some(param => !param.name)) ||
    (step === 3 && workflowSteps.some(step => !step.label || !step.code));

  return (
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
          disabled={isContinueDisabled}
          className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 ${
            isContinueDisabled ? 'opacity-50 cursor-not-allowed' : ''
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
  );
};

export default StepNavigator;
