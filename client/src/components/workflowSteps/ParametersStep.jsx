// workflowSteps/ParametersStep.jsx
import React from 'react';
import { Settings2, ChevronUp, ChevronDown } from 'lucide-react';

export const ParametersStep = ({ 
  parameterSections,
  expandedSections,
  toggleSection,
  handleAddSection,
  handleSectionNameChange,
  handleAddParameter,
  handleParameterChange,
  handleAddOption,
  handleOptionChange 
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">Workflow Parameters</label>
        {parameterSections.length === 0 ? (
          <div className="sg-dataset-tile p-6 text-center">
            <Settings2 className="mx-auto h-8 w-8 text-gray-400" />
            <h3 className="sg-dataset-title mt-2">No parameters configured</h3>
            <p className="text-sm text-gray-600 mt-1">Add a section to start configuring parameters.</p>
          </div>
        ) : (
          parameterSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="sg-dataset-tile">
              <button
                className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => toggleSection(section.name || `Section ${sectionIndex + 1}`)}
              >
                <h5 className="text-sm font-medium text-gray-900">
                  {section.name || `Section ${sectionIndex + 1}`}
                </h5>
                {expandedSections[section.name || `Section ${sectionIndex + 1}`] ? (
                  <ChevronUp className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
              </button>
              {expandedSections[section.name || `Section ${sectionIndex + 1}`] && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Section Name</label>
                    <div className="relative">
                      <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        value={section.name}
                        onChange={(e) => handleSectionNameChange(sectionIndex, e.target.value)}
                        placeholder="e.g., Report Metadata"
                        className="w-full pl-10"
                      />
                    </div>
                  </div>
                  {section.parameters.map((param, paramIndex) => (
                    <div key={paramIndex} className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Name</label>
                          <div className="relative">
                            <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              type="text"
                              value={param.name}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'name', e.target.value)}
                              placeholder="e.g., Report Type"
                              className="w-full pl-10"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Type</label>
                          <div className="relative">
                            <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <select
                              value={param.type}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'type', e.target.value)}
                              className="w-full pl-10"
                            >
                              <option value="text">Text</option>
                              <option value="textbox">Textbox</option>
                              <option value="numeric">Numeric</option>
                              <option value="integer">Integer</option>
                              <option value="date">Date</option>
                              <option value="select">Select</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
                          <div className="relative">
                            <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              type="text"
                              value={param.description}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'description', e.target.value)}
                              placeholder="e.g., Type of the report"
                              className="w-full pl-10"
                            />
                          </div>
                        </div>
                        <div className="flex items-center mt-6">
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <input
                              type="checkbox"
                              checked={param.mandatory}
                              onChange={(e) => handleParameterChange(sectionIndex, paramIndex, 'mandatory', e.target.checked)}
                              className="h-4 w-4 border-gray-300 text-[#0065bd] focus:ring-[#0065bd]"
                            />
                            Required
                          </label>
                        </div>
                      </div>
                      {param.type === 'select' && (
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-900">Options</label>
                          {param.options?.map((option, optIndex) => (
                            <div key={optIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="relative">
                                  <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'label', e.target.value)}
                                    placeholder="Option label"
                                    className="w-full pl-10"
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="relative">
                                  <Settings2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                  <input
                                    type="text"
                                    value={option.value}
                                    onChange={(e) => handleOptionChange(sectionIndex, paramIndex, optIndex, 'value', e.target.value)}
                                    placeholder="Option value"
                                    className="w-full pl-10"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddOption(sectionIndex, paramIndex)}
                            className="text-sm text-[#0065bd] hover:text-[#004a9f] underline hover:no-underline"
                          >
                            Add Option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddParameter(sectionIndex)}
                    className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
                  >
                    Add Parameter
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <button
          onClick={handleAddSection}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-[#0065bd] rounded hover:bg-[#004a9f] transition-colors"
        >
          Add Section
        </button>
      </div>
    </div>
  );
};