import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Search, X, UserPlus, Clock, Database, AlertCircle, User, Mail, Calendar, Activity, ChevronLeft, ChevronRight, ChevronFirst, ChevronLast } from 'lucide-react';
import { GridLoader } from 'react-spinners';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const ManagePermissions = () => {
  const navigate = useNavigate();
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Cobalt | Manage Permissions";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

  const formatWorkflowId = (id) => `WF${String(id).padStart(4, '0')}`;

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

  const StatusBadge = ({ status }) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200';
        case 'error': return 'bg-red-50 text-red-700 border-red-200';
        default: return 'bg-blue-50 text-blue-900 border-blue-200';
      }
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-full ${getStatusColor(status)}`}>
        {status}
      </span>
    );
  };

  const DestinationIcon = ({ destination }) => {
    switch (destination?.toLowerCase()) {
      case 'api': return <Database className="w-4 h-4 text-blue-600" />;
      case 'csv': return <Database className="w-4 h-4 text-emerald-600" />;
      case 'json': return <Database className="w-4 h-4 text-purple-600" />;
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
    if (userId) {
      fetchWorkflows();
      fetchUsers();
    }
  }, [userId]);

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
    setError('');
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
      (workflow.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatWorkflowId(workflow.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkflows = filteredWorkflows.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSelectedUser = () => {
    return users.find((u) => u.id == newPermission.user_id);
  };

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to access permissions management.</p>
        </div>
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
              <span className="text-white font-medium">Manage Permissions</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Manage Permissions
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Manage access permissions for workflows
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Workflow Permissions
          </h2>
          <p className="sg-workflow-description mb-6">Manage access permissions for workflows</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative mb-6">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search workflows..."
              className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <GridLoader color="#0065bd" size={17.5} margin={7.5} />
            </div>
          ) : paginatedWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
              <p className="text-gray-600 text-sm">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div>
              <div className="space-y-4">
                {paginatedWorkflows.map((workflow) => (
                  <div key={workflow.id} className="sg-workflow-card">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
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
                        className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg"
                      >
                        {selectedWorkflow === workflow.id ? 'Hide Permissions' : 'View Permissions'}
                      </button>
                      <button
                        onClick={() => openGrantModal(workflow)}
                        className="flex-1 px-4 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 text-sm font-medium rounded-lg flex items-center gap-1"
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
                              <div key={perm.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center text-sm rounded-full">
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
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredWorkflows.length)} of {filteredWorkflows.length} workflows
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

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Grant Workflow Access</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-700 hover:text-gray-900"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded">
                    {formatWorkflowId(modalWorkflow?.id)}
                  </span>
                  <StatusBadge status={modalWorkflow?.status} />
ods
                </div>
                <h3 className="text-sm font-medium text-gray-900">{modalWorkflow?.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{modalWorkflow?.description}</p>
              </div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 text-white flex items-center justify-center text-sm rounded-full">
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
                            {getSelectedUser().login_count || 0} logins
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
                    <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <select
                      className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
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
                  className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addPermission}
                  disabled={!newPermission.user_id}
                  className="flex-1 px-4 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:border-gray-300 text-sm font-medium rounded-lg"
                >
                  Grant Access
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

export default ManagePermissions;