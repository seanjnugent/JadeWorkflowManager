import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { FiTrendingUp, FiAlertCircle, FiClock } from 'react-icons/fi';
import { BsGraphUpArrow } from 'react-icons/bs';

// Simple Card Component
const Card = ({ children }) => (
  <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
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
            borderColor: 'rgba(168, 85, 247, 0.8)',
            backgroundColor: 'rgba(168, 85, 247, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
          },
          {
            label: 'Successful Runs',
            data: data.run_stats.map(stat => stat.successful_runs),
            borderColor: 'rgba(74, 222, 128, 0.8)',
            backgroundColor: 'rgba(74, 222, 128, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
          },
          {
            label: 'Failed Runs',
            data: data.run_stats.map(stat => stat.failed_runs),
            borderColor: 'rgba(248, 113, 113, 0.8)',
            backgroundColor: 'rgba(248, 113, 113, 0.2)',
            borderWidth: 2,
            tension: 0.1,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Workflow Runs Over Time',
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas id="runStatsChart" className="w-full h-96"></canvas>;
};

const StatusPieChart = ({ data }) => {
  useEffect(() => {
    if (!data.run_stats) return;

    const totalSuccess = data.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0);
    const totalFailed = data.run_stats.reduce((sum, stat) => sum + stat.failed_runs, 0);

    const ctx = document.getElementById('statusPieChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Successful', 'Failed'],
        datasets: [{
          data: [totalSuccess, totalFailed],
          backgroundColor: ['rgba(74, 222, 128, 0.8)', 'rgba(248, 113, 113, 0.8)'],
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Run Status Distribution',
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas id="statusPieChart" className="w-full h-96"></canvas>;
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
          backgroundColor: 'rgba(96, 165, 250, 0.8)',
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Error Messages Frequency',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas id="errorMessagesChart" className="w-full h-96"></canvas>;
};

const identifyPattern = (message) => {
  if (message.includes('GraphQL API error')) {
    return 'GraphQL API Error';
  } else if (message.includes('Local execution error')) {
    return 'Local Execution Error';
  } else if (message.includes('Remote API error')) {
    return 'Remote API Error';
  } else if (message.includes('JSON object must be str')) {
    return 'JSON Type Error';
  } else if (message.includes('DagsterGraphQLClient')) {
    return 'DagsterGraphQLClient Error';
  } else if (message.includes('Pipeline not found')) {
    return 'Pipeline Not Found';
  } else if (message.includes("received invalid type <class 'str'> for input \"input_file_path\"")) {
    return 'Invalid input file path';
  } else if (message.includes('Invalid type')) {
    return 'Invalid Type Error';
  } else {
    return 'Other Error';
  }
};

const FailureTable = ({ data }) => {
  if (!data.failures || data.failures.length === 0) return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full">
        <FiAlertCircle className="text-green-500 text-4xl" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">No failures detected!</h3>
      <p className="mt-1 text-gray-500">Everything is running smoothly</p>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Run ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started At</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Message</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.failures.map((failure) => (
            <tr key={failure.run_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{failure.run_id}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.workflow_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.started_at}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
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
        setStepPerformance(stepData);
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

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="container mx-auto px-6 py-10">
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Workflow Analytics Dashboard
              </h1>
              <p className="text-gray-500 mt-2">
                Visual insights into your workflow performance
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <FiTrendingUp className="text-green-500 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Runs</p>
                  <span className="text-2xl font-bold text-gray-800">{totalRuns}</span>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <BsGraphUpArrow className="text-blue-500 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <span className="text-2xl font-bold text-gray-800">{successRate}%</span>
                </div>
              </div>
              <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-full">
                  <FiClock className="text-pink-500 text-xl" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Duration</p>
                  <span className="text-2xl font-bold text-gray-800">
                    {stepPerformance.step_stats.length > 0
                      ? (stepPerformance.step_stats.reduce((sum, stat) => sum + stat.avg_duration_seconds, 0) / stepPerformance.step_stats.length).toFixed(1)
                      : '0.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <RunStatsChart data={runStats} />
            </Card>
            <Card>
              <StatusPieChart data={runStats} />
            </Card>
          </div>

          <Card>
            <ErrorMessagesChart data={failureAnalysis} />
          </Card>

          <Card>
            <div className="bg-gray-100 p-4 rounded-t-lg">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <FiAlertCircle className="text-gray-800" />
                Recent Failures Analysis
              </h2>
            </div>
            <div className="p-6">
              <FailureTable data={failureAnalysis} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
