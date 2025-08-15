// workflowSteps/DestinationConfigurationStep.jsx
import React from 'react';
import { FileSpreadsheet, Waypoints, Database, Plus, Trash2 } from 'lucide-react';

export const DestinationConfigurationStep = ({ 
  destinationOutputs, 
  handleAddDestination,
  handleRemoveDestination,
  handleDestinationChange,
  handleDestinationConfigChange 
}) => {
  return (
    <div className="space-y-6">
      {destinationOutputs.map((destination, index) => (
        <div key={destination.id} className="sg-dataset-tile p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Output {index + 1}</h3>
            {destinationOutputs.length > 1 && (
              <button
                onClick={() => handleRemoveDestination(destination.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Output Name</label>
              <input
                type="text"
                value={destination.name}
                onChange={(e) => handleDestinationChange(destination.id, 'name', e.target.value)}
                placeholder="e.g., processed_data"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Destination Type</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  onClick={() => handleDestinationChange(destination.id, 'type', 'csv')}
                  className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                    destination.type === 'csv' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                  }`}
                >
                  <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                  <span className="text-sm font-medium text-gray-900">CSV File</span>
                </div>
                <div
                  onClick={() => handleDestinationChange(destination.id, 'type', 'api')}
                  className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors ${
                    destination.type === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300'
                  }`}
                >
                  <Waypoints className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                  <span className="text-sm font-medium text-gray-900">API Endpoint</span>
                </div>
                <div className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed">
                  <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
                  <span className="text-sm font-medium text-gray-400">Database (Coming Soon)</span>
                </div>
              </div>
            </div>

            {destination.type === 'csv' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded">
                <h4 className="font-medium">CSV Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Filename</label>
                    <input
                      type="text"
                      value={destination.config.csv.filename}
                      onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'filename', e.target.value)}
                      placeholder="output.csv"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Path</label>
                    <input
                      type="text"
                      value={destination.config.csv.path}
                      onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'path', e.target.value)}
                      placeholder="outputs/"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {destination.type === 'api' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded">
                <h4 className="font-medium">API Configuration</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">API Endpoint</label>
                    <input
                      type="url"
                      value={destination.config.api.endpoint}
                      onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'endpoint', e.target.value)}
                      placeholder="https://api.example.com/data"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Authorization Token</label>
                    <input
                      type="password"
                      value={destination.config.api.authToken}
                      onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'authToken', e.target.value)}
                      placeholder="Bearer token or API key"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">HTTP Method</label>
                    <select
                      value={destination.config.api.method}
                      onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'method', e.target.value)}
                      className="w-full"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      <button
        onClick={handleAddDestination}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0065bd] border border-[#0065bd] rounded hover:bg-[#0065bd] hover:text-white transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Output Destination
      </button>
    </div>
  );
};

