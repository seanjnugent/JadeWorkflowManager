// ./components/CustomTooltip.jsx
import React, { useState } from 'react';
import '../styles/Workflow.css'; // Import your CSS styles

const CustomTooltip = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-1';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 -mr-1';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-1';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-0 left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900';
      case 'left':
        return 'right-0 top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900';
      case 'right':
        return 'left-0 top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900';
    }
  };

  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 whitespace-nowrap bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg ${getPositionClasses()}`}
        >
          <div className={`absolute w-0 h-0 ${getArrowClasses()}`}></div>
          {content}
        </div>
      )}
    </div>
  );
};

export default CustomTooltip;