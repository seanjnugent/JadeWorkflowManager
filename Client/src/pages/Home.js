import React, { useState } from 'react';
import { 
  Plus, FileText, Clock, Play, Activity, 
  Database, Upload, ChevronRight, BarChart2, 
  Settings, Calendar, Bell, Menu, Search, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  
  // Dummy data
  const recentWorkflows = [
    { 
      name: 'Sales Data Clean', 
      status: 'complete', 
      date: 'Today at 9:32 AM', 
      type: 'Transform', 
      color: '#38bdf8',
      completedSteps: 4,
      totalSteps: 4
    },
    { 
      name: 'Customer Merge', 
      status: 'running', 
      date: 'Now', 
      type: 'Merge', 
      color: '#38bdf8',
      completedSteps: 2,
      totalSteps: 3 
    },
    { 
      name: 'Marketing Analysis', 
      status: 'pending', 
      date: 'Scheduled for 2:00 PM', 
      type: 'Analyze', 
      color: '#38bdf8',
      completedSteps: 0,
      totalSteps: 3
    },
  ];

  const popularTemplates = [
    { 
      name: 'Clean & Normalize', 
      description: 'Standardize formats and remove duplicates', 
      uses: 245,
    },
    { 
      name: 'Weekly Sales Report', 
      description: 'Aggregate regional sales data into a report', 
      uses: 182,
    },
    { 
      name: 'Campaign Metrics', 
      description: 'Process and visualize campaign performance', 
      uses: 107,
    },
  ];

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    // Process the dropped files
    const files = e.dataTransfer.files;
    if (files.length) {
      // Navigate to a new workflow
      navigate('/new-workflow', { state: { files } });
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 relative overflow-hidden">
      {/* Dynamic background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent"></div>
      
      {/* Header */}
      <header className="backdrop-blur-xl bg-gray-950/70 border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Conduit</h1>
              
              <div className="hidden md:flex items-center gap-8 ml-8">
                <a href="/dashboard" className="text-gray-300 hover:text-white transition-colors">Dashboard</a>
                <a href="/workflows" className="text-gray-300 hover:text-white transition-colors">Workflows</a>
                <a href="/templates" className="text-gray-300 hover:text-white transition-colors">Templates</a>
                <a href="/connections" className="text-gray-300 hover:text-white transition-colors">Data Sources</a>
              </div>
            </div>
            
            <div className="flex items-center gap-5">
              <div className="relative hidden md:block">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-gray-500 w-64"
                />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
              
              <button className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/70 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              
              <button className="p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/70 transition-colors md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-medium">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        {/* Upload & Quick Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div 
            className={`lg:col-span-2 backdrop-blur-xl ${
              dragActive 
                ? 'bg-blue-900/20 border-blue-500/50' 
                : 'bg-gray-900/40 border-gray-800'
            } rounded-md border p-8 transition-all duration-200 relative overflow-hidden`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Subtle glow effect */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-2xl font-bold text-white mb-2 relative z-10">Transform Your Data</h2>
            <p className="text-gray-400 mb-6 max-w-md relative z-10">
              Drag and drop your CSV file to start a new transformation workflow
            </p>
            
            <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-700 rounded-md bg-gray-900/40 mb-6 relative z-10">
              <div className="p-4 bg-blue-900/30 rounded-md text-blue-400 mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-medium text-lg mb-1 text-white text-center">Drop your CSV file here</h3>
              <p className="text-gray-400 text-sm text-center mb-4">
                or select a file from your computer
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-md text-sm text-white font-medium"
                onClick={() => document.getElementById('file-upload').click()}
              >
                Browse Files
              </motion.button>
              <input id="file-upload" type="file" accept=".csv" className="hidden" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
              <div className="bg-gray-800/40 backdrop-blur-md rounded-md p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-gray-400 text-sm">Processed Today</h4>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">5 files</p>
              </div>
              
              <div className="bg-gray-800/40 backdrop-blur-md rounded-md p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-gray-400 text-sm">Active Workflows</h4>
                  <Play className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">2</p>
              </div>
              
              <div className="bg-gray-800/40 backdrop-blur-md rounded-md p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-gray-400 text-sm">Data Processed</h4>
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">1.2 GB</p>
              </div>
            </div>
          </div>
          
          <div className="backdrop-blur-xl bg-gray-900/40 border border-gray-800 rounded-md p-6 relative overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 relative z-10">
              <Clock className="w-5 h-5 text-blue-400" />
              Quick Actions
            </h2>
            
            <div className="space-y-3 relative z-10">
              <motion.button
                whileHover={{ x: 4 }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md rounded-md border border-gray-800 text-left hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-md text-blue-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white">New Workflow</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </motion.button>
              
              <motion.button
                whileHover={{ x: 4 }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md rounded-md border border-gray-800 text-left hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-md text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white">Templates</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </motion.button>
              
              <motion.button
                whileHover={{ x: 4 }}
                className="w-full flex items-center justify-between p-4 bg-gray-800/40 backdrop-blur-md rounded-md border border-gray-800 text-left hover:border-blue-500/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-900/30 rounded-md text-blue-400">
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-white">Connections</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors" />
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Recent Workflows */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Recent Workflows
            </h2>
            <button 
              onClick={() => navigate('/workflows')}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center"
            >
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentWorkflows.map((workflow, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="backdrop-blur-xl bg-gray-900/40 border border-gray-800 rounded-md p-5 hover:border-blue-500/40 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => navigate(`/workflow/${index}`)}
              >
                {/* Status indicator light */}
                <div 
                  className={`absolute top-0 right-6 w-1 h-8 rounded-b-full ${
                    workflow.status === 'complete' ? 'bg-green-500' :
                    workflow.status === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
                
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="w-10 h-10 bg-gray-800/60 rounded-md flex items-center justify-center"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-md font-medium ${
                    workflow.status === 'complete' ? 'bg-green-900/30 text-green-400' :
                    workflow.status === 'running' ? 'bg-blue-900/30 text-blue-300' : 'bg-gray-800 text-gray-400'
                  }`}>
                    {workflow.status === 'running' ? 'Processing...' : workflow.status}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-1">{workflow.name}</h3>
                <div className="text-sm text-gray-400 mb-4">{workflow.date}</div>
                
                {/* Progress indicator */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex-1 mr-4">
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(workflow.completedSteps / workflow.totalSteps) * 100}%`,
                          backgroundColor: workflow.color
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-gray-400 font-medium">
                    {workflow.completedSteps}/{workflow.totalSteps}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Popular Templates */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Popular Templates
            </h2>
            <button 
              className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center"
              onClick={() => navigate('/templates')}
            >
              Browse Library <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {popularTemplates.map((template, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.01, borderColor: 'rgba(59, 130, 246, 0.5)' }}
                whileTap={{ scale: 0.99 }}
                className="backdrop-blur-xl bg-gray-900/40 border border-gray-800 rounded-md p-5 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => navigate(`/templates/${index}`)}
              >
                {/* Subtle glow effect */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
                
                <div 
                  className="w-10 h-10 bg-gray-800/60 rounded-md flex items-center justify-center mb-3"
                >
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">{template.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{template.uses} users</span>
                  <span className="text-xs px-2 py-1 bg-gray-800 rounded-md text-gray-400">Template</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;