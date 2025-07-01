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
      minute: '2-digit',
    });
  };

  const RoleBadge = ({ role }) => {
    const getRoleColor = (role) => {
      switch (role?.toLowerCase()) {
        case 'admin': return 'bg-purple-50 text-purple-800 border-purple-200';
        case 'user': return 'bg-blue-50 text-blue-900 border-blue-200';
        case 'viewer': return 'bg-gray-50 text-gray-700 border-gray-200';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${getRoleColor(role)}`}>
        <Shield className="w-3 h-3 mr-1" />
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </span>
    );
  };

  const StatusBadge = ({ isLocked }) => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
        isLocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
      }`}>
        {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
        {isLocked ? 'Locked' : 'Active'}
      </span>
    );
  };

  const UserAvatar = ({ user }) => {
    const initials = `${user.first_name?.charAt(0) || ''}${user.surname?.charAt(0) || ''}`.toUpperCase();
    return (
      <div className="w-8 h-8 bg-blue-900 text-white flex items-center justify-center text-sm font-medium">
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
      if (!response.ok) throw new Error('Failed to fetch users');
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
        setUsers(users.map((u) => (u.id === editingUser ? { ...u, ...editableUser } : u)));
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
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_locked: !u.is_locked } : u)));
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
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Settings
            </button>
            <button
              onClick={() => window.location.href = '/users/new'}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 border border-blue-900 px-4 py-2"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            <p className="text-gray-600 text-sm mt-1">View and manage user accounts</p>
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
          <div className="relative mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-6 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{users.length}</div>
              <div className="text-gray-600 text-sm">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-700">{users.filter((u) => !u.is_locked).length}</div>
              <div className="text-gray-600 text-sm">Active</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-700">{users.filter((u) => u.is_locked).length}</div>
              <div className="text-gray-600 text-sm">Locked</div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-900"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <UserAvatar user={user} />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.first_name} {user.surname}</p>
                        <div className="flex items-center text-sm text-gray-600">
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
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{user.login_count}</div>
                      <div className="text-xs text-gray-600">Total Logins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">{formatDate(user.last_login_at).split(',')[0]}</div>
                      <div className="text-xs text-gray-600">Last Login</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleUserLock(user)}
                      className={`flex-1 px-4 py-2 text-sm font-medium flex items-center justify-center gap-1 ${
                        user.is_locked
                          ? 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {user.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {user.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
                <div className="flex items-center">
                  <UserAvatar user={editableUser} />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{editableUser.first_name} {editableUser.surname}</p>
                    <p className="text-sm text-gray-600">{editableUser.email}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={editableUser.first_name || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={editableUser.surname || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="email"
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={editableUser.email || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={editableUser.role || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                    >
                      <option value="user">User - Standard access</option>
                      <option value="admin">Admin - Full system access</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="user-locked"
                    className="w-4 h-4 text-blue-900 border-gray-300"
                    checked={editableUser.is_locked || false}
                    onChange={(e) => setEditableUser({ ...editableUser, is_locked: e.target.checked })}
                  />
                  <label htmlFor="user-locked" className="ml-2 text-sm text-gray-700">Lock user account</label>
                </div>
                <button
                  onClick={() => setResetPassword(true)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                >
                  Reset Password
                </button>
                {resetPassword && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          name="newPassword"
                          className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          name="confirmPassword"
                          className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleResetPassword}
                      className="w-full px-4 py-2 bg-blue-900 border border-blue-900 text-white hover:bg-blue-800 text-sm font-medium"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="flex-1 px-4 py-2 bg-blue-900 border border-blue-900 text-white hover:bg-blue-800 text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ManageUsers;