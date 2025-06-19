import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, Edit2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '[invalid url, do not cite]';

const ManagePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [editingPermission, setEditingPermission] = useState(null);
  const [editablePermission, setEditablePermission] = useState({});
  const [userIdFilter, setUserIdFilter] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const fetchPermissions = async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken || !userId) {
      navigate('/login');
      return;
    }
    try {
      let url = `${API_BASE_URL}/workflows/permissions`;
      if (userIdFilter) {
        url += `?user_id=${userIdFilter}`;
      }
      const response = await fetch(url, {
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
        throw new Error('Failed to fetch permissions');
      }
      const data = await response.json();
      setPermissions(data.permissions || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to load permissions. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [navigate, userId, userIdFilter]);

  const handlePermissionEdit = (permission) => {
    setEditingPermission(permission.id);
    setEditablePermission({ ...permission });
  };

  const savePermission = async (permissionId) => {
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch(`${API_BASE_URL}/workflow_permissions/${permissionId}`, {
        method: 'PUT',
        headers: ({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        }),
        body: JSON.stringify(editablePermission),
      });
      if (response.ok) {
        setPermissions(
          permissions.map((p) => (p.id === permissionId ? { ...p, ...editablePermission } : p))
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

  if (!userId) {
    return (
      <div className="ds_wrapper flex justify-center items-center h-screen">
        <p>Please log in to manage permissions.</p>
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
              <Shield className="mr-2 inline-block" size={24} /> Permission Management
            </h1>
          </header>
        </div>
        <div className="ds_layout__content">
          <div className="ds_form-group mb-4">
            <label htmlFor="user-id-filter" className="ds_label">Filter by User ID</label>
            <div className="flex items-center">
              <input
                id="user-id-filter"
                type="text"
                className="ds_input"
                placeholder="Enter User ID"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="ds_button ml-2"
                onClick={fetchPermissions}
              >
                <Search className="mr-1" size={16} /> Search
              </motion.button>
            </div>
          </div>
          <ul className="ds_summary-list">
            {permissions.map((perm) => (
              <li key={perm.id} className="ds_summary-list__item">
                <span className="ds_summary-list__key" id={`item-perm-${perm.id}-key`}>{perm.user_name}</span>
                <span className="ds_summary-list__value">
                  <q className="ds_summary-list__answer">{perm.workflow_id}</q>
                </span>
                <span className="ds_summary-list__value">
                  {editingPermission === perm.id ? (
                    <select
                      className="ds_select"
                      value={editablePermission.permission_level}
                      onChange={(e) =>
                        setEditablePermission({ ...editablePermission, permission_level: e.target.value })
                      }
                    >
                      <option value="read">Read</option>
                      <option value="write">Write</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <q className="ds_summary-list__answer">{perm.permission_level}</q>
                  )}
                </span>
                <div className="ds_summary-list__actions">
                  {editingPermission === perm.id ? (
                    <div className="ds_button-group">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button"
                        onClick={() => savePermission(perm.id)}
                      >
                        <Check size={16} className="mr-1" /> Save
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="ds_button ds_button--secondary"
                        onClick={() => setEditingPermission(null)}
                      >
                        <X size={16} className="mr-1" /> Cancel
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="ds_button"
                      onClick={() => handlePermissionEdit(perm)}
                    >
                      <Edit2 size={16} className="mr-1" /> Edit
                    </motion.button>
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

export default ManagePermissions;