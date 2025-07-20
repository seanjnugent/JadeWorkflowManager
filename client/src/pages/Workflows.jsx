import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronLeft, Search, FileText, Database, Waypoints, Filter, X } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Workflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${API_BASE_URL}/workflows/?page=${currentPage}&limit=${limit}&user_id=${userId}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch workflows');
        return response.json();
      })
      .then(data => {
        setWorkflows(data.workflows || []);
        setTotalItems(data.pagination?.total || 0);
      })
      .catch(error => {
        console.error('Error fetching workflows:', error);
        setWorkflows([]);
        setTotalItems(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, currentPage]);

  const totalPages = Math.ceil(totalItems / limit);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getDestinationIconAndColor = (destination) => {
    switch (destination?.toLowerCase()) {
      case 'api':
        return { icon: <Waypoints className="h-4 w-4 text-blue-600" /> };
      case 'csv':
        return { icon: <FileText className="h-4 w-4 text-teal-600" /> };
      case 'database':
        return { icon: <Database className="h-4 w-4 text-red-600" /> };
      default:
        return { icon: <FileText className="h-4 w-4 text-gray-600" /> };
    }
  };

  const filteredWorkflows = React.useMemo(() => {
    return workflows.filter(workflow =>
      workflow.name.toLowerCase().includes(filter.toLowerCase()) ||
      (workflow.description && workflow.description.toLowerCase().includes(filter.toLowerCase())) ||
      (workflow.status && workflow.status.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [workflows, filter]);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Home
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Your Workflows</h1>
            <p className="text-gray-600 text-sm mt-1">Monitor and manage your dataset processing workflows</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Search dataset pipelines..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full h-9 px-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm focus:border-blue-900"
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
            <button
              onClick={() => navigate('/workflows/new/')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
            >
              <Plus className="h-4 w-4" />
              New Workflow
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50">
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[10%]">ID</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[25%]">Pipeline Name</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[25%]">Description</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[15%]">Owner</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[10%]">Destination</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[10%]">Status</th>
                    <th className="text-left text-xs font-medium text-gray-900 py-3 px-2 w-[10%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkflows.length > 0 ? (
                    filteredWorkflows.map((workflow) => {
                      const { icon } = getDestinationIconAndColor(workflow.destination);
                      return (
                        <tr
                          key={workflow.id}
                          className="border-b border-gray-200 hover:bg-gray-50 bg-white"
                          onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="py-3 px-2 w-[10%]">
                            <div className="text-xs text-gray-900 truncate">{workflow.id}</div>
                          </td>
                          <td className="py-3 px-2 w-[25%]">
                            <div className="flex items-center">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-gray-900 truncate">{workflow.name}</div>
                                <div className="text-xs text-gray-600 mt-1 truncate">{`WF${String(workflow.id).padStart(4, '0')}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 w-[25%]">
                            <div className="text-xs text-gray-600 truncate">{workflow.description || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-2 w-[15%]">
                            <div className="text-xs text-gray-900 truncate">{workflow.owner || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-2 w-[10%]">
                            <div className="flex items-center gap-1 text-xs text-gray-600 truncate">{icon}{workflow.destination || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-2 w-[10%]">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${getStatusBadge(workflow.status)}`}>
                              {workflow.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 w-[10%]">
                            <button
                              className="inline-flex items-center justify-center text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-2 py-1 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workflows/workflow/${workflow.id}`);
                              }}
                            >
                              Explore
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-sm text-gray-600">No workflows available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 space-y-4 sm:space-y-0">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Workflows;