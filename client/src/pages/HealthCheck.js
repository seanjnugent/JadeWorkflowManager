import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Github } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '[invalid url, do not cite]';

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
        setTimeout(() => setError(''), 5000);
      }
    };
    fetchHealthStatus();
  }, [navigate, userId]);

  if (!userId) {
    return (
      <div className="ds_wrapper flex justify-center items-center h-screen">
        <p>Please log in to access system health.</p>
      </div>
    );
  }

  return (
    <div className="ds_wrapper">
      {error && (
        <div className="ds_notification ds_notification--error">
          <p>{error}</p>
        </div>
      )}
      <main id="main-content" className="ds_layout ds_layout--question">
        <div className="ds_layout__header">
          <header className="ds_page-header">
            <h1 className="ds_page-header__title">
              <Activity className="mr-2 inline-block" size={24} /> System Health
            </h1>
          </header>
        </div>
        <div className="ds_layout__content">
          {healthStatus ? (
            <ul className="ds_summary-list">
              <li className="ds_summary-list__item">
                <span className="ds_summary-list__key" id="item-overall-key">Overall Status</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={healthStatus.status === 'healthy' ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                      {capitalizeFirstLetter(healthStatus.status)}
                    </span>
                  </q>
                </span>
              </li>
              <li className="ds_summary-list__item">
                <span className="ds_summary-list__key" id="item-supabase-key">Supabase</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={healthStatus.supabase === 'Connected' ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                      {healthStatus.supabase}
                    </span>
                  </q>
                </span>
              </li>
              <li className="ds_summary-list__item">
                <span className="ds_summary-list__key" id="item-database-key">Database</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={healthStatus.database === 'Connected' ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                      {healthStatus.database}
                    </span>
                  </q>
                </span>
              </li>
              <li className="ds_summary-list__item">
                <span className="ds_summary-list__key" id="item-dagster-key">Dagster</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={healthStatus.dagster === 'Connected' ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                      {healthStatus.dagster}
                    </span>
                  </q>
                </span>
              </li>
              <li className="ds_summary-list__item">
                <span className="ds_summary-list__key" id="item-github-key">GitHub</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={healthStatus.github === 'Connected' ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                      {healthStatus.github === 'Connected' ? 'Connected' : capitalizeFirstLetter(healthStatus.github)}
                    </span>
                  </q>
                </span>
              </li>
              {healthStatus.github !== 'Connected' && (
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id="item-github-error-key">GitHub Error</span>
                  <span className="ds_summary-list__value">
                    <q className="ds_summary-list__answer">{healthStatus.github}</q>
                  </span>
                </li>
              )}
              {healthStatus.dagster !== 'Connected' && (
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id="item-dagster-error-key">Dagster Error</span>
                  <span className="ds_summary-list__value">
                    <q className="ds_summary-list__answer">{healthStatus.dagster}</q>
                  </span>
                </li>
              )}
            </ul>
          ) : (
            <p>Loading health status...</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default HealthCheck;