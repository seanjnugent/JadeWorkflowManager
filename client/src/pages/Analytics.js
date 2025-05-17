import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAlertCircle, FiClock } from 'react-icons/fi';
import { BsGraphUpArrow, BsPieChartFill } from 'react-icons/bs';

// Simple Card Component
const Card = ({ children }) => (
  <div className="relative bg-white rounded-lg p-6 shadow-sm">
    {children}
  </div>
);

// Animated counter
const AnimatedCounter = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayValue(prev => {
        const diff = value - prev;
        return prev + Math.ceil(diff * 0.1);
      });
    }, 30);

    return () => clearInterval(interval);
  }, [value]);

  return <span className="text-4xl font-bold text-gray-800">{displayValue}</span>;
};

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
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'white',
                        pointBorderColor: 'rgba(168, 85, 247, 1)',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Successful Runs',
                        data: data.run_stats.map(stat => stat.successful_runs),
                        borderColor: 'rgba(74, 222, 128, 0.8)',
                        backgroundColor: 'rgba(74, 222, 128, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'white',
                        pointBorderColor: 'rgba(74, 222, 128, 1)',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: 'Failed Runs',
                        data: data.run_stats.map(stat => stat.failed_runs),
                        borderColor: 'rgba(248, 113, 113, 0.8)',
                        backgroundColor: 'rgba(248, 113, 113, 0.2)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'white',
                        pointBorderColor: 'rgba(248, 113, 113, 1)',
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: "'Poppins', sans-serif",
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    title: {
                        display: true,
                        text: 'Workflow Runs Over Time',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Run Count',
                            font: {
                                family: "'Poppins', sans-serif",
                                weight: '600'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date',
                            font: {
                                family: "'Poppins', sans-serif",
                                weight: '600'
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            },
        });
        return () => chart.destroy();
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <canvas id="runStatsChart" className="w-full h-96"></canvas>
        </motion.div>
    );
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
                    borderColor: ['rgba(74, 222, 128, 1)', 'rgba(248, 113, 113, 1)'],
                    borderWidth: 2,
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                family: "'Poppins', sans-serif",
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    title: {
                        display: true,
                        text: 'Run Status Distribution',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            },
        });
        return () => chart.destroy();
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <canvas id="statusPieChart" className="w-full h-96"></canvas>
        </motion.div>
    );
};
const ErrorMessagesChart = ({ data }) => {
    useEffect(() => {
        if (!data.failures) return;

        // Group and count the frequency of each error message
        const errorCounts = data.failures.reduce((acc, failure) => {
            const errorMessage = failure.error_message;
            acc[errorMessage] = (acc[errorMessage] || 0) + 1;
            return acc;
        }, {});

        // Group similar error messages
        const groupedErrors = {};
        Object.entries(errorCounts).forEach(([message, count]) => {
            // Simple grouping by common patterns (customize this logic as needed)
            const pattern = identifyPattern(message);
            if (!groupedErrors[pattern]) {
                groupedErrors[pattern] = { count: 0, messages: [] };
            }
            groupedErrors[pattern].count += count;
            groupedErrors[pattern].messages.push(message);
        });

        // Sort grouped errors by frequency
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
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(96, 165, 250, 1)'
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: "'Poppins', sans-serif",
                                size: 14,
                                weight: '600'
                            },
                            padding: 20,
                            usePointStyle: true,
                        }
                    },
                    title: {
                        display: true,
                        text: 'Error Messages Frequency',
                        font: {
                            family: "'Poppins', sans-serif",
                            size: 18,
                            weight: 'bold'
                        },
                        padding: {
                            top: 10,
                            bottom: 30
                        }
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequency',
                            font: {
                                family: "'Poppins', sans-serif",
                                weight: '600'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Error Message Pattern',
                            font: {
                                family: "'Poppins', sans-serif",
                                weight: '600'
                            }
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                family: "'Poppins', sans-serif"
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            },
        });

        // Log grouped errors for further analysis
        console.log('Grouped Errors:', groupedErrors);

        return () => chart.destroy();
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
        >
            <canvas id="errorMessagesChart" className="w-full h-96"></canvas>
        </motion.div>
    );
};

// Helper function to identify patterns in error messages
const identifyPattern = (message) => {
    // Customize this function to identify patterns in your error messages
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
    if (!data.failures) return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
        >
            <div className="inline-flex items-center justify-center p-4 bg-green-100 rounded-full">
                <FiAlertCircle className="text-green-500 text-4xl" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No failures detected!</h3>
            <p className="mt-1 text-gray-500">Everything is running smoothly</p>
        </motion.div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
        >
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
                        {data.failures.map((failure, index) => (
                            <motion.tr
                                key={failure.run_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{failure.run_id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.workflow_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{failure.started_at}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {failure.error_message}
                                    </span>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
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

    // Calculate summary stats
    const totalRuns = runStats.run_stats.reduce((sum, stat) => sum + stat.total_runs, 0);
    const successRate = totalRuns > 0
        ? (runStats.run_stats.reduce((sum, stat) => sum + stat.successful_runs, 0) / totalRuns * 100).toFixed(1)
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {isLoading ? (
                <div className="flex items-center justify-center h-screen">
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-600"
                    ></motion.div>
                </div>
            ) : (
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4"
                    >
                        <div>
                            <h1 className="text-4xl font-bold text-gray-800">
                                Workflow Analytics Dashboard
                            </h1>
                            <p className="text-gray-500 mt-2">
                                Visual insights into your workflow performance
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <FiTrendingUp className="text-green-500 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Total Runs</p>
                                    <AnimatedCounter value={totalRuns} />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <BsGraphUpArrow className="text-blue-500 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Success Rate</p>
                                    <span className="text-4xl font-bold text-gray-800">
                                        {successRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3">
                                <div className="p-3 bg-pink-100 rounded-full">
                                    <FiClock className="text-pink-500 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Avg Duration</p>
                                    <span className="text-4xl font-bold text-gray-800">
                                        {stepPerformance.step_stats.length > 0
                                            ? (stepPerformance.step_stats.reduce((sum, stat) => sum + stat.avg_duration_seconds, 0) / stepPerformance.step_stats.length).toFixed(1)
                                            : '0.0'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <RunStatsChart data={runStats} />
                        </Card>
                        <Card>
                            <StatusPieChart data={runStats} />
                        </Card>
                    </div>

                    {/* Error Messages Chart */}
                    <Card>
                        <ErrorMessagesChart data={failureAnalysis} />
                    </Card>

                    {/* Failures */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white rounded-xl shadow-sm overflow-hidden"
                    >
                        <div className="bg-gray-100 p-4">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                <FiAlertCircle className="text-gray-800" />
                                Recent Failures Analysis
                            </h2>
                        </div>
                        <div className="p-6">
                            <FailureTable data={failureAnalysis} />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
