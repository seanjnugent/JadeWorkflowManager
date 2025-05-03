import React, { useState, useCallback } from 'react';
import { ChevronLeft, FileInput, Code2, Database, Settings2, TestTube2, Save, CheckCircle2 } from 'lucide-react';

const NewWorkflow = () => {
  const [step, setStep] = useState(0);
  const [workflowName, setWorkflowName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [transformationCode, setTransformationCode] = useState('');
  const [parameters, setParameters] = useState({});
  const [destinationType, setDestinationType] = useState('');
  const [connections] = useState(['PostgreSQL Prod', 'MySQL Analytics', 'BigQuery Warehouse']);
  const [parsedFileStructure, setParsedFileStructure] = useState([]);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [connectionId, setConnectionId] = useState('');
  const [tableName, setTableName] = useState('');
  const [fileOutputPath, setFileOutputPath] = useState('');
  const [fileOutputFormat, setFileOutputFormat] = useState('CSV');

  const handleFileUpload = useCallback(async (file) => {
    if (!workflowName) {
      setUploadError('Please enter a workflow name');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workflow_name', workflowName);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (!data.schema || !data.data) {
        throw new Error('Invalid response format from server');
      }

      const structure = Object.entries(data.schema).map(([column, typeInfo]) => ({
        column,
        detectedType: typeInfo.type,
        type: typeInfo.type,
        samples: data.data.slice(0, 3).map(row => row[column]),
        format: typeInfo.format,
      }));

      setParsedFileStructure(structure);
      setIsFileUploaded(true);
      setUploadError(null);
      setStep(1);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
      setIsFileUploaded(false);
    } finally {
      setIsUploading(false);
    }
  }, [workflowName]);

  const handleTypeChange = (column, newType) => {
    setParsedFileStructure(prev =>
      prev.map(col =>
        col.column === column ? { ...col, type: newType } : col
      )
    );
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleSaveWorkflow = async () => {
    const workflowData = {
      name: workflowName,
      description: 'Data processing workflow',
      created_by: 1, // Replace with actual user ID from auth
      status: 'draft',
      steps: [{
        step_order: 1,
        label: 'Transform Data',
        code_type: selectedLanguage.toLowerCase(),
        code: transformationCode,
        input_file_pattern: '*.csv',
        parameters,
      }],
      destination: {
        destination_type: destinationType,
        connection_id: destinationType === 'database' ? connectionId : null,
        table_name: destinationType === 'database' ? tableName : null,
        file_path: destinationType === 'file' ? fileOutputPath : null,
        file_format: destinationType === 'file' ? fileOutputFormat : null,
      },
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/workflows/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error('Failed to save workflow');
      }

      alert('Workflow saved successfully!');
      setStep(0);
      setWorkflowName('');
      setSelectedLanguage('');
      setTransformationCode('');
      setParameters({});
      setDestinationType('');
      setParsedFileStructure([]);
      setIsFileUploaded(false);
    } catch (error) {
      console.error('Save error:', error);
      setUploadError(error.message);
    }
  };

  const steps = [
    { title: 'Load File & Name', icon: <FileInput size={18} /> },
    { title: 'Structure Review', icon: <Settings2 size={18} /> },
    { title: 'Transformation', icon: <Code2 size={18} /> },
    { title: 'Destination', icon: <Database size={18} /> },
    { title: 'Test & Save', icon: <TestTube2 size={18} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          {steps.map((s, index) => (
            <div key={s.title} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center 
                ${index <= step ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                {index < step ? <CheckCircle2 size={16} /> : s.icon}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-px w-12 ${index < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        
        <h2 className="text-2xl font-semibold mb-2">{steps[step].title}</h2>
        <p className="text-gray-600">
          {step === 0 && "Upload your source data file and name your workflow"}
          {step === 1 && "Review and confirm the detected data structure"}
          {step === 2 && "Configure data transformation logic"}
          {step === 3 && "Select output destination"}
          {step === 4 && "Validate and save your workflow"}
        </p>
      </div>

      <div className="mb-8">
        {step === 0 && (
          <div>
            <div className="mb-6">
              <label className="block font-medium mb-2">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g., Monthly Sales Report"
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-blue-600 bg-blue-50' : 
                isUploading ? 'border-blue-300 bg-blue-50' : 
                'border-gray-200'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="mb-4 relative">
                <FileInput className="w-12 h-12 text-gray-400 mx-auto" />
                <p className="text-gray-600 mt-2">
                  {isDragging ? 'Drop file here' : 'Drag & drop CSV/Excel/Parquet file or'}
                </p>
                {isUploading && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                    <div className="text-blue-600 animate-pulse">
                      <svg className="animate-spin h-5 w-5 mr-3 inline-block" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Uploading and parsing file...
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                id="file-input"
                className="hidden"
                accept=".csv,.xlsx,.xls,.parquet,.json"
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="file-input"
                className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 cursor-pointer ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Browse Files
              </label>
              {uploadError && (
                <p className="text-red-600 text-sm mt-4">{uploadError}</p>
              )}
              <p className="text-sm text-gray-500 mt-4">
                Supports CSV, XLSX, Parquet, JSON
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="border border-gray-100 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 font-medium text-sm">
              Detected Structure (First 3 Samples)
            </div>
            <div className="p-4">
              {parsedFileStructure.map((col) => {
                const samples = col.samples || ['No samples available'];
                const detectedType = col.detectedType || col.type;
                const typeOptions = ['string', 'numeric', 'date', 'boolean'];

                return (
                  <div key={col.column} className="flex items-center gap-4 mb-6 last:mb-0">
                    <div className="w-1/4 font-medium">
                      {col.column}
                      <span className="block text-xs text-gray-500 mt-1">
                        Detected: {detectedType}
                      </span>
                    </div>
                    
                    <select 
                      className="w-1/4 px-2 py-1 border rounded bg-white"
                      value={col.type}
                      onChange={(e) => handleTypeChange(col.column, e.target.value)}
                    >
                      {typeOptions.map(opt => (
                        <option 
                          key={opt} 
                          value={opt}
                          className={opt === detectedType ? 'font-semibold' : ''}
                        >
                          {opt}
                        </option>
                      ))}
                    </select>
                    
                    <div className="w-1/2 text-gray-600 text-sm space-y-1">
                      {samples.map((sample, idx) => (
                        <div 
                          key={idx} 
                          className="truncate bg-gray-50 px-2 py-1 rounded text-xs"
                        >
                          {typeof sample === 'object' ? 
                            JSON.stringify(sample) : 
                            String(sample)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block font-medium">Transformation Language</label>
              <div className="flex gap-4">
                {['Python', 'SQL', 'R'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setTransformationCode(
                        lang === 'Python' ? '# Python transformation script\nimport pandas as pd\n\ndf["new_column"] = df["total_amount"] * 1.1' :
                        lang === 'SQL' ? '-- SQL transformation\nSELECT *, total_amount * 1.1 AS new_column\nFROM input_table' :
                        '# R transformation script\ndf$new_column <- df$total_amount * 1.1'
                      );
                    }}
                    className={`px-4 py-2 rounded-lg border ${
                      selectedLanguage === lang 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-medium">Transformation Code</label>
              <textarea
                className="w-full h-48 border rounded p-4 font-mono text-sm"
                value={transformationCode}
                onChange={(e) => setTransformationCode(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <label className="block font-medium">Parameters (JSON)</label>
              <textarea
                className="w-full h-24 border rounded p-4 font-mono text-sm"
                value={JSON.stringify(parameters, null, 2)}
                onChange={(e) => {
                  try {
                    setParameters(JSON.parse(e.target.value));
                  } catch {
                    // Ignore invalid JSON for now
                  }
                }}
                placeholder='{"multiplier": 1.1}'
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="block font-medium">Destination Type</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setDestinationType('database')}
                  className={`px-6 py-4 rounded-lg border flex items-center gap-2 ${
                    destinationType === 'database' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Database size={18} />
                  Database Table
                </button>
                <button
                  onClick={() => setDestinationType('file')}
                  className={`px-6 py-4 rounded-lg border flex items-center gap-2 ${
                    destinationType === 'file' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileInput size={18} />
                  File Output
                </button>
              </div>
            </div>

            {destinationType === 'database' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <select 
                    className="w-1/2 border rounded px-4 py-2"
                    value={connectionId}
                    onChange={(e) => setConnectionId(e.target.value)}
                  >
                    <option value="">Select Connection</option>
                    {connections.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="New table name"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-1/2 border rounded px-4 py-2"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Don't see your connection? <a href="#" className="text-blue-600">Add new connection</a>
                </p>
              </div>
            )}

            {destinationType === 'file' && (
              <div className="space-y-4">
                <select 
                  className="w-full border rounded px-4 py-2"
                  value={fileOutputFormat}
                  onChange={(e) => setFileOutputFormat(e.target.value)}
                >
                  <option>CSV</option>
                  <option>JSON</option>
                  <option>Excel</option>
                </select>
                <input
                  type="text"
                  placeholder="Output path (e.g. /output/report.csv)"
                  value={fileOutputPath}
                  onChange={(e) => setFileOutputPath(e.target.value)}
                  className="w-full border rounded px-4 py-2"
                />
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 size={18} />
                Connection test successful!
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="block font-medium">Workflow Name</label>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Monthly Sales Report"
                className="w-full border rounded px-4 py-2"
                disabled
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t pt-6">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ChevronLeft size={16} className="mr-2 inline" />
          Back
        </button>
        
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={(step === 0 && (!isFileUploaded || !workflowName)) || 
                      (step === 2 && (!selectedLanguage || !transformationCode)) ||
                      (step === 3 && (!destinationType || 
                        (destinationType === 'database' && (!connectionId || !tableName)) ||
                        (destinationType === 'file' && (!fileOutputPath || !fileOutputFormat))))}
            className={`bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 ${
              ((step === 0 && (!isFileUploaded || !workflowName)) || 
               (step === 2 && (!selectedLanguage || !transformationCode)) ||
               (step === 3 && (!destinationType || 
                 (destinationType === 'database' && (!connectionId || !tableName)) ||
                 (destinationType === 'file' && (!fileOutputPath || !fileOutputFormat))))) 
                ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSaveWorkflow}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Save size={16} />
            Save Workflow
          </button>
        )}
      </div>
    </div>
  );
};

export default NewWorkflow;