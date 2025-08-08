import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { TrendingUp, AlertCircle, Layers, Clock, X, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Card = ({ children, title, icon }) => (
  <div className="sg-workflow-card">
    <h2 className="sg-workflow-title flex items-center gap-2">
      {icon}
      {title}
    </h2>
    {children}
  </div>
);

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
            borderColor: '#6B7280',
            backgroundColor: 'rgba(107, 114, 128, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Successful Runs',
            data: data.run_stats.map(stat => stat.successful_runs),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
          },
          {
            label: 'Failed Runs',
            data: data.run_stats.map(stat => stat.failed_runs),
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            tension: 0.4,
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
          title: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#6B7280', font: { family: "'Inter', sans-serif", size: 12 } },
          },
          y: {
            grid: { color: 'rgba(229, 231, 235, 0.5)' },
            ticks: { color: '#6B7280', font: { family: "'Inter', sans-serif", size: 12 } },
          },
        },
        interaction: { mode: 'nearest', intersect: false },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div>
      <div className="h-64">
        <canvas id="runStatsChart" className="w-full h-full"></canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Total Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Successful Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Failed Runs</span>
        </div>
      </div>
    </div>
  );
};

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
          backgroundColor: ['#10B981', '#EF4444'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div>
      <div className="h-64 flex flex-col items-center">
        <canvas id="statusPieChart" className="w-full h-full max-w-xs"></canvas>
          <div className="flex justify-center gap-4 mt-3 mb-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Successful</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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
            backgroundColor: '#10B981',
            borderWidth: 0,
          },
          {
            label: 'Failed Runs',
            data: failureData,
            backgroundColor: '#EF4444',
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            stacked: true,
            ticks: {
              color: '#6B7280',
              font: { family: "'Inter', sans-serif", size: 12 },
              callback: function(value) {
                return this.getLabelForValue(value).substring(0, 15) + (this.getLabelForValue(value).length > 15 ? '...' : '');
              }
            },
          },
          y: {
            grid: { color: 'rgba(229, 231, 235, 0.5)' },
            stacked: true,
            ticks: { color: '#6B7280', font: { family: "'Inter', sans-serif", size: 12 } },
            beginAtZero: true,
          },
        },
      },
    });
    return () => chart.destroy();
  }, [data]);

  return (
    <div>
      <div className="h-64">
        <canvas id="runAnalysisChart" className="w-full h-full"></canvas>
      </div>
      <div className="flex justify-center gap-4 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Successful</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Failed</span>
        </div>
      </div>
    </div>
  );
};

const identifyPattern = (message) => {
  if (!message || typeof message !== 'string') return 'Unknown Error';

  if (message.includes('GraphQL API error')) return 'GraphQL API Error';
  if (message.includes('Local execution error')) return 'Local Execution Error';
  if (message.includes('Remote API error')) return 'Remote API Error';
  if (message.includes('JSON object must be str')) return 'JSON Type Error';
  if (message.includes('DagsterGraphQLClient')) return 'DagsterGraphQLClient Error';
  if (message.includes('Pipeline not found')) return 'Pipeline Not Found';
  if (message.includes('received invalid type <class "str"> for input \"input_file_path\"')) return 'Invalid Input File Path';
  if (message.includes('Invalid type')) return 'Invalid Type Error';
  return 'Other Error';
};

