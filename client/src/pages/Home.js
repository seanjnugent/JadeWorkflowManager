import React, { useState, useEffect } from 'react';
import {
  Plus, Workflow, Plug, Settings, Code,
  ChevronRight, Search, FileText, Database, Waypoints,
  Clock, CircleCheckBig, Play, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Home = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [user, setUser] = useState(null);

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

  useEffect(() => {
    const fetchUser = async () => {
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('access_token');

      if (!userId || !accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            navigate('/login', { replace: true });
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        if (!data.user) {
          throw new Error('User not found');
        }

        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [navigate]);

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
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Hi {user ? `${user.first_name}` : 'User'},</h1>
            <p className="text-gray-600 mt-2">
              Manage and monitor your dataset processing pipelines and publications
            </p>
          </div>
        </div>

        {/* Rest of your component remains the same */}
        {/* Recent Activity Card */}
        <div className="mb-8">
          <div className="bg-white flex flex-col gap-6 rounded-xl border shadow-sm">
            <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-4">
              <h4 className="flex items-center text-[20px] font-normal">
                <Clock className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
                Recent Activity
              </h4>
            </div>
            <div className="p-0">
              <div className="relative w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b-2 border-gray-200">
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[50px]">Status</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Workflow</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">User</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px]">Time</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6">Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-white">
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[50px]">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs w-fit font-medium border whitespace-nowrap bg-blue-100 text-blue-800 border-blue-200">
                            Running
                          </span>
                        </div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6">
                        <div>
                          <div className="font-semibold text-gray-900">Health Dataset Upload Pipeline</div>
                          <div className="text-sm text-gray-600 mt-1">WF001</div>
                        </div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                        <div className="text-sm text-gray-900">Alex Campbell</div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                        <div className="text-sm text-gray-900">17 Jun, 14:30</div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6">
                        <div className="text-sm text-gray-600">Processing health statistics data</div>
                      </td>
                    </tr>
                    <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-gray-25">
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[50px]">
                        <div className="flex items-center space-x-2">
                          <CircleCheckBig className="h-4 w-4 text-green-600" />
                          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs w-fit font-medium border whitespace-nowrap bg-green-100 text-green-800 border-green-200">
                            Completed
                          </span>
                        </div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6">
                        <div>
                          <div className="font-semibold text-gray-900">Education Performance Data Ingestion</div>
                          <div className="text-sm text-gray-600 mt-1">WF002</div>
                        </div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                        <div className="text-sm text-gray-900">Sarah Wilson</div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                        <div className="text-sm text-gray-900">17 Jun, 13:45</div>
                      </td>
                      <td className="p-2 align-middle whitespace-nowrap py-4 px-6">
                        <div className="text-sm text-gray-600">12,456 records processed successfully</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Workflows Section */}
        <div className="bg-white flex flex-col gap-6 rounded-xl border shadow-sm">
          <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h4 className="leading-none text-xl font-semibold">Your Workflows</h4>
                <p className="text-gray-600 mt-1">Monitor and manage your dataset processing workflows</p>
              </div>
              <div className="flex gap-3 mt-4 lg:mt-0">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 border bg-white hover:bg-gray-50 border-gray-200">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <input
                    className="flex h-9 w-full min-w-0 px-3 py-1 text-sm pl-10 bg-white border-2 border-gray-200 focus:border-blue-600 rounded-sm"
                    placeholder="Search dataset pipelines..."
                    value=""
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className="overflow-x-auto">
              <div className="relative w-full overflow-x-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b-2 border-gray-200">
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[280px]">Pipeline Name</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">Category</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px]">Status</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[110px]">Last Run</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[250px]">User Log</th>
                      <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows.map((workflow) => (
                      <tr
                        key={workflow.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-white"
                        onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                      >
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[280px]">
                          <div className="max-w-[260px]">
                            <div className="font-semibold text-gray-900 break-words leading-tight">{workflow.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{workflow.id}</div>
                          </div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                          <span className="inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap">
                            {workflow.destination || 'Unknown'}
                          </span>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                          <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs w-fit font-medium border whitespace-nowrap ${
                            workflow.status === 'Active' ? 'bg-green-100 text-green-800 border-green-200' :
                            workflow.status === 'Scheduled' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {workflow.status}
                          </span>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[110px]">
                          <div className="max-w-[90px]">
                            <div className="font-semibold text-gray-900 whitespace-nowrap">
                              {workflow.lastRun === "Never run" ? "Never run" : "2025-06-11"}
                            </div>
                            {workflow.lastRun !== "Never run" && (
                              <div className="text-sm text-gray-600 mt-1 whitespace-nowrap">09:30</div>
                            )}
                          </div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[250px]">
                          <div className="max-w-[230px]">
                            <div className="font-semibold text-gray-900 break-words leading-tight">Alex Campbell</div>
                            <div className="text-sm text-gray-600 mt-1 break-words leading-tight">
                              {workflow.description || 'No description available'}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                          <button className="inline-flex items-center justify-center text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-8 gap-1.5 px-3 rounded-sm whitespace-nowrap">
                            Explore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Workflow Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/workflows/new/')}
            className="lg:col-span-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg p-6 flex flex-col items-start justify-between shadow-lg shadow-blue-500/20 transition-all"
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
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuration</h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/connections')}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-all"
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
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-all"
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
    </main>
  );
};

export default Home;
