import React from 'react';
import { Plus } from 'lucide-react';

const ParametersForm = ({ parameters, handleAddParameter, handleParameterChange }) => {
  return (
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
  );
};

export default ParametersForm;
