import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, ChevronLeft, Search, FileText, Database, Waypoints, X, ChevronDown } from 'lucide-react';
import { GridLoader } from 'react-spinners';

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
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <div className="min-h-screen bg-white">
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap');

        :root {
          --font-size: 16px;
          --background: #ffffff;
          --foreground: #333333;
          --card: #ffffff;
          --card-foreground: #333333;
          --primary: #0065bd;
          --primary-foreground: #ffffff;
          --secondary: #f8f8f8;
          --secondary-foreground: #333333;
          --muted: #f8f8f8;
          --muted-foreground: #5e5e5e;
          --accent: #e9ebef;
          --accent-foreground: #333333;
          --destructive: #d4183d;
          --destructive-foreground: #ffffff;
          --border: #b3b3b3;
          --input: #f8f8f8;
          --input-background: #f8f8f8;
          --switch-background: #cbced4;
          --font-weight-light: 300;
          --font-weight-normal: 400;
          --font-weight-medium: 500;
          --font-weight-bold: 700;
          --ring: #0065bd;
          --chart-1: #0065bd;
          --chart-2: #005eb8;
          --chart-3: #00437d;
          --chart-4: #d9eeff;
          --chart-5: #5e5e5e;
          --radius: 4px;
          --sidebar: #f8f8f8;
          --sidebar-foreground: #333333;
          --sidebar-primary: #0065bd;
          --sidebar-primary-foreground: #ffffff;
          --sidebar-accent: #e9ebef;
          --sidebar-accent-foreground: #333333;
          --sidebar-border: #b3b3b3;
          --sidebar-ring: #0065bd;
          --sg-blue: #0065bd;
          --sg-blue-dark: #005eb8;
          --sg-blue-darker: #00437d;
          --sg-blue-light: #d9eeff;
          --sg-blue-lighter: #f0f8ff;
          --sg-blue-lightest: #e6f3ff;
          --sg-blue-border: rgba(0,101,189,0.64);
          --sg-blue-text: #00437d;
          --sg-blue-hover: #004a9f;
          --sg-gray: #5e5e5e;
          --sg-gray-dark: #333333;
          --sg-gray-light: #ebebeb;
          --sg-gray-lighter: #f8f8f8;
          --sg-gray-border: #b3b3b3;
          --sg-gray-bg: #f8f8f8;
          --sg-text-primary: #333333;
          --sg-text-secondary: #5e5e5e;
          --sg-text-inverse: #ffffff;
          --sg-focus: #ffb900;
          --sg-focus-outline: 3px solid var(--sg-focus);
          --sg-space-xs: 4px;
          --sg-space-sm: 8px;
          --sg-space-md: 16px;
          --sg-space-lg: 24px;
          --sg-space-xl: 32px;
          --sg-space-xxl: 48px;
          --sg-font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --sg-font-size-xs: 0.75rem;
          --sg-font-size-sm: 0.875rem;
          --sg-font-size-base: 1rem;
          --sg-font-size-lg: 1.125rem;
          --sg-font-size-xl: 1.25rem;
          --sg-font-size-2xl: 1.5rem;
          --sg-font-size-3xl: 1.875rem;
          --sg-font-size-4xl: 2.25rem;
          --sg-font-size-5xl: 3rem;
          --sg-line-height-tight: 1.25;
          --sg-line-height-normal: 1.5;
          --sg-line-height-relaxed: 1.75;
        }

        .dark {
          --background: #1a1a1a;
          --foreground: #ffffff;
          --card: #1a1a1a;
          --card-foreground: #ffffff;
          --primary: #0065bd;
          --primary-foreground: #ffffff;
          --secondary: #333333;
          --secondary-foreground: #ffffff;
          --muted: #333333;
          --muted-foreground: #b3b3b3;
          --accent: #333333;
          --accent-foreground: #ffffff;
          --destructive: #d4183d;
          --destructive-foreground: #ffffff;
          --border: #333333;
          --input: #333333;
          --ring: #0065bd;
          --sidebar: #1a1a1a;
          --sidebar-foreground: #ffffff;
          --sidebar-primary: #0065bd;
          --sidebar-primary-foreground: #ffffff;
          --sidebar-accent: #333333;
          --sidebar-accent-foreground: #ffffff;
          --sidebar-border: #333333;
          --sidebar-ring: #0065bd;
        }

        @layer base {
          * {
            border-color: var(--border);
            outline: none;
          }

          body {
            background: var(--background);
            color: var(--foreground);
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            line-height: var(--sg-line-height-normal);
            color: var(--sg-text-primary);
          }

          *:focus-visible {
            outline: var(--sg-focus-outline);
            outline-offset: 2px;
          }

          a, button, input[type="button"], input[type="submit"], input[type="reset"], select, [role="button"], [tabindex="0"] {
            cursor: pointer;
          }

          input[type="text"], input[type="email"], input[type="password"], input[type="search"], textarea {
            cursor: text;
          }

          h1 {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-4xl);
            font-weight: var(--font-weight-bold);
            line-height: var(--sg-line-height-tight);
            color: var(--sg-text-primary);
            margin-bottom: var(--sg-space-lg);
          }

          h2 {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-2xl);
            font-weight: var(--font-weight-bold);
            line-height: var(--sg-line-height-tight);
            color: var(--sg-text-primary);
            margin-bottom: var(--sg-space-md);
          }

          h3 {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-xl);
            font-weight: var(--font-weight-medium);
            line-height: var(--sg-line-height-normal);
            color: var(--sg-text-primary);
            margin-bottom: var(--sg-space-md);
          }

          p {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            font-weight: var(--font-weight-normal);
            line-height: var(--sg-line-height-normal);
            color: var(--sg-text-primary);
            margin-bottom: var(--sg-space-md);
          }

          label {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            font-weight: var(--font-weight-medium);
            line-height: var(--sg-line-height-normal);
            color: var(--sg-text-primary);
          }

          button {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            font-weight: var(--font-weight-medium);
            line-height: var(--sg-line-height-normal);
            cursor: pointer;
          }

          input {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            font-weight: var(--font-weight-normal);
            line-height: var(--sg-line-height-normal);
            color: var(--sg-text-primary);
          }

          a {
            font-family: var(--sg-font-family);
            color: var(--sg-blue);
            text-decoration: none;
            text-underline-position: from-font;
            cursor: pointer;
            transition: color 0.2s ease-in-out;
          }

          a:hover {
            color: var(--sg-blue-hover);
            text-decoration: none;
          }
        }

        @layer components {
          .sg-data-search-container {
            position: relative;
            display: flex;
          }

          .sg-data-search-container:focus-within .sg-data-search-input,
          .sg-data-search-container:focus-within .sg-data-search-button {
            border-color: var(--sg-focus);
          }

          .sg-data-search-input {
            width: 100%;
            height: 48px;
            padding: 0 12px;
            padding-right: 48px;
            background: #f8f8f8;
            border: 2px solid #5e5e5e;
            border-right: none;
            font-size: 16px;
            color: #333333;
            transition: border-color 0.2s ease-in-out;
            border-radius: var(--radius) 0 0 var(--radius);
          }

          .sg-data-search-input:focus {
            border-color: var(--sg-focus);
            outline: none;
          }

          .sg-data-search-input::placeholder {
            color: #5e5e5e;
          }

          .sg-data-search-button {
            width: 48px;
            height: 48px;
            background: #0065bd;
            border: 2px solid #5e5e5e;
            border-left: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            border-radius: 0 var(--radius) var(--radius) 0;
          }

          .sg-data-search-button:hover {
            background: var(--sg-blue-hover);
          }

          .sg-filter-item {
            border-top: 1px solid #b3b3b3;
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
          }

          .sg-filter-item:hover {
            background-color: #f8f8f8;
          }

          .sg-filter-item-last {
            border-bottom: 1px solid #b3b3b3;
          }

          .sg-filter-content {
            padding: 16px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .sg-filter-label {
            font-family: var(--sg-font-family);
            font-size: 16px;
            font-weight: var(--font-weight-normal);
            color: var(--sg-text-primary);
            line-height: 1.5;
          }

          .sg-filter-chevron {
            width: 16px;
            height: 16px;
            color: var(--sg-blue);
            transition: transform 0.2s ease-in-out;
          }

          .sg-filter-item:hover .sg-filter-chevron,
          .sg-filter-expanded .sg-filter-chevron {
            transform: rotate(180deg);
          }

          .sg-dataset-tile {
            background: var(--background);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--sg-gray-light);
            border-radius: var(--radius);
            padding: var(--sg-space-lg);
            display: block;
            text-decoration: none;
            cursor: pointer;
            transition: box-shadow 0.2s ease-in-out;
          }

          .sg-dataset-tile:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .sg-dataset-title {
            font-family: var(--sg-font-family);
            font-size: 22px;
            font-weight: var(--font-weight-bold);
            line-height: 32px;
            letter-spacing: 0.15px;
            color: var(--sg-blue);
            margin-bottom: 8px;
            text-decoration: underline;
            transition: color 0.2s ease-in-out;
          }

          .sg-dataset-tile:hover .sg-dataset-title {
            color: var(--sg-blue-hover);
            text-decoration: underline;
          }

          .sg-dataset-description {
            font-family: var(--sg-font-family);
            font-size: 19px;
            line-height: 32px;
            letter-spacing: 0.15px;
            color: var(--sg-text-primary);
            margin-bottom: 8px;
            text-decoration: none !important;
          }

          .sg-sort-container {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: flex-end;
            margin-bottom: var(--sg-space-lg);
            margin-top: 46px;
          }

          .sg-sort-label {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-base);
            color: var(--sg-text-primary);
            letter-spacing: 0.15px;
          }



          .sg-sort-dropdown {
            width: 100%;
            height: 100%;
            padding: 0 12px;
            padding-right: 40px;
            background: white;
            border: 2px solid black;
            font-size: var(--sg-font-size-base);
            color: var(--sg-text-primary);
            appearance: none;
            cursor: pointer;
            border-radius: var(--radius);
          }

          .sg-pagination {
            display: flex;
            justify-content: center;
            padding-top: var(--sg-space-lg);
            gap: 8px;
          }

          .sg-pagination-button {
            width: 40px;
            height: 40px;
            background: var(--sg-gray-lighter);
            border-bottom: 2px solid black;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--sg-font-size-base);
            color: var(--sg-text-primary);
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
            border-radius: var(--radius);
          }

          .sg-pagination-button:hover {
            background: var(--sg-blue-light);
          }

          .sg-pagination-button:disabled {
            background: var(--sg-gray-light);
            color: var(--sg-gray);
            cursor: not-allowed;
            opacity: 0.6;
          }

          .sg-pagination-button-active {
            background: var(--sg-blue-lightest);
            border-bottom: 2px solid var(--sg-blue);
            color: var(--sg-blue);
            font-weight: var(--font-weight-medium);
          }

          .sg-fab {
            position: fixed;
            bottom: 32px;
            right: 32px;
            width: 56px;
            height: 56px;
            background: var(--sg-blue);
            color: var(--sg-text-inverse);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transition: background-color 0.2s ease-in-out;
            z-index: 1000;
          }

          .sg-fab:hover {
            background: var(--sg-blue-hover);
          }

          .sg-empty-state {
            text-align: center;
            padding: var(--sg-space-xl);
            background: var(--background);
            border: 1px solid var(--sg-gray-light);
            border-radius: var(--radius);
          }

          .sg-empty-state-icon {
            width: 64px;
            height: 64px;
            color: var(--sg-gray);
            margin: 0 auto var(--sg-space-md);
          }

          .sg-empty-state-title {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-xl);
            font-weight: var(--font-weight-medium);
            color: var(--sg-text-primary);
            margin-bottom: var(--sg-space-sm);
          }

          .sg-empty-state-description {
            font-family: var(--sg-font-family);
            font-size: var(--sg-font-size-sm);
            color: var(--sg-text-secondary);
          }

          .sg-badge {
            padding: 2px 8px;
            font-size: var(--sg-font-size-sm);
            font-weight: var(--font-weight-medium);
            border-radius: var(--radius);
            display: inline-flex;
            align-items: center;
            text-transform: capitalize;
          }
        }

        @media (max-width: 768px) {
          .sg-data-search-input {
            height: 40px;
          }

          .sg-data-search-button {
            width: 40px;
            height: 40px;
          }

          .sg-sort-container {
            margin-top: var(--sg-space-lg);
          }

          .sg-sort-select {
            width: 140px;
            height: 36px;
          }

          .sg-sort-chevron {
            width: 36px;
            height: 36px;
          }

          .sg-fab {
            bottom: 16px;
            right: 16px;
            width: 48px;
            height: 48px;
          }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center gap-2 text-base">
            <a
              href="#/"
              className="text-[#0065bd] hover:text-[#004a9f] hover:no-underline underline cursor-pointer transition-colors duration-200"
            >
              Home
            </a>
            <span className="text-[#5e5e5e]">&gt;</span>
            <span className="text-[#333333]">Workflows</span>
          </div>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar - 25% width */}
          <div className="w-1/4 shrink-0">
            {/* Page title */}
            <div className="mb-6">
              <h1 className="text-[44px] font-bold text-black leading-[50px] tracking-[0.15px] whitespace-nowrap">
                {filteredWorkflows.length} workflows available
              </h1>
            </div>

            {/* Search */}
            <div className="mb-6">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
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
                  <Search className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Filter by */}
            <div>
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
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
                className="w-full h-12 bg-[#0065bd] text-white font-bold text-base mt-8 rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Clear filters
              </button>
            </div>
          </div>

          {/* Main content - 75% width */}
          <div className="w-3/4">
            {/* Sort by dropdown */}
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

            {/* Workflow tiles */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <GridLoader color="#0065bd" size={17.5} margin={7.5} />
              </div>
            ) : (
              <div className="space-y-6">
                {filteredWorkflows.length > 0 ? (
                  filteredWorkflows.map((workflow) => {
                    const { icon } = getDestinationIconAndColor(workflow.destination);
                    return (
                      <a
                        key={workflow.id}
                        href={`/workflows/workflow/${workflow.id}`}
                        className="sg-dataset-tile block"
                      >
                   <h3 className="sg-dataset-title">
  WF{String(workflow.id).padStart(4, '0')} - {workflow.name}
</h3>
<div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3 [text-decoration:none]">
  <span className="flex items-center gap-1 [text-decoration:none]">
    {icon}
    {workflow.destination || 'N/A'}
  </span>
  <span className="[text-decoration:none]">
    Last updated: {workflow.last_run ? new Date(workflow.last_run).toLocaleDateString('en-GB') : 'N/A'}
  </span>
  <span className="flex items-center gap-1 [text-decoration:none]">
    Status: <span className={`sg-badge ${getStatusBadge(workflow.status)}`}>{workflow.status}</span>
  </span>
</div>

<p className="sg-dataset-description [text-decoration:none]">
  {workflow.description || 'No description available'}
</p>

                      </a>
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