import React, { forwardRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkflowContext } from '../context/WorkflowContext';

const ParametersStep = forwardRef(({ onNext, onPrevious, isVisible }, ref) => {
  const { state, dispatch } = useWorkflowContext();
  const [expandedSections, setExpandedSections] = useState({});

  const handleAddSection = () => {
    dispatch({ type: 'ADD_PARAMETER_SECTION' });
    // Auto-expand new section
    const newSectionIndex = state.parameterSections.length;
    setExpandedSections(prev => ({
      ...prev,
      [newSectionIndex]: true
    }));
  };

  const handleSectionNameChange = (sectionIndex, value) => {
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { name: value }
      }
    });
  };

  const handleAddParameter = (sectionIndex) => {
    const currentSection = state.parameterSections[sectionIndex];
    const newParameters = [
      ...currentSection.parameters,
      { name: '', type: 'text', description: '', mandatory: false, options: [] }
    ];
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: newParameters }
      }
    });
  };

  const handleParameterChange = (sectionIndex, paramIndex, field, value) => {
    const currentSection = state.parameterSections[sectionIndex];
    const updatedParameters = currentSection.parameters.map((param, idx) =>
      idx === paramIndex ? { ...param, [field]: value } : param
    );
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: updatedParameters }
      }
    });
  };

  const handleRemoveParameter = (sectionIndex, paramIndex) => {
    const currentSection = state.parameterSections[sectionIndex];
    const updatedParameters = currentSection.parameters.filter((_, idx) => idx !== paramIndex);
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: updatedParameters }
      }
    });
  };

  const handleRemoveSection = (sectionIndex) => {
    const updatedSections = state.parameterSections.filter((_, idx) => idx !== sectionIndex);
    dispatch({ type: 'SET_PARAMETER_SECTIONS', payload: updatedSections });
    
    // Update expanded sections mapping
    const newExpanded = {};
    Object.keys(expandedSections).forEach(key => {
      const idx = parseInt(key);
      if (idx < sectionIndex) {
        newExpanded[idx] = expandedSections[key];
      } else if (idx > sectionIndex) {
        newExpanded[idx - 1] = expandedSections[key];
      }
    });
    setExpandedSections(newExpanded);
  };

  const handleAddOption = (sectionIndex, paramIndex) => {
    const currentSection = state.parameterSections[sectionIndex];
    const updatedParameters = currentSection.parameters.map((param, idx) => {
      if (idx === paramIndex) {
        return {
          ...param,
          options: [...(param.options || []), { label: '', value: '' }]
        };
      }
      return param;
    });
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: updatedParameters }
      }
    });
  };

  const handleOptionChange = (sectionIndex, paramIndex, optionIndex, field, value) => {
    const currentSection = state.parameterSections[sectionIndex];
    const updatedParameters = currentSection.parameters.map((param, idx) => {
      if (idx === paramIndex) {
        const updatedOptions = param.options.map((option, optIdx) =>
          optIdx === optionIndex ? { ...option, [field]: value } : option
        );
        return { ...param, options: updatedOptions };
      }
      return param;
    });
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: updatedParameters }
      }
    });
  };

  const handleRemoveOption = (sectionIndex, paramIndex, optionIndex) => {
    const currentSection = state.parameterSections[sectionIndex];
    const updatedParameters = currentSection.parameters.map((param, idx) => {
      if (idx === paramIndex) {
        const updatedOptions = param.options.filter((_, optIdx) => optIdx !== optionIndex);
        return { ...param, options: updatedOptions };
      }
      return param;
    });
    
    dispatch({
      type: 'UPDATE_PARAMETER_SECTION',
      payload: {
        index: sectionIndex,
        updates: { parameters: updatedParameters }
      }
    });
  };

  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex]
    }));
  };

  if (!isVisible) return null;

  return (
    <section id="parameters" ref={ref} className="sg-dataset-tile">
      <div className="sg-section-separator">
        <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-[#0065bd]" />
          Workflow Parameters
        </h2>
      </div>
      <p className="sg-dataset-description mb-6">
        Define configurable parameters that users can set when running the workflow
      </p>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Parameter Sections</h3>
            <p className="text-sm text-gray-600">
              Organize related parameters into logical sections for better user experience
            </p>
          </div>
          <button
            onClick={handleAddSection}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Section
          </button>
        </div>

        {state.parameterSections.length === 0 ? (
          <div className="sg-dataset-tile p-8 text-center">
            <Settings2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="sg-dataset-title mt-4">No Parameters Configured</h3>
            <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
              Parameters allow users to customize the workflow behavior at runtime. 
              Add sections to group related parameters together.
            </p>
            <button
              onClick={handleAddSection}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0065bd] border border-[#0065bd] rounded hover:bg-[#0065bd] hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Your First Section
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {state.parameterSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="sg-dataset-tile border-2 border-gray-200">
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                      placeholder={`Section ${sectionIndex + 1} Name (e.g., "Report Settings")`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd] focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-sm text-gray-600">
                      {section.parameters.length} parameter{section.parameters.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSection(sectionIndex);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleSection(sectionIndex)}
                      className="text-gray-600 hover:text-gray-800 p-1"
                    >
                      {expandedSections[sectionIndex] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Section Content */}
                {expandedSections[sectionIndex] && (
                  <div className="p-4 space-y-4">
                    {/* Parameters */}
                    {section.parameters.map((param, paramIndex) => (
                      <div key={paramIndex} className="p-4 bg-white border border-gray-200 rounded-lg space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-gray-900">Parameter {paramIndex + 1}</h4>
                          <button
                            onClick={() => handleRemoveParameter(sectionIndex, paramIndex)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove parameter"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                              Parameter Name *
                            </label>
                            <input
                              type="text"
                              value={param.name}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'name', e.target.value)}
                              placeholder="e.g., start_date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd]"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">Type</label>
                            <select
                              value={param.type}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd]"
                            >
                              <option value="text">Text</option>
                              <option value="textbox">Text Area</option>
                              <option value="numeric">Numeric</option>
                              <option value="integer">Integer</option>
                              <option value="date">Date</option>
                              <option value="select">Select Dropdown</option>
                              <option value="boolean">Boolean (True/False)</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                            <input
                              type="text"
                              value={param.description}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'description', e.target.value)}
                              placeholder="e.g., Start date for the report period"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd]"
                            />
                          </div>

                          <div className="flex items-center">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                              <input
                                type="checkbox"
                                checked={param.mandatory}
                                onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'mandatory', e.target.checked)}
                                className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd] rounded"
                              />
                              Required Parameter
                            </label>
                          </div>
                        </div>

                        {/* Options for Select type */}
                        {param.type === 'select' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="block text-sm font-medium text-gray-900">Options</label>
                              <button
                                onClick={() => handleAddOption(sectionIndex, paramIndex)}
                                className="text-sm text-[#0065bd] hover:text-[#004a9f] flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Option
                              </button>
                            </div>

                            {(param.options || []).map((option, optionIndex) => (
                              <div key={optionIndex} className="flex gap-3 items-center p-3 bg-gray-50 rounded">
                                <input
                                  type="text"
                                  value={option.label}
                                  onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optionIndex, 'label', e.target.value)}
                                  placeholder="Display Label"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd]"
                                />
                                <input
                                  type="text"
                                  value={option.value}
                                  onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optionIndex, 'value', e.target.value)}
                                  placeholder="Value"
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0065bd]"
                                />
                                <button
                                  onClick={() => handleRemoveOption(sectionIndex, paramIndex, optionIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}

                            {(!param.options || param.options.length === 0) && (
                              <p className="text-sm text-gray-600 italic">No options defined. Add at least one option.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Parameter Button */}
                    <button
                      onClick={() => handleAddParameter(sectionIndex)}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#0065bd] hover:text-[#0065bd] transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Parameter to {section.name || `Section ${sectionIndex + 1}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Parameters Usage Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Parameter Usage in Workflows</h4>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Parameters defined here will be available in your ETL processing logic and can be used to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Filter data based on date ranges or criteria</li>
              <li>Configure processing behavior (e.g., aggregation levels)</li>
              <li>Set output file names or destinations</li>
              <li>Control data transformation rules</li>
              <li>Customize report formats and content</li>
            </ul>
            <p className="mt-3 font-medium">
              These parameters will be accessible in your ETL code as a dictionary: <code className="bg-blue-100 px-1 rounded">parameters['parameter_name']</code>
            </p>
          </div>
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

ParametersStep.displayName = 'ParametersStep';

export default ParametersStep;