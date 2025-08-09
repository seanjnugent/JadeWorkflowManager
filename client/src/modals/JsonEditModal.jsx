// ./modals/JsonEditModal.jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import '../styles/Workflow.css'; // Import your CSS styles

const JsonEditModal = ({ isOpen, onClose, title = 'Edit JSON', jsonData, onSave }) => {
  const [jsonText, setJsonText] = useState(JSON.stringify(jsonData, null, 2));
  const [error, setError] = useState(null);

  const handleSave = () => {
    try {
      const parsedJson = JSON.parse(jsonText);
      onSave(parsedJson);
      setError(null);
      onClose();
    } catch (e) {
      setError('Invalid JSON format: ' + e.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">{title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-80 p-3 border border-gray-300 rounded font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Edit JSON configuration..."
            spellCheck="false"
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default JsonEditModal;