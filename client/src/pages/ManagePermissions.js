import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, X, UserPlus, Clock, Database, AlertCircle, User, Mail, Calendar, Activity } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ManagePermissions = () => {
  const [workflows, setWorkflows] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalWorkflow, setModalWorkflow] = useState(null);
  const [newPermission, setNewPermission] = useState({ user_id: '', permission_level: 'read' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const userId = 1001; // Using localStorage.getItem('userId') in real implementation

  const formatWorkflowId = (id) => `WF${String(id).padStart(4, '0')}`;

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

  const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'active': return 'bg-green-50 text-green-700 border-green-200';
        case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200';
        case 'error': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-blue-50 text-blue-900 border-blue-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  const DestinationIcon = ({ destination }) => {
    switch (destination?.toLowerCase()) {
      case 'api': return <Database className="w-4 h-4 text-blue-900" />;
      case 'csv': return <Database className="w-4 h-4 text-green-700" />;
      case 'json': return <Database className="w-4 h-4 text-purple-800" />;
      default: return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workflows/`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch workflows');
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
      setError('Failed to load workflows. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
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
    }
  };

  const fetchPermissions = async (workflowId) => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workflows/permissions?workflow_id=${workflowId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      const data = await response.json();
      setPermissions((prev) => ({ ...prev, [workflowId]: data.permissions || [] }));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setError('Failed to load permissions. Please try again.');
    }
  };

  useEffect(() => {
    fetchWorkflows();
    fetchUsers();
  }, []);

  const handleWorkflowClick = (workflow) => {
    if (selectedWorkflow === workflow.id) {
      setSelectedWorkflow(null);
    } else {
      setSelectedWorkflow(workflow.id);
      fetchPermissions(workflow.id);
    }
  };

  const openGrantModal = (workflow) => {
    setModalWorkflow(workflow);
    setShowModal(true);
    setNewPermission({ user_id: '', permission_level: 'read' });
  };

  const closeModal = () => {
    setShowModal(false);
    setModalWorkflow(null);
    setNewPermission({ user_id: '', permission_level: 'read' });
  };

  const addPermission = async () => {
    if (!newPermission.user_id) {
      setError('Please select a user');
      return;
    }
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workflows/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...newPermission, workflow_id: modalWorkflow.id }),
      });
      if (response.ok) {
        const selectedUser = users.find((u) => u.id == newPermission.user_id);
        const newPerm = {
          id: Math.random() * 1000,
          user_name: `${selectedUser.first_name} ${selectedUser.surname}`,
          permission_level: newPermission.permission_level,
          user_id: selectedUser.id,
        };
        setPermissions((prev) => ({
          ...prev,
          [modalWorkflow.id]: [...(prev[modalWorkflow.id] || []), newPerm],
        }));
        closeModal();
      } else {
        setError('Failed to add permission');
      }
    } catch (error) {
      console.error('Error adding permission:', error);
      setError('Error adding permission');
    }
  };

  const removePermission = async (workflowId, permissionId) => {
    try {
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/workflows/permissions/${permissionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        setPermissions((prev) => ({
          ...prev,
          [workflowId]: prev[workflowId].filter((p) => p.id !== permissionId),
        }));
      } else {
        setError('Failed to remove permission');
      }
    } catch (error) {
      console.error('Error removing permission:', error);
      setError('Error removing permission');
    }
  };

  const filteredWorkflows = workflows.filter(
    (workflow) =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatWorkflowId(workflow.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSelectedUser = () => {
    return users.find((u) => u.id == newPermission.user_id);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
            >
              <X className="h-4 w-4" />
              Back to Settings
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">Workflow Permissions</h1>
            <p className="text-gray-600 text-sm mt-1">Manage access permissions for workflows</p>
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
              placeholder="Search workflows..."
              className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-b-2 border-blue-900"></div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
              <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredWorkflows.map((workflow) => (
                <div key={workflow.id} className="border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1">
                          {formatWorkflowId(workflow.id)}
                        </span>
                        <StatusBadge status={workflow.status} />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">{workflow.name}</h3>
                      <p className="text-sm text-gray-600">{workflow.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <DestinationIcon destination={workflow.destination} />
                      <span className="ml-2">Destination: {workflow.destination}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="ml-2">{workflow.owner} • {workflow.group_name}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="ml-2">Last run: {formatDate(workflow.last_run)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWorkflowClick(workflow)}
                      className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                    >
                      {selectedWorkflow === workflow.id ? 'Hide Permissions' : 'View Permissions'}
                    </button>
                    <button
                      onClick={() => openGrantModal(workflow)}
                      className="flex-1 px-4 py-2 bg-blue-900 border border-blue-900 text-white hover:bg-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Grant Access
                    </button>
                  </div>
                  {selectedWorkflow === workflow.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Current Permissions</h4>
                      {permissions[workflow.id]?.length > 0 ? (
                        <div className="space-y-2">
                          {permissions[workflow.id].map((perm) => (
                            <div key={perm.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-900 text-white flex items-center justify-center text-sm">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">{perm.user_name}</p>
                                  <p className="text-xs text-gray-600 capitalize">{perm.permission_level} access</p>
                                </div>
                              </div>
                              <button
                                onClick={() => removePermission(workflow.id, perm.id)}
                                className="text-red-700 hover:text-red-900"
                                title="Remove access"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No additional permissions granted</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Grant Workflow Access</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1">
                    {formatWorkflowId(modalWorkflow?.id)}
                  </span>
                  <StatusBadge status={modalWorkflow?.status} />
                </div>
                <h3 className="text-sm font-medium text-gray-900">{modalWorkflow?.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{modalWorkflow?.description}</p>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                  <div className="relative">
                    <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={newPermission.user_id}
                      onChange={(e) => setNewPermission({ ...newPermission, user_id: e.target.value })}
                    >
                      <option value="">Choose a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.surname} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {getSelectedUser() && (
                  <div className="bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-900 text-white flex items-center justify-center text-sm">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {getSelectedUser().first_name} {getSelectedUser().surname}
                        </p>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {getSelectedUser().email}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                          <span className="capitalize">{getSelectedUser().role}</span>
                          <div className="flex items-center">
                            <Activity className="w-3 h-3 mr-1" />
                            {getSelectedUser().login_count} logins
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(getSelectedUser().last_login_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permission Level</label>
                  <div className="relative">
                    <Shield className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                      value={newPermission.permission_level}
                      onChange={(e) => setNewPermission({ ...newPermission, permission_level: e.target.value })}
                    >
                      <option value="read">Read - View workflow and results</option>
                      <option value="write">Write - Modify and execute workflow</option>
                      <option value="admin">Admin - Full control including permissions</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addPermission}
                  disabled={!newPermission.user_id}
                  className="flex-1 px-4 py-2 bg-blue-900 border border-blue-900 text-white hover:bg-blue-800 disabled:bg-gray-300 disabled:border-gray-300 text-sm font-medium"
                >
                  Grant Access
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ManagePermissions;