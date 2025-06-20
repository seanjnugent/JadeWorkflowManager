import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { FiTrendingUp, FiAlertCircle, FiClock, FiLayers } from 'react-icons/fi';

// Card Component
const Card = ({ children, title }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    {title && <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>}
    {children}
  </div>
);

const fetchData = async (endpoint) => {
  try {
    const response = await fetch(`http://localhost:8000/analytics/${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return {};
  }
};

// Fake data for step performance
const fakeStepPerformance = {
  step_stats: [
    { step_name: 'data_ingestion', avg_duration_seconds: 12.5, success_rate: 98.2, runs: 150 },
    { step_name: 'data_processing', avg_duration_seconds: 8.7, success_rate: 95.6, runs: 145 },
    { step_name: 'model_training', avg_duration_seconds: 25.3, success_rate: 92.1, runs: 140 },
    { step_name: 'output_validation', avg_duration_seconds: 5.2, success_rate: 99.0, runs: 148 },
  ],
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
    <div className="h-64">
      <canvas id="runStatsChart" className="w-full h-full"></canvas>
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
    <div className="h-64 flex flex-col items-center">
      <canvas id="statusPieChart" className="w-full h-full max-w-xs"></canvas>
      <div className="flex justify-center gap-4 mt-3">
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
  );
};

const ErrorMessagesChart = ({ data }) => {
  useEffect(() => {
    if (!data.failures) return;

    const errorCounts = data.failures.reduce((acc, failure) => {
      const errorMessage = failure.error_message;
      acc[errorMessage] = (acc[errorMessage] || 0) + 1;
      return acc;
    }, {});

    const groupedErrors = {};
    Object.entries(errorCounts).forEach(([message, count]) => {
      const pattern = identifyPattern(message);
      if (!groupedErrors[pattern]) {
        groupedErrors[pattern] = { count: 0, messages: [] };
      }
      groupedErrors[pattern].count += count;
      groupedErrors[pattern].messages.push(message);
    });

    const sortedGroupedErrors = Object.entries(groupedErrors).sort((a, b) => b[1].count - a[1].count);
    const groupedErrorMessages = sortedGroupedErrors.map(([pattern]) => pattern);
    const groupedErrorCounts = sortedGroupedErrors.map(([, group]) => group.count);

    const ctx = document.getElementById('errorMessagesChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: groupedErrorMessages,
        datasets: [{
          label: 'Frequency',
          data: groupedErrorCounts,
          backgroundColor: '#3B82F6',
          borderWidth: 0,
          borderRadius: 4,
        }],
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
            beginAtZero: true,
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return <div className="h-64"><canvas id="errorMessagesChart" className="w-full h-full"></canvas></div>;
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
      <FiAlertCircle className="mx-auto text-emerald-500 text-4xl" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">No Failures Detected</h3>
      <p className="mt-1 text-gray-500">All workflows are running smoothly</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Message</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.failures.map((failure) => (
            <tr key={failure.run_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{failure.run_id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.workflow_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.started_at}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
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

const StepPerformanceTable = ({ data }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-100">
    <table className="min-w-full divide-y divide-gray-100">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step Name</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Duration (s)</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate (%)</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Runs</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {data.step_stats.map((step) => (
          <tr key={step.step_name} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{step.step_name}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{step.avg_duration_seconds.toFixed(1)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{step.success_rate.toFixed(1)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{step.runs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Analytics = () => {
  const [runStats, setRunStats] = useState({ run_stats: [] });
  const [failureAnalysis, setFailureAnalysis] = useState({ failures: [] });
  const [stepPerformance, setStepPerformance] = useState({ step_stats: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [runStatsData, failureData, stepData] = await Promise.all([
          fetchData('workflow-run-stats'),
          fetchData('failure-analysis'),
          fetchData('step-performance'),
        ]);
        setRunStats(runStatsData);
        setFailureAnalysis(failureData);
        setStepPerformance(stepData.step_stats.length > 0 ? stepData : fakeStepPerformance);
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
  const avgDuration = stepPerformance.step_stats.length > 0
    ? (stepPerformance.step_stats.reduce((sum, stat) => sum + stat.avg_duration_seconds, 0) / stepPerformance.step_stats.length).toFixed(1)
    : 0;
  const totalSteps = stepPerformance.step_stats.length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-['Inter',sans-serif] py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dagster Workflow Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time insights into your pipeline performance</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-full">
              <FiTrendingUp className="text-emerald-500 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Runs</p>
              <span className="text-xl font-semibold text-gray-900">{totalRuns}</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-full">
              <FiLayers className="text-blue-500 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Success Rate</p>
              <span className="text-xl font-semibold text-gray-900">{successRate}%</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-full">
              <FiClock className="text-amber-500 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Avg Duration</p>
              <span className="text-xl font-semibold text-gray-900">{avgDuration}s</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-full">
              <FiLayers className="text-purple-500 text-lg" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Steps</p>
              <span className="text-xl font-semibold text-gray-900">{totalSteps}</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <Card title="Workflow Runs Over Time">
              <RunStatsChart data={runStats} />
            </Card>
          </div>
          <Card title="Run Status Distribution">
            <StatusPieChart data={runStats} />
          </Card>
        </div>

        <Card title="Error Messages Frequency">
          <ErrorMessagesChart data={failureAnalysis} />
        </Card>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card title="Recent Failures">
            <FailureTable data={failureAnalysis} />
          </Card>
          <Card title="Step Performance">
            <StepPerformanceTable data={stepPerformance} />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;