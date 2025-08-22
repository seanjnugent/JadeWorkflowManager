import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight, File, Link, Database, FileX, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { DATA_TYPES } from '../config/WorkflowConfig';

const StructurePreviewStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();

  const handleTypeChange = (column, newType) => {
    const updatedStructure = state.parsedFileStructure.map((col) =>
      col.column === column ? { ...col, type: newType } : col
    );
    dispatch({ type: 'SET_PARSED_FILE_STRUCTURE', payload: updatedStructure });
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

        .sg-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          border: 1px solid var(--sg-gray-border);
        }

        .sg-table th,
        .sg-table td {
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-align: left;
          border-bottom: 1px solid var(--sg-gray-border);
          vertical-align: top;
        }

        .sg-table thead th {
          background-color: var(--sg-gray-bg);
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody th {
          background-color: transparent;
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody tr:hover td,
        .sg-table tbody tr:hover th {
          background-color: var(--sg-blue-lightest);
        }

        .sg-table-wrapper {
          position: relative;
          width: 100%;
          overflow-x: auto;
          border-radius: var(--radius);
          border: 1px solid var(--sg-gray-border);
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
      `}</style>

      <section id="structure-preview" ref={ref} className="sg-dataset-tile">
        <div className="sg-section-separator">
          <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#0065bd]" />
            Data Structure Preview
          </h2>
        </div>
        <p className="sg-dataset-description mb-6">
          Review and adjust the detected data structure for optimal processing
        </p>

        <div className="space-y-6">
          {/* Source Type Indicator */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            {state.sourceType === 'file' && <File className="h-5 w-5 text-[#0065bd]" />}
            {state.sourceType === 'api' && <Link className="h-5 w-5 text-[#0065bd]" />}
            {state.sourceType === 'database' && <Database className="h-5 w-5 text-[#0065bd]" />}
            <div>
              <h3 className="font-medium text-gray-900 capitalize">
                {state.sourceType} Data Source
              </h3>
              <p className="text-sm text-gray-600">
                {state.sourceType === 'file' && 'Structure detected from uploaded files'}
                {state.sourceType === 'api' && 'Structure will be determined at runtime from API response'}
                {state.sourceType === 'database' && 'Structure will be determined from database schema'}
              </p>
            </div>
          </div>

          {/* Input Files Overview */}
          {state.sourceType === 'file' && state.inputFiles && state.inputFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4">Input Files Overview ({state.inputFiles.length})</h3>
              <div className="grid gap-4">
                {state.inputFiles.map((inputFile, fileIndex) => (
                  <div key={fileIndex} className="sg-dataset-tile p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <File className="h-4 w-4 text-[#0065bd]" />
                          {inputFile.name || `Input File ${fileIndex + 1}`}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {inputFile.format?.toUpperCase()} {inputFile.description || 'No description'}
                        </p>
                      </div>
                      <div className="text-right">
                        {inputFile.hasFixedStructure === false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                            <FileX className="h-3 w-3" />
                            Dynamic Structure
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            <CheckCircle className="h-3 w-3" />
                            {inputFile.structure?.length || 0} Fields
                          </span>
                        )}
                      </div>
                    </div>

                    {inputFile.hasFixedStructure === false ? (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <FileX className="h-4 w-4 text-orange-600" />
                          <h5 className="font-medium text-orange-900">Dynamic Structure Processing</h5>
                        </div>
                        <p className="text-sm text-orange-800 mb-2">
                          This file will be processed without a predefined structure. The system will handle the data dynamically at runtime.
                        </p>
                        <ul className="text-xs text-orange-700 space-y-1 ml-4">
                          <li>Structure determined when file is processed</li>
                          <li>Suitable for files with varying column structures</li>
                          <li>All fields treated as strings initially</li>
                          <li>May require additional processing steps</li>
                        </ul>
                      </div>
                    ) : inputFile.structure && inputFile.structure.length > 0 ? (
                      <div className="space-y-3">
                          <table className="sg-table">
                            <thead>
                              <tr>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Field Name</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Required</th>
                                <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inputFile.structure.slice(0, 10).map((field, fieldIndex) => (
                                <tr key={fieldIndex} className={fieldIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{field.name}</td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      {field.type}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {field.required ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border border-gray-300"></div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">
                                    {field.description || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        {inputFile.structure.length > 10 && (
                          <p className="text-sm text-gray-600 text-center">
                            ... and {inputFile.structure.length - 10} more fields
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No structure defined for this file</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Structure Preview */}
          {state.sourceType === 'api' && (
            <div className="sg-dataset-tile p-6 text-center">
              <Link className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">API Data Structure</h3>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                The data structure will be automatically detected when the API is called during workflow execution. 
                Ensure your API returns consistent JSON format with the same field structure across requests.
              </p>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                <h4 className="font-medium text-blue-900 mb-2">API Response Requirements</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>Must return valid JSON format</li>
                  <li>Array of objects or single object structure</li>
                  <li>Consistent field names and types</li>
                  <li>HTTP 200 status for successful responses</li>
                </ul>
              </div>

              {state.sourceConfig.api.endpoint && (
                <div className="mt-4 p-3 bg-gray-100 rounded text-left">
                  <p className="text-xs font-medium text-gray-700 mb-1">Configured Endpoint:</p>
                  <p className="text-xs font-mono text-gray-900 break-all">{state.sourceConfig.api.endpoint}</p>
                </div>
              )}
            </div>
          )}

          {/* Database Structure Preview */}
          {state.sourceType === 'database' && (
            <div className="sg-dataset-tile p-6 text-center">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">Database Connection</h3>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                Database integration is coming soon. The system will automatically detect table schemas 
                and column types from your database connections.
              </p>
            </div>
          )}

          {/* No Structure Available */}
          {state.sourceType === 'file' && (!state.inputFiles || state.inputFiles.length === 0) && state.parsedFileStructure.length === 0 && (
            <div className="sg-dataset-tile p-6 text-center">
              <File className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mt-2">No File Structure Available</h3>
              <p className="text-sm text-gray-600 mt-2">
                {state.isFileUploaded ? 
                  'Unable to parse the uploaded file structure. Please ensure the file is in a supported format.' :
                  'Upload a file in the previous step to preview its structure here.'
                }
              </p>
              {!state.isFileUploaded && (
                <button
                  onClick={onPrevious}
                  className="mt-4 sg-button-secondary"
                >
                  Go Back to Upload File
                </button>
              )}
            </div>
          )}

          {/* Structure Summary */}
          {((state.inputFiles && state.inputFiles.length > 0) || state.parsedFileStructure.length > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Structure Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-20 text-sm">
                <div>
                  <span className="font-medium text-green-800">Input Files:</span>
                  <span className="ml-2 text-green-700">{state.inputFiles?.length || 0}</span>
                </div>
                <div>
                  <span className="font-medium text-green-800">Fixed Structure:</span>
                  <span className="ml-2 text-green-700">
                    {state.inputFiles?.filter(file => file.hasFixedStructure !== false).length || 0}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-green-800">Dynamic Structure:</span>
                  <span className="ml-2 text-green-700">
                    {state.inputFiles?.filter(file => file.hasFixedStructure === false).length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Data Processing Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Data Processing Pipeline</h4>
            <p className="text-sm text-blue-800">
              The configured structure will be used to optimize data processing operations. 
              Type information helps with validation, transformations, and performance optimization 
              in your Dagster workflow.
            </p>
            
            {state.inputFiles && state.inputFiles.length > 0 && (
              <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                <p className="text-xs font-medium text-blue-900 mb-2">Generated Processing Logic:</p>
                <div className="space-y-1">
                  {state.inputFiles.map((file, index) => (
                    <div key={index} className="text-xs text-blue-800">
                      <code>
                        {file.hasFixedStructure === false 
                          ? `${file.name}: Dynamic processing with runtime structure detection`
                          : `${file.name}: Fixed structure with ${file.structure?.length || 0} defined fields`
                        }
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            className="sg-button-primary"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
});

StructurePreviewStep.displayName = 'StructurePreviewStep';

export default StructurePreviewStep;