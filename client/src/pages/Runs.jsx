import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Runs = () => {
  const navigate = useNavigate();
  const [allRuns, setAllRuns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    fetch(`${API_BASE_URL}/runs?user_id=${userId}&page=${currentPage}&limit=${limit}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.runs && Array.isArray(data.runs)) {
          setAllRuns(data.runs);
        } else {
          setAllRuns([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching runs:', err);
        setAllRuns([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate, currentPage]);

  const totalPages = Math.ceil(allRuns.length / limit);

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
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const paginatedRuns = sortedRuns.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="ds_page__middle">
      <div className="ds_wrapper">
        <header className="ds_page-header">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
            <div>
              <h4 className="leading-none text-[20px] font-semibold">All Runs</h4>
              <p className="text-gray-600 mt-1">Monitor and manage your workflow executions</p>
            </div>
            <div className="flex gap-3 mt-4 lg:mt-0">
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all h-9 px-4 py-2 border bg-white hover:bg-gray-50 border-gray-200">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
            </div>
          </div>
        </header>

        <div className="bg-white flex flex-col gap-6 rounded-xl border shadow-sm">
          <div className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 border-b border-gray-200 pb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Filter runs..."
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
                    <th
                      className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px] cursor-pointer"
                      onClick={() => requestSort('id')}
                    >
                      ID {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[280px] cursor-pointer"
                      onClick={() => requestSort('workflow_id')}
                    >
                      Workflow ID
                    </th>
                    <th
                      className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[100px] cursor-pointer"
                      onClick={() => requestSort('status')}
                    >
                      Status
                    </th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[110px]">
                      Started At
                    </th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[110px]">
                      Finished At
                    </th>
                    <th className="h-10 text-left align-middle whitespace-nowrap font-semibold text-gray-900 py-4 px-6 w-[250px]">
                      Error Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">Loading...</td>
                    </tr>
                  ) : paginatedRuns.length > 0 ? (
                    paginatedRuns.map((run) => (
                      <tr
                        key={run.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors bg-white"
                        onClick={() => navigate(`/runs/run/${run.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                          <div className="text-sm text-gray-900">{run.id}</div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[280px]">
                          <div className="max-w-[260px]">
                            <div className="font-semibold text-gray-900 break-words leading-tight">{run.workflow_id}</div>
                          </div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[100px]">
                          <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium border whitespace-nowrap ${getStatusBadge(run.status)}`}>
                            {getStatusIcon(run.status)}
                            <span className="ml-1">{run.status}</span>
                          </span>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[110px]">
                          <div className="text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {new Date(run.started_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </div>
                        </td>
                        <td className="p-2 align-middle whitespace-nowrap py-4 px-6 w-[110px]">
                          <div className="text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {run.finished_at ? new Date(run.finished_at).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            }) : 'Still running'}
                          </div>
                        </td>
                        <td className="p-2 align-middle py-4 px-6 w-[250px]">
                          <div className="text-sm text-gray-600 break-words leading-tight max-w-[230px]">{run.error_message || 'N/A'}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-gray-500">No runs available.</td>
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

export default Runs;
