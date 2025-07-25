import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Activity, Edit2, Key, Bell, Shield, X, ChevronRight } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Cobalt | Your Profile";
    const accessToken = localStorage.getItem('access_token');
    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            navigate('/login', { replace: true });
            return;
          }
          throw new Error('Failed to fetch user data');
        }
        const data = await response.json();
        if (!data.user) throw new Error('User not found');

        const userData = {
          ...data.user,
          user_group: 'Central Team',
          api_token: 'fake-token-1234567890',
          notification_preferences: { email: true, slack: false },
          workflow_permissions: [
            { id: 1, name: 'Data Pipeline', role: 'Admin' },
            { id: 2, name: 'ML Training', role: 'Viewer' },
          ],
        };
        setUser(userData);
        setEditableUser(userData);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setError('Failed to load user data. Please try again.');
        navigate('/settings', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, navigate]);

  const handleEdit = (field) => {
    setEditingItem(field);
  };

  const handleSave = async (field) => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editableUser),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser.user || updatedUser);
        setEditingItem(null);
      } else {
        setError('Failed to save changes.');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError('An error occurred while saving.');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditableUser(user);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/user/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password: passwordData.newPassword }),
      });
      if (response.ok) {
        setShowPasswordModal(false);
        setPasswordData({ newPassword: '', confirmPassword: '' });
      } else {
        setError('Failed to change password.');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('An error occurred while changing password.');
    }
  };

  if (!user || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <GridLoader color="#0065bd" size={17.5} margin={7.5} />
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
              <span className="text-white font-medium">Your Profile</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Your Profile
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Manage your personal details and settings
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Personal Details */}
          <div className="mb-8">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <User className="h-6 w-6 text-blue-600" />
              Personal Details
            </h2>
            <p className="sg-workflow-description mb-6">Manage your personal information</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Name</span>
                {editingItem === 'name' ? (
                  <div className="w-2/3 flex flex-col gap-2">
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        value={editableUser.first_name}
                        onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                        className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="First Name"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="text"
                        value={editableUser.surname}
                        onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                        className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        placeholder="Last Name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                        onClick={() => handleSave('name')}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-2/3 flex justify-between items-center">
                    <span className="text-sm text-gray-900">{`${user.first_name} ${user.surname}`}</span>
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => handleEdit('name')}
                      disabled={editingItem && editingItem !== 'name'}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Email</span>
                {editingItem === 'email' ? (
                  <div className="w-2/3 flex flex-col gap-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <input
                        type="email"
                        value={editableUser.email}
                        onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                        className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                        onClick={() => handleSave('email')}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-2/3 flex justify-between items-center">
                    <span className="text-sm text-gray-900">{user.email}</span>
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => handleEdit('email')}
                      disabled={editingItem && editingItem !== 'email'}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Role</span>
                {editingItem === 'role' ? (
                  <div className="w-2/3 flex flex-col gap-2">
                    <div className="relative">
                      <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <select
                        value={editableUser.role}
                        onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                        className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                        onClick={() => handleSave('role')}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-2/3 flex justify-between items-center">
                    <span className="text-sm text-gray-900">{capitalizeFirstLetter(user.role)}</span>
                    <button
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => handleEdit('role')}
                      disabled={editingItem && editingItem !== 'role'}
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">User Group</span>
                <div className="w-2/3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{user.user_group}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Status</span>
                <div className="w-2/3 flex justify-between items-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${
                      user.is_locked
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {user.is_locked ? 'Locked' : 'Active'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Last Login</span>
                <div className="w-2/3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="mb-8">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Security
            </h2>
            <p className="sg-workflow-description mb-6">Manage your security settings</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Password</span>
                <div className="w-2/3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">********</span>
                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">API Token</span>
                <div className="w-2/3 flex justify-between items-center">
                  <span className="text-sm text-gray-900 truncate">{user.api_token}</span>
                  <button className="text-sm text-blue-600 hover:underline" disabled>
                    Regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="mb-8">
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Bell className="h-6 w-6 text-blue-600" />
              Preferences
            </h2>
            <p className="sg-workflow-description mb-6">Manage your notification preferences</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <span className="w-1/3 text-sm font-medium text-gray-700">Notifications</span>
                <div className="w-2/3 flex justify-between items-center">
                  <div className="text-sm text-gray-900">
                    <div>Email: {user.notification_preferences.email ? 'Enabled' : 'Disabled'}</div>
                    <div>Slack: {user.notification_preferences.slack ? 'Enabled' : 'Disabled'}</div>
                  </div>
                  <button className="text-sm text-blue-600 hover:underline" disabled>
                    Change
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Permissions */}
          <div>
            <h2 className="sg-workflow-title flex items-center gap-2">
              <Key className="h-6 w-6 text-blue-600" />
              Workflow Permissions
            </h2>
            <p className="sg-workflow-description mb-6">View your workflow permissions</p>
            <div className="space-y-4">
              {user.workflow_permissions.map((perm) => (
                <div key={perm.id} className="flex items-center justify-between p-2">
                  <span className="w-1/3 text-sm font-medium text-gray-700">{perm.name}</span>
                  <div className="w-2/3 flex justify-between items-center">
                    <span className="text-sm text-gray-900">{perm.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
                <button
                  className="text-gray-700 hover:text-gray-900"
                  onClick={() => setShowPasswordModal(false)}
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      id="new-password"
                      type="password"
                      className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <input
                      id="confirm-password"
                      type="password"
                      className="w-full p-2 pl-10 border border-gray-300 text-sm text-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 text-sm font-medium rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </form>
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

export default Profile;