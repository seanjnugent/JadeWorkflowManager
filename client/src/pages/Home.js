import React, { useState, useEffect } from 'react';
import {
  Plus, Workflow, Plug, Settings, Code,
  ChevronRight, Search, FileText, Database, Waypoints
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    // Fetch workflows data from the API
    fetch('http://localhost:8000/workflows/?page=1&limit=10', {
      headers: {
        'accept': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      // Map over the workflows to add icons and other necessary fields
      const mappedWorkflows = data.workflows.slice(0, 3).map((workflow) => {
        const { icon, color } = getDestinationIconAndColor(workflow.destination);
        return {
          ...workflow,
          icon: icon,
          lastRun: "Never run" // Update lastRun text
        };
      });
      setWorkflows(mappedWorkflows);
    })
    .catch(error => console.error('Error fetching workflows:', error));
  }, []);

  const getDestinationIconAndColor = (destination) => {
    switch (destination?.toLowerCase()) {
      case 'api':
        return { icon: <Waypoints className="w-6 h-6 text-blue-600" />, color: 'bg-blue-100 border-blue-200' };
      case 'csv':
        return { icon: <FileText className="w-6 h-6 text-teal-600" />, color: 'bg-teal-100 border-teal-200' };
      case 'database':
        return { icon: <Database className="w-6 h-6 text-red-600" />, color: 'bg-red-100 border-red-200' };
      default:
        return { icon: <FileText className="w-6 h-6 text-gray-600" />, color: 'bg-gray-100 border-gray-200' };
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Workflows Section */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">My Workflows</h2>
              <button
                onClick={() => navigate('/workflows')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="space-y-4">
              {workflows.map((workflow) => (
                <motion.div
                  key={workflow.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                  className="bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-2">
                      {workflow.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{workflow.name}</h3>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      workflow.status === 'Active' ? 'bg-green-100 text-green-700' :
                      workflow.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {workflow.status}
                    </span>
                    <span className="text-sm text-gray-500">{workflow.lastRun}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Add Workflow and Quick Actions */}
          <div className="space-y-6">
            {/* Add Workflow Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/workflows/new/')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg p-6 flex flex-col items-start justify-between shadow-lg shadow-blue-500/20 transition-all"
            >
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2 text-left">Create New Workflow</h3>
                <p className="text-sm text-white/80 text-left">
                  Design a new data pipeline or ETL process
                </p>
              </div>
            </motion.button>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Configuration</h2>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/connections')}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-2">
                    <Plug className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">Data Connections</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => navigate('/settings')}
                className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-2">
                    <Settings className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-800">Settings</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
