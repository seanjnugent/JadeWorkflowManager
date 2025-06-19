import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Activity, Edit2, Key, Bell, Shield } from 'lucide-react';

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
    const fetchUser = async () => {
      try {
        const response = await fetch(`http://localhost:8000/users/user/${userId}`);
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
      const response = await fetch(`http://localhost:8000/users/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      <div className="ds_wrapper flex justify-center items-center h-screen">
        <p>Loading user...</p>
      </div>
    );
  }

  return (
    <div className="ds_wrapper">
      <main id="main-content" className="ds_layout ds_layout--question">
        <div className="ds_layout__header">
          <header className="ds_page-header">
            <h1 className="ds_page-header__title">Your Profile</h1>
          </header>
        </div>
        <div className="ds_layout__content">
          <h2>Personal Details</h2>
          <ul className="ds_summary-list">
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-name-key">Name</span>
              <span className="ds_summary-list__value">
                {editingItem === 'name' ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editableUser.first_name}
                      onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                      className="ds_input"
                      placeholder="First Name"
                    />
                    <input
                      type="text"
                      value={editableUser.surname}
                      onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                      className="ds_input"
                      placeholder="Last Name"
                    />
                    <div className="ds_button-group">
                      <button className="ds_button ds_button--secondary" onClick={handleCancel}>Cancel</button>
                      <button className="ds_button" onClick={() => handleSave('name')}>Save</button>
                    </div>
                  </div>
                ) : (
                  <q className="ds_summary-list__answer">{`${user.first_name} ${user.surname}`}</q>
                )}
              </span>
              <div className="ds_summary-list__actions">
                <button
                  type="button"
                  className="ds_link"
                  aria-describedby="item-name-key"
                  onClick={() => handleEdit('name')}
                  disabled={editingItem && editingItem !== 'name'}
                >
                  Change
                </button>
              </div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-email-key">Email</span>
              <span className="ds_summary-list__value">
                {editingItem === 'email' ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={editableUser.email}
                      onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                      className="ds_input"
                    />
                    <div className="ds_button-group">
                      <button className="ds_button ds_button--secondary" onClick={handleCancel}>Cancel</button>
                      <button className="ds_button" onClick={() => handleSave('email')}>Save</button>
                    </div>
                  </div>
                ) : (
                  <q className="ds_summary-list__answer">{user.email}</q>
                )}
              </span>
              <div className="ds_summary-list__actions">
                <button
                  type="button"
                  className="ds_link"
                  aria-describedby="item-email-key"
                  onClick={() => handleEdit('email')}
                  disabled={editingItem && editingItem !== 'email'}
                >
                  Change
                </button>
              </div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-role-key">Role</span>
              <span className="ds_summary-list__value">
                {editingItem === 'role' ? (
                  <div className="flex flex-col gap-2">
                    <select
                      value={editableUser.role}
                      onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                      className="ds_input"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                    <div className="ds_button-group">
                      <button className="ds_button ds_button--secondary" onClick={handleCancel}>Cancel</button>
                      <button className="ds_button" onClick={() => handleSave('role')}>Save</button>
                    </div>
                  </div>
                ) : (
                  <q className="ds_summary-list__answer">{capitalizeFirstLetter(user.role)}</q>
                )}
              </span>
              <div className="ds_summary-list__actions">
                <button
                  type="button"
                  className="ds_link"
                  aria-describedby="item-role-key"
                  onClick={() => handleEdit('role')}
                  disabled={editingItem && editingItem !== 'role'}
                >
                  Change
                </button>
              </div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-usergroup-key">User Group</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{user.user_group}</q>
              </span>
              <div className="ds_summary-list__actions"></div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-status-key">Status</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{user.is_locked ? 'Locked' : 'Active'}</q>
              </span>
              <div className="ds_summary-list__actions"></div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-lastlogin-key">Last Login</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                </q>
              </span>
              <div className="ds_summary-list__actions"></div>
            </li>
          </ul>

          <h2>Security</h2>
          <ul className="ds_summary-list">
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-password-key">Password</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">********</q>
              </span>
              <div className="ds_summary-list__actions">
                <button
                  type="button"
                  className="ds_link"
                  aria-describedby="item-password-key"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change
                </button>
              </div>
            </li>
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-apitoken-key">API Token</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">{user.api_token}</q>
              </span>
              <div className="ds_summary-list__actions">
                <button type="button" className="ds_link" aria-describedby="item-apitoken-key" disabled>
                  Regenerate
                </button>
              </div>
            </li>
          </ul>

          <h2>Preferences</h2>
          <ul className="ds_summary-list">
            <li className="ds_summary-list__item">
              <span className="ds_summary-list__key" id="item-notifications-key">Notifications</span>
              <span className="ds_summary-list__value">
                <q className="ds_summary-list__answer">
                  <ul className="ds_no-bullets">
                    <li>Email: {user.notification_preferences.email ? 'Enabled' : 'Disabled'}</li>
                    <li>Slack: {user.notification_preferences.slack ? 'Enabled' : 'Disabled'}</li>
                  </ul>
                </q>
              </span>
              <div className="ds_summary-list__actions">
                <button
                  type="button"
                  className="ds_link"
                  aria-describedby="item-notifications-key"
                  disabled
                >
                  Change
                </button>
              </div>
            </li>
          </ul>

          <h2>Workflow Permissions</h2>
          <ul className="ds_summary-list">
            {user.workflow_permissions.map((perm) => (
              <li key={perm.id} className="ds_summary-list__item">
                <span className="ds_summary-list__key" id={`item-perm${perm.id}-key`}>{perm.name}</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">{perm.role}</q>
                </span>
                <div className="ds_summary-list__actions"></div>
              </li>
            ))}
          </ul>

          {/* Password Change Modal */}
          {showPasswordModal && (
            <div className="ds_modal">
              <div className="ds_modal__dialog">
                <div className="ds_modal__header">
                  <h2 className="ds_modal__title">Change Password</h2>
                  <button
                    className="ds_modal__close"
                    onClick={() => setShowPasswordModal(false)}
                    aria-label="Close modal"
                  ></button>
                </div>
                <div className="ds_modal__content">
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="ds_form-group">
                      <label htmlFor="new-password" className="ds_label">New Password</label>
                      <input
                        id="new-password"
                        type="password"
                        className="ds_input"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="ds_form-group">
                      <label htmlFor="confirm-password" className="ds_label">Confirm Password</label>
                      <input
                        id="confirm-password"
                        type="password"
                        className="ds_input"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                    <div className="ds_button-group">
                      <button
                        type="button"
                        className="ds_button ds_button--secondary"
                        onClick={() => setShowPasswordModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="ds_button">
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;