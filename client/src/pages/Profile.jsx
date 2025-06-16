import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Clock,
  ChevronRight,
  Activity,
  Edit2,
  Check,
  X,
  Users,
  BarChart2,
  Wrench,
  LogOut,
} from 'lucide-react';

const capitalizeFirstLetter = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editableUser, setEditableUser] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`http://localhost:8000/users/user/${userId}`);
        const data = await response.json();

        if (!data.user) {
          throw new Error("User not found");
        }

        setUser(data.user);
        setEditableUser(data.user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        navigate("/settings", { replace: true });
      }
    };

    fetchUser();
  }, [userId, navigate]);

  const handleSave = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/user/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(editableUser)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser.user || updatedUser);
        setEditing(false);
      } else {
        alert("Failed to save changes.");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      alert("An error occurred while saving.");
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600">Loading user...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Main Content */}
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Navigation */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/workflows')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <span className="font-medium text-gray-800">Workflows</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/analytics')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <BarChart2 className="w-6 h-6 text-green-600" />
                </div>
                <span className="font-medium text-gray-800">Analytics</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/profile')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <User className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="font-medium text-gray-800">Profile</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/settings')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <Wrench className="w-6 h-6 text-yellow-600" />
                </div>
                <span className="font-medium text-gray-800">Settings</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate('/logout')}
              className="w-full bg-gray-100 border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-white border border-gray-200 rounded-lg p-2">
                  <LogOut className="w-6 h-6 text-red-600" />
                </div>
                <span className="font-medium text-gray-800">Logout</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.button>
          </div>

          {/* Profile Section */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <User className="mr-2 text-indigo-600" /> User Profile
              </h2>

              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-700">
                    {editableUser.first_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    {editableUser.first_name} {editableUser.surname}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {user.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editableUser.first_name}
                      onChange={(e) =>
                        setEditableUser({ ...editableUser, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-900">{user.first_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editableUser.surname}
                      onChange={(e) =>
                        setEditableUser({ ...editableUser, surname: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-900">{user.surname}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {editing ? (
                    <input
                      type="email"
                      value={editableUser.email}
                      onChange={(e) =>
                        setEditableUser({ ...editableUser, email: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-500" /> {user.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  {editing ? (
                    <select
                      value={editableUser.role}
                      onChange={(e) =>
                        setEditableUser({ ...editableUser, role: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 capitalize">
                      {capitalizeFirstLetter(user.role)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-gray-900 flex items-center">
                    {user.is_locked ? (
                      <>
                        <Lock className="w-4 h-4 mr-2 text-red-500" /> Locked
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4 mr-2 text-green-500" /> Active
                      </>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login Count</label>
                  <p className="text-gray-900">{user.login_count || 0}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Login</label>
                  <p className="text-gray-900">
                    {new Date(user.last_login_at).toLocaleString() || "Never"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                  <p className="text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-3">
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    <Edit2 size={16} className="mr-2" /> Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;