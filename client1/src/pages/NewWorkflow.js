import React, { useState } from 'react';
import { ChevronLeft, FileInput, Code2, Database, Settings2, TestTube2, Save, CheckCircle2 } from 'lucide-react';

const NewWorkflow = () => {
  const [step, setStep] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [destinationType, setDestinationType] = useState('');
  const [connections] = useState(['PostgreSQL Prod', 'MySQL Analytics', 'BigQuery Warehouse']);
  
  // Dummy parsed file structure
  const fileStructure = [
    { column: 'customer_id', type: 'string', sample: 'CUST-001' },
    { column: 'order_date', type: 'date', sample: '2024-03-20' },
    { column: 'total_amount', type: 'numeric', sample: '149.99' },
    { column: 'is_active', type: 'boolean', sample: 'true' },
  ];

  const steps = [
    { title: 'Load File', icon: <FileInput size={18} /> },
    { title: 'Structure Review', icon: <Settings2 size={18} /> },
    { title: 'Transformation', icon: <Code2 size={18} /> },
    { title: 'Destination', icon: <Database size={18} /> },
    { title: 'Test & Save', icon: <TestTube2 size={18} /> },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      {/* Progress Header */}
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
          {step === 0 && "Upload or select your source data file to begin"}
          {step === 1 && "Review and confirm the detected data structure"}
          {step === 2 && "Configure data transformation logic"}
          {step === 3 && "Select output destination"}
          {step === 4 && "Validate and save your workflow"}
        </p>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {step === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
            <div className="mb-4">
              <FileInput className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-gray-600 mt-2">Drag & drop CSV/Excel file or</p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Browse Files
            </button>
            <p className="text-sm text-gray-500 mt-4">Supports CSV, XLSX, JSON</p>
          </div>
        )}

        {step === 1 && (
          <div className="border border-gray-100 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 font-medium text-sm">
              Detected Structure (Sample Data)
            </div>
            <div className="p-4">
              {fileStructure.map((col) => (
                <div key={col.column} className="flex items-center gap-4 mb-4 last:mb-0">
                  <div className="w-1/4 font-medium">{col.column}</div>
                  <select 
                    className="w-1/4 px-2 py-1 border rounded"
                    defaultValue={col.type}
                  >
                    <option>string</option>
                    <option>numeric</option>
                    <option>date</option>
                    <option>boolean</option>
                  </select>
                  <div className="w-1/2 text-gray-500 text-sm">{col.sample}</div>
                </div>
              ))}
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
                    onClick={() => setSelectedLanguage(lang)}
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
              <div className="border border-gray-200 rounded-lg p-4 font-mono text-sm bg-gray-50">
                {selectedLanguage === 'Python' && (
                  `# Python transformation script\nimport pandas as pd\n\ndf['new_column'] = df['total_amount'] * 1.1`
                )}
                {selectedLanguage === 'SQL' && (
                  `-- SQL transformation\nSELECT *, total_amount * 1.1 AS new_column\nFROM input_table`
                )}
                {selectedLanguage === 'R' && (
                  `# R transformation script\ndf$new_column <- df$total_amount * 1.1`
                )}
              </div>
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
                  <select className="w-1/2 border rounded px-4 py-2">
                    <option>Select Connection</option>
                    {connections.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    type="text"
                    placeholder="New table name"
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
                <select className="w-full border rounded px-4 py-2">
                  <option>CSV</option>
                  <option>JSON</option>
                  <option>Excel</option>
                </select>
                <input
                  type="text"
                  placeholder="Output path (e.g. /output/report.csv)"
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
                placeholder="Monthly Sales Report"
                className="w-full border rounded px-4 py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
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
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={() => console.log('Saving workflow...')}
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