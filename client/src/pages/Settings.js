import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Activity, Users, Shield, Edit2, Check, X, Lock, Unlock, Workflow, BarChart2, LogOut } from 'lucide-react';

const Settings = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [editablePermission, setEditablePermission] = useState({});

  // Simulated admin user ID (replace with auth context)
  const adminUserId = 1;

  useEffect(() => {
    // Fetch health check
    const fetchHealthCheck = async () => {
      try {
        const response = await fetch('http://localhost:8000/health_check');
        const data = await response.json();
        setHealthStatus(data);
      } catch (error) {
        console.error('Error fetching health check:', error);
        setHealthStatus({ status: 'error', details: { error: 'Failed to fetch health status' } });
      }
    };

    // Fetch users
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://localhost:8000/users');
        const data = await response.json();
        setUsers(data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    // Fetch permissions
    const fetchPermissions = async () => {
      try {
        const response = await fetch('http://localhost:8000/workflow_permissions');
        const data = await response.json();
        setPermissions(data.permissions || []);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };

    fetchHealthCheck();
    fetchUsers();
    fetchPermissions();
  }, []);

  const handleUserEdit = (user) => {
    setEditingUser(user.id);
    setEditableUser({ ...user });
  };

  const handlePermissionEdit = (permission) => {
    setEditingPermission(permission.id);
    setEditablePermission({ ...permission });
  };

  const saveUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableUser),
      });
      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, ...editableUser } : u)));
        setEditingUser(null);
      } else {
        alert('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  const savePermission = async (permissionId) => {
    try {
      const response = await fetch(`http://localhost:8000/workflow_permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editablePermission),
      });
      if (response.ok) {
        setPermissions(permissions.map((p) => (p.id === permissionId ? { ...p, ...editablePermission } : p)));
        setEditingPermission(null);
      } else {
        alert('Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      alert('Error updating permission');
    }
  };

  const toggleUserLock = async (userId, isLocked) => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_locked: !isLocked }),
      });
      if (response.ok) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, is_locked: !isLocked } : u)));
      } else {
        alert('Failed to toggle user lock');
      }
    } catch (error) {
      console.error('Error toggling user lock:', error);
      alert('Error toggling user lock');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-80 z-0"></div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-64 bg-white bg-opacity-90 border-r border-gray-200 p-8 flex-shrink-0 backdrop-blur-md"
        >
          <div className="text-2xl font-bold text-indigo-600 mb-8">ETL Workflow</div>
          <nav className="space-y-6">
            {[
              { Icon: Workflow, text: 'Workflows', href: '/workflows' },
              { Icon: BarChart2, text: 'Analytics', href: '/analytics' },
              { Icon: Users, text: 'Profile', href: '/profile' },
              { Icon: Wrench, text: 'Settings', href: '/settings' },
              { Icon: LogOut, text: 'Logout', href: '/logout' },
            ].map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                whileHover={{ scale: 1.02 }}
                className="flex items-center text-lg text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <item.Icon size={20} className="mr-4" /> {item.text}
              </motion.a>
            ))}
          </nav>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 p-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white bg-opacity-90 border border-gray-200 rounded-xl p-10 shadow-lg backdrop-blur-md"
          >
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-10">
              System Settings
            </h1>

            {/* System Health */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-white bg-opacity-80 rounded-xl p-6 border border-gray-200 mb-8 backdrop-blur-md"
            >
              <h2 className="text-2xl font-semibold text-indigo-600 mb-6 flex items-center">
                <Activity size={24} className="mr-2" /> System Health
              </h2>
              {healthStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Overall Status:</span>
                    <span className={`font-semibold ${healthStatus.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                      {healthStatus.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Supabase:</span>
                    <span className={`font-semibold ${healthStatus.supabase === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {healthStatus.supabase}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Database:</span>
                    <span className={`font-semibold ${healthStatus.database === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {healthStatus.database}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Dagster:</span>
                    <span className={`font-semibold ${healthStatus.dagster === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {healthStatus.dagster}
                    </span>
                  </div>
                  {healthStatus.dagster !== 'Connected' && (
                    <div className="col-span-2 mt-4">
                      <p className="text-gray-600">Dagster Error:</p>
                      <p className="text-red-600 text-sm">{healthStatus.dagster}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600">Loading health status...</p>
              )}
            </motion.div>

            {/* User Management */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white bg-opacity-80 rounded-xl p-6 border border-gray-200 mb-8 backdrop-blur-md"
            >
              <h2 className="text-2xl font-semibold text-indigo-600 mb-6 flex items-center">
                <Users size={24} className="mr-2" /> User Management
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <input
                              value={editableUser.username}
                              onChange={(e) => setEditableUser({ ...editableUser, username: e.target.value })}
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            />
                          ) : (
                            user.username
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <input
                              value={editableUser.email}
                              onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            />
                          ) : (
                            user.email
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <select
                              value={editableUser.role}
                              onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            >
                              <option value="admin">Admin</option>
                              <option value="user">User</option>
                            </select>
                          ) : (
                            user.role
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.is_locked ? (
                            <span className="text-red-600">Locked</span>
                          ) : (
                            <span className="text-green-600">Active</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => saveUser(user.id)}
                                className="p-1 bg-indigo-600 rounded"
                              >
                                <Check size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setEditingUser(null)}
                                className="p-1 bg-gray-300 rounded"
                              >
                                <X size={16} />
                              </motion.button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleUserEdit(user)}
                                className="p-1 bg-indigo-600 rounded"
                              >
                                <Edit2 size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => toggleUserLock(user.id, user.is_locked)}
                                className="p-1 bg-red-600 rounded"
                              >
                                {user.is_locked ? <Unlock size={16} /> : <Lock size={16} />}
                              </motion.button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Permission Management */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="bg-white bg-opacity-80 rounded-xl p-6 border border-gray-200 backdrop-blur-md"
            >
              <h2 className="text-2xl font-semibold text-indigo-600 mb-6 flex items-center">
                <Shield size={24} className="mr-2" /> Permission Management
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workflow</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{perm.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{perm.workflow_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingPermission === perm.id ? (
                            <select
                              value={editablePermission.permission_level}
                              onChange={(e) => setEditablePermission({ ...editablePermission, permission_level: e.target.value })}
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            >
                              <option value="read">Read</option>
                              <option value="write">Write</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            perm.permission_level
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingPermission === perm.id ? (
                            <div className="flex gap-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => savePermission(perm.id)}
                                className="p-1 bg-indigo-600 rounded"
                              >
                                <Check size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setEditingPermission(null)}
                                className="p-1 bg-gray-300 rounded"
                              >
                                <X size={16} />
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handlePermissionEdit(perm)}
                              className="p-1 bg-indigo-600 rounded"
                            >
                              <Edit2 size={16} />
                            </motion.button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
};

export default Settings;
