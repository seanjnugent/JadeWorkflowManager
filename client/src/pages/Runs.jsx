import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw
} from 'lucide-react';

const Runs = () => {
  const navigate = useNavigate();
  const [allRuns, setAllRuns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const limit = 20;

  // Fetch runs from API
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/runs', {
      headers: {
        accept: 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.runs && Array.isArray(data.runs)) {
          setAllRuns(data.runs); // Access the 'runs' property
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
  }, []);

  const totalPages = Math.ceil(allRuns.length / limit);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusIcon = (status) => {
    const normalizedStatus = status?.toLowerCase(); // Make case-insensitive
    switch (normalizedStatus) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failure':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const normalizedStatus = status?.toLowerCase(); // Make case-insensitive
    switch (normalizedStatus) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'failure':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

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
        run.id.toString().includes(filter.toLowerCase()) ||
        run.workflow_id.toString().includes(filter.toLowerCase()) ||
        run.status.toLowerCase().includes(filter.toLowerCase()) // Make case-insensitive
    );
  }, [allRuns, sortConfig, filter]);

  const paginatedRuns = sortedRuns.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Runs</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Filter runs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg py-2 px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('id')}
                  >
                    ID {sortConfig.key === 'id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('workflow_id')}
                  >
                    Workflow ID {sortConfig.key === 'workflow_id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('status')}
                  >
                    Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Finished At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Message</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedRuns.length > 0 ? (
                  paginatedRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                      onClick={() => navigate(`/runs/run/${run.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{run.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{run.workflow_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                            run.status
                          )}`}
                        >
                          {getStatusIcon(run.status)}
                          <span className="ml-2">{run.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {run.finished_at ? new Date(run.finished_at).toLocaleString() : 'Still running'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="truncate max-w-xs">{run.error_message || 'N/A'}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      No runs available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 space-y-4 sm:space-y-0">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-200 disabled:opacity-50 flex items-center"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Previous
            </motion.button>

            <span className="text-gray-700">
              Page {currentPage} of {totalPages}
            </span>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg border border-gray-200 disabled:opacity-50 flex items-center"
            >
              Next
              <ChevronRight className="w-5 h-5 ml-1" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Runs;
