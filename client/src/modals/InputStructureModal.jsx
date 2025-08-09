// ./modals/InputStructureModal.jsx
import React from 'react';
import { X } from 'lucide-react';
import '../styles/Workflow.css'; // Import your CSS styles

const InputStructureModal = ({ isOpen, onClose, inputStructure }) => {
  if (!isOpen) return null;

  const { columns = [] } = inputStructure;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">Input Structure</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          {columns.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {columns.map((col, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{col.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{col.type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          col.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {col.required ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{col.description || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No input structure defined.</p>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputStructureModal;