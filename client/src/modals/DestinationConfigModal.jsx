// ./modals/DestinationConfigModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../styles/Workflow.css'; // Import your CSS styles

const DestinationConfigModal = ({ isOpen, onClose, initialConfig, onSave }) => {
  const [apiUrl, setApiUrl] = useState(initialConfig?.api_url || '');
  const [apiToken, setApiToken] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setApiUrl(initialConfig?.api_url || '');
      setApiToken('');
      setError(null);
    }
  }, [isOpen, initialConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!apiUrl.trim()) {
      setError('API URL is required');
      return;
    }

    try {
      await onSave({ api_url: apiUrl.trim(), api_token: apiToken.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save configuration');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] flex flex-col rounded-lg shadow-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-xl font-semibold text-gray-900">Edit Destination Configuration</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-auto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Token (Optional)</label>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter token (will be encrypted)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Token will be encrypted at rest and only decrypted at runtime.
              </p>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </form>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DestinationConfigModal;