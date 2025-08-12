import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { TrendingUp, AlertCircle, Layers, Clock, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Card Component
const Card = ({ children, title, icon, className = '' }) => (
  <div className={`sg-dataset-tile ${className}`}>
    <h2 className="sg-dataset-title flex items-center gap-2 mb-4">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

// Metric Card Component
const MetricCard = ({ value, label, icon, trend, className = '' }) => (
  <div className={`sg-dataset-tile ${className}`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="sg-dataset-title">{value}</p>
      </div>
    </div>
  </div>
);

// Fetch Data Utility
const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/${endpoint}`, {
      headers: {
        'accept': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (response.ok) {
      return await response.json();
    }
    throw new Error(`Failed to fetch ${endpoint}`);
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return {};
  }
};

// RunStatsChart Component
const RunStatsChart = ({ data }) => {
  useEffect(() => {
    if (!data.run_stats) return;
    const ctx = document.getElementById('runStatsChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.run_stats.map(stat => stat.date),
        datasets: [
          {
            label: 'Total Runs',
            data: data.run_stats.map(stat => stat.total_runs),
            borderColor: '#0065bd', // --sg-blue
            backgroundColor: 'rgba(0, 101, 189, 0.05)', // --sg-blue-lightest with opacity
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Successful Runs',
            data: data.run_stats.map(stat => stat.successful_runs),
            borderColor: '#10b981', // emerald-600
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Failed Runs',
            data: data.run_stats.map(stat => stat.failed_runs),
            borderColor: '#ef4444', // red-600
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#333333', // --sg-gray-dark
            titleFont: { size: 12, weight: 'normal', family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
            bodyFont: { size: 12, weight: 'normal', family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { 
              color: '#5e5e5e', // --sg-text-secondary
              font: { size: 11, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
            },
          },
          y: {
            grid: { 
              color: '#ebebeb', // --sg-gray-light
              drawBorder: false,
            },
            ticks: { 
              color: '#5e5e5e', // --sg-text-secondary
              font: { size: 11, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
              padding: 8,
            },
          },
        },
        interaction: { mode: 'nearest', intersect: false },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div>
      <div className="h-72">
        <canvas id="runStatsChart" className="w-full h-full"></canvas>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#0065bd] rounded-full"></div>
          <span className="text-xs text-gray-500">Total Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Successful Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Failed Runs</span>
        </div>
      </div>
    </div>
  );
};

// StatusPieChart Component
const StatusPieChart = ({ data }) => {
  useEffect(() => {
    if (!data.run_stats) return;
    const totalSuccess = data.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0);
    const totalFailed = data.run_stats.reduce((sum, stat) => sum + stat.failed_runs, 0);
    const ctx = document.getElementById('statusPieChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Successful', 'Failed'],
        datasets: [{
          data: [totalSuccess, totalFailed],
          backgroundColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
          borderRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#333333', // --sg-gray-dark
            bodyFont: { size: 12, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div className="relative">
      <div className="h-72 flex items-center justify-center">
        <canvas id="statusPieChart" className="w-full max-w-[280px]"></canvas>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Successful</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Failed</span>
        </div>
      </div>
    </div>
  );
};

// RunAnalysisChart Component
const RunAnalysisChart = ({ data }) => {
  useEffect(() => {
    if (!data.analysis) return;
    const workflows = [...new Set(data.analysis.map(item => item.workflow_name))];
    const successData = workflows.map(workflow => {
      const success = data.analysis.find(item => item.workflow_name === workflow && item.status === 'Completed');
      return success ? success.run_count : 0;
    });
    const failureData = workflows.map(workflow => {
      const failure = data.analysis.find(item => item.workflow_name === workflow && item.status === 'Failed');
      return failure ? failure.run_count : 0;
    });
    const ctx = document.getElementById('runAnalysisChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: workflows,
        datasets: [
          {
            label: 'Successful Runs',
            data: successData,
            backgroundColor: '#0065bd', // --sg-blue
            borderWidth: 0,
            borderRadius: 4,
          },
          {
            label: 'Failed Runs',
            data: failureData,
            backgroundColor: '#ef4444', // red-600
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#333333', // --sg-gray-dark
            bodyFont: { size: 12, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            stacked: true,
            ticks: {
              color: '#5e5e5e', // --sg-text-secondary
              font: { size: 11, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
              callback: function(value) {
                return this.getLabelForValue(value).substring(0, 12) + (this.getLabelForValue(value).length > 12 ? '...' : '');
              }
            },
          },
          y: {
            grid: { 
              color: '#ebebeb', // --sg-gray-light
              drawBorder: false,
            },
            stacked: true,
            ticks: { 
              color: '#5e5e5e', // --sg-text-secondary
              font: { size: 11, family: 'Roboto, Helvetica Neue, Arial, sans-serif' },
              padding: 8,
            },
            beginAtZero: true,
          },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div>
      <div className="h-72">
        <canvas id="runAnalysisChart" className="w-full h-full"></canvas>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#0065bd] rounded-full"></div>
          <span className="text-xs text-gray-500">Successful</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-500">Failed</span>
        </div>
      </div>
    </div>
  );
};

// FailureTable Component
const FailureTable = ({ data, navigate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (!data.failures || data.failures.length === 0) return (
    <div className="sg-dataset-tile text-center py-12">
      <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="sg-dataset-title text-gray-500 mb-2">No Failures Detected</h3>
      <p className="sg-dataset-description">All workflows are running smoothly</p>
    <div className="sg-dataset-tile text-center py-12">
      <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="sg-dataset-title text-gray-500 mb-2">No Failures Detected</h3>
      <p className="sg-dataset-description">All workflows are running smoothly</p>
    </div>
  );

  const totalPages = Math.ceil(data.failures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedFailures = data.failures.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    const element = document.getElementById('recent-failures');
    if (element) {
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  const identifyPattern = (message) => {
    if (!message || typeof message !== 'string') return 'Unknown Error';
    const patterns = [
      { pattern: 'GraphQL API error', name: 'GraphQL API Error' },
      { pattern: 'Local execution error', name: 'Local Execution Error' },
      { pattern: 'Remote API error', name: 'Remote API Error' },
      { pattern: 'JSON object must be str', name: 'JSON Type Error' },
      { pattern: 'DagsterGraphQLClient', name: 'Dagster Error' },
      { pattern: 'Pipeline not found', name: 'Pipeline Not Found' },
      { pattern: 'received invalid type', name: 'Invalid Input Type' },
      { pattern: 'Invalid type', name: 'Type Error' },
    ];
    const match = patterns.find(p => message.includes(p.pattern));
    return match ? match.name : 'Other Error';
  };

  return (
    <div>
      <div className="sg-table-wrapper">
        <table className="sg-table">
          <thead>
            <tr>
              <th>Run ID</th>
              <th>Workflow</th>
              <th>Started At</th>
              <th>Error</th>
              <th>Run ID</th>
              <th>Workflow</th>
              <th>Started At</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
          <tbody>
            {paginatedFailures.map((failure) => (
              <tr
                key={failure.run_id}
                className="hover:bg-blue-50 cursor-pointer"
                onClick={() => navigate(`/runs/run/${failure.run_id}`)}
              >
                <td className="font-medium">{failure.run_id}</td>
                <td className="max-w-[200px] truncate">{failure.workflow_name}</td>
                <td className="whitespace-nowrap">
                  {new Date(failure.started_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </td>
                <td>
                <td>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {identifyPattern(failure.error_message)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(startIndex + itemsPerPage, data.failures.length)}</span> of{' '}
            <span className="font-medium">{data.failures.length}</span> failures
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 rounded-md text-sm ${
                    currentPage === page
                      ? 'bg-[#0065bd] text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLast className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Analytics Component
const Analytics = () => {
  const navigate = useNavigate();
  const [runStats, setRunStats] = useState({ run_stats: [] });
  const [failureAnalysis, setFailureAnalysis] = useState({ failures: [] });
  const [runAnalysis, setRunAnalysis] = useState({ analysis: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');

  // Scroll spy functionality
  useEffect(() => {
    const sections = ['overview', 'runs-over-time', 'status-distribution', 'run-analysis', 'recent-failures'];

    const observerOptions = {
      root: null,
      rootMargin: '-45px 0px -60% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (element) observer.observe(element);
    });

    return () => {
      sections.forEach((sectionId) => {
        const element = document.getElementById(sectionId);
        if (element) observer.unobserve(element);
      });
    };
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');
    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [runStatsData, failureData, runAnalysisData] = await Promise.all([
          fetchData('workflow-run-stats'),
          fetchData('failure-analysis'),
          fetchData('run-analysis'),
        ]);
        setRunStats(runStatsData);
        setFailureAnalysis(failureData);
        setRunAnalysis(runAnalysisData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const handleJumpLinkClick = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 45;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
    }
  };

  const isActiveSection = (sectionId) => activeSection === sectionId;

  const totalRuns = runStats.run_stats.reduce((sum, stat) => sum + stat.total_runs, 0);
  const successRate = totalRuns > 0
    ? (runStats.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0) / totalRuns * 100).toFixed(1)
    : 0;
  const totalWorkflows = [...new Set(runAnalysis.analysis.map(item => item.workflow_id))].length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            <GridLoader color="#0065bd" size={17.5} margin={7.5} />
          </div>
          <p className="text-gray-600 text-sm mt-2">Loading analytics data...</p>
          <p className="text-gray-600 text-sm mt-2">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style jsx>{`
        :root {
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
          --sg-space-xs: 4px;
          --sg-space-sm: 8px;
          --sg-space-md: 16px;
          --sg-space-lg: 24px;
          --sg-space-xl: 32px;
          --sg-space-xxl: 48px;
          --sg-font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          --radius: 4px;
        }

        .sg-page-header {
          background: var(--sg-blue-dark);
          color: var(--sg-text-inverse);
          padding: var(--sg-space-xl) 0;
          padding-bottom: var(--sg-space-lg);
        }

        .sg-page-header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--sg-space-lg);
        }

        .sg-page-header-breadcrumb {
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-title {
          font-family: var(--sg-font-family);
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.25;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-md);
        }

        .sg-page-header-description {
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-inverse);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-contents-sticky {
          position: sticky;
          top: var(--sg-space-lg);
          align-self: flex-start;
          background: white;
          border-radius: var(--radius);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: var(--sg-space-lg);
          max-height: calc(100vh - var(--sg-space-xl));
          overflow-y: auto;
        }

        .sg-contents-nav {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .sg-contents-item {
          margin: 0;
          padding: 0;
        }

        .sg-contents-link {
          display: flex;
          align-items: center;
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-decoration: none;
          color: var(--sg-blue);
          font-family: var(--sg-font-family);
          font-size: 1rem;
          font-weight: 400;
          line-height: 1.5;
          border-left: 4px solid transparent;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
          margin: 2px 0;
        }

        .sg-contents-link::before {
          content: '–';
          margin-right: var(--sg-space-sm);
          color: var(--sg-blue);
          font-weight: 400;
        }

        .sg-contents-link:hover {
          background-color: var(--sg-blue-light);
          border-left-color: var(--sg-blue);
          text-decoration: none;
        }

        .sg-contents-link-active {
          background-color: var(--sg-blue-lightest);
          border-left-color: var(--sg-blue);
          font-weight: 500;
          color: var(--sg-blue);
        }

        .sg-contents-link-active::before {
          font-weight: 700;
        }

        .sg-section-separator {
          border-bottom: 1px solid #b3b3b3;
          padding-bottom: var(--sg-space-sm);
          margin-bottom: var(--sg-space-lg);
        }

        .sg-dataset-tile {
          background: white;
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
          font-size: 1.375rem;
          font-weight: 700;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-blue);
          margin-bottom: 8px;
          text-decoration: none;
          transition: color 0.2s ease-in-out;
        }

        .sg-dataset-tile:hover .sg-dataset-title {
          color: var(--sg-blue-hover);
          text-decoration: underline;
        }

        .sg-dataset-description {
          font-family: var(--sg-font-family);
          font-size: 1.1875rem;
          line-height: 2rem;
          letter-spacing: 0.15px;
          color: var(--sg-text-primary);
          margin-bottom: 8px;
          text-decoration: none;
        }

        .sg-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--sg-font-family);
          font-size: 1rem;
          line-height: 1.5;
          color: var(--sg-text-primary);
          border: 1px solid var(--sg-gray-border);
        }

        .sg-table th,
        .sg-table td {
          padding: var(--sg-space-sm) var(--sg-space-md);
          text-align: left;
          border-bottom: 1px solid var(--sg-gray-border);
          vertical-align: top;
        }

        .sg-table thead th {
          background-color: var(--sg-gray-bg);
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody th {
          background-color: transparent;
          font-weight: 500;
          color: var(--sg-text-primary);
        }

        .sg-table tbody tr:hover td,
        .sg-table tbody tr:hover th {
          background-color: var(--sg-blue-lightest);
        }

        .sg-table-wrapper {
          position: relative;
          width: 100%;
          overflow-x: auto;
          border-radius: var(--radius);
          border: 1px solid var(--sg-gray-border);
        }
      `}</style>

      {/* Blue page header section */}
      <div className="sg-page-header">
        <div className="sg-page-header-container">
      <div className="sg-page-header">
        <div className="sg-page-header-container">
          {/* Breadcrumb */}
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
          <nav className="sg-page-header-breadcrumb">
            <div className="flex items-center gap-2 text-base">
              <button 
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
                className="text-white hover:text-[#d9eeff] hover:no-underline underline cursor-pointer transition-colors duration-200"
              >
                Workflows
              </button>
              <span className="text-white">&gt;</span>
              <span className="text-white">&gt;</span>
              <span className="text-white">Analytics</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="sg-page-header-title">
          <h1 className="sg-page-header-title">
            Analytics Dashboard
          </h1>

          {/* Page description - constrained to 75% width */}
          <div className="w-3/4">
            <p className="sg-page-header-description">
              Real-time insights into your pipeline performance with detailed metrics and visualizations.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - 25% width with sticky contents */}
          <div className="w-1/4 shrink-0">
            <div className="sg-contents-sticky">
              <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-4">
                Contents
              </h2>
              
              <nav>
                <ul className="sg-contents-nav">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'runs-over-time', label: 'Runs Over Time' },
                    { id: 'status-distribution', label: 'Status Distribution' },
                    { id: 'run-analysis', label: 'Run Analysis' },
                    { id: 'recent-failures', label: 'Recent Failures' }
                  ].map(section => (
                    <li key={section.id} className="sg-contents-item">
                      <button
                        onClick={() => handleJumpLinkClick(section.id)}
                        className={`sg-contents-link w-full text-left ${activeSection === section.id ? 'sg-contents-link-active' : ''}`}
                      >
                        {section.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>

          {/* Main content - 75% width */}
          <div className="w-3/4">
            {/* Overview Section */}
            <section id="overview" className="mb-12 pt-6">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Overview
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Key metrics for your workflow performance
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <MetricCard
                    value={totalRuns}
                    label="Total Runs"
                    icon={<TrendingUp className="h-5 w-5" />}
                    trend="up"
                  />
                  <MetricCard
                    value={`${successRate}%`}
                    label="Success Rate"
                    icon={<Layers className="h-5 w-5" />}
                    trend={successRate >= 90 ? 'up' : 'down'}
                  />
                  <MetricCard
                    value={totalWorkflows}
                    label="Total Workflows"
                    icon={<Clock className="h-5 w-5" />}
                  />
                </div>
              </div>
            </section>

            {/* Runs Over Time Section */}
            <section id="runs-over-time" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Runs Over Time
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Trends in workflow runs over the past 30 days
                </p>
                <Card
                  title="Workflow Runs Over Time"
                  icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
                >
                  <RunStatsChart data={runStats} />
                </Card>
              </div>
            </section>

            {/* Status Distribution Section */}
            <section id="status-distribution" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Status Distribution
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Breakdown of successful vs failed runs
                </p>
                <Card
                  title="Run Status Distribution"
                  icon={<Layers className="h-5 w-5 text-blue-500" />}
                >
                  <StatusPieChart data={runStats} />
                </Card>
              </div>
            </section>

            {/* Run Analysis Section */}
            <section id="run-analysis" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Run Analysis
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Performance by individual workflows
                </p>
                <Card
                  title="Workflow Run Analysis"
                  icon={<ChevronRight className="h-5 w-5 text-blue-500" />}
                >
                  <RunAnalysisChart data={runAnalysis} />
                </Card>
              </div>
            </section>

            {/* Recent Failures Section */}
            <section id="recent-failures" className="mb-12">
              <div className="sg-section-separator">
                <h2 className="text-[24px] font-bold text-black leading-[32px] tracking-[0.15px] mb-2">
                  Recent Failures
                </h2>
              </div>
              <div className="prose prose-lg max-w-none">
                <p className="text-[19px] leading-[32px] tracking-[0.15px] text-[#333333] mb-6">
                  Details of recent workflow failures and errors
                </p>
                <Card
                  title="Recent Failures"
                  icon={<AlertCircle className="h-5 w-5 text-blue-500" />}
                  className="pb-6"
                >
                  <FailureTable data={failureAnalysis} navigate={navigate} />
                </Card>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/workflows')}
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-200 hover:scale-105"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Analytics;
