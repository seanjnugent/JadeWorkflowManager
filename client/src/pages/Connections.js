import React, { useState } from 'react';
import { Database, Plug, Edit2, Check, X } from 'lucide-react';

// Dummy data for database connections
const dummyConnections = [
  {
    id: 1,
    name: 'Sales Database',
    type: 'PostgreSQL',
    host: 'db.sales.example.com',
    port: 5432,
    database: 'sales_db',
    username: 'sales_user',
    is_active: true,
  },
  {
    id: 2,
    name: 'Analytics Warehouse',
    type: 'Snowflake',
    host: 'analytics.snowflake.com',
    port: 443,
    database: 'warehouse',
    username: 'analytics_user',
    is_active: false,
  },
];

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
  const [connections, setConnections] = useState(dummyConnections);
  const [editingId, setEditingId] = useState(null);
  const [editableConnection, setEditableConnection] = useState({});
  const [error, setError] = useState('');

  const handleEdit = (connection) => {
    setEditingId(connection.id);
    setEditableConnection({ ...connection });
  };

  const handleSave = () => {
    try {
      const updatedConnections = connections.map((conn) =>
        conn.id === editableConnection.id ? editableConnection : conn
      );
      setConnections(updatedConnections);
      setEditingId(null);
    } catch (err) {
      console.error('Error saving connection:', err);
      setError('Failed to save changes.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditableConnection({});
  };

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
            <h1 className="text-xl font-semibold text-gray-900">Database Connections</h1>
            <p className="text-gray-600 text-sm mt-1">Manage and view database connections</p>
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
          <h2 className="text-sm font-medium text-gray-900 mb-4">User-Managed Connections</h2>
          {connections.map((conn) => (
            <div key={conn.id} className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-900">{conn.name}</h3>
                {editingId === conn.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
                    >
                      <Check className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEdit(conn)}
                    className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <select
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                      <Database className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
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
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    conn.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {conn.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-6">
            <button
              onClick={() => alert('Add new connection functionality coming soon!')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
            >
              <Plug className="h-4 w-4" />
              Add Connection
            </button>
          </div>

          <h2 className="text-sm font-medium text-gray-900 mt-8 mb-4">System Database</h2>
          <p className="text-sm text-gray-600 mb-4">This database stores configuration data, users, and system settings. It is read-only.</p>
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
      </div>
    </main>
  );
};

export default Connections;