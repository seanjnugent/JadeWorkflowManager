import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Play, UploadCloud, Plug, Clock, AlertCircle, Download,
  FileInput, Settings2, Save, CheckCircle2, Code, Plus, X
} from 'lucide-react';

// Common Components ================================================

const StepCard = ({ id, title, icon: Icon, isActive, onClick, index, completed }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    onClick={() => onClick(id)}
    className={`flex items-center p-4 rounded-lg transition-all duration-300
      ${isActive ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'} 
      w-full mb-3 relative overflow-hidden group text-left`}
  >
    <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-3
      ${isActive ? 'bg-blue-600 text-white' : completed ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}`}>
      {completed ? <CheckCircle2 size={16} /> : index}
    </div>
    <Icon className={`w-5 h-5 mr-2 ${isActive ? 'text-blue-600' : completed ? 'text-green-500' : 'text-gray-500'}`} />
    <span className={`font-medium ${isActive ? 'text-gray-900' : completed ? 'text-gray-800' : 'text-gray-700'}`}>
      {title}
    </span>
  </motion.button>
);

const FileUploadArea = ({ onFileUpload, isUploading, isDragging, error }) => {
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
        ${isDragging ? 'border-blue-500 bg-blue-50' : error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:bg-gray-50'}`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          onFileUpload(e.dataTransfer.files[0]);
        }
      }}
      onClick={() => document.getElementById('file-upload').click()}
    >
      <UploadCloud className={`w-12 h-12 mx-auto mb-2 ${error ? 'text-red-400' : 'text-gray-400'}`} />
      <p className={`mb-1 ${error ? 'text-red-600' : 'text-gray-500'}`}>
        {isUploading ? 'Processing file...' : 'Drag & drop or click to select file'}
      </p>
      <p className="text-sm text-gray-400">Supports CSV, Excel, JSON files</p>
      <input
        id="file-upload"
        type="file"
        onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
        className="hidden"
        accept=".csv,.xlsx,.json"
      />
    </div>
  );
};

const ErrorAlert = ({ message, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-between p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 mb-6"
  >
    <div className="flex items-center">
      <AlertCircle className="w-5 h-5 mr-2" />
      <span>{message}</span>
    </div>
    {onDismiss && (
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
        <X size={18} />
      </button>
    )}
  </motion.div>
);

const SuccessAlert = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center p-4 bg-green-50 text-green-600 rounded-lg border border-green-200 mb-6"
  >
    <CheckCircle2 className="w-5 h-5 mr-2" />
    <span>{message}</span>
  </motion.div>
);

const StepNavigation = ({ currentStep, totalSteps, onBack, onNext, backLabel = 'Back', nextLabel = 'Next' }) => (
  <div className="mt-8 flex justify-between pt-6 border-t border-gray-200">
    <button
      onClick={onBack}
      disabled={currentStep === 1}
      className={`px-6 py-2 rounded-lg transition flex items-center ${
        currentStep === 1
          ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-100'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
      }`}
    >
      <ChevronLeft className="w-4 h-4 mr-1" /> {backLabel}
    </button>
    <button
      onClick={onNext}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
    >
      {nextLabel} <ChevronLeft className="w-4 h-4 ml-1 transform rotate-180" />
    </button>
  </div>
);

 export {
  StepCard,
  FileUploadArea,
  ErrorAlert,
  SuccessAlert,
  StepNavigation
};