import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { TrendingUp, AlertCircle, Layers, Clock, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Card Component
const Card = ({ children, title, icon, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md ${className}`}>
    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

// Metric Card Component
const MetricCard = ({ value, label, icon, trend, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-semibold text-gray-800">{value}</p>
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
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Successful Runs',
            data: data.run_stats.map(stat => stat.successful_runs),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 2,
            tension: 0.3,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Failed Runs',
            data: data.run_stats.map(stat => stat.failed_runs),
            borderColor: '#ef4444',
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
            backgroundColor: '#1f2937',
            titleFont: { size: 12, weight: 'normal' },
            bodyFont: { size: 12, weight: 'normal' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { 
              color: '#9ca3af',
              font: { size: 11 },
            },
          },
          y: {
            grid: { 
              color: '#f3f4f6',
              drawBorder: false,
            },
            ticks: { 
              color: '#9ca3af',
              font: { size: 11 },
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
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
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
            backgroundColor: '#1f2937',
            bodyFont: { size: 12 },
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
            backgroundColor: '#3b82f6',
            borderWidth: 0,
            borderRadius: 4,
          },
          {
            label: 'Failed Runs',
            data: failureData,
            backgroundColor: '#ef4444',
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
            backgroundColor: '#1f2937',
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            stacked: true,
            ticks: {
              color: '#9ca3af',
              font: { size: 11 },
              callback: function(value) {
                return this.getLabelForValue(value).substring(0, 12) + (this.getLabelForValue(value).length > 12 ? '...' : '');
              }
            },
          },
          y: {
            grid: { 
              color: '#f3f4f6',
              drawBorder: false,
            },
            stacked: true,
            ticks: { 
              color: '#9ca3af',
              font: { size: 11 },
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
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <AlertCircle className="mx-auto text-gray-300 h-12 w-12 mb-3" />
      <h3 className="text-lg font-medium text-gray-500 mb-1">No Failures Detected</h3>
      <p className="text-sm text-gray-400">All workflows are running smoothly</p>
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
      <div className="relative w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 bg-gray-50">
            <tr>
              <th className="px-4 py-3">Run ID</th>
              <th className="px-4 py-3">Workflow</th>
              <th className="px-4 py-3">Started At</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedFailures.map((failure) => (
              <tr
                key={failure.run_id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/runs/${failure.run_id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  {failure.run_id}
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="truncate">{failure.workflow_name}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(failure.started_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </td>
                <td className="px-4 py-3">
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
                      ? 'bg-blue-600 text-white'
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

  const totalRuns = runStats.run_stats.reduce((sum, stat) => sum + stat.total_runs, 0);
  const successRate = totalRuns > 0
    ? (runStats.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0) / totalRuns * 100 ): 0;
  const totalWorkflows = [...new Set(runAnalysis.analysis.map(item => item.workflow_id))].length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <GridLoader color="#3b82f6" size={15} margin={5} />
          </div>
          <p className="text-gray-500 text-sm mt-3">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue page header section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-sm">
              <button 
                onClick={() => navigate('/workflows')}
                className="text-blue-100 hover:text-white hover:underline cursor-pointer transition-colors"
              >
                Workflows
              </button>
              <span className="text-blue-200">/</span>
              <span className="text-white">Analytics</span>
            </div>
          </nav>

          {/* Page title */}
          <h1 className="text-3xl font-bold mb-3">
            Analytics Dashboard
          </h1>

          {/* Page description */}
          <p className="text-blue-100 max-w-3xl">
            Real-time insights into your pipeline performance with detailed metrics and visualizations
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Sticky contents navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Dashboard Sections
            </h2>
            <nav>
              <ul className="space-y-1">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'runs-over-time', label: 'Runs Over Time' },
                  { id: 'status-distribution', label: 'Status Distribution' },
                  { id: 'run-analysis', label: 'Run Analysis' },
                  { id: 'recent-failures', label: 'Recent Failures' }
                ].map(section => (
                  <li key={section.id}>
                    <button
                      onClick={() => handleJumpLinkClick(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {section.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-8">
          {/* Overview Section */}
          <section id="overview" className="scroll-mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Overview
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Key metrics for your workflow performance
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <MetricCard
                value={totalRuns}
                label="Total Runs"
                icon={<TrendingUp className="h-5 w-5" />}
                trend="up"
              />
              <MetricCard
                value={`${successRate.toFixed(1)}%`}
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
          </section>

          {/* Runs Over Time Section */}
          <section id="runs-over-time" className="scroll-mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Runs Over Time
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Trends in workflow runs over the past 30 days
            </p>
            
            <Card
              title="Workflow Runs Over Time"
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
            >
              <RunStatsChart data={runStats} />
            </Card>
          </section>

          {/* Status Distribution Section */}
          <section id="status-distribution" className="scroll-mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Status Distribution
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Breakdown of successful vs failed runs
            </p>
            
            <Card
              title="Run Status Distribution"
              icon={<Layers className="h-5 w-5 text-blue-500" />}
            >
              <StatusPieChart data={runStats} />
            </Card>
          </section>

          {/* Run Analysis Section */}
          <section id="run-analysis" className="scroll-mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Run Analysis
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Performance by individual workflows
            </p>
            
            <Card
              title="Workflow Run Analysis"
              icon={<ChevronRight className="h-5 w-5 text-blue-500" />}
            >
              <RunAnalysisChart data={runAnalysis} />
            </Card>
          </section>

          {/* Recent Failures Section */}
          <section id="recent-failures" className="scroll-mt-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Recent Failures
              </h2>
            </div>
            <p className="text-gray-600 mb-6">
              Details of recent workflow failures and errors
            </p>
            
            <Card
              title="Recent Failures"
              icon={<AlertCircle className="h-5 w-5 text-blue-500" />}
              className="pb-6"
            >
              <FailureTable data={failureAnalysis} navigate={navigate} />
            </Card>
          </section>
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