const FailureTable = ({ data, navigate }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!data.failures || data.failures.length === 0) return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto text-emerald-500 h-8 w-8" />
      <h3 className="mt-4 text-sm font-medium text-gray-900">No Failures Detected</h3>
      <p className="mt-1 text-sm text-gray-600">All workflows are running smoothly</p>
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

  return (
    <div>
      <div className="relative w-full overflow-x-auto">
        <table className="sg-table w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="border-b-2 border-gray-200">
              <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Run ID</th>
              <th className="text-left font-medium text-gray-900 py-4 px-6 w-[280px]">Workflow</th>
              <th className="text-left font-medium text-gray-900 py-4 px-6 w-[110px]">Started At</th>
              <th className="text-left font-medium text-gray-900 py-4 px-6 w-[250px]">Error Message</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFailures.map((failure) => (
              <tr
                key={failure.run_id}
                className="border-b border-gray-200 hover:bg-gray-50 bg-white cursor-pointer"
                onClick={() => navigate(`/runs/${failure.run_id}`)}
              >
                <td className="py-4 px-6 w-[100px]">
                  <div className="text-sm text-gray-900">{failure.run_id}</div>
                </td>
                <td className="py-4 px-6 w-[280px]">
                  <div className="max-w-[260px]">
                    <div className="font-medium text-gray-900 break-words leading-tight">{failure.workflow_name}</div>
                  </div>
                </td>
                <td className="py-4 px-6 w-[110px]">
                  <div className="text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                    {new Date(failure.started_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </div>
                </td>
                <td className="py-4 px-6 w-[250px]">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 border border-red-200 rounded-full whitespace-nowrap">
                    {identifyPattern(failure.error_message)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.failures.length)} of {data.failures.length} failures
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              }
              if (
                (page === currentPage - 2 && currentPage > 3) ||
                (page === currentPage + 2 && currentPage < totalPages - 2)
              ) {
                return (
                  <span key={page} className="px-3 py-1 text-sm text-gray-600">
                    ...
                  </span>
                );
              }
              return null;
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
            >
              <ChevronLast className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
    ? (runStats.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0) / totalRuns * 100).toFixed(1)
    : 0;
  const totalWorkflows = [...new Set(runAnalysis.analysis.map(item => item.workflow_id))].length;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="flex justify-center items-center">
            <GridLoader color="#0065bd" size={17.5} margin={7.5} />
          </div>
          <p className="text-gray-600 text-sm mt-2">Loading analytics data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`
        .sg-workflow-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
        }
        .sg-workflow-card::before {
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
        .sg-workflow-card:hover {
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
        }rgba(4, 5, 7, 1)
        .sg-workflow-card:hover::before {
          transform: scaleX(1);
        }
        .sg-workflow-title {
          font-size: 20px;
          line-height: 28px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 12px;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-title {
          color: #0065bd;
        }
        .sg-workflow-description {
          font-size: 16px;
          line-height: 24px;
          color: #6b7280;
          transition: color 0.3s ease;
        }
        .sg-workflow-card:hover .sg-workflow-description {
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
        .sg-table {
          width: 100%;
          border-collapse: collapse;
        }
        .sg-table th {
          text-align: left;
          font-weight: 600;
          padding: 12px 16px;
          background-color: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
        .sg-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          color: #374151;
        }
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '32px 0' }}>
        <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Workflows
              </button>
              <span>></span>
              <span className="text-white font-medium">Analytics</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Analytics
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Real-time insights into your pipeline performance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-1/4 shrink-0">
          <div className="sg-sidebar">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contents</h2>
            <nav className="space-y-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'runs-over-time', label: 'Runs Over Time' },
                { id: 'status-distribution', label: 'Status Distribution' },
                { id: 'run-analysis', label: 'Run Analysis' },
                { id: 'recent-failures', label: 'Recent Failures' }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => handleJumpLinkClick(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border-l-3 border-blue-600 font-bold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-3/4 space-y-8">
          {/* Overview Section */}
          <section id="overview" className="sg-workflow-card">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Overview
            </h2>
            <p className="sg-workflow-description mb-6">Key metrics for your workflow performance</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="sg-workflow-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Runs</p>
                    <span className="text-lg font-semibold text-gray-900">{totalRuns}</span>
                  </div>
                </div>
              </div>
              <div className="sg-workflow-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <Layers className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <span className="text-lg font-semibold text-gray-900">{successRate}%</span>
                  </div>
                </div>
              </div>
              <div className="sg-workflow-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Workflows</p>
                    <span className="text-lg font-semibold text-gray-900">{totalWorkflows}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Runs Over Time Section */}
          <section id="runs-over-time">
            <Card
              title="Workflow Runs Over Time"
              icon={<TrendingUp className="h-6 w-6 text-blue-600" />}
            >
              <p className="sg-workflow-description mb-4">Trends in workflow runs over time</p>
              <RunStatsChart data={runStats} />
            </Card>
          </section>

          {/* Status Distribution Section */}
          <section id="status-distribution">
            <Card
              title="Run Status Distribution"
              icon={<Layers className="h-6 w-6 text-blue-600" />}
            >
              <p className="sg-workflow-description mb-4">Distribution of run statuses</p>
              <StatusPieChart data={runStats} />
            </Card>
          </section>

          {/* Run Analysis Section */}
          <section id="run-analysis" >
            <Card
              title="Workflow Run Analysis"
              icon={<ChevronRight className="h-6 w-6 text-blue-600" />}
            >
              <p className="sg-workflow-description mb-4">Analysis of runs by workflow</p>
              <RunAnalysisChart data={runAnalysis} />
            </Card>
          </section>

          {/* Recent Failures Section */}
          <section id="recent-failures">
            <Card
              title="Recent Failures"
              icon={<AlertCircle className="h-6 w-6 text-blue-600" />}
            >
              <p className="sg-workflow-description mb-4">Details of recent workflow failures</p>
              <FailureTable data={failureAnalysis} navigate={navigate} />
            </Card>
          </section>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/workflows')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </main>
  );
};

export default Analytics;