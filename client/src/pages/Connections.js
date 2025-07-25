import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Plug, Edit2, Check, X, ChevronRight, ChevronLeft, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

// Parse DATABASE_URL
const systemDbUrl = 'postgresql://user:pass@localhost:5432/workflow_db';
const parseDatabaseUrl = (url) => {
  try {
    const regex = /^(?:[^:]+):\/\/(?:[^:]+):(?:[^@]+)@([^:]+):(\d+)\/(.+)$/;
    const [, host, port, database] = url.match(regex) || [];
    return { host: host || 'localhost', port: port || '5432', database: database || 'workflow_db' };
  } catch {
    return { host: 'Unknown', port: 'Unknown', database: 'Unknown' };
  }
};
const systemDb = parseDatabaseUrl(systemDbUrl);

const Connections = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editableConnection, setEditableConnection] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Cobalt | Database Connections";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/connections/`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch connections');
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('Failed to load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchConnections();
    }
  }, [userId]);

  const handleEdit = (connection) => {
    setEditingId(connection.id);
    setEditableConnection({ ...connection });
  };

  const handleSave = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/connections/${editableConnection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editableConnection),
      });
      if (response.ok) {
        const updatedConnections = connections.map((conn) =>
          conn.id === editableConnection.id ? editableConnection : conn
        );
        setConnections(updatedConnections);
        setEditingId(null);
      } else {
        setError('Failed to save changes.');
      }
    } catch (err) {
      console.error('Error saving connection:', err);
      setError('Failed to save changes.');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditableConnection({});
  };

  const totalPages = Math.ceil(connections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConnections = connections.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to access database connections.</p>
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
              <span className="text-white font-medium">Database Connections</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Database Connections
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Manage and view database connections
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            User-Managed Connections
          </h2>
          <p className="sg-workflow-description mb-6">Manage your database connections</p>

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
          ) : paginatedConnections.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
              <p className="text-gray-600 text-sm">Add a new connection to get started</p>
            </div>
          ) : (
            <div>
              <div className="space-y-6">
                {paginatedConnections.map((conn) => (
                  <div key={conn.id} className="sg-workflow-card p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-medium text-gray-900">{conn.name}</h3>
                      {editingId === conn.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                          >
                            <Check className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(conn)}
                          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Name</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              value={editableConnection.name || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, name: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.name}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Type</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <select
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              value={editableConnection.type || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, type: e.target.value })
                              }
                            >
                              <option value="PostgreSQL">PostgreSQL</option>
                              <option value="Snowflake">Snowflake</option>
                              <option value="MySQL">MySQL</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.type}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Host</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              value={editableConnection.host || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, host: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.host}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Port</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              type="number"
                              value={editableConnection.port || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, port: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.port}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Database</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              value={editableConnection.database || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, database: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.database}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Username</span>
                        {editingId === conn.id ? (
                          <div className="relative">
                            <Database className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <input
                              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                              value={editableConnection.username || ''}
                              onChange={(e) =>
                                setEditableConnection({ ...editableConnection, username: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">{conn.username}</span>
                        )}
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-700">Status</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                            conn.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          {conn.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, connections.length)} of {connections.length} connections
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
                    >
                      <ChevronFirst className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 text-sm rounded-lg ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      }
                      if (
                        (page === currentPage - 2 && currentPage > 3) ||
                        (page === currentPage + 2 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <span key={page} className="px-3 py-1 text-sm text-gray-600">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-gray-600"
                    >
                      <ChevronLast className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-6">
                <button
                  onClick={() => alert('Add new connection functionality coming soon!')}
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                >
                  <Plug className="h-4 w-4" />
                  Add Connection
                </button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-600" />
              System Database
            </h2>
            <p className="sg-workflow-description mb-6">This database stores configuration data, users, and system settings. It is read-only.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-medium text-gray-700">Host</span>
                <span className="text-sm text-gray-600">{systemDb.host}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700">Port</span>
                <span className="text-sm text-gray-600">{systemDb.port}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700">Database</span>
                <span className="text-sm text-gray-600">{systemDb.database}</span>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700">Type</span>
                <span className="text-sm text-gray-600">PostgreSQL</span>
              </div>
            </div>
          </div>
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

export default Connections;