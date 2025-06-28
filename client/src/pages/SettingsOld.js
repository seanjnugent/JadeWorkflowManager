import React, { useState, useEffect } from 'react';
import {
  Workflow,
  BarChart2,
  Users,
  Wrench,
  LogOut,
  Edit2,
  Check,
  X,
  Lock,
  Unlock,
  Shield,
  ChevronRight,
  Activity,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../utils/AuthUtils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Settings = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editingPermission, setEditingPermission] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [editablePermission, setEditablePermission] = useState({});
  const [error, setError] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');

  const adminUserId = 1;
  const navigate = useNavigate();
  const logout = useLogout();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchData = async () => {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken || !userId) {
        navigate('/login');
        return;
      }

      try {
        // Fetch Health Check
        const healthResponse = await fetch(`${API_BASE_URL}/health_check`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!healthResponse.ok) {
          if (healthResponse.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch health status');
        }
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);

        // Fetch Users
        const usersResponse = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!usersResponse.ok) {
          if (usersResponse.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch users');
        }
        const usersData = await usersResponse.json();
        setUsers(Array.isArray(usersData) ? usersData : usersData.users || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again.');
        setTimeout(() => setError(''), 5000);
      }
    };

    fetchData();
  }, [navigate, userId]);

  const fetchPermissions = async () => {
    const accessToken = localStorage.getItem('access_token');
    try {
      let url = `${API_BASE_URL}/workflows/permissions`;
      if (userIdFilter) {
        url += `?user_id=${userIdFilter}`;
      }

      const permissionsResponse = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!permissionsResponse.ok) {
        if (permissionsResponse.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch permissions');
      }

      const permissionsData = await permissionsResponse.json();
      setPermissions(permissionsData.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to load permissions. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleUserEdit = (user) => {
    setEditingUser(user.id);
    setEditableUser({ ...user });
  };

  const handlePermissionEdit = (permission) => {
    setEditingPermission(permission.id);
    setEditablePermission({ ...permission });
  };

  const saveUser = async (userId) => {
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
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
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch(
        `${API_BASE_URL}/workflow_permissions/${permissionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(editablePermission),
        }
      );

      if (response.ok) {
        setPermissions(
          permissions.map((p) =>
            p.id === permissionId ? { ...p, ...editablePermission } : p
          )
        );
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
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_locked: !isLocked }),
      });

      if (response.ok) {
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, is_locked: !isLocked } : u))
        );
      } else {
        alert('Failed to toggle user lock');
      }
    } catch (error) {
      console.error('Error toggling user lock:', error);
      alert('Error toggling user lock');
    }
  };

  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600">Please log in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center mx-auto max-w-2xl mt-4">
          {error}
        </div>
      )}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/workflows')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <Workflow className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-medium text-gray-800">Workflows</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/analytics')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <BarChart2 className="w-6 h-6 text-green-600" />
                </div>
                <span className="font-medium text-gray-800">Analytics</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/profile/${userId}`)}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="font-medium text-gray-800">Profile</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/settings')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <Wrench className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="font-medium text-gray-800">Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={logout}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
                <span className="font-medium text-gray-800">Logout</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          </div>

          {/* Settings Sections */}
          <div className="lg:col-span-2 space-y-8">
            {/* System Health Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Activity className="mr-2 text-blue-600" /> System Health
              </h2>
              {healthStatus ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Overall Status:</span>
                    <span
                      className={`font-semibold ${
                        healthStatus.status === 'healthy'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {capitalizeFirstLetter(healthStatus.status)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Supabase:</span>
                    <span
                      className={`font-semibold ${
                        healthStatus.supabase === 'Connected'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {healthStatus.supabase}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Database:</span>
                    <span
                      className={`font-semibold ${
                        healthStatus.database === 'Connected'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {healthStatus.database}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Dagster:</span>
                    <span
                      className={`font-semibold ${
                        healthStatus.dagster === 'Connected'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
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
            </div>

            {/* User Management Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Users className="mr-2 text-indigo-600" /> User Management
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td
                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:text-indigo-600 underline"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          {editingUser === user.id ? (
                            <>
                              <input
                                value={editableUser.first_name}
                                onChange={(e) =>
                                  setEditableUser({
                                    ...editableUser,
                                    first_name: e.target.value,
                                  })
                                }
                                placeholder="First Name"
                                className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900 w-full"
                              />
                              <input
                                value={editableUser.surname}
                                onChange={(e) =>
                                  setEditableUser({
                                    ...editableUser,
                                    surname: e.target.value,
                                  })
                                }
                                placeholder="Last Name"
                                className="mt-1 px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900 w-full"
                              />
                            </>
                          ) : (
                            <span>
                              {user.first_name} {user.surname}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <input
                              value={editableUser.email}
                              onChange={(e) =>
                                setEditableUser({
                                  ...editableUser,
                                  email: e.target.value,
                                })
                              }
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            />
                          ) : (
                            user.email
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {editingUser === user.id ? (
                            <select
                              value={editableUser.role}
                              onChange={(e) =>
                                setEditableUser({
                                  ...editableUser,
                                  role: e.target.value,
                                })
                              }
                              className="px-2 py-1 bg-gray-50 border border-gray-300 rounded text-gray-900"
                            >
                              <option value="admin">Admin</option>
                              <option value="user">User</option>
                            </select>
                          ) : (
                            capitalizeFirstLetter(user.role)
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {user.is_locked ? (
                            <span className="text-red-600">Locked</span>
                          ) : (
                            <span className="text-green-600">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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
            </div>

            {/* Permission Management Section */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Shield className="mr-2 text-purple-600" /> Permission Management
              </h2>
              <div className="mb-4 flex items-center">
                <input
                  type="text"
                  placeholder="Enter User ID"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={fetchPermissions}
                  className="ml-2 px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center"
                >
                  <Search className="w-5 h-5 mr-1" />
                  Search
                </motion.button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permission Level
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {perm.user_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {perm.workflow_id}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {editingPermission === perm.id ? (
                            <select
                              value={editablePermission.permission_level}
                              onChange={(e) =>
                                setEditablePermission({
                                  ...editablePermission,
                                  permission_level: e.target.value,
                                })
                              }
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
