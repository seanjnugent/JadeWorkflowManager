import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Edit2, X, Lock, Unlock, Mail, Calendar, Activity, Shield, User, Check, AlertCircle, UserPlus, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://your-api-domain.com';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [resetPassword, setResetPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const userId = localStorage.getItem('userId'); // Replaced hardcoded userId

  useEffect(() => {
    document.title = "Jade | Manage Users";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-GB', {
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
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${getRoleColor(role)}`}>
        <Shield className="w-3 h-3 mr-1" />
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </span>
    );
  };

  const StatusBadge = ({ isLocked }) => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
        isLocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      }`}>
        {isLocked ? <Lock className="w-3 h-3 mr-1" /> : <Unlock className="w-3 h-3 mr-1" />}
        {isLocked ? 'Locked' : 'Active'}
      </span>
    );
  };

  const UserAvatar = ({ user }) => {
    const initials = `${user.first_name?.charAt(0) || ''}${user.surname?.charAt(0) || ''}`.toUpperCase();
    return (
      <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center text-sm font-medium rounded-full">
        {initials}
      </div>
    );
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/`, {
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
    if (userId) fetchUsers();
  }, [userId]);

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
    setError('');
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
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_locked: !user.is_locked } : u)));
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
    `${user.first_name || ''} ${user.surname || ''} ${user.email || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to access user management.</p>
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
        }.sg-workflow-card {
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
              <span className="text-white font-medium">Manage Users</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Manage Users
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              View and manage user accounts and their settings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card-simple">
          <div className="flex justify-between items-center mb-6">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              User Management
            </h2>
            <button
              onClick={() => navigate('/users/new')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mb-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{users.length}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-emerald-700">{users.filter((u) => !u.is_locked).length}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-700">{users.filter((u) => u.is_locked).length}</div>
                <div className="text-sm text-gray-600">Locked</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {paginatedUsers.map((user) => (
                  <div key={user.id} className="sg-workflow-card">
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
                        <div className="text-sm font-medium text-gray-900">{user.login_count || 0}</div>
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
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => toggleUserLock(user)}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-1 ${
                          user.is_locked
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
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
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
            </div>
          )}
        </section>

        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Edit User</h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
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
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={editableUser.first_name || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={editableUser.surname || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      type="email"
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={editableUser.email || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={editableUser.role || ''}
                      onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                    >
                      <option value="user">User - Standard access</option>
                      <option value="admin">Admin - Full system access</option>
                      <option value="viewer">Viewer - Read-only access</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="user-locked"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    checked={editableUser.is_locked || false}
                    onChange={(e) => setEditableUser({ ...editableUser, is_locked: e.target.checked })}
                  />
                  <label htmlFor="user-locked" className="ml-2 text-sm text-gray-700">Lock user account</label>
                </div>
                <button
                  onClick={() => setResetPassword(true)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg"
                >
                  Reset Password
                </button>
                {resetPassword && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          name="newPassword"
                          className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <input
                          type="password"
                          name="confirmPassword"
                          className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleResetPassword}
                      className="w-full px-4 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 text-sm font-medium rounded-lg"
                    >
                      Change Password
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="flex-1 px-4 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 text-sm font-medium rounded-lg flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
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

export default ManageUsers;