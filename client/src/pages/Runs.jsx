import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import '../jade.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Runs = () => {
  const navigate = useNavigate();
  const [allRuns, setAllRuns] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState('Most relevant');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    status: [],
    workflow_id: [],
    triggered_by: []
  });
  const [expandedFilters, setExpandedFilters] = useState({
    status: false,
    workflow_id: false,
    triggered_by: false
  });

  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    const queryParams = new URLSearchParams({
      user_id: userId,
      page: currentPage.toString(),
      limit: limit.toString(),
    });

    fetch(`${API_BASE_URL}/runs/?${queryParams}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch runs');
        return res.json();
      })
      .then((data) => {
        if (data.runs && Array.isArray(data.runs)) {
          setAllRuns(data.runs);
          setTotalItems(data.pagination?.total || 0);
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

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
  };

  const clearSearch = () => {
    setSearchValue('');
  };

  const toggleFilter = (filterType) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value]
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      workflow_id: [],
      triggered_by: []
    });
  };

  const getStatusIconAndColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, badge: 'sg-badge-success' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4 text-red-600" />, badge: 'sg-badge-error' };
      case 'running':
        return { icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />, badge: 'sg-badge-info' };
      case 'cancelled':
        return { icon: <XCircle className="h-4 w-4 text-purple-700" />, badge: 'sg-badge-warning' };
      default:
        return { icon: null, badge: 'sg-badge-neutral' };
    }
  };

  const uniqueStatuses = Array.from(new Set(allRuns.map(run => run.status).filter(Boolean)));
  const uniqueWorkflowIds = Array.from(new Set(allRuns.map(run => run.workflow_id).filter(Boolean)));
  const uniqueTriggeredBy = Array.from(new Set(allRuns.map(run => run.triggered_by).filter(Boolean)));

  const sortedRuns = useMemo(() => {
    let sortableRuns = [...allRuns];

    if (sortBy !== 'Most relevant') {
      sortableRuns.sort((a, b) => {
        let key;
        if (sortBy === 'Newest first') key = 'started_at';
        else if (sortBy === 'Oldest first') key = 'started_at';
        else if (sortBy === 'A-Z') key = 'id';
        else if (sortBy === 'Z-A') key = 'id';

        if (key === 'started_at') {
          const aTime = new Date(a[key]).getTime();
          const bTime = new Date(b[key]).getTime();
          if (sortBy === 'Newest first') return bTime - aTime;
          return aTime - bTime;
        } else {
          if (a[key] < b[key]) return sortBy === 'A-Z' ? -1 : 1;
          if (a[key] > b[key]) return sortBy === 'A-Z' ? 1 : -1;
          return 0;
        }
      });
    }

    return sortableRuns.filter(run => {
      const matchesSearch = (
        run.id.toString().toLowerCase().includes(searchValue.toLowerCase()) ||
        run.workflow_id.toString().toLowerCase().includes(searchValue.toLowerCase()) ||
        run.status.toLowerCase().includes(searchValue.toLowerCase())
      );

      const matchesStatus = filters.status.length === 0 || filters.status.includes(run.status);
      const matchesWorkflowId = filters.workflow_id.length === 0 || filters.workflow_id.includes(run.workflow_id);
      const matchesTriggeredBy = filters.triggered_by.length === 0 || filters.triggered_by.includes(run.triggered_by);

      return matchesSearch && matchesStatus && matchesWorkflowId && matchesTriggeredBy;
    });
  }, [allRuns, sortBy, searchValue, filters]);

  return (
    <div className="min-h-screen">
      <div className="sg-layout-container">
        {/* Breadcrumb */}
        <nav className="sg-breadcrumb">
          <span 
            className="sg-breadcrumb-item"
            onClick={() => navigate('/')}
          >
            Home
          </span>
          <span className="sg-breadcrumb-separator">/</span>
          <span className="sg-breadcrumb-current">Runs</span>
        </nav>

        <div className="sg-layout-grid">
          {/* Sidebar */}
          <div className="sg-layout-sidebar">
            <div className="sg-sidebar">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {sortedRuns.length} runs found
                </h1>
              </div>

              {/* Search */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Search
                </h2>
                <div className="sg-data-search-container">
                  <input
                    type="text"
                    placeholder="Search runs..."
                    value={searchValue}
                    onChange={handleSearchChange}
                    className="sg-data-search-input"
                  />
                  {searchValue && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    className="sg-data-search-button"
                    type="submit"
                    aria-label="Search runs"
                  >
                    <Search className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Filter by */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Filter by
                </h2>

                {/* Status Filter */}
                <div className={`sg-filter-item ${expandedFilters.status ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('status')}>
                    <span className="sg-filter-label">Status</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.status && (
                    <div className="mt-3 space-y-3">
                      {uniqueStatuses.map(status => (
                        <label key={status} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={() => handleFilterChange('status', status)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Workflow ID Filter */}
                <div className={`sg-filter-item ${expandedFilters.workflow_id ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('workflow_id')}>
                    <span className="sg-filter-label">Workflow ID</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.workflow_id && (
                    <div className="mt-3 space-y-3">
                      {uniqueWorkflowIds.map(id => (
                        <label key={id} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.workflow_id.includes(id)}
                            onChange={() => handleFilterChange('workflow_id', id)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                          />
                          {id}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Triggered By Filter */}
                <div className={`sg-filter-item sg-filter-item-last ${expandedFilters.triggered_by ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('triggered_by')}>
                    <span className="sg-filter-label">Triggered By</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.triggered_by && (
                    <div className="mt-3 space-y-3">
                      {uniqueTriggeredBy.length > 0 ? (
                        uniqueTriggeredBy.map(trigger => (
                          <label key={trigger} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                            <input
                              type="checkbox"
                              checked={filters.triggered_by.includes(trigger)}
                              onChange={() => handleFilterChange('triggered_by', trigger)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                            />
                            User ID: {trigger}
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No users available</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Clear Filters Button */}
                <button
                  onClick={clearFilters}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base mt-6 rounded-lg transition-colors duration-300"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="sg-layout-main">
            {/* Sort by Dropdown */}
            <div className="sg-sort-container">
              <label className="sg-sort-label">
                Sort by:
              </label>
              <div className="sg-sort-select">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sg-sort-dropdown"
                >
                  <option>Most relevant</option>
                  <option>Newest first</option>
                  <option>Oldest first</option>
                  <option>A-Z</option>
                  <option>Z-A</option>
                </select>
                <div className="sg-sort-chevron">
                  <ChevronDown className="sg-sort-chevron-icon" />
                </div>
              </div>
            </div>

            {/* Run Cards */}
            {loading ? (
              <div className="sg-loading">
                <GridLoader color="#0065bd" size={17.5} margin={7.5} />
              </div>
            ) : (
              <div className="space-y-6">
                {sortedRuns.length > 0 ? (
                  sortedRuns.map((run) => {
                    const { icon, badge } = getStatusIconAndColor(run.status);
                    return (
                      <div
                        key={run.id}
                        className="sg-card"
                        onClick={() => navigate(`/runs/run/${run.id}`)}
                      >
                        <h3 className="sg-card-title">
                          Run #{run.id}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Workflow ID:</span> {run.workflow_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Status:</span>
                            <span className={`sg-badge ${badge}`}>
                              {icon} <span className="ml-1">{run.status}</span>
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Started:</span> {new Date(run.started_at).toLocaleDateString('en-GB')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Triggered By:</span> User ID {run.triggered_by}
                          </span>
                        </div>
                        <p className="sg-card-description">
                          {run.error_message || 'No error message'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="sg-empty-state">
                    <CheckCircle className="sg-empty-state-icon" />
                    <h3 className="sg-empty-state-title">No runs found</h3>
                    <p className="sg-empty-state-description">No runs match your current search criteria.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="sg-pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="sg-pagination-button"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`sg-pagination-button ${currentPage === index + 1 ? 'sg-pagination-button-active' : ''}`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="sg-pagination-button"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Floating New Run Button */}
        <button
          onClick={() => navigate('/runs/new/')}
          className="sg-fab"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Runs;