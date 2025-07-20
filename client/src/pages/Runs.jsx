import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Runs = () => {
  const navigate = useNavigate();
  const [allRuns, setAllRuns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
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

    fetch(`${API_BASE_URL}/runs/?user_id=${userId}&page=${currentPage}&limit=${limit}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.runs && Array.isArray(data.runs)) {
          setAllRuns(data.runs);
          setTotalItems(data.pagination.total);
        } else {
          setAllRuns([]);
          setTotalItems(0);
        }
      })
      .catch((err) => {
        console.error('Error fetching runs:', err);
        setAllRuns([]);
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

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-purple-700" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'running':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedRuns = React.useMemo(() => {
    let sortableRuns = [...allRuns];

    if (sortConfig.key !== null) {
      sortableRuns.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableRuns.filter(
      (run) =>
        run.id.toString().toLowerCase().includes(filter.toLowerCase()) ||
        run.workflow_id.toString().toLowerCase().includes(filter.toLowerCase()) ||
        run.status.toLowerCase().includes(filter.toLowerCase())
    );
  }, [allRuns, sortConfig, filter]);

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
            <h1 className="text-xl font-semibold text-gray-900">All Runs</h1>
            <p className="text-gray-600 text-sm mt-1">Monitor and manage your workflow executions</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-600" />
              <input
                type="text"
                placeholder="Filter runs..."
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
                    <th
                      className="text-left font-medium text-gray-900 py-3 px-2 w-1/5 cursor-pointer"
                      onClick={() => requestSort('id')}
                    >
                      ID {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="text-left font-medium text-gray-900 py-3 px-2 w-1/5 cursor-pointer"
                      onClick={() => requestSort('workflow_id')}
                    >
                      Workflow ID
                    </th>
                    <th
                      className="text-left font-medium text-gray-900 py-3 px-2 w-1/5 cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      Status
                    </th>
                    <th className="text-left font-medium text-gray-900 py-3 px-2 w-1/5">
                      Started At
                    </th>
                    <th className="text-left font-medium text-gray-900 py-3 px-2 w-1/5">
                      Error Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRuns.length > 0 ? (
                    sortedRuns.map((run) => (
                      <tr
                        key={run.id}
                        className="border-b border-gray-200 hover:bg-gray-50 bg-white"
                        onClick={() => navigate(`/runs/run/${run.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="py-3 px-2 w-1/5">
                          <div className="text-sm text-gray-900 truncate">{run.id}</div>
                        </td>
                        <td className="py-3 px-2 w-1/5">
                          <div className="text-sm font-medium text-gray-900 truncate">{run.workflow_id}</div>
                        </td>
                        <td className="py-3 px-2 w-1/5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${getStatusBadge(run.status)}`}>
                            {getStatusIcon(run.status)}
                            <span className="ml-1">{run.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-2 w-1/5">
                          <div className="text-sm text-gray-900 whitespace-nowrap truncate">
                            {new Date(run.started_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-2 w-1/5">
                          <div className="text-sm text-gray-600 truncate">{run.error_message || 'N/A'}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-sm text-gray-600">No runs available.</td>
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

export default Runs;