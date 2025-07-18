import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { TrendingUp, AlertCircle, Layers, Clock, X } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Card = ({ children, title }) => (
  <div className="bg-white border border-gray-300 p-6">
    {title && (
      <h4 className="text-sm font-medium text-gray-900 mb-4">{title}</h4>
    )}
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
          <div className="w-3 h-3 bg-gray-500"></div>
          <span className="text-xs text-gray-600">Total Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500"></div>
          <span className="text-xs text-gray-600">Successful Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500"></div>
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
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500"></div>
            <span className="text-xs text-gray-600">Successful</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500"></div>
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
      const success = data.analysis.find(item => item.workflow_name === workflow && item.status === 'SUCCESS');
      return success ? success.run_count : 0;
    });
    const failureData = workflows.map(workflow => {
      const failure = data.analysis.find(item => item.workflow_name === workflow && item.status === 'FAILURE');
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
            stacked: true, // Enable stacking for x-axis
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
            stacked: true, // Enable stacking for y-axis
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
          <div className="w-3 h-3 bg-green-500"></div>
          <span className="text-xs text-gray-600">Successful Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500"></div>
          <span className="text-xs text-gray-600">Failed Runs</span>
        </div>
      </div>
    </div>
  );
};

const identifyPattern = (message) => {
  if (message.includes('GraphQL API error')) return 'GraphQL API Error';
  if (message.includes('Local execution error')) return 'Local Execution Error';
  if (message.includes('Remote API error')) return 'Remote API Error';
  if (message.includes('JSON object must be str')) return 'JSON Type Error';
  if (message.includes('DagsterGraphQLClient')) return 'DagsterGraphQLClient Error';
  if (message.includes('Pipeline not found')) return 'Pipeline Not Found';
  if (message.includes("received invalid type <class 'str'> for input \"input_file_path\"")) return 'Invalid Input File Path';
  if (message.includes('Invalid type')) return 'Invalid Type Error';
  return 'Other Error';
};

const FailureTable = ({ data }) => {
  if (!data.failures || data.failures.length === 0) return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto text-green-500 h-8 w-8" />
      <h3 className="mt-4 text-sm font-medium text-gray-900">No Failures Detected</h3>
      <p className="mt-1 text-sm text-gray-600">All workflows are running smoothly</p>
    </div>
  );

  return (
    <div className="relative w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="border-b-2 border-gray-200">
            <th className="text-left font-medium text-gray-900 py-4 px-6 w-[100px]">Run ID</th>
            <th className="text-left font-medium text-gray-900 py-4 px-6 w-[280px]">Workflow</th>
            <th className="text-left font-medium text-gray-900 py-4 px-6 w-[110px]">Started At</th>
            <th className="text-left font-medium text-gray-900 py-4 px-6 w-[250px]">Error Message</th>
          </tr>
        </thead>
        <tbody>
          {data.failures.map((failure) => (
            <tr
              key={failure.run_id}
              className="border-b border-gray-200 hover:bg-gray-50 bg-white"
              style={{ cursor: 'pointer' }}
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
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                  {failure.error_message}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Analytics = () => {
  const [runStats, setRunStats] = useState({ run_stats: [] });
  const [failureAnalysis, setFailureAnalysis] = useState({ failures: [] });
  const [runAnalysis, setRunAnalysis] = useState({ analysis: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const accessToken = localStorage.getItem('access_token');
    if (!userId || !accessToken) {
      window.location.href = '/login';
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
  }, []);

  const totalRuns = runStats.run_stats.reduce((sum, stat) => sum + stat.total_runs, 0);
  const successRate = totalRuns > 0
    ? (runStats.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0) / totalRuns * 100).toFixed(1)
    : 0;
  const totalWorkflows = [...new Set(runAnalysis.analysis.map(item => item.workflow_id))].length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Home
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-gray-600 text-sm mt-1">Real-time insights into your pipeline performance</p>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <GridLoader color="#1e3a8a" size={15} margin={2} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-0 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-300 p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 border border-green-200">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Runs</p>
                  <span className="text-sm font-medium text-gray-900">{totalRuns}</span>
                </div>
              </div>
              <div className="bg-white border border-gray-300 p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-50 border border-blue-200">
                  <Layers className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <span className="text-sm font-medium text-gray-900">{successRate}%</span>
                </div>
              </div>
              <div className="bg-white border border-gray-300 p-4 flex items-center gap-3">
                <div className="p-2 bg-yellow-50 border border-yellow-200">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Workflows</p>
                  <span className="text-sm font-medium text-gray-900">{totalWorkflows}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card title="Workflow Runs Over Time">
                  <RunStatsChart data={runStats} />
                </Card>
              </div>
              <Card title="Run Status Distribution">
                <StatusPieChart data={runStats} />
              </Card>
            </div>
            <Card title="Workflow Run Analysis">
              <RunAnalysisChart data={runAnalysis} />
            </Card>
            <div className="grid grid-cols-1">
              <Card title="Recent Failures">
                <FailureTable data={failureAnalysis} />
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Analytics;
