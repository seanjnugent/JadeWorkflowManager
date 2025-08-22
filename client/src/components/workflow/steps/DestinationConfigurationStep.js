import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight, Database, FileSpreadsheet, Link, Plus, Trash2, Settings } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { DATABASE_CONNECTIONS } from '../config/WorkflowConfig';

const DestinationConfigurationStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();

  const handleAddDestination = () => {
    dispatch({ type: 'ADD_DESTINATION_OUTPUT' });
  };

  const handleRemoveDestination = (id) => {
    if (state.destinationOutputs.length > 1) {
      dispatch({ type: 'REMOVE_DESTINATION_OUTPUT', payload: id });
    }
  };

  const handleDestinationChange = (id, field, value) => {
    dispatch({
      type: 'UPDATE_DESTINATION_OUTPUT',
      payload: {
        id,
        updates: { [field]: value }
      }
    });
  };

  const handleDestinationConfigChange = (id, configType, field, value) => {
    const destination = state.destinationOutputs.find(d => d.id === id);
    const updatedConfig = {
      ...destination.config,
      [configType]: {
        ...destination.config[configType],
        [field]: value
      }
    };
    
    dispatch({
      type: 'UPDATE_DESTINATION_OUTPUT',
      payload: {
        id,
        updates: { config: updatedConfig }
      }
    });
  };

  if (!isVisible) return null;

  return (
    <section id="destination-configuration" ref={ref} className="sg-dataset-tile">
      <div className="sg-section-separator">
        <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
          <Database className="h-5 w-5 text-[#0065bd]" />
          Destination Configuration
        </h2>
      </div>
      <p className="sg-dataset-description mb-6">
        Configure where your processed data will be saved. You can have multiple output destinations.
      </p>

      <div className="space-y-6">
        {/* Add Destination Button */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Output Destinations ({state.destinationOutputs.length})</h3>
            <p className="text-sm text-gray-600">
              Configure one or more destinations for your processed data
            </p>
          </div>
          <button
            onClick={handleAddDestination}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0065bd] border border-[#0065bd] rounded hover:bg-[#0065bd] hover:text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Output Destination
          </button>
        </div>

        {/* Destination List */}
        <div className="space-y-4">
          {state.destinationOutputs.map((destination, index) => (
            <div key={destination.id} className="sg-dataset-tile border-2 border-gray-200">
              {/* Destination Header */}
              <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0065bd] text-white text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">Output {index + 1}</h4>
                    <p className="text-sm text-gray-600">{destination.name}</p>
                  </div>
                </div>
                {state.destinationOutputs.length > 1 && (
                  <button
                    onClick={() => handleRemoveDestination(destination.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Remove destination"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-6">
                {/* Basic Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Output Name *</label>
                    <input
                      type="text"
                      value={destination.name}
                      onChange={(e) => handleDestinationChange(destination.id, 'name', e.target.value)}
                      placeholder="e.g., processed_data, summary_report"
                      className="w-full"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Unique name for this output (used in file naming and DAG operations)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Description (Optional)</label>
                    <input
                      type="text"
                      value={destination.description || ''}
                      onChange={(e) => handleDestinationChange(destination.id, 'description', e.target.value)}
                      placeholder="e.g., Main processed dataset"
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Destination Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">Destination Type</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                      onClick={() => handleDestinationChange(destination.id, 'type', 'csv')}
                      className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors border-2 ${
                        destination.type === 'csv' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <FileSpreadsheet className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                      <span className="text-sm font-medium text-gray-900">CSV File</span>
                      <p className="text-xs text-gray-600 mt-1">Save as CSV to S3</p>
                    </div>
                    
                    <div
                      onClick={() => handleDestinationChange(destination.id, 'type', 'api')}
                      className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors border-2 ${
                        destination.type === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Link className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                      <span className="text-sm font-medium text-gray-900">API Endpoint</span>
                      <p className="text-xs text-gray-600 mt-1">Send to REST API</p>
                    </div>
                    
                    <div className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed border-2 border-gray-300">
                      <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
                      <span className="text-sm font-medium text-gray-400">Database</span>
                      <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
                    </div>
                  </div>
                </div>

                {/* CSV Configuration */}
                {destination.type === 'csv' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV File Configuration
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Filename Template</label>
                        <input
                          type="text"
                          value={destination.config.csv.filename}
                          onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'filename', e.target.value)}
                          placeholder="output.csv"
                          className="w-full"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          Supports variables: {'{workflow_id}'}, {'{created_at}'}, {'{output_name}'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">S3 Path</label>
                        <input
                          type="text"
                          value={destination.config.csv.path}
                          onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'path', e.target.value)}
                          placeholder="outputs/"
                          className="w-full"
                        />
                        <p className="text-xs text-blue-700 mt-1">
                          S3 bucket path (e.g., "outputs/", "reports/monthly/")
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-blue-900 mb-2">Delimiter</label>
                        <select
                          value={destination.config.csv.delimiter}
                          onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'delimiter', e.target.value)}
                          className="w-full"
                        >
                          <option value=",">Comma (,)</option>
                          <option value=";">Semicolon (;)</option>
                          <option value="\t">Tab</option>
                          <option value="|">Pipe (|)</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
                          <input
                            type="checkbox"
                            checked={destination.config.csv.includeHeaders}
                            onChange={(e) => handleDestinationConfigChange(destination.id, 'csv', 'includeHeaders', e.target.checked)}
                            className="h-4 w-4 border-blue-300 text-[#0065bd] focus:ring-[#0065bd] rounded"
                          />
                          Include Headers
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                      <p className="text-xs font-medium text-blue-900 mb-1">Final Path Preview:</p>
                      <code className="text-xs text-blue-800 break-all">
                        s3://jade-files/{destination.config.csv.path}{destination.config.csv.filename}
                      </code>
                    </div>
                  </div>
                )}

                {/* API Configuration */}
                {destination.type === 'api' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      API Endpoint Configuration
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-green-900 mb-2">API Endpoint *</label>
                        <input
                          type="url"
                          value={destination.config.api.endpoint}
                          onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'endpoint', e.target.value)}
                          placeholder="https://api.example.com/data"
                          className="w-full"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          Full URL where the processed data will be sent
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-2">HTTP Method</label>
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
                        
                        <div>
                          <label className="block text-sm font-medium text-green-900 mb-2">Content Type</label>
                          <select
                            value={destination.config.api.contentType || 'application/json'}
                            onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'contentType', e.target.value)}
                            className="w-full"
                          >
                            <option value="application/json">JSON</option>
                            <option value="application/x-www-form-urlencoded">Form Data</option>
                          </select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-green-900 mb-2">Authorization Token (Optional)</label>
                        <input
                          type="password"
                          value={destination.config.api.authToken}
                          onChange={(e) => handleDestinationConfigChange(destination.id, 'api', 'authToken', e.target.value)}
                          placeholder="Bearer token or API key"
                          className="w-full"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          Will be sent as Authorization header if provided
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-green-900 mb-2">Additional Headers (Optional)</label>
                        <textarea
                          value={destination.config.api.headers ? JSON.stringify(destination.config.api.headers, null, 2) : '{}'}
                          onChange={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value);
                              handleDestinationConfigChange(destination.id, 'api', 'headers', headers);
                            } catch (err) {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder='{"X-Custom-Header": "value"}'
                          className="w-full min-h-[80px] font-mono text-sm"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          JSON object with additional headers to send
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <h5 className="font-medium text-yellow-900 mb-2">API Requirements</h5>
                      <ul className="text-xs text-yellow-800 space-y-1">
                        <li>Endpoint should accept JSON data in request body</li>
                        <li>Data will be sent as array of objects (records)</li>
                        <li>Should return 2xx status code for success</li>
                        <li>HTTPS endpoints are recommended</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Database Configuration (Coming Soon) */}
                {destination.type === 'database' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-50">
                    <h4 className="font-medium text-gray-600 mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Configuration (Coming Soon)
                    </h4>
                    <div className="text-center py-8">
                      <Database className="mx-auto h-12 w-12 text-gray-400" />
                      <h5 className="mt-2 text-lg font-medium text-gray-600">Database Integration</h5>
                      <p className="mt-1 text-sm text-gray-500">
                        Direct database outputs will be available in a future release
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Output Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Output Operations Summary</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>Your configured destinations will generate the following Dagster operations:</p>
            <div className="space-y-1 ml-4">
              {state.destinationOutputs.map((dest, index) => (
                <div key={dest.id} className="font-mono text-xs bg-white p-2 rounded border border-blue-200">
                  <code>_3_{index + 1}_save_{dest.type}_{dest.name}_{'{workflow_id}'}</code>
                  <span className="text-blue-600 ml-2">→ {dest.type.toUpperCase()}</span>
                </div>
              ))}
              <div className="font-mono text-xs bg-white p-2 rounded border border-blue-200">
                <code>_4_save_receipt_{'{workflow_id}'}</code>
                <span className="text-blue-600 ml-2">→ Processing metadata</span>
              </div>
            </div>
            <p className="mt-3">
              All outputs include automatic error handling, retry logic, and processing receipts for audit trails.
            </p>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">Best Practices</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>Use descriptive names for outputs (e.g., "cleaned_data", "summary_report")</li>
            <li>Include timestamps in file names for versioning</li>
            <li>Test API endpoints before deploying to production</li>
            <li>Use appropriate S3 paths to organize outputs logically</li>
            <li>Consider data sensitivity when choosing output destinations</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={onPrevious}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
});

DestinationConfigurationStep.displayName = 'DestinationConfigurationStep';

export default DestinationConfigurationStep;