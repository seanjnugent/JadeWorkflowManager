import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, ListChecks, Activity, Unplug, X } from 'lucide-react';

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
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-600 text-sm">Please log in to access the admin hub.</p>
      </main>
    );
  }

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
            <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-sm mt-1">Manage administrative settings and system configurations</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                to: '/manage-users',
                icon: <Users className="h-6 w-6 text-gray-600" />,
                title: 'Manage Users',
                summary: 'Access and manage user accounts and settings',
              },
              {
                to: '/users/new',
                icon: <UserPlus className="h-6 w-6 text-gray-600" />,
                title: 'Create User',
                summary: 'Create new user accounts',
              },
              {
                to: '/manage-permissions',
                icon: <ListChecks className="h-6 w-6 text-gray-600" />,
                title: 'Manage Permissions',
                summary: 'Adjust user permissions and access levels',
              },
              {
                to: '/health-check',
                icon: <Activity className="h-6 w-6 text-gray-600" />,
                title: 'System Health',
                summary: 'Check the health and status of the system',
              },
              {
                to: '/connections',
                icon: <Unplug className="h-6 w-6 text-gray-600" />,
                title: 'Database Connections',
                summary: 'Manage and configure database connections',
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="border border-gray-200 bg-white p-4 hover:bg-gray-50 no-underline h-full flex flex-col"
              >
                <div className="flex items-start gap-3 flex-grow">
                  <div className="mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-sm font-medium text-gray-900">{item.title}</h2>
                    <p className="text-sm text-gray-600 mt-2">{item.summary}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Settings;