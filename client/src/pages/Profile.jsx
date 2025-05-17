import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, Clock, Lock, Edit2, Check, X, Eye } from 'lucide-react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState({
    id: null,
    username: '',
    email: '',
    role: '',
    last_login_at: '',
    login_count: 0,
  });
  const [editableDetails, setEditableDetails] = useState({ ...userDetails });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [permissions, setPermissions] = useState([]);

  // Simulated user ID (replace with auth context in a real app)
  const userId = 1;

  useEffect(() => {
    // Fetch user details
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`http://localhost:8000/users/${userId}`);
        const data = await response.json();
        setUserDetails(data);
        setEditableDetails(data);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    // Fetch workflow permissions
    const fetchPermissions = async () => {
      try {
        const response = await fetch(`http://localhost:8000/workflow_permissions/${userId}`);
        const data = await response.json();
        setPermissions(data.permissions || []);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };

    fetchUserDetails();
    fetchPermissions();
  }, []);

  const handleDetailChange = (field, value) => {
    setEditableDetails((prev) => ({ ...prev, [field]: value }));
  };

  const saveDetails = async () => {
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableDetails),
      });
      if (response.ok) {
        setUserDetails(editableDetails);
        setIsEditing(false);
      } else {
        alert('Failed to save details');
      }
    } catch (error) {
      console.error('Error saving details:', error);
      alert('Error saving details');
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      const response = await fetch(`http://localhost:8000/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });
      if (response.ok) {
        alert('Password changed successfully!');
        setIsPasswordModalOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        alert('Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Error changing password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-64 bg-white border-r border-gray-200 p-6 flex-shrink-0"
        >
          <div className="text-xl font-bold text-gray-800 mb-8">Profile</div>
          <nav className="space-y-4">
            {[
              { Icon: User, text: 'Profile', href: '/profile' },
              { Icon: Shield, text: 'Logout', href: '/logout' },
            ].map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                whileHover={{ scale: 1.02 }}
                className="flex items-center text-base text-gray-600 hover:text-indigo-600 transition-colors"
              >
                <item.Icon size={18} className="mr-3" /> {item.text}
              </motion.a>
            ))}
          </nav>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white border border-gray-200 p-8"
          >
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                User Profile
              </h1>
              {!isEditing ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all"
                >
                  <Edit2 size={16} className="inline mr-2" /> Edit
                </motion.button>
              ) : (
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEditableDetails(userDetails);
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={saveDetails}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                  >
                    <Check size={16} className="inline mr-2" /> Save
                  </motion.button>
                </div>
              )}
            </div>

            {/* User Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gray-50 p-6 border border-gray-200 mb-6"
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-4">User Info</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="mr-3 text-indigo-600" size={18} />
                  {isEditing ? (
                    <input
                      value={editableDetails.username}
                      onChange={(e) => handleDetailChange('username', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
                      placeholder="Username"
                    />
                  ) : (
                    <span className="text-gray-900">{userDetails.username}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <Mail className="mr-3 text-indigo-600" size={18} />
                  {isEditing ? (
                    <input
                      value={editableDetails.email}
                      onChange={(e) => handleDetailChange('email', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
                      placeholder="Email Address"
                    />
                  ) : (
                    <span className="text-gray-900">{userDetails.email}</span>
                  )}
                </div>
                <div className="flex items-center">
                  <Shield className="mr-3 text-indigo-600" size={18} />
                  <span className="text-gray-900">{userDetails.role}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-3 text-indigo-600" size={18} />
                  <span className="text-gray-900">
                    Last Login: {userDetails.last_login_at ? new Date(userDetails.last_login_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Security Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="border-t border-gray-200 pt-6 flex justify-between items-center"
            >
              <h2 className="text-lg font-semibold text-gray-700">Security</h2>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 transition-all"
              >
                <Lock size={16} className="inline mr-2" /> Change Password
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.main>

        {/* Password Change Modal */}
        <AnimatePresence>
          {isPasswordModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white p-6 w-full max-w-md border border-gray-200 shadow-lg"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-700">Change Password</h2>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </motion.button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-gray-900"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitPasswordChange}
                      className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                    >
                      Change Password
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Profile;
