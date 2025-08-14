// workflowSteps/SourceConfigurationStep.jsx
import React from 'react';
import { File, Link, Database } from 'lucide-react';

export const SourceConfigurationStep = ({ 
  sourceType, 
  setSourceType, 
  sourceConfig, 
  handleSourceConfigChange,
  handleFileUpload,
  isFileUploaded,
  isUploading 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Source Type</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setSourceType('file')}
            className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
              sourceType === 'file' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
            }`}
          >
            <File className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
            <span className="text-sm font-medium text-gray-900">File Upload</span>
          </div>
          <div
            onClick={() => setSourceType('api')}
            className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
              sourceType === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
            }`}
          >
            <Link className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
            <span className="text-sm font-medium text-gray-900">API Endpoint</span>
          </div>
          <div className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed">
            <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
            <span className="text-sm font-medium text-gray-400">Database (Coming Soon)</span>
          </div>
        </div>
      </div>

      {sourceType === 'file' && (
        <div className="sg-dataset-tile p-6">
          <h3 className="text-lg font-medium mb-4">File Upload Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Upload File</label>
              <input
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-sm text-gray-600 mt-1">Supported formats: CSV, XLSX, JSON</p>
            </div>
            {isFileUploaded && (
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">✓ File uploaded successfully</p>
              </div>
            )}
          </div>
        </div>
      )}

      {sourceType === 'api' && (
        <div className="sg-dataset-tile p-6">
          <h3 className="text-lg font-medium mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">API Endpoint</label>
              <input
                type="url"
                value={sourceConfig.api.endpoint}
                onChange={(e) => handleSourceConfigChange('endpoint', e.target.value)}
                placeholder="https://api.example.com/data"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Authorization Token (Optional)</label>
              <input
                type="password"
                value={sourceConfig.api.authToken}
                onChange={(e) => handleSourceConfigChange('authToken', e.target.value)}
                placeholder="Bearer token or API key"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">HTTP Method</label>
              <select
                value={sourceConfig.api.method}
                onChange={(e) => handleSourceConfigChange('method', e.target.value)}
                className="w-full"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

