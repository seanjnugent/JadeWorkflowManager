import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Workflow, Plug, Settings, Filter,
  ChevronRight, Search, FileText, Database, Waypoints,
  CircleCheckBig
} from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Home = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [user, setUser] = useState(null);
  const [isWorkflowsLoading, setIsWorkflowsLoading] = useState(true);
  const [isRecentActivityLoading, setIsRecentActivityLoading] = useState(true);

  // Fetch workflows
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    const apiUrl = `${API_BASE_URL}/workflows/?page=1&limit=10&user_id=${userId}`;

    fetch(apiUrl, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch workflows');
        return response.json();
      })
      .then(data => {
        const mappedWorkflows = data.workflows.slice(0, 3).map((workflow) => ({
          ...workflow,
          icon: getDestinationIconAndColor(workflow.destination).icon,
          lastRun: workflow.last_run ? formatLastRunDate(workflow.last_run) : "Never run"
        }));
        setWorkflows(mappedWorkflows);
      })
      .catch(error => console.error('Error fetching workflows:', error))
      .finally(() => setIsWorkflowsLoading(false));
  }, [navigate]);

  // Fetch user info
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
        if (!data.user) throw new Error('User not found');
        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch recent activity
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');
    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${API_BASE_URL}/users/recent-activity?user_id=${userId}&limit=3`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    })
      .then(response => {
        if (!response.ok) throw new Error("Failed to fetch recent activity");
        return response.json();
      })
      .then(data => {
        const formattedData = data.map(activity => ({
          ...activity,
          status: activity.status === "SUCCESS" ? "Completed" :
                 activity.status === "FAILURE" ? "Failed" :
                 activity.status,
          lastRun: activity.last_updated
            ? formatLastRunDate(activity.last_updated)
            : "Never run",
          workflow_id: `WF${String(activity.workflow_id).padStart(4, '0')}`,
        }));
        setRecentActivity(formattedData);
      })
      .catch(error => console.error('Error fetching recent activity:', error))
      .finally(() => setIsRecentActivityLoading(false));
  }, [navigate]);

  // Helper: Format date like "17 Jun, 14:30"
  const formatLastRunDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Helper: Get icons and colors based on destination
  const getDestinationIconAndColor = (destination) => {
    switch (destination?.toLowerCase()) {
      case 'api':
        return { icon: <Waypoints className="h-6 w-6 text-blue-600" /> };
      case 'csv':
        return { icon: <FileText className="h-6 w-6 text-teal-600" /> };
      case 'database':
        return { icon: <Database className="h-6 w-6 text-red-600" /> };
      default:
        return { icon: <FileText className="h-6 w-6 text-gray-600" /> };
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header Section */}
        <header className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Hi {user ? `${user.first_name}` : ''},</h1>
          <p className="text-gray-600 text-sm mt-1">
            Manage and monitor your dataset processing pipelines and publications
          </p>
        </header>

        {/* Recent Activity Section */}
        <div className="bg-white border border-gray-300 p-6 mb-8">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <CircleCheckBig className="h-6 w-6 text-blue-600" />
              Recent Activity
            </h4>
            <p className="text-gray-600 text-sm mt-1">Your latest workflow activities</p>
          </div>
          {isRecentActivityLoading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Status</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[280px]">Workflow</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[120px]">User</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[110px]">Time</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6">Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-200 hover:bg-gray-50 bg-white"
                        onClick={() => navigate(`/runs/run/${activity.run_id}`)}
                      >
                        <td className="py-4 px-6 w-[100px]">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                            activity.status === "Completed"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : activity.status === "STARTED" || activity.status === "RUNNING"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : activity.status === "Failed"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                          }`}>
                            {activity.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 w-[280px]">
                          <div className="max-w-[260px]">
                            <div className="text-sm font-medium text-gray-900 break-words">{activity.workflow_name}</div>
                            <div className="text-sm text-gray-600 mt-1">{activity.workflow_id}</div>
                          </div>
                        </td>
                        <td className="py-4 px-6 w-[120px]">
                          <div className="text-sm text-gray-900">{activity.triggered_by_username}</div>
                        </td>
                        <td className="py-4 px-6 w-[110px]">
                          <div className="text-sm text-gray-900 whitespace-nowrap">{activity.lastRun}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 break-words">{activity.latest_activity}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-sm text-gray-600">No recent activity found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workflows Section */}
        <div className="bg-white border border-gray-300 p-6">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Workflow className="h-6 w-6 text-blue-600" />
              Your Workflows
            </h4>
            <p className="text-gray-600 text-sm mt-1">Monitor and manage your dataset processing workflows</p>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 h-4 w-4" />
                <input
                  className="w-full h-9 px-3 py-1 pl-10 text-sm bg-white border border-gray-300 focus:border-blue-900"
                  placeholder="Search dataset pipelines..."
                  value=""
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <button className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2">
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </div>
          {isWorkflowsLoading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[280px]">Pipeline Name</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[120px]">Category</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Status</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[110px]">Last Run</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[250px]">Workflow Owner</th>
                    <th className="text-left font-medium text-gray-900 py-4 px-6 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="border-b border-gray-200 hover:bg-gray-50 bg-white"
                      onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                    >
                      <td className="py-4 px-6 w-[280px]">
                        <div className="max-w-[260px]">
                          <div className="text-sm text-gray-600 mt-1">{`WF${String(workflow.id).padStart(4, '0')}`}</div>
                          <div className="text-xs font-medium text-gray-900 break-words">{workflow.name}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 w-[120px]">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200">
                          {workflow.destination || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-4 px-6 w-[100px]">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                          workflow.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' :
                          workflow.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {workflow.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 w-[110px]">
                        <div className="text-sm text-gray-900 whitespace-nowrap">{workflow.lastRun}</div>
                      </td>
                      <td className="py-4 px-6 w-[250px]">
                        <div className="max-w-[230px]">
                          <div className="text-sm font-medium text-gray-900 break-words">{workflow.owner}</div>
                          <div className="text-xs text-gray-600 mt-1 break-words">{workflow.group_name || ''}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6 w-[120px]">
                        <button className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-3 py-1">
                          <ChevronRight className="h-4 w-4" />
                          Explore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/workflows/new/')}
            className="lg:col-span-1 bg-blue-900 border border-blue-900 text-white p-6 flex flex-col items-start justify-between"
          >
            <div className="w-12 h-12 bg-white/10 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-2 text-left">Create New Workflow</h3>
              <p className="text-sm text-white/80 text-left">
                Design a new data pipeline or ETL process
              </p>
            </div>
          </button>
          <div className="lg:col-span-2 bg-white border border-gray-300 p-6 space-y-4">
            <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              Configuration
            </h2>
            <button
              onClick={() => navigate('/connections')}
              className="w-full bg-white border border-gray-300 p-4 flex items-center justify-between hover:bg-gray-100"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-gray-50 border border-gray-200 p-2">
                  <Plug className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Data Connections</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-white border border-gray-300 p-4 flex items-center justify-between hover:bg-gray-100"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-gray-50 border border-gray-200 p-2">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-sm font-medium text-gray-900">Settings</span>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;