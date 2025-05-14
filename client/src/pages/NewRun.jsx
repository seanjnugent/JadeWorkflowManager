import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Play, UploadCloud, Plug, Clock, AlertCircle, Download 
} from 'lucide-react';

const StepCard = ({ id, title, icon: Icon, isActive, onClick, index }) => (
  <button
    onClick={() => onClick(id)}
    className={`flex items-center p-4 rounded-lg transition-all duration-300
      ${isActive ? 'bg-blue-50 border border-blue-200 scale-[1.02] shadow-sm' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'} 
      w-full mb-3 relative overflow-hidden group text-left`}
  >
    <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-3
      ${isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
      {index}
    </div>
    <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} />
    <span className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>{title}</span>
  </button>
);

const NewRun = () => {
  const navigate = useNavigate();
  const { workflowId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [workflowDetails, setWorkflowDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runName, setRunName] = useState('');
  const [file, setFile] = useState(null);
  const [parameters, setParameters] = useState({});
  const [scheduleType, setScheduleType] = useState('none');
  const [launchTime, setLaunchTime] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { id: 1, title: 'Run Configuration', icon: Play },
    { id: 2, title: 'Input File', icon: UploadCloud },
    { id: 3, title: 'Parameters', icon: Plug },
    { id: 4, title: 'Schedule', icon: Clock },
  ];

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/workflow/${workflowId}`, {
      headers: { accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        setWorkflowDetails(data);
        const initialParams = {};
        data.workflow.parameters.forEach((p) => {
          initialParams[p.name] = '';
        });
        setParameters(initialParams);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [workflowId]);

  const validateInputs = () => {
    if (!runName.trim()) return 'Run name is required';
    if (currentStep >= 2 && !file) return 'Please upload an input file';
    if (currentStep >= 3) {
      for (const param of workflowDetails?.workflow?.parameters || []) {
        if (param.mandatory && !parameters[param.name]) {
          return `Parameter "${param.name}" is required`;
        }
      }
    }
    if (currentStep === 4 && scheduleType === 'specific' && !launchTime) {
      return 'Launch time is required for scheduled runs';
    }
    return '';
  };

  const handleNext = () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStartRun = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const payload = {
        run_name: runName,
        input_file_path: file.name,
        parameters,
        schedule: scheduleType === 'specific' ? { launch_time: launchTime, repeat } : null,
      };

      await fetch(`/api/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      navigate('/runs');
    } catch (err) {
      setError('Failed to start run. Please try again.');
    }
  };

  const handleDownloadTemplate = () => {
    const cols = workflowDetails?.workflow?.input_structure?.columns || [];
    const headers = cols.map((c) => c.name).join(',');
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowDetails.workflow.name}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-700">Loading...</div>;

  const { workflow } = workflowDetails;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto flex gap-8">
        {/* Sidebar */}
        <aside className="w-80 p-6 rounded-xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Setup Flow</h2>
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              {...step}
              index={index + 1}
              isActive={currentStep === step.id}
              onClick={setCurrentStep}
            />
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => navigate(`/workflows/${workflowId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 mr-1" /> Back to Workflow
          </button>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{steps[currentStep - 1].title}</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Run Name</label>
              <input
                type="text"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                placeholder="Enter a unique name for this run"
                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Input File</label>
              <div
                className="border-2 border-dashed border-gray-300 p-8 rounded-lg text-center cursor-pointer hover:bg-gray-50 transition-all"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setFile(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <UploadCloud className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">
                  {file ? file.name : 'Drag & drop or click to select CSV'}
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                >
                  View Template
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center"
                >
                  <Download className="w-4 h-4 mr-1" /> Download Template
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              {workflow.parameters.length > 0 ? (
                workflow.parameters.map((param, i) => (
                  <div key={i}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {param.name} ({param.type}) {param.mandatory && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type={param.type === 'integer' ? 'number' : 'text'}
                      value={parameters[param.name] || ''}
                      onChange={(e) =>
                        setParameters((prev) => ({
                          ...prev,
                          [param.name]: e.target.value,
                        }))
                      }
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Enter ${param.name}`}
                    />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No parameters defined for this workflow.</p>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Type</label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">Run Immediately</option>
                  <option value="specific">Launch at Specific Time</option>
                </select>
              </div>
              {scheduleType === 'specific' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Launch Time</label>
                    <input
                      type="datetime-local"
                      value={launchTime}
                      onChange={(e) => setLaunchTime(e.target.value)}
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                    <select
                      value={repeat}
                      onChange={(e) => setRepeat(e.target.value)}
                      className="w-full p-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="none">Do Not Repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto shadow-xl border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Input Structure</h3>
                <table className="w-full text-sm text-gray-700">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="p-3">Column</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Required</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflow.input_structure.columns.map((col, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">{col.name}</td>
                        <td className="p-3">{col.type}</td>
                        <td className="p-3">{col.required ? 'Yes' : 'No'}</td>
                        <td className="p-3">{col.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition border border-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-6 py-2 rounded-lg transition ${
                currentStep === 1
                  ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-100'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              Back
            </button>
            <button
              onClick={currentStep === 4 ? handleStartRun : handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              {currentStep === 4 ? 'Start Run' : 'Next'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default NewRun;