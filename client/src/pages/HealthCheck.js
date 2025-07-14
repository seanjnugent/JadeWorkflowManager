import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Github, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-domain.com';

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const HealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchHealthStatus = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken || !userId) {
        navigate('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/health_check`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch health status');
        }
        const data = await response.json();
        setHealthStatus(data);
      } catch (error) {
        console.error('Error fetching health status:', error);
        setError('Failed to fetch health status. Please try again.');
        setTimeout(() => setError(''), 5000);
      }
    };
    fetchHealthStatus();
  }, [navigate, userId]);

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-600 text-sm">Please log in to access system health.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Settings
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">System Health</h1>
            <p className="text-gray-600 text-sm mt-1">Monitor the status of system components</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 flex justify-between items-center">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
              ✕
            </button>
          </div>
        )}

        <div className="bg-white border border-gray-300 p-6">
          {healthStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700">Overall Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    healthStatus.status === 'healthy' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {capitalizeFirstLetter(healthStatus.status)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">S3</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    healthStatus.s3 === 'Connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.s3}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">Database</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    healthStatus.database === 'Connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.database}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">Dagster</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    healthStatus.dagster === 'Connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.dagster}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">GitHub</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    healthStatus.github === 'Connected' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.github === 'Connected' ? 'Connected' : capitalizeFirstLetter(healthStatus.github)}
                  </span>
                </div>
                {healthStatus.github !== 'Connected' && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">GitHub Error</span>
                    <span className="text-sm text-gray-600">{healthStatus.github}</span> 
                  </div>
                )}
                {healthStatus.dagster !== 'Connected' && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Dagster Error</span>
                    <span className="text-sm text-gray-600">{healthStatus.dagster}</span>
                  </div>
                )}
                {healthStatus.s3 !== 'Connected' && (
                  <div>
                    <span className="block text-sm font-medium text-gray-700">S3 Error</span>
                    <span className="text-sm text-gray-600">{healthStatus.s3}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-900"></div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default HealthCheck;