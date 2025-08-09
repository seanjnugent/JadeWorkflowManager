// ./components/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    completed: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: null,
      text: 'Completed',
    },
    success: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      icon: null,
      text: 'Success',
    },
    failed: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: null,
      text: 'Failed',
    },
    running: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: null,
      text: 'Running',
    },
    pending: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: null,
      text: 'Pending',
    },
    unknown: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: null,
      text: 'Unknown',
    },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.unknown;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${config.color}`}
    >
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.text}
    </span>
  );
};

export default StatusBadge;