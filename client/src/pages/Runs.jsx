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
    user_name: []
  });
  const [expandedFilters, setExpandedFilters] = useState({
    status: false,
    workflow_id: false,
    user_name: false
  });
  // Store unique filter values fetched from the backend
  const [filterOptions, setFilterOptions] = useState({
    status: [],
    workflow_id: [],
    user_name: []
  });
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Jade | Runs";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  const limit = 10;

  useEffect(() => {
    setLoading(true);
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');

    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      user_id: userId,
      page: currentPage.toString(),
      limit: limit.toString(),
      ...(searchValue && { search: searchValue }),
      ...(filters.status.length > 0 && { status: filters.status.join(',') }),
      ...(filters.workflow_id.length > 0 && { workflow_id: filters.workflow_id.join(',') }),
      ...(filters.user_name.length > 0 && { user_name: filters.user_name.join(',') }),
      ...(sortBy !== 'Most relevant' && { sort_by: sortBy })
    });

    // Fetch runs
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

    // Fetch filter options
    fetch(`${API_BASE_URL}/runs/filter-options`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch filter options');
        return res.json();
      })
      .then((data) => {
        setFilterOptions({
          status: data.status || [],
          workflow_id: data.workflow_id || [],
          user_name: data.user_name || []
        });
      })
      .catch((err) => {
        console.error('Error fetching filter options:', err);
      });
  }, [navigate, currentPage, searchValue, filters, sortBy]);

  const totalPages = Math.ceil(totalItems / limit);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const clearSearch = () => {
    setSearchValue('');
    setCurrentPage(1);
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
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({
      status: [],
      workflow_id: [],
      user_name: []
    });
    setCurrentPage(1);
  };

  const getStatusIconAndColor = (status) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
        return { icon: <CheckCircle className="h-4 w-4 text-green-600" />, badge: 'bg-green-100 text-green-800' };
      case 'failed':
        return { icon: <XCircle className="h-4 w-4 text-red-600" />, badge: 'bg-red-100 text-red-800' };
      case 'running':
        return { icon: <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />, badge: 'bg-blue-100 text-blue-800' };
      case 'cancelled':
        return { icon: <XCircle className="h-4 w-4 text-purple-700" />, badge: 'bg-purple-100 text-purple-800' };
      default:
        return { icon: null, badge: 'bg-gray-100 text-gray-800' };
    }
  };

  // Use filterOptions for filter dropdowns
  const { status: uniqueStatuses, workflow_id: uniqueWorkflowIds, user_name: uniqueTriggeredBy } = filterOptions;

  // Backend handles filtering and sorting
  const sortedRuns = useMemo(() => {
    return [...allRuns];
  }, [allRuns]);

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

          .sg-sort-select {
            position: relative;
            width: 180px;
            height: 40px;
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

          .sg-sort-chevron {
            position: absolute;
            top: 0;
            right: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .sg-sort-chevron-icon {
            width: 16px;
            height: 16px;
            color: var(--sg-text-primary);
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
        <nav className="mb-6">
          <div className="flex items-center gap-2 text-base">
            <a
              href="#/"
              className="text-[#0065bd] hover:text-[#004a9f] hover:no-underline underline cursor-pointer transition-colors duration-200"
            >
              Home
            </a>
            <span className="text-[#5e5e5e">&gt;</span>
            <span className="text-[#333333]">Runs</span>
          </div>
        </nav>

        <div className="flex gap-8">
          <div className="w-1/4 shrink-0">
            <div className="mb-6">
              <h1 className="text-[44px] font-bold text-black leading-[50px] tracking-[0.15px] whitespace-nowrap">
                {totalItems} runs available
              </h1>
            </div>

            <div className="mb-6">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
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
                  <Search className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
                Filter by
              </h2>

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
                        WF0{id}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className={`sg-filter-item sg-filter-item-last ${expandedFilters.user_name ? 'sg-filter-expanded' : ''}`}>
                <div className="sg-filter-content" onClick={() => toggleFilter('user_name')}>
                  <span className="sg-filter-label">Triggered By</span>
                  <ChevronDown className="sg-filter-chevron" />
                </div>
                {expandedFilters.user_name && (
                  <div className="mt-3 space-y-3">
                    {uniqueTriggeredBy.length > 0 ? (
                      uniqueTriggeredBy.map(trigger => (
                        <label key={trigger} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={filters.user_name.includes(trigger)}
                            onChange={() => handleFilterChange('user_name', trigger)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                          />
                          {trigger}
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No users available</p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={clearFilters}
                className="w-full h-12 bg-[#0065bd] text-white font-bold text-base mt-8 rounded hover:bg-[#004a9f] transition-colors duration-200"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="w-3/4">
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

            {loading ? (
              <div className="flex justify-center items-center py-12">
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
                        className="sg-dataset-tile block"
                      >
                        <h3 className="sg-dataset-title">
                          Run #{run.id}
                        </h3>
                        <div className="flex items-center gap-4 text-[14px] text-[#5e5e5e] leading-[24px] tracking-[0.15px] mb-3 [text-decoration:none]">
                          <span className="flex items-center gap-1 [text-decoration:none]">
                            WF0{run.workflow_id}
                          </span>
                          <span className="flex items-center gap-1 [text-decoration:none]">
                            Status: <span className={`sg-badge ${badge}`}>
                              {icon} <span className="ml-1">{run.status}</span>
                            </span>
                          </span>
                          <span className="[text-decoration:none]">
                            Started: {new Date(run.started_at).toLocaleDateString('en-GB')}
                          </span>
                          <span className="[text-decoration:none]">
                            Triggered By: {run.user_name}
                          </span>
                        </div>
                        <p className="sg-dataset-description [text-decoration:none]">
                          {run.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {run.run_name}
                        </p>
                      </a>
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