import { useWorkflowContext } from '../context/WorkflowContext';
import React, { forwardRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Upload, File, Link, Database, Plus, Trash2, Settings, FileX, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL, INPUT_FILE_TYPES, FILE_STRUCTURE_TYPES } from '../config/WorkflowConfig';

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

const SourceConfigurationStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();

  const handleSourceTypeChange = (type) => {
    dispatch({ type: 'SET_SOURCE_TYPE', payload: type });
    // Reset file upload status when changing source type
    if (type !== 'file') {
      dispatch({ type: 'SET_FILE_UPLOADED', payload: false });
    }
  };

  const handleAddInputFile = () => {
    dispatch({ type: 'ADD_INPUT_FILE' });
  };

  const handleRemoveInputFile = (index) => {
    if (state.inputFiles.length > 1) {
      dispatch({ type: 'REMOVE_INPUT_FILE', payload: index });
    }
  };

  const handleInputFileChange = (index, field, value) => {
    dispatch({
      type: 'UPDATE_INPUT_FILE',
      payload: {
        index,
        updates: { [field]: value }
      }
    });
  };

  const handleSetNoFixedStructure = (fileIndex) => {
    dispatch({
      type: 'UPDATE_INPUT_FILE',
      payload: {
        index: fileIndex,
        updates: { 
          structure: [],
          hasFixedStructure: false,
          description: state.inputFiles[fileIndex].description || 'Dynamic structure file - structure will be determined at runtime'
        }
      }
    });
  };

  const handleAddStructureField = (fileIndex) => {
    const currentFile = state.inputFiles[fileIndex];
    const newStructure = [
      ...currentFile.structure,
      {
        name: '',
        type: 'string',
        required: true,
        description: ''
      }
    ];
    
    dispatch({
      type: 'UPDATE_INPUT_FILE',
      payload: {
        index: fileIndex,
        updates: { 
          structure: newStructure,
          hasFixedStructure: true 
        }
      }
    });
  };

  const handleStructureFieldChange = (fileIndex, fieldIndex, field, value) => {
    const currentFile = state.inputFiles[fileIndex];
    const newStructure = currentFile.structure.map((structField, idx) =>
      idx === fieldIndex ? { ...structField, [field]: value } : structField
    );
    
    dispatch({
      type: 'UPDATE_INPUT_FILE',
      payload: {
        index: fileIndex,
        updates: { structure: newStructure }
      }
    });
  };

  const handleRemoveStructureField = (fileIndex, fieldIndex) => {
    const currentFile = state.inputFiles[fileIndex];
    const newStructure = currentFile.structure.filter((_, idx) => idx !== fieldIndex);
    
    dispatch({
      type: 'UPDATE_INPUT_FILE',
      payload: {
        index: fileIndex,
        updates: { structure: newStructure }
      }
    });
  };

  const handleSourceConfigChange = (field, value) => {
    dispatch({ 
      type: 'UPDATE_SOURCE_CONFIG', 
      payload: { [field]: value } 
    });
  };

  const handleUseGenericProcessing = () => {
    // Mark source as configured for generic processing
    dispatch({ type: 'SET_FILE_UPLOADED', payload: true });
    dispatch({ type: 'SET_PARSED_FILE_STRUCTURE', payload: [] });
    dispatch({ type: 'SET_INPUT_FILES', payload: [] });
    dispatch({ type: 'SET_ERROR', payload: '' });
  };

  const handleFileUpload = useCallback(
    async (file, fileIndex = null) => {
      if (!state.workflowName) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter a workflow name first' });
        return;
      }
      if (!state.workflowDescription) {
        dispatch({ type: 'SET_ERROR', payload: 'Please enter a workflow description first' });
        return;
      }

      dispatch({ type: 'SET_UPLOADING', payload: true });

      try {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        
        if (!['csv', 'xlsx', 'json', 'pdf'].includes(fileExtension)) {
          throw new Error('Unsupported file type. Please use CSV, XLSX, JSON, or PDF files.');
        }

        // Analyze file structure
        let structure = [];
        let fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        
        if (fileExtension === 'csv') {
          const text = await file.text();
          const lines = text.split('\n').slice(0, 5);
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const sampleRows = lines.slice(1, 4).map(line => 
              line.split(',').map(cell => cell.trim().replace(/"/g, ''))
            );
            
            structure = headers.map((header, index) => ({
              name: header,
              type: 'string', // Default, user can change
              required: true,
              description: `Field: ${header}`,
              samples: sampleRows.map(row => row[index] || '').filter(cell => cell !== '')
            }));
          }
        } else if (fileExtension === 'json') {
          const text = await file.text();
          const data = JSON.parse(text);
          let sampleObject = data;
          
          if (Array.isArray(data) && data.length > 0) {
            sampleObject = data[0];
          }
          
          if (typeof sampleObject === 'object' && sampleObject !== null) {
            structure = Object.keys(sampleObject).map(key => ({
              name: key,
              type: typeof sampleObject[key] === 'number' ? 'integer' : 'string',
              required: true,
              description: `Field: ${key}`,
              samples: Array.isArray(data) ? 
                data.slice(0, 3).map(item => item[key]).filter(val => val !== undefined) : 
                [sampleObject[key]]
            }));
          }
        } else if (fileExtension === 'pdf') {
          // PDF - set generic structure
          structure = [
            { name: 'extracted_text', type: 'string', required: true, description: 'Extracted text content' },
            { name: 'page_number', type: 'integer', required: true, description: 'Page number' },
            { name: 'metadata', type: 'string', required: false, description: 'Document metadata' }
          ];
        }

        // Create or update input file configuration
        const inputFileConfig = {
          name: fileName,
          path: `jade-files/inputs/{workflow_id}/${file.name}`,
          format: fileExtension,
          structure: structure,
          hasFixedStructure: structure.length > 0,
          required: true,
          description: `${fileExtension.toUpperCase()} input file`
        };

        if (fileIndex !== null) {
          // Update existing file
          dispatch({
            type: 'UPDATE_INPUT_FILE',
            payload: {
              index: fileIndex,
              updates: inputFileConfig
            }
          });
        } else {
          // Add new file or update single file mode
          if (state.inputFiles.length === 0) {
            dispatch({ type: 'SET_INPUT_FILES', payload: [inputFileConfig] });
          } else {
            dispatch({ type: 'ADD_INPUT_FILE' });
            dispatch({
              type: 'UPDATE_INPUT_FILE',
              payload: {
                index: state.inputFiles.length,
                updates: inputFileConfig
              }
            });
          }
        }

        // Update legacy structure for backward compatibility
        if (structure.length > 0) {
          const legacyStructure = structure.map(field => ({
            column: field.name,
            detectedType: field.type,
            type: field.type,
            format: 'none',
            samples: field.samples || []
          }));
          dispatch({ type: 'SET_PARSED_FILE_STRUCTURE', payload: legacyStructure });
        }

        dispatch({ type: 'SET_FILE_UPLOADED', payload: true });
        dispatch({ type: 'SET_ERROR', payload: '' });
        
      } catch (error) {
        console.error('File analysis error:', error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: `File analysis failed: ${error.message}` 
        });
        dispatch({ type: 'SET_FILE_UPLOADED', payload: false });
      } finally {
        dispatch({ type: 'SET_UPLOADING', payload: false });
      }
    },
    [state.workflowName, state.workflowDescription, state.inputFiles, dispatch]
  );

  const testApiConnection = async () => {
    if (!state.sourceConfig.api.endpoint) {
      dispatch({ type: 'SET_ERROR', payload: 'Please enter an API endpoint first' });
      return;
    }

    dispatch({ type: 'SET_UPLOADING', payload: true });

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.sourceConfig.api.authToken) {
        headers.Authorization = `Bearer ${state.sourceConfig.api.authToken}`;
      }

      const testResponse = await fetch(state.sourceConfig.api.endpoint, {
        method: state.sourceConfig.api.method,
        headers: {
          ...headers,
          ...state.sourceConfig.api.headers
        }
      });

      if (testResponse.ok) {
        const data = await testResponse.json();
        
        // Try to infer structure from response
        let sampleData = data;
        if (Array.isArray(data) && data.length > 0) {
          sampleData = data[0];
        }

        if (typeof sampleData === 'object' && sampleData !== null) {
          const structure = Object.keys(sampleData).map(key => ({
            column: key,
            detectedType: typeof sampleData[key],
            type: typeof sampleData[key],
            format: 'none',
            samples: Array.isArray(data) ? data.slice(0, 3).map(item => item[key]) : [sampleData[key]]
          }));
          dispatch({ type: 'SET_PARSED_FILE_STRUCTURE', payload: structure });
        }

        dispatch({ type: 'SET_ERROR', payload: '' });
        dispatch({ type: 'SET_FILE_UPLOADED', payload: true }); // Mark as "configured"
      } else {
        throw new Error(`API returned ${testResponse.status}: ${testResponse.statusText}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `API connection failed: ${error.message}` 
      });
      dispatch({ type: 'SET_FILE_UPLOADED', payload: false });
    } finally {
      dispatch({ type: 'SET_UPLOADING', payload: false });
    }
  };

  // Check if source is configured (always true for file type now)
  const isSourceConfigured = () => {
    if (state.sourceType === 'file') {
      return true; // File source is always considered configured
    } else if (state.sourceType === 'api') {
      return state.sourceConfig.api.endpoint && state.sourceConfig.api.endpoint.trim() !== '';
    }
    return false;
  };

  if (!isVisible) return null;

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

        .sg-section-separator {
          border-bottom: 1px solid #b3b3b3;
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-dataset-tile {
          background: white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border: 1px solid var(--sg-gray-light);
          border-radius: var(--radius);
          padding: var(--sg-space-lg);
          display: block;
          text-decoration: none;
          cursor: pointer;
          transition: box-shadow 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: 8px;
          text-decoration: none;
        }

        .sg-input {
          width: 100%;
          padding: var(--sg-space-sm) var(--sg-space-md);
          border: 1px solid var(--sg-gray-border);
          border-radius: var(--radius);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          background-color: white;
          transition: border-color 0.2s ease-in-out;
        }

        .sg-input:focus {
          outline: none;
          border-color: var(--sg-blue);
          box-shadow: 0 0 0 2px rgba(0, 101, 189, 0.1);
        }

        .sg-button-primary {
          display: inline-flex;
          align-items: center;
          gap: var(--sg-space-sm);
          padding: var(--sg-space-sm) var(--sg-space-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          background-color: var(--sg-blue);
          border: 1px solid var(--sg-blue);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .sg-button-primary:hover {
          background-color: var(--sg-blue-hover);
          border-color: var(--sg-blue-hover);
        }

        .sg-button-secondary {
          display: inline-flex;
          align-items: center;
          gap: var(--sg-space-sm);
          padding: var(--sg-space-sm) var(--sg-space-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--sg-blue);
          background-color: white;
          border: 1px solid var(--sg-blue);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .sg-button-secondary:hover {
          background-color: var(--sg-blue);
          color: white;
        }

        .sg-button-ghost {
          display: inline-flex;
          align-items: center;
          gap: var(--sg-space-sm);
          padding: var(--sg-space-sm) var(--sg-space-md);
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--sg-gray);
          background-color: white;
          border: 1px solid var(--sg-gray-border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .sg-button-ghost:hover {
          background-color: var(--sg-gray-bg);
        }

        .sg-select {
          width: 100%;
          padding: var(--sg-space-sm) var(--sg-space-md);
          border: 1px solid var(--sg-gray-border);
          border-radius: var(--radius);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          background-color: white;
          transition: border-color 0.2s ease-in-out;
        }

        .sg-select:focus {
          outline: none;
          border-color: var(--sg-blue);
          box-shadow: 0 0 0 2px rgba(0, 101, 189, 0.1);
        }

        .sg-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--sg-text-primary);
          margin-bottom: var(--sg-space-sm);
        }

        .sg-help-text {
          font-size: 0.875rem;
          color: var(--sg-text-secondary);
          margin-top: var(--sg-space-xs);
        }
      `}</style>

      <section id="source-configuration" ref={ref} className="sg-dataset-tile">
        <div className="sg-section-separator">
          <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#0065bd]" />
            Source Configuration
          </h2>
        </div>
        <p className="sg-dataset-description mb-6">
          Configure the data source for your workflow. This determines how data will be loaded in your Dagster DAG.
        </p>

        <div className="space-y-6">
          <div>
            <label className="sg-label">Source Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => handleSourceTypeChange('file')}
                className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors border-2 ${
                  state.sourceType === 'file' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <File className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                <span className="text-sm font-medium text-gray-900">File Upload</span>
                <p className="text-xs text-gray-600 mt-1">Upload CSV, Excel, or JSON files</p>
              </div>
              
              <div
                onClick={() => handleSourceTypeChange('api')}
                className={`sg-dataset-tile p-4 text-center cursor-pointer transition-colors border-2 ${
                  state.sourceType === 'api' ? 'border-[#0065bd] bg-[#e6f3ff]' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Link className="w-6 h-6 mb-2 text-gray-600 mx-auto" />
                <span className="text-sm font-medium text-gray-900">API Endpoint</span>
                <p className="text-xs text-gray-600 mt-1">Fetch data from REST APIs</p>
              </div>
              
              <div className="sg-dataset-tile p-4 text-center opacity-50 cursor-not-allowed border-2 border-gray-300">
                <Database className="w-6 h-6 mb-2 text-gray-400 mx-auto" />
                <span className="text-sm font-medium text-gray-400">Database</span>
                <p className="text-xs text-gray-400 mt-1">Coming Soon</p>
              </div>
            </div>
          </div>

          {/* File Upload Configuration */}
          {state.sourceType === 'file' && (
            <div className="sg-dataset-tile p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <File className="h-5 w-5 text-[#0065bd]" />
                Input Files Configuration
              </h3>
              
              {/* Source configuration status */}
              {isSourceConfigured() && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">File source configured successfully!</p>
                      <p className="text-sm text-green-700">
                        {state.inputFiles && state.inputFiles.length > 0 
                          ? `${state.inputFiles.length} input file${state.inputFiles.length !== 1 ? 's' : ''} configured`
                          : 'Generic file processing enabled - supports any file structure'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Processing Mode Selection */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Choose Your Processing Mode</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">Template-Based Processing</h5>
                    <p className="text-sm text-blue-700 mb-3">
                      Define specific input files with known structures for optimized processing
                    </p>
                    <button
                      onClick={handleAddInputFile}
                      className="sg-button-secondary text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Define Input Files
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded border border-blue-200">
                    <h5 className="font-medium text-blue-800 mb-2">Generic Processing</h5>
                    <p className="text-sm text-blue-700 mb-3">
                      Handle any file structure dynamically at runtime - no template required
                    </p>
                    <button
                      onClick={handleUseGenericProcessing}
                      className="sg-button-secondary text-xs"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Enable Generic Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* Multiple Files Management */}
              <div className="space-y-6">
                {state.inputFiles && state.inputFiles.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Input Files ({state.inputFiles.length})</h4>
                        <p className="sg-help-text">Configure one or more input files for your workflow</p>
                      </div>
                      <button
                        onClick={handleAddInputFile}
                        className="sg-button-secondary"
                      >
                        <Plus className="h-4 w-4" />
                        Add Input File
                      </button>
                    </div>

                    {state.inputFiles.map((inputFile, fileIndex) => (
                      <div key={fileIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <h5 className="font-medium text-gray-900">Input File {fileIndex + 1}</h5>
                          {state.inputFiles.length > 1 && (
                            <button
                              onClick={() => handleRemoveInputFile(fileIndex)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="sg-label">File Name</label>
                            <input
                              type="text"
                              value={inputFile.name}
                              onChange={(e) => handleInputFileChange(fileIndex, 'name', e.target.value)}
                              placeholder="e.g., hearings_file, disposals_file"
                              className="sg-input"
                            />
                          </div>

                          <div>
                            <label className="sg-label">File Format</label>
                            <select
                              value={inputFile.format}
                              onChange={(e) => handleInputFileChange(fileIndex, 'format', e.target.value)}
                              className="sg-select"
                            >
                              {INPUT_FILE_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="sg-label">File Path</label>
                            <input
                              type="text"
                              value={inputFile.path}
                              onChange={(e) => handleInputFileChange(fileIndex, 'path', e.target.value)}
                              placeholder="jade-files/inputs/{workflow_id}/filename.csv"
                              className="sg-input"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="sg-label">Description</label>
                            <input
                              type="text"
                              value={inputFile.description}
                              onChange={(e) => handleInputFileChange(fileIndex, 'description', e.target.value)}
                              placeholder="e.g., Hearing events data with case information"
                              className="sg-input"
                            />
                          </div>
                        </div>

                        {/* File Upload */}
                        <div>
                          <label className="sg-label">Upload Sample File (Optional)</label>
                          <input
                            type="file"
                            accept=".csv,.xlsx,.json,.pdf"
                            onChange={(e) => handleFileUpload(e.target.files[0], fileIndex)}
                            disabled={state.isUploading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                          />
                          <p className="sg-help-text">
                            Upload to auto-detect structure, or define manually below
                          </p>
                        </div>

                        {/* Structure Configuration */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="sg-label mb-0">File Structure</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSetNoFixedStructure(fileIndex)}
                                className="text-sm text-orange-600 hover:text-orange-800 flex items-center gap-1 px-2 py-1 border border-orange-200 rounded hover:bg-orange-50"
                              >
                                <FileX className="h-3 w-3" />
                                No Fixed Structure
                              </button>
                              <button
                                onClick={() => handleAddStructureField(fileIndex)}
                                className="text-sm text-[#0065bd] hover:text-[#004a9f] flex items-center gap-1 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                              >
                                <Plus className="h-3 w-3" />
                                Add Field
                              </button>
                            </div>
                          </div>

                          {inputFile.hasFixedStructure === false ? (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <FileX className="h-5 w-5 text-orange-600" />
                                <h6 className="font-medium text-orange-900">Dynamic Structure File</h6>
                              </div>
                              <p className="text-sm text-orange-800 mb-3">
                                This file will be processed without a predefined structure. The system will handle the data dynamically at runtime.
                              </p>
                              <ul className="text-sm text-orange-700 space-y-1 ml-4">
                                <li>Structure will be determined when the file is processed</li>
                                <li>Suitable for files with varying column structures</li>
                                <li>Processing may be slower than fixed structure files</li>
                                <li>All fields will be treated as strings initially</li>
                              </ul>
                              <button
                                onClick={() => handleInputFileChange(fileIndex, 'hasFixedStructure', true)}
                                className="mt-3 text-sm text-orange-600 hover:text-orange-800 underline"
                              >
                                Switch to Fixed Structure
                              </button>
                            </div>
                          ) : inputFile.structure && inputFile.structure.length > 0 ? (
                            <div className="space-y-3">
                              {inputFile.structure.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3 bg-gray-50 rounded">
                                  <input
                                    type="text"
                                    value={field.name}
                                    onChange={(e) => handleStructureFieldChange(fileIndex, fieldIndex, 'name', e.target.value)}
                                    placeholder="Field name"
                                    className="sg-input"
                                  />
                                  <select
                                    value={field.type}
                                    onChange={(e) => handleStructureFieldChange(fileIndex, fieldIndex, 'type', e.target.value)}
                                    className="sg-select"
                                  >
                                    {FILE_STRUCTURE_TYPES.map(type => (
                                      <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                  </select>
                                  <div className="flex items-center">
                                    <label className="flex items-center gap-2 text-sm">
                                      <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => handleStructureFieldChange(fileIndex, fieldIndex, 'required', e.target.checked)}
                                        className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd]"
                                      />
                                      Required
                                    </label>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveStructureField(fileIndex, fieldIndex)}
                                    className="text-red-600 hover:text-red-800 justify-self-end"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-4 border-2 border-dashed border-gray-300 rounded">
                              <p className="text-sm text-gray-600">No structure defined. Upload a file, add fields manually, or use dynamic structure.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  // No input files configured - show generic processing status
                  <div className="text-center p-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                    <CheckCircle className="mx-auto h-12 w-12 text-blue-600" />
                    <h4 className="mt-2 text-lg font-medium text-blue-900">Generic File Processing Enabled</h4>
                    <p className="mt-1 text-sm text-blue-700">
                      Your workflow will handle files dynamically without requiring predefined templates
                    </p>
                    <div className="mt-4 p-3 bg-white rounded border border-blue-200 text-left max-w-md mx-auto">
                      <p className="text-xs font-medium text-blue-800 mb-2">Features enabled:</p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>Automatic file type detection</li>
                        <li>Dynamic structure parsing</li>
                        <li>Flexible column handling</li>
                        <li>Runtime schema inference</li>
                        <li>Support for varying file formats</li>
                      </ul>
                    </div>
                    <div className="mt-4 flex gap-3 justify-center">
                      <button
                        onClick={handleAddInputFile}
                        className="sg-button-secondary"
                      >
                        <Plus className="h-4 w-4" />
                        Add Specific Files Instead
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {state.isUploading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <p className="text-sm text-blue-800">Analyzing file structure...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API Configuration */}
          {state.sourceType === 'api' && (
            <div className="sg-dataset-tile p-6">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Link className="h-5 w-5 text-[#0065bd]" />
                API Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="sg-label">API Endpoint *</label>
                  <input
                    type="url"
                    value={state.sourceConfig.api.endpoint}
                    onChange={(e) => handleSourceConfigChange('endpoint', e.target.value)}
                    placeholder="https://api.example.com/data"
                    className="sg-input"
                    required
                  />
                  <p className="sg-help-text">
                    Full URL to the API endpoint that returns JSON data
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="sg-label">HTTP Method</label>
                    <select
                      value={state.sourceConfig.api.method}
                      onChange={(e) => handleSourceConfigChange('method', e.target.value)}
                      className="sg-select"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </div>

                  <div>
                    <label className="sg-label">Content Type</label>
                    <select
                      value={state.sourceConfig.api.contentType || 'application/json'}
                      onChange={(e) => handleSourceConfigChange('contentType', e.target.value)}
                      className="sg-select"
                    >
                      <option value="application/json">JSON</option>
                      <option value="application/xml">XML</option>
                      <option value="text/csv">CSV</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="sg-label">Authorization Token (Optional)</label>
                  <input
                    type="password"
                    value={state.sourceConfig.api.authToken}
                    onChange={(e) => handleSourceConfigChange('authToken', e.target.value)}
                    placeholder="Bearer token or API key"
                    className="sg-input"
                  />
                  <p className="sg-help-text">
                    Authorization token if required by the API
                  </p>
                </div>

                <div>
                  <label className="sg-label">Additional Headers (Optional)</label>
                  <textarea
                    value={state.sourceConfig.api.headers ? JSON.stringify(state.sourceConfig.api.headers, null, 2) : '{}'}
                    onChange={(e) => {
                      try {
                        const headers = JSON.parse(e.target.value);
                        handleSourceConfigChange('headers', headers);
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    placeholder='{"X-Custom-Header": "value", "Accept": "application/json"}'
                    className="sg-input min-h-[80px] font-mono text-sm"
                  />
                  <p className="sg-help-text">
                    JSON object with additional headers to send with requests
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={testApiConnection}
                    disabled={!state.sourceConfig.api.endpoint.trim() || state.isUploading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {state.isUploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Link className="h-4 w-4" />
                    )}
                    Test Connection
                  </button>
                  
                  <div className="text-sm text-gray-600 flex items-center">
                    Test the API connection and detect data structure
                  </div>
                </div>

                {state.isFileUploaded && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800">API connection successful!</p>
                        <p className="text-sm text-green-700">
                          Detected {state.parsedFileStructure.length} fields from API response
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">API Requirements</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>API must return JSON data (array of objects preferred)</li>
                    <li>Response should have consistent field structure</li>
                    <li>HTTPS endpoints are recommended for security</li>
                    <li>API should be accessible from the processing environment</li>
                    <li>Consider rate limits and authentication requirements</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Database Configuration (Coming Soon) */}
          {state.sourceType === 'database' && (
            <div className="sg-dataset-tile p-6 opacity-50">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-gray-400" />
                Database Configuration (Coming Soon)
              </h3>
              <div className="text-center py-8">
                <Database className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 text-lg font-medium text-gray-900">Database Integration</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Direct database connections will be available in a future release
                </p>
                <div className="mt-4 p-3 bg-gray-100 rounded text-left max-w-md mx-auto">
                  <p className="text-xs font-medium text-gray-700 mb-2">Planned Features:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>PostgreSQL, MySQL, SQL Server support</li>
                    <li>Connection pooling and security</li>
                    <li>Custom SQL queries</li>
                    <li>Schema auto-detection</li>
                    <li>Incremental data loading</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Data Loading Pipeline</h4>
            <p className="text-sm text-blue-800 mb-3">
              Your source configuration will automatically generate the appropriate data loading operation 
              in the Dagster DAG with the following features:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>Automatic file type detection and parsing</li>
              <li>Error handling and retry logic</li>
              <li>Data validation and type conversion</li>
              <li>Logging and monitoring integration</li>
              <li>S3 resource management and cleanup</li>
              {state.sourceType === 'file' && (!state.inputFiles || state.inputFiles.length === 0) && (
                <li>Dynamic structure inference for flexible processing</li>
              )}
            </ul>
            
            <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
              <p className="text-xs font-medium text-blue-900 mb-1">Generated Operation:</p>
              <code className="text-xs text-blue-800 break-all">
                _1_load_input_{'{workflow_id}'} → {state.sourceType.toUpperCase()} loader
                {state.sourceType === 'file' && (!state.inputFiles || state.inputFiles.length === 0) && ' (Generic Mode)'}
              </code>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={onPrevious}
            className="sg-button-ghost"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={state.isUploading || !isSourceConfigured()}
            className="sg-button-primary disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
});

SourceConfigurationStep.displayName = 'SourceConfigurationStep';

export default SourceConfigurationStep;