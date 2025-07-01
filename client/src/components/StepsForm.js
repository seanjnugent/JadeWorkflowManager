import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/python/python';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/r/r';
import 'codemirror/theme/material.css';

const StepsForm = ({ workflowSteps, handleAddStep, handleStepChange, handleDeleteStep, codeError, parameters, parsedFileStructure }) => {
  const insertParameter = (stepIndex, paramName) => {
    const step = workflowSteps[stepIndex];
    const newCode = step.code + `params["${paramName}"]`;
    handleStepChange(stepIndex, 'code', newCode);
  };

  const insertColumn = (stepIndex, columnName) => {
    const step = workflowSteps[stepIndex];
    const newCode = step.code + `df["${columnName}"]`;
    handleStepChange(stepIndex, 'code', newCode);
  };

  return (
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
            <CodeMirror
              value={step.code}
              onBeforeChange={(editor, data, value) => {
                handleStepChange(index, 'code', value);
              }}
              options={{
                mode: step.code_type,
                theme: 'material',
                lineNumbers: true,
              }}
            />
            <div className="flex space-x-2 mt-2">
              {parameters.map((param, paramIndex) => (
                <button
                  key={paramIndex}
                  onClick={() => insertParameter(index, param.name)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  {param.name}
                </button>
              ))}
              {parsedFileStructure.map((col, colIndex) => (
                <button
                  key={colIndex}
                  onClick={() => insertColumn(index, col.column)}
                  className="bg-green-500 text-white px-2 py-1 rounded"
                >
                  {col.column}
                </button>
              ))}
            </div>
          </div>
          {codeError && (
            <p className="text-red-600 text-sm">{codeError}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default StepsForm;
