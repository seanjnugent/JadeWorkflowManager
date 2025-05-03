import React from 'react';
import { FileInput } from 'lucide-react';

const FileUpload = ({
  workflowName,
  workflowDescription,
  userId,
  isDragging,
  isUploading,
  uploadError,
  handleFileUpload,
  handleDragEnter,
  handleDragLeave,
  handleDrop,
}) => {
  return (
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
  );
};

export default FileUpload;
