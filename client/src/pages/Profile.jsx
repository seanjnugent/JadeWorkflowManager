import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Activity, Edit2, Key, Bell, Shield, X } from 'lucide-react';

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

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!userId || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
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

        // Add fake user group and other fields
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
        navigate('/settings', { replace: true });
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
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editableUser),
      });
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser.user || updatedUser);
        setEditingItem(null);
      } else {
        alert('Failed to save changes.');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('An error occurred while saving.');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setEditableUser(user);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    // Fake password change
    alert('Password change simulated successfully.');
    setShowPasswordModal(false);
    setPasswordData({ newPassword: '', confirmPassword: '' });
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="animate-spin h-8 w-8 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Home
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Your Profile</h1>
            <p className="text-gray-600 text-sm mt-1">Manage your personal details and settings</p>
          </div>
        </div>

        {/* Personal Details */}
        <div className="bg-white border border-gray-300 p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <User className="h-6 w-6 text-blue-600" />
            Personal Details
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Name</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  {editingItem === 'name' ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editableUser.first_name}
                        onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        value={editableUser.surname}
                        onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                        placeholder="Last Name"
                      />
                      <div className="flex gap-2">
                        <button
                          className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
                          onClick={() => handleSave('name')}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900">{`${user.first_name} ${user.surname}`}</span>
                  )}
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button
                    className="text-sm text-blue-900 hover:underline"
                    onClick={() => handleEdit('name')}
                    disabled={editingItem && editingItem !== 'name'}
                  >
                    Change
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Email</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  {editingItem === 'email' ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="email"
                        value={editableUser.email}
                        onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                      />
                      <div className="flex gap-2">
                        <button
                          className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
                          onClick={() => handleSave('email')}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900">{user.email}</span>
                  )}
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button
                    className="text-sm text-blue-900 hover:underline"
                    onClick={() => handleEdit('email')}
                    disabled={editingItem && editingItem !== 'email'}
                  >
                    Change
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Role</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  {editingItem === 'role' ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={editableUser.role}
                        onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                        className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                      </select>
                      <div className="flex gap-2">
                        <button
                          className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                        <button
                          className="text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
                          onClick={() => handleSave('role')}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900">{capitalizeFirstLetter(user.role)}</span>
                  )}
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button
                    className="text-sm text-blue-900 hover:underline"
                    onClick={() => handleEdit('role')}
                    disabled={editingItem && editingItem !== 'role'}
                  >
                    Change
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">User Group</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm text-gray-900">{user.user_group}</span>
                </td>
                <td className="py-3 px-2 w-1/3"></td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Status</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${
                    user.is_locked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {user.is_locked ? 'Locked' : 'Active'}
                  </span>
                </td>
                <td className="py-3 px-2 w-1/3"></td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Last Login</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm text-gray-900">
                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }) : 'Never'}
                  </span>
                </td>
                <td className="py-3 px-2 w-1/3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Security */}
        <div className="bg-white border border-gray-300 p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
            Security
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Password</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm text-gray-900">********</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button
                    className="text-sm text-blue-900 hover:underline"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">API Token</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm text-gray-900 truncate">{user.api_token}</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button className="text-sm text-blue-900 hover:underline" disabled>
                    Regenerate
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Preferences */}
        <div className="bg-white border border-gray-300 p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Bell className="h-6 w-6 text-blue-600" />
            Preferences
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-2 w-1/3">
                  <span className="text-sm font-medium text-gray-900">Notifications</span>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <div className="text-sm text-gray-900">
                    <div>Email: {user.notification_preferences.email ? 'Enabled' : 'Disabled'}</div>
                    <div>Slack: {user.notification_preferences.slack ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </td>
                <td className="py-3 px-2 w-1/3">
                  <button className="text-sm text-blue-900 hover:underline" disabled>
                    Change
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Workflow Permissions */}
        <div className="bg-white border border-gray-300 p-6">
          <h2 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
            <Key className="h-6 w-6 text-blue-600" />
            Workflow Permissions
          </h2>
          <table className="w-full text-sm">
            <tbody>
              {user.workflow_permissions.map((perm) => (
                <tr key={perm.id} className="border-b border-gray-200">
                  <td className="py-3 px-2 w-1/3">
                    <span className="text-sm font-medium text-gray-900">{perm.name}</span>
                  </td>
                  <td className="py-3 px-2 w-1/3">
                    <span className="text-sm text-gray-900">{perm.role}</span>
                  </td>
                  <td className="py-3 px-2 w-1/3"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center">
            <div className="bg-white border border-gray-300 p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-medium text-gray-900">Change Password</h2>
                <button
                  className="text-gray-600 hover:text-gray-900"
                  onClick={() => setShowPasswordModal(false)}
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label htmlFor="new-password" className="text-sm font-medium text-gray-900 block mb-1">
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-gray-900 block mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="w-full h-9 px-2 border border-gray-300 text-sm text-gray-700 focus:border-blue-900"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-sm font-medium text-white bg-blue-900 border border-blue-900 hover:bg-blue-800 px-4 py-2"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Profile;