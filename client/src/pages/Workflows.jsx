import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, ChevronRight, ChevronLeft, Search, FileText, Database, Waypoints, Filter } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Workflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${API_BASE_URL}/workflows/?page=${currentPage}&limit=10&user_id=${userId}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        setWorkflows(data.workflows);
      })
      .catch(error => console.error('Error fetching workflows:', error));
  }, [navigate, currentPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDestinationIconAndColor = (destination) => {
    switch (destination?.toLowerCase()) {
      case 'api':
        return { icon: <Waypoints className="w-6 h-6 text-blue-600" /> };
      case 'csv':
        return { icon: <FileText className="w-6 h-6 text-teal-600" /> };
      case 'database':
        return { icon: <Database className="w-6 h-6 text-red-600" /> };
      default:
        return { icon: <FileText className="w-6 h-6 text-gray-600" /> };
    }
  };

  const filteredWorkflows = React.useMemo(() => {
    return workflows.filter(workflow =>
      workflow.name.toLowerCase().includes(filter.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(filter.toLowerCase())) ||
      (workflow.status && workflow.status.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [workflows, filter]);

  const totalPages = Math.ceil(filteredWorkflows.length / 10);
  const paginatedWorkflows = filteredWorkflows.slice((currentPage - 1) * 10, currentPage * 10);

  return (
    <div className="ds_page__middle">
      <div className="ds_wrapper">
        <header className="ds_page-header">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h4 className="leading-none text-[20px] font-semibold">Your Workflows</h4>
                <p className="text-gray-600 mt-1">Monitor and manage your dataset processing workflows</p>
              </div>
              <div className="flex gap-3 mt-4 lg:mt-0">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all h-9 px-4 py-2 border bg-white hover:bg-gray-50 border-gray-200">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/workflows/new/')}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all h-9 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Workflow
                </motion.button>
              </div>
            </div>       </header>

        <div className="bg-white flex flex-col gap-6 rounded-xl border shadow-sm">
          <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-6">
 
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search dataset pipelines..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex h-9 w-full min-w-0 px-3 py-1 text-sm pl-10 bg-white border-2 border-gray-200 focus:border-blue-600 rounded-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="p-0">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px]">ID</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[280px]">Pipeline Name</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[250px]">Description</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">Owner</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">Tags</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[110px]">Date Created</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px]">Status</th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedWorkflows.length > 0 ? (
                    paginatedWorkflows.map((workflow) => {
                      const { icon } = getDestinationIconAndColor(workflow.destination);
                      return (
                        <tr
                          key={workflow.id}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-white"
                          onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                            <div className="text-sm text-gray-900">{workflow.id}</div>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[280px]">
                            <div className="flex items-center max-w-[260px]">
                              <div className="mr-3">{icon}</div>
                              <div>
                                <div className="font-semibold text-gray-900 break-words leading-tight">{workflow.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{`WF${String(workflow.id).padStart(4, '0')}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2 align-middle py-4 px-6 w-[250px]">
                            <div className="text-sm text-gray-600 break-words leading-tight max-w-[230px]">{workflow.description || 'N/A'}</div>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                            <div className="text-sm text-gray-900">{workflow.created_by || 'N/A'}</div>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                            <div className="text-sm text-gray-600">{workflow.tags || 'N/A'}</div>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[110px]">
                            <div className="text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                              {new Date(workflow.created_at).toLocaleString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </div>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                            <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${getStatusBadge(workflow.status)}`}>
                              {workflow.status}
                            </span>
                          </td>
                          <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[120px]">
                            <button className="inline-flex items-center justify-center text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-8 gap-1.5 px-3 rounded-sm whitespace-nowrap">
                              Explore
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-gray-500">No workflows available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 pb-6 space-y-4 sm:space-y-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all h-9 px-4 py-2 border bg-white hover:bg-gray-50 border-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </motion.button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all h-9 px-4 py-2 border bg-white hover:bg-gray-50 border-gray-200 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflows;