import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, ListChecks, Menu, Activity, Unplug } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-600">Please log in to access the admin hub.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans">
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          Settings
        </h1>
        <nav aria-label="Admin Hub navigation">
          <ul className="ds_category-list ds_category-list--grid ds_category-list--narrow">
            <li className="ds_card ds_card--has-hover">
              <article className="ds_category-item ds_category-item--card">
                <h2 className="ds_category-item__title">
                  <Link to="/manage-users" className="ds_category-item__link">
                    <Users className="w-12 h-12 mb-2" />
                    Manage Users
                  </Link>
                </h2>
                <p className="ds_category-item__summary">
                  Access and manage user accounts and settings
                </p>
              </article>
            </li>

            <li className="ds_card ds_card--has-hover">
              <article className="ds_category-item ds_category-item--card">
                <h2 className="ds_category-item__title">
                  <Link to="/manage-permissions" className="ds_category-item__link">
                    <UserPlus className="w-12 h-12 mb-2" />
                    Create User
                  </Link>
                </h2>
                <p className="ds_category-item__summary">
                  Create new user accounts and assign initial permissions
                </p>
              </article>
            </li>

            <li className="ds_card ds_card--has-hover">
              <article className="ds_category-item ds_category-item--card">
                <h2 className="ds_category-item__title">
                  <Link to="/manage-permissions" className="ds_category-item__link">
                    <ListChecks className="w-12 h-12 mb-2" />
                    Manage Permissions
                  </Link>
                </h2>
                <p className="ds_category-item__summary">
                  Adjust user permissions and access levels
                </p>
              </article>
            </li>

            <li className="ds_card ds_card--has-hover">
              <article className="ds_category-item ds_category-item--card">
                <h2 className="ds_category-item__title">
                  <Link to="/health-check" className="ds_category-item__link">
                    <Activity className="w-12 h-12 mb-2" />
                    System Health
                  </Link>
                </h2>
                <p className="ds_category-item__summary">
                  Check the health and status of the system
                </p>
              </article>
            </li>

            <li className="ds_card ds_card--has-hover">
              <article className="ds_category-item ds_category-item--card">
                <h2 className="ds_category-item__title">
                  <Link to="/connections" className="ds_category-item__link">
                    <Unplug className="w-12 h-12 mb-2" />
                    Database Connections
                  </Link>
                </h2>
                <p className="ds_category-item__summary">
                  Manage and configure database connections
                </p>
              </article>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Settings;
