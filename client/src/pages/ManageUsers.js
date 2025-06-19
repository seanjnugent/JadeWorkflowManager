import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Edit2, Check, X, Lock, Unlock } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '[invalid url, do not cite]';

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [editableUser, setEditableUser] = useState({});
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchUsers = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken || !userId) {
        navigate('/login');
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please try again.');
        setTimeout(() => setError(''), 5000);
      }
    };
    fetchUsers();
  }, [navigate, userId]);

  const handleUserEdit = (user) => {
    setEditingUser(user.id);
    setEditableUser({ ...user });
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
        setUsers(users.map((u) => (u.id === userId ? { ...u, is_locked: !isLocked } : u)));
      } else {
        alert('Failed to toggle user lock');
      }
    } catch (error) {
      console.error('Error toggling user lock:', error);
      alert('Error toggling user lock');
    }
  };

  if (!userId) {
    return (
      <div className="ds_wrapper flex justify-center items-center h-screen">
        <p>Please log in to manage users.</p>
      </div>
    );
  }

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
              <Users className="mr-2 inline-block" size={24} /> User Management
            </h1>
          </header>
        </div>
        <div className="ds_layout__content">
          <ul className="ds_summary-list">
            {users.map((user) => (
              <li key={user.id} className="ds_summary-list__item">
                <span className="ds_summary-list__key" id={`item-user-${user.id}-key`}>
                  {editingUser === user.id ? (
                    <div className="flex flex-col gap-2">
                      <input
                        className="ds_input"
                        value={editableUser.first_name}
                        onChange={(e) => setEditableUser({ ...editableUser, first_name: e.target.value })}
                        placeholder="First Name"
                      />
                      <input
                        className="ds_input"
                        value={editableUser.surname}
                        onChange={(e) => setEditableUser({ ...editableUser, surname: e.target.value })}
                        placeholder="Last Name"
                      />
                    </div>
                  ) : (
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      {user.first_name} {user.surname}
                    </span>
                  )}
                </span>
                <span className="ds_summary-list__value">
                  {editingUser === user.id ? (
                    <input
                      className="ds_input"
                      value={editableUser.email}
                      onChange={(e) => setEditableUser({ ...editableUser, email: e.target.value })}
                    />
                  ) : (
                    <q className="ds_summary-list__answer">{user.email}</q>
                  )}
                </span>
                <span className="ds_summary-list__value">
                  {editingUser === user.id ? (
                    <select
                      className="ds_select"
                      value={editableUser.role}
                      onChange={(e) => setEditableUser({ ...editableUser, role: e.target.value })}
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  ) : (
                    <q className="ds_summary-list__answer">{capitalizeFirstLetter(user.role)}</q>
                  )}
                </span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">
                    <span className={user.is_locked ? 'ds_tag ds_tag--error' : 'ds_tag ds_tag--success'}>
                      {user.is_locked ? 'Locked' : 'Active'}
                    </span>
                  </q>
                </span>
                <div className="ds_summary-list__actions">
                  {editingUser === user.id ? (
                    <div className="ds_button-group">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button"
                        onClick={() => saveUser(user.id)}
                      >
                        <Check size={16} className="mr-1" /> Save
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button ds_button--secondary"
                        onClick={() => setEditingUser(null)}
                      >
                        <X size={16} className="mr-1" /> Cancel
                      </motion.button>
                    </div>
                  ) : (
                    <div className="ds_button-group">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button"
                        onClick={() => handleUserEdit(user)}
                      >
                        <Edit2 size={16} className="mr-1" /> Edit
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button ds_button--secondary"
                        onClick={() => toggleUserLock(user.id, user.is_locked)}
                      >
                        {user.is_locked ? <Unlock size={16} className="mr-1" /> : <Lock size={16} className="mr-1" />}
                        {user.is_locked ? 'Unlock' : 'Lock'}
                      </motion.button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
};

export default ManageUsers;