import React from 'react';
import { Plus, FileText, Clock, CheckCircle2, PlayCircle, Zap, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  
  // Dummy data
  const workflows = [
    { name: 'Monthly Stats Processing', status: 'complete', date: '2024-03-15', type: 'Python' },
    { name: 'EPC Monthly Upload', status: 'running', date: '2024-03-18', type: 'SQL' },
    { name: 'Customer Data Enrichment', status: 'pending', date: '2024-03-19', type: 'R' },
  ];

  const recentActivity = [
    { workflow: 'Sales Report Generator', status: 'running', date: '2024-03-20 09:30', progress: 65 },
    { workflow: 'Data Cleanup', status: 'complete', date: '2024-03-20 08:45', progress: 100 },
    { workflow: 'API Data Pull', status: 'error', date: '2024-03-20 07:15', progress: 30 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="container mx-auto px-4 py-16">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Welcome to Conduit</h1>
              <p className="text-gray-200 text-lg">Automate your data workflows with precision</p>
            </div>
            <button 
              onClick={() => navigate('/new-workflow')}
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all px-8 py-4 rounded-lg flex items-center gap-2 group"
            >
              <Plus className="w-5 h-5 text-white" />
              <span className="text-white font-medium">New Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 -mt-8">
        {/* Workflows Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              My Workflows
            </h2>
            <button 
              onClick={() => navigate('/workflows')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflows.map((workflow, index) => (
              <div 
                key={index}
                className="border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    workflow.status === 'complete' ? 'bg-green-100 text-green-600' :
                    workflow.status === 'running' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {workflow.status}
                  </span>
                </div>
                <h3 className="font-medium mb-1">{workflow.name}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{workflow.type} Pipeline</span>
                  <span>{workflow.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </h2>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{activity.workflow}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'complete' ? 'bg-green-100 text-green-600' :
                      activity.status === 'running' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{activity.date}</span>
                    {activity.status === 'running' && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full">
                          <div 
                            className="h-full bg-blue-600 rounded-full transition-all" 
                            style={{ width: `${activity.progress}%` }}
                          />
                        </div>
                        <span>{activity.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              Quick Actions
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-all"
                onClick={() => navigate('/templates')}
              >
                <div className="text-blue-600 mb-2">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="font-medium">Use Template</span>
                <p className="text-sm text-gray-500 mt-1">Start from existing workflow</p>
              </button>
              
              <button 
                className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition-all"
                onClick={() => navigate('/connections')}
              >
                <div className="text-blue-600 mb-2">
                  <Database className="w-6 h-6" />
                </div>
                <span className="font-medium">Data Sources</span>
                <p className="text-sm text-gray-500 mt-1">Manage connections</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;