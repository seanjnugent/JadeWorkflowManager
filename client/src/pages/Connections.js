import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Activity, Plug, Edit2, Check, X } from 'lucide-react';

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
    <div className="min-h-screen bg-white text-gray-900">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center mx-auto max-w-2xl mt-4">
          {error}
        </div>
      )}
      <div className="container mx-auto px-6 py-10">
        <div className="lg:col-span-2 space-y-8">
          {/* User-Managed Connections */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Plug className="mr-2 text-green-600" /> Database Connections
            </h2>

            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className="border-b border-gray-200 pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{conn.name}</h3>
                    {editingId === conn.id ? (
                      <div className="space-x-2">
                        <button
                          onClick={handleSave}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-1 text-red-600 hover:text-red-700"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(conn)}
                        className="p-1 text-indigo-600 hover:text-indigo-700"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      {editingId === conn.id ? (
                        <input
                          type="text"
                          value={editableConnection.name || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, name: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-gray-900">{conn.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      {editingId === conn.id ? (
                        <select
                          value={editableConnection.type || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, type: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="PostgreSQL">PostgreSQL</option>
                          <option value="Snowflake">Snowflake</option>
                          <option value="MySQL">MySQL</option>
                        </select>
                      ) : (
                        <p className="text-gray-900">{conn.type}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                      {editingId === conn.id ? (
                        <input
                          type="text"
                          value={editableConnection.host || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, host: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-gray-900">{conn.host}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      {editingId === conn.id ? (
                        <input
                          type="number"
                          value={editableConnection.port || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, port: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-gray-900">{conn.port}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
                      {editingId === conn.id ? (
                        <input
                          type="text"
                          value={editableConnection.database || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, database: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-gray-900">{conn.database}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      {editingId === conn.id ? (
                        <input
                          type="text"
                          value={editableConnection.username || ''}
                          onChange={(e) =>
                            setEditableConnection({ ...editableConnection, username: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-gray-900">{conn.username}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <p className="text-gray-900 flex items-center">
                        {conn.is_active ? (
                          <>
                            <Activity className="w-4 h-4 mr-2 text-green-500" /> Active
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 mr-2 text-red-500" /> Inactive
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex justify-end">
              <button
                onClick={() => {
                  alert('Add new connection functionality coming soon!');
                }}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plug size={16} className="mr-2" /> Add Connection
              </button>
            </div>
          </div>

          {/* System Database */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Database className="mr-2 text-gray-600" /> System Database
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This database stores configuration data, users, and system settings. It is read-only.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                <p className="text-gray-900">{systemDb.host}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <p className="text-gray-900">{systemDb.port}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
                <p className="text-gray-900">{systemDb.database}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <p className="text-gray-900">PostgreSQL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Connections;
