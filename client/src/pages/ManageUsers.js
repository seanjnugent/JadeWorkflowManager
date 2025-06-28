import React, { useState, useEffect } from 'react';
import { Users, Search, Edit2, X, Lock, Unlock, Mail, Calendar, Activity, Shield, User, Check, AlertCircle, UserPlus } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-domain.com';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const userId = 1001; // Using localStorage.getItem('userId') in real implementation

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const RoleBadge = ({ role }) => {
    const getRoleColor = (role) => {
      switch (role?.toLowerCase()) {
        case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'user': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(role)}`}>
        <Shield className="w-3 h-3 mr-1" />
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </span>
    );
  };

  const StatusBadge = ({ isLocked }) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        isLocked
          ? 'bg-red-100 text-red-800 border-red-200'
          : 'bg-green-100 text-green-800 border-green-200'
      }`}>
        {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
        {isLocked ? 'Locked' : 'Active'}
      </span>
    );
  };

  const UserAvatar = ({ user, size = 'md' }) => {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12'
    };

    const textSizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };

    const initials = `${user.first_name?.charAt(0) || ''}${user.surname?.charAt(0) || ''}`.toUpperCase();

    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium ${textSizes[size]}`}>
        {initials}
      </div>
    );
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (user) => {
    setEditingUser(user.id);
    setEditableUser({ ...user });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditableUser({});
    setResetPassword(false);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
  };

  const saveUser = async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/${editableUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editableUser),
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === editingUser ? { ...u, ...editableUser } : u));
        closeEditModal();
      } else {
        setError('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Error updating user');
    }
  };

  const toggleUserLock = async (user) => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_locked: !user.is_locked }),
      });

      if (response.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, is_locked: !u.is_locked } : u));
      } else {
        setError('Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user lock:', error);
      setError('Error updating user status');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleResetPassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/${editableUser.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ new_password: passwordForm.newPassword }),
      });

      if (response.ok) {
        setResetPassword(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        setError('');
        alert('Password changed successfully');
      } else {
        setError('Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Error changing password');
    }
  };

  const filteredUsers = users.filter((user) =>
    `${user.first_name} ${user.surname} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
              <div className="text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{users.filter(u => !u.is_locked).length}</div>
              <div className="text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{users.filter(u => u.is_locked).length}</div>
              <div className="text-gray-600">Locked</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <UserAvatar user={user} size="lg" />
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.first_name} {user.surname}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <RoleBadge role={user.role} />
                    <StatusBadge isLocked={user.is_locked} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="text-lg font-semibold text-gray-900">{user.login_count}</div>
                      <div className="text-xs text-gray-600">Total Logins</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Calendar className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-900">
                        {formatDate(user.last_login_at).split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-600">Last Login</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleUserLock(user)}
                      className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-1 ${
                        user.is_locked
                          ? 'bg-green-100 hover:bg-green-200 text-green-700'
                          : 'bg-red-100 hover:bg-red-200 text-red-700'
                      }`}
                      title={user.is_locked ? 'Unlock user' : 'Lock user'}
                    >
                      {user.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {user.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <UserAvatar user={editableUser} size="md" />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">
                      {editableUser.first_name} {editableUser.surname}
                    </p>
                    <p className="text-sm text-gray-600">{editableUser.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editableUser.first_name || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editableUser.surname || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editableUser.email || ''}
                    onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editableUser.role || ''}
                    onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                  >
                    <option value="user">User - Standard access</option>
                    <option value="admin">Admin - Full system access</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="user-locked"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    checked={editableUser.is_locked || false}
                    onChange={(e) => setEditableUser({ ...editableUser, is_locked: e.target.checked })}
                  />
                  <label htmlFor="user-locked" className="ml-2 text-sm text-gray-700">
                    Lock user account
                  </label>
                </div>

                <button
                  onClick={() => setResetPassword(true)}
                  className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors font-medium"
                >
                  Reset Password
                </button>

                {resetPassword && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <button
                      onClick={handleResetPassword}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
