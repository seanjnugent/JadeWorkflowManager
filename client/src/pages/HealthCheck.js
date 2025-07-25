import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Github, X, ChevronRight } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-domain.com';

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const HealthCheck = () => {
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Cobalt | System Health";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  useEffect(() => {
    const fetchHealthStatus = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken || !userId) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/health_check`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login', { replace: true });
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
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchHealthStatus();
  }, [userId, navigate]);

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to access system health.</p>
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
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
          border-color: #0065bd;
        }
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
      `}</style>

      {/* Hero Header */}
      <div className="sg-page-header" style={{ backgroundColor: '#0065bd', color: 'white', padding: '32px 0' }}>
        <div className="sg-page-header-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <nav className="mb-4">
            <div className="flex items-center gap-2 text-blue-100">
              <button
                onClick={() => navigate('/settings')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Settings
              </button>
              <span>></span>
              <span className="text-white font-medium">System Health</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            System Health
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Monitor the status of system components
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-600" />
            System Status
          </h2>
          <p className="sg-workflow-description mb-6">Monitor the status of system components</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700">Overall Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                    healthStatus.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {capitalizeFirstLetter(healthStatus.status)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">S3</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                    healthStatus.s3 === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.s3}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">Database</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                    healthStatus.database === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.database}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">Dagster</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                    healthStatus.dagster === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {healthStatus.dagster}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-700">GitHub</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                    healthStatus.github === 'Connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
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
          )}
        </section>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/settings')}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-300 hover:scale-105"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </main>
  );
};

export default HealthCheck;