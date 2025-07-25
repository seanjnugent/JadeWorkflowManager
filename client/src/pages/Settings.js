import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, ListChecks, Activity, Unplug, ChevronRight } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Cobalt | Settings";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to access the admin hub.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <style>{`
          .sg-workflow-card-simple {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
          text-decoration: none;
        }
        .sg-workflow-card-simple::before {
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
        .sg-workflow-card-simple:hover {
          box-shadow: 0 8px 25px rgba(0, 101, 189, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08);
        }
        .sg-workflow-card {
          padding: 24px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
          position: relative;
          overflow: hidden;
          text-decoration: none;

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
                onClick={() => navigate('/workflows')}
                className="text-white hover:text-blue-200 underline transition-colors"
              >
                Workflows
              </button>
              <span>></span>
              <span className="text-white font-medium">Settings</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Settings
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Manage user accounts, permissions, system health, and database connections
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section id="settings" className="sg-workflow-card-simple">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Admin Settings
          </h2>
          <p className="sg-workflow-description mb-6">Configure and manage system settings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                to: '/manage-users',
                icon: <Users className="w-6 h-6 text-blue-600" />,
                title: 'Manage Users',
                summary: 'Access and manage user accounts and settings',
              },
              {
                to: '/users/new',
                icon: <UserPlus className="w-6 h-6 text-blue-600" />,
                title: 'Create User',
                summary: 'Create new user accounts',
              },
              {
                to: '/manage-permissions',
                icon: <ListChecks className="w-6 h-6 text-blue-600" />,
                title: 'Manage Permissions',
                summary: 'Adjust user permissions and access levels',
              },
              {
                to: '/health-check',
                icon: <Activity className="w-6 h-6 text-blue-600" />,
                title: 'System Health',
                summary: 'Check the health and status of the system',
              },
              {
                to: '/connections',
                icon: <Unplug className="w-6 h-6 text-blue-600" />,
                title: 'Database Connections',
                summary: 'Manage and configure database connections',
              },
            ].map((item, index) => (
              <a
                key={index}
                href={item.to}
                className="sg-workflow-card"
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.to);
                }}
              >
                <h3 className="sg-workflow-title flex items-center gap-2">
                  <span className="flex items-center justify-center w-10 h-10 bg-blue-50 border border-blue-200 rounded-lg">
                    {item.icon}
                  </span>
                  {item.title}
                </h3>
                <p className="sg-workflow-description">{item.summary}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Settings;