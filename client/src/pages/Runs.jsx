import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RefreshCw, Plus, Search, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { GridLoader } from 'react-spinners';

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
        return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4 text-red-600" />, badge: 'bg-red-50 text-red-700 border-red-200' };
      case 'running':
        return { icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />, badge: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'cancelled':
        return { icon: <XCircle className="h-4 w-4 text-purple-700" />, badge: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { icon: null, badge: 'bg-gray-50 text-gray-700 border-gray-200' };
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
    <div className="min-h-screen bg-gray-50">
      <style>{`
        .sg-data-search-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .sg-data-search-input {
          width: 100%;
          height: 48px;
          padding: 0 48px 0 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          line-height: 24px;
          color: #333333;
          transition: all 0.3s ease;
        }
        .sg-data-search-input:focus {
          outline: none;
          border-color: #0065bd;
          box-shadow: 0 0 0 3px rgba(0, 101, 189, 0.1);
        }
        .sg-data-search-button {
          position: absolute;
          right: 0;
          top: 0;
          width: 48px;
          height: 48px;
          background-color: #0065bd;
          border-radius: 0 8px 8px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.3s ease;
        }
        .sg-data-search-button:hover {
          background-color: #004a9f;
        }
        .sg-filter-item {
          padding: 16px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .sg-filter-item-last {
          border-bottom: none;
        }
        .sg-filter-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .sg-filter-content:hover {
          color: #0065bd;
        }
        .sg-filter-label {
          font-size: 16px;
          line-height: 24px;
          color: #374151;
          font-weight: 500;
        }
        .sg-filter-chevron {
          width: 20px;
          height: 20px;
          color: #6b7280;
          transition: transform 0.3s ease;
        }
        .sg-filter-expanded .sg-filter-chevron {
          transform: rotate(180deg);
        }
        .sg-run-card {
          display: block;
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sg-run-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0065bd, #004a9f);
          transform: scaleX(0);
          transition: transform 0.3s ease;
        }
        .sg-run-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
        .sg-run-card:hover::before {
          transform: scaleX(1);
        }
        .sg-run-title {
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        .sg-run-card:hover .sg-run-title {
          color: #0065bd;
        }
        .sg-run-description {
          font-size: 16px;
          line-height: 24px;
          color: #6b7280;
          transition: color 0.3s ease;
        }
        .sg-run-card:hover .sg-run-description {
          color: #4b5563;
        }
        .sg-sidebar {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          border: 1px solid #e5e7eb;
          height: fit-content;
          position: sticky;
          top: 24px;
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <div className="flex items-center gap-2 text-base">
            <a
              href="/"
              className="text-[#0065bd] hover:text-[#004a9f] hover:no-underline underline cursor-pointer transition-colors duration-200"
              onClick={(e) => { e.preventDefault(); navigate('/'); }}
            >
              Home
            </a>
            <span className="text-[#6b7280]">></span>
            <span className="text-[#374151] font-medium">Runs</span>
          </div>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar - 25% width */}
          <div className="w-1/4 shrink-0">
            <div className="sg-sidebar">
              <div className="mb-6">
                <h1 className="text-[24px] font-bold text-[#1f2937] leading-[42px] tracking-[0.15px]">
                  {sortedRuns.length} runs found
                </h1>
              </div>

              {/* Search */}
              <div className="mb-8">
                <h2 className="text-[20px] font-semibold text-[#1f2937] leading-[28px] tracking-[0.15px] mb-3">
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
                <h2 className="text-[20px] font-semibold text-[#1f2937] leading-[28px] tracking-[0.15px] mb-4">
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
                        <label key={status} className="flex items-center gap-3 text-sm text-[#374151] cursor-pointer hover:text-[#0065bd] transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(status)}
                            onChange={() => handleFilterChange('status', status)}
                            className="h-4 w-4 text-[#0065bd] border-gray-300 rounded focus:ring-[#0065bd] focus:ring-2"
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
                        <label key={id} className="flex items-center gap-3 text-sm text-[#374151] cursor-pointer hover:text-[#0065bd] transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.workflow_id.includes(id)}
                            onChange={() => handleFilterChange('workflow_id', id)}
                            className="h-4 w-4 text-[#0065bd] border-gray-300 rounded focus:ring-[#0065bd] focus:ring-2"
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
                          <label key={trigger} className="flex items-center gap-3 text-sm text-[#374151] cursor-pointer hover:text-[#0065bd] transition-colors">
                            <input
                              type="checkbox"
                              checked={filters.triggered_by.includes(trigger)}
                              onChange={() => handleFilterChange('triggered_by', trigger)}
                              className="h-4 w-4 text-[#0065bd] border-gray-300 rounded focus:ring-[#0065bd] focus:ring-2"
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
                  className="w-full h-12 bg-[#0065bd] hover:bg-[#004a9f] text-white font-semibold text-base mt-6 rounded-lg transition-colors duration-300"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - 75% width */}
          <div className="w-3/4">
            {/* Sort by Dropdown */}
            <div className="flex justify-end mb-8">
              <div className="flex items-center gap-3">
                <label className="text-base text-[#374151] font-medium tracking-[0.15px]">
                  Sort by:
                </label>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-11 w-44 px-4 pr-10 bg-white border border-gray-300 rounded-lg text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0065bd] focus:border-[#0065bd] transition-colors"
                  >
                    <option>Most relevant</option>
                    <option>Newest first</option>
                    <option>Oldest first</option>
                    <option>A-Z</option>
                    <option>Z-A</option>
                  </select>
                  <div className="absolute right-0 top-0 w-11 h-11 bg-[#0065bd] rounded-r-lg flex items-center justify-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Run Cards */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <GridLoader color="#0065bd" size={17.5} margin={7.5} />
              </div>
            ) : (
              <div className="space-y-6">
                {sortedRuns.length > 0 ? (
                  sortedRuns.map((run) => {
                    const { icon, badge } = getStatusIconAndColor(run.status);
                    return (
                      <a
                        key={run.id}
                        href={`/runs/run/${run.id}`}
                        className="sg-run-card"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/runs/run/${run.id}`);
                        }}
                      >
                        <h3 className="sg-run-title">
                          Run #{run.id}
                        </h3>
                        <div className="flex items-center gap-6 text-[14px] text-[#6b7280] leading-[20px] tracking-[0.15px] mb-4">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#374151]">Workflow ID:</span> {run.workflow_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#374151]">Status:</span>
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${badge}`}>
                              {icon} <span className="ml-1">{run.status}</span>
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#374151]">Started:</span> {new Date(run.started_at).toLocaleDateString('en-GB')}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-[#374151]">Triggered By:</span> User ID {run.triggered_by}
                          </span>
                        </div>
                        <p className="sg-run-description">
                          {run.error_message || 'No error message'}
                        </p>
                      </a>
                    );
                  })
                ) : (
                  <div className="text-center py-12 bg-white rounded-12 border border-gray-200">
                    <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No runs found</h3>
                    <p className="text-sm text-gray-500">No runs match your current search criteria.</p>
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-center pt-8">
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-[#0065bd] transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-600" />
                  </button>
                  {[...Array(totalPages)].map((_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => handlePageChange(index + 1)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-medium transition-colors ${
                        currentPage === index + 1
                          ? 'bg-[#0065bd] text-white border border-[#0065bd]'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-[#0065bd]'
                      }`}
                    >
                      <span className="text-sm">{index + 1}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 bg-white border border-gray-300 rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-[#0065bd] transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating New Run Button */}
        <button
          onClick={() => navigate('/runs/new/')}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#0065bd] hover:bg-[#004a9f] text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Runs;