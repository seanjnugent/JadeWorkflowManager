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
              <Plug className="mr-2 inline-block" size={24} /> Database Connections
            </h1>
          </header>
        </div>
        <div className="ds_layout__content">
          <h2>User-Managed Connections</h2>
          {connections.map((conn) => (
            <div key={conn.id} className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="ds_summary-list__key">{conn.name}</h3>
                {editingId === conn.id ? (
                  <div className="ds_button-group">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="ds_button"
                      onClick={handleSave}
                    >
                      <Check size={16} className="mr-1" /> Save
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="ds_button ds_button--secondary"
                      onClick={handleCancel}
                    >
                      <X size={16} className="mr-1" /> Cancel
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="ds_button"
                    onClick={() => handleEdit(conn)}
                  >
                    <Edit2 size={16} className="mr-1" /> Edit
                  </motion.button>
                )}
              </div>
              <ul className="ds_summary-list">
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-name-${conn.id}-key`}>Name</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <input
                        className="ds_input"
                        value={editableConnection.name || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, name: e.target.value })
                        }
                      />
                    ) : (
                      <q className="ds_summary-list__answer">{conn.name}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-type-${conn.id}-key`}>Type</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <select
                        className="ds_select"
                        value={editableConnection.type || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, type: e.target.value })
                        }
                      >
                        <option value="PostgreSQL">PostgreSQL</option>
                        <option value="Snowflake">Snowflake</option>
                        <option value="MySQL">MySQL</option>
                      </select>
                    ) : (
                      <q className="ds_summary-list__answer">{conn.type}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-host-${conn.id}-key`}>Host</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <input
                        className="ds_input"
                        value={editableConnection.host || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, host: e.target.value })
                        }
                      />
                    ) : (
                      <q className="ds_summary-list__answer">{conn.host}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-port-${conn.id}-key`}>Port</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <input
                        className="ds_input"
                        type="number"
                        value={editableConnection.port || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, port: e.target.value })
                        }
                      />
                    ) : (
                      <q className="ds_summary-list__answer">{conn.port}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-database-${conn.id}-key`}>Database</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <input
                        className="ds_input"
                        value={editableConnection.database || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, database: e.target.value })
                        }
                      />
                    ) : (
                      <q className="ds_summary-list__answer">{conn.database}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-username-${conn.id}-key`}>Username</span>
                  <span className="ds_summary-list__value">
                    {editingId === conn.id ? (
                      <input
                        className="ds_input"
                        value={editableConnection.username || ''}
                        onChange={(e) =>
                          setEditableConnection({ ...editableConnection, username: e.target.value })
                        }
                      />
                    ) : (
                      <q className="ds_summary-list__answer">{conn.username}</q>
                    )}
                  </span>
                </li>
                <li className="ds_summary-list__item">
                  <span className="ds_summary-list__key" id={`item-status-${conn.id}-key`}>Status</span>
                  <span className="ds_summary-list__value">
                    <q className="ds_summary-list__answer">
                      <span className={conn.is_active ? 'ds_tag ds_tag--success' : 'ds_tag ds_tag--error'}>
                        {conn.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </q>
                  </span>
                </li>
              </ul>
            </div>
          ))}
          <div className="ds_button-group mt-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="ds_button"
              onClick={() => alert('Add new connection functionality coming soon!')}
            >
              <Plug size={16} className="mr-1" /> Add Connection
            </motion.button>
          </div>

          <h2 className="mt-8">System Database</h2>
          <p className="mb-4">This database stores configuration data, users, and system settings. It is read-only.</p>
          <ul className="ds_summary-list">
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-system-host-key">Host</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{systemDb.host}</q>
              </span>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-system-port-key">Port</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{systemDb.port}</q>
              </span>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-system-database-key">Database</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{systemDb.database}</q>
              </span>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-system-type-key">Type</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">PostgreSQL</q>
              </span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Connections;