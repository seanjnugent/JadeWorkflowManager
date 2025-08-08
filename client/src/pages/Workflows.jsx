import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronLeft, Search, FileText, Database, Waypoints, X, ChevronDown } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import '../jade.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Workflows = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [sortBy, setSortBy] = useState('Most relevant');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    destination: [],
    owner: [],
    group: []
  });
  const [expandedFilters, setExpandedFilters] = useState({
    destination: false,
    owner: false,
    group: false
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
      page: currentPage.toString(),
      limit: limit.toString(),
      user_id: userId
    });

    fetch(`${API_BASE_URL}/workflows/?${queryParams}`, {
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
      destination: [],
      owner: [],
      group: []
    });
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'sg-badge-success';
      case 'failed':
        return 'sg-badge-error';
      case 'scheduled':
        return 'sg-badge-info';
      default:
        return 'sg-badge-neutral';
    }
  };

  const getDestinationIconAndColor = (destination) => {
    const destinations = destination?.split(',').map(d => d.trim().toLowerCase()) || [];
    if (destinations.includes('pdf')) {
      return { icon: <FileText className="h-4 w-4 text-[#0065bd]" /> };
    } else if (destinations.includes('csv')) {
      return { icon: <FileText className="h-4 w-4 text-[#0065bd]" /> };
    } else if (destinations.includes('database')) {
      return { icon: <Database className="h-4 w-4 text-red-600" /> };
    } else if (destinations.includes('api')) {
      return { icon: <Waypoints className="h-4 w-4 text-blue-600" /> };
    }
    return { icon: <FileText className="h-4 w-4 text-gray-600" /> };
  };

  const uniqueDestinations = Array.from(
    new Set(
      workflows
        .flatMap(w => w.destination?.split(',').map(d => d.trim()) || [])
        .filter(Boolean)
    )
  );
  const uniqueOwners = Array.from(new Set(workflows.map(w => w.owner).filter(Boolean)));
  const uniqueGroups = Array.from(new Set(workflows.map(w => w.group_name).filter(Boolean)));

  const filteredWorkflows = React.useMemo(() => {
    return workflows.filter(workflow => {
      const matchesSearch = (
        workflow.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (workflow.description && workflow.description.toLowerCase().includes(searchValue.toLowerCase())) ||
        (workflow.status && workflow.status.toLowerCase().includes(searchValue.toLowerCase()))
      );

      const matchesDestination = filters.destination.length === 0 ||
        workflow.destination?.split(',').some(d => filters.destination.includes(d.trim()));
      const matchesOwner = filters.owner.length === 0 || filters.owner.includes(workflow.owner);
      const matchesGroup = filters.group.length === 0 || filters.group.includes(workflow.group_name);

      return matchesSearch && matchesDestination && matchesOwner && matchesGroup;
    });
  }, [workflows, searchValue, filters]);

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
          <span className="sg-breadcrumb-current">Workflows</span>
        </nav>

        <div className="sg-layout-grid">
          {/* Sidebar */}
          <div className="sg-layout-sidebar">
            <div className="sg-sidebar">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {filteredWorkflows.length} workflows found
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
                    placeholder="Search workflows..."
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
                    aria-label="Search workflows"
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

                {/* Destination Filter */}
                <div className={`sg-filter-item ${expandedFilters.destination ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('destination')}>
                    <span className="sg-filter-label">Destination</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.destination && (
                    <div className="mt-3 space-y-3">
                      {uniqueDestinations.map(dest => (
                        <label key={dest} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.destination.includes(dest)}
                            onChange={() => handleFilterChange('destination', dest)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                          />
                          {dest}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Owner Filter */}
                <div className={`sg-filter-item ${expandedFilters.owner ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('owner')}>
                    <span className="sg-filter-label">Owner</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.owner && (
                    <div className="mt-3 space-y-3">
                      {uniqueOwners.map(owner => (
                        <label key={owner} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.owner.includes(owner)}
                            onChange={() => handleFilterChange('owner', owner)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                          />
                          {owner}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group Filter */}
                <div className={`sg-filter-item sg-filter-item-last ${expandedFilters.group ? 'sg-filter-expanded' : ''}`}>
                  <div className="sg-filter-content" onClick={() => toggleFilter('group')}>
                    <span className="sg-filter-label">Group</span>
                    <ChevronDown className="sg-filter-chevron" />
                  </div>
                  {expandedFilters.group && (
                    <div className="mt-3 space-y-3">
                      {uniqueGroups.length > 0 ? (
                        uniqueGroups.map(group => (
                          <label key={group} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                            <input
                              type="checkbox"
                              checked={filters.group.includes(group)}
                              onChange={() => handleFilterChange('group', group)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                            />
                            {group}
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No groups available</p>
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

            {/* Workflow Cards */}
            {loading ? (
              <div className="sg-loading">
                <GridLoader color="#0065bd" size={17.5} margin={7.5} />
              </div>
            ) : (
              <div className="space-y-6">
                {filteredWorkflows.length > 0 ? (
                  filteredWorkflows.map((workflow) => {
                    const { icon } = getDestinationIconAndColor(workflow.destination);
                    return (
                      <div
                        key={workflow.id}
                        className="sg-card"
                        onClick={() => navigate(`/workflows/workflow/${workflow.id}`)}
                      >
                        <h3 className="sg-card-title">
                          {workflow.name}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Destination:</span> 
                            <span className="flex items-center gap-1">{icon} {workflow.destination || 'N/A'}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Last run:</span> {workflow.last_run ? new Date(workflow.last_run).toLocaleDateString('en-GB') : 'N/A'}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Status:</span> 
                            <span className={`sg-badge ${getStatusBadge(workflow.status)}`}>
                              {workflow.status}
                            </span>
                          </span>
                        </div>
                        <p className="sg-card-description">
                          {workflow.description || 'No description available'}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="sg-empty-state">
                    <FileText className="sg-empty-state-icon" />
                    <h3 className="sg-empty-state-title">No workflows found</h3>
                    <p className="sg-empty-state-description">No workflows match your current search criteria.</p>
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

        {/* Floating New Workflow Button */}
        <button
          onClick={() => navigate('/workflows/new/')}
          className="sg-fab"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Workflows;