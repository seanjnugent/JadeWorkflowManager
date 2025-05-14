import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Lock,
  Check,
  X,
  Settings,
  DollarSign,
  Shield,
  LogOut
} from "lucide-react";

// Mock data for user details
const mockUserDetails = {
  first_name: "John",
  surname: "Doe",
  email_address: "john.doe@example.com",
  phone_number: "123-456-7890",
  residential_address: {
    street: "123 Main St",
    city: "Anytown",
    country: "Anystate",
    postcode: "12345"
  },
  client_profile: {
    investment_experience: "Intermediate",
    investment_goal: "Retirement",
    risk_tolerance: "Moderate"
  }
};

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [userDetails, setUserDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: ""
    },
    clientProfile: {
      investmentExperience: "",
      investmentGoal: "",
      riskTolerance: ""
    }
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [editableDetails, setEditableDetails] = useState({...userDetails});

  useEffect(() => {
    // Simulate fetching user details with a dummy API call
    const fetchUserDetails = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Use mock data
        const data = mockUserDetails;

        setUserDetails({
          firstName: data.first_name,
          lastName: data.surname,
          email: data.email_address,
          phone: data.phone_number,
          address: {
            street: data.residential_address.street,
            city: data.residential_address.city,
            state: data.residential_address.country,
            zipCode: data.residential_address.postcode
          },
          clientProfile: {
            investmentExperience: data.client_profile.investment_experience,
            investmentGoal: data.client_profile.investment_goal,
            riskTolerance: data.client_profile.risk_tolerance
          }
        });
        setEditableDetails({
          ...data,
          residential_address: data.residential_address,
          client_profile: data.client_profile
        });

      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    fetchUserDetails();
  }, []);

  const handleDetailChange = (field, value) => {
    setEditableDetails(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      return {...prev, [field]: value};
    });
  };

  const saveDetails = () => {
    setUserDetails(editableDetails);
    setIsEditing(false);
    // Here you would typically save to the server after validation
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitPasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    // Dummy API call simulation
    alert("Password changed successfully!");
    setIsPasswordModalOpen(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <div className="min-h-screen bg-white text-black overflow-hidden relative">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-white opacity-80 z-0"></div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-64 bg-[#1e90a7] border-r border-[#2c2c2c] p-8 flex-shrink-0"
        >
          <nav className="space-y-6">
            {[
              { icon: Settings, text: "Profile & Settings", href: "/profile" },
              { icon: DollarSign, text: "Bank Accounts", href: "/bank-accounts" },
              { icon: Shield, text: "Security", href: "/security" },
              { icon: LogOut, text: "Logout", href: "/logout" }
            ].map((item, index) => (
              <motion.a
                key={index}
                href={item.href}
                whileHover={{ scale: 1.05 }}
                className="flex items-center text-lg text-white hover:text-teal-500 transition-colors"
              >
                <item.icon size={20} className="mr-4" /> {item.text}
              </motion.a>
            ))}
          </nav>
        </motion.aside>

        {/* Main Content */}
        <motion.main
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-1 p-12"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-[#1e1e1e] border border-[#2c2c2c] rounded-3xl p-10 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-10">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-600">
                Profile Settings
              </h1>
              {!isEditing ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-full hover:opacity-90 transition-all"
                >
                  <Edit2 size={18} className="inline mr-2" /> Edit
                </motion.button>
              ) : (
                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setEditableDetails(userDetails);
                      setIsEditing(false);
                    }}
                    className="px-6 py-3 bg-[#2c2c2c] text-gray-400 rounded-full hover:bg-[#3c3c3c] transition-all"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={saveDetails}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-full hover:opacity-90 transition-all"
                  >
                    <Check size={18} className="inline mr-2" /> Save
                  </motion.button>
                </div>
              )}
            </div>

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-[#121212] rounded-2xl p-6 border border-[#2c2c2c]"
              >
                <h2 className="text-2xl font-semibold text-teal-400 mb-6">Personal Info</h2>
                <div className="space-y-6">
                  <div className="flex items-center">
                    <User className="mr-4 text-teal-500" />
                    {isEditing ? (
                      <div className="flex gap-4 w-full">
                        <input
                          value={editableDetails.firstName}
                          onChange={(e) => handleDetailChange('firstName', e.target.value)}
                          className="w-1/2 px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                          placeholder="First Name"
                        />
                        <input
                          value={editableDetails.lastName}
                          onChange={(e) => handleDetailChange('lastName', e.target.value)}
                          className="w-1/2 px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                          placeholder="Last Name"
                        />
                      </div>
                    ) : (
                      <span className="text-white">{userDetails.firstName} {userDetails.lastName}</span>
                    )}
                  </div>

                  <div className="flex items-center">
                    <Mail className="mr-4 text-teal-500" />
                    {isEditing ? (
                      <input
                        value={editableDetails.email}
                        onChange={(e) => handleDetailChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                        placeholder="Email Address"
                      />
                    ) : (
                      <span className="text-white">{userDetails.email}</span>
                    )}
                  </div>

                  <div className="flex items-center">
                    <Phone className="mr-4 text-teal-500" />
                    {isEditing ? (
                      <input
                        value={editableDetails.phone}
                        onChange={(e) => handleDetailChange('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                        placeholder="Phone Number"
                      />
                    ) : (
                      <span className="text-white">{userDetails.phone}</span>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Address */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-[#121212] rounded-2xl p-6 border border-[#2c2c2c]"
              >
                <h2 className="text-2xl font-semibold text-teal-400 mb-6">Address</h2>
                <div className="flex items-center">
                  <MapPin className="mr-4 text-teal-500" />
                  {isEditing ? (
                    <div className="space-y-4 w-full">
                      <input
                        value={editableDetails.address?.street}
                        onChange={(e) => handleDetailChange('address.street', e.target.value)}
                        className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                        placeholder="Street Address"
                      />
                      <div className="flex gap-4">
                        <input
                          value={editableDetails.address?.city}
                          onChange={(e) => handleDetailChange('address.city', e.target.value)}
                          className="w-1/2 px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                          placeholder="City"
                        />
                        <input
                          value={editableDetails.address?.state}
                          onChange={(e) => handleDetailChange('address.state', e.target.value)}
                          className="w-1/4 px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                          placeholder="State"
                        />
                        <input
                          value={editableDetails.address?.zipCode}
                          onChange={(e) => handleDetailChange('address.zipCode', e.target.value)}
                          className="w-1/4 px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                          placeholder="ZIP"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-white">
                      {userDetails.address.street}, {userDetails.address.city},
                      {userDetails.address.state} {userDetails.address.zipCode}
                    </span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Investment Profile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-10"
            >
              <h2 className="text-2xl font-semibold text-teal-400 mb-6">Investment Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    label: "Investment Experience",
                    value: userDetails.clientProfile.investmentExperience
                  },
                  {
                    label: "Investment Goal",
                    value: userDetails.clientProfile.investmentGoal
                  },
                  {
                    label: "Risk Tolerance",
                    value: userDetails.clientProfile.riskTolerance
                  }
                ].map((profile, index) => (
                  <div
                    key={index}
                    className="bg-[#121212] rounded-2xl p-6 border border-[#2c2c2c]"
                  >
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      {profile.label}
                    </h3>
                    <p className="text-white text-xl font-semibold">
                      {profile.value || "Not specified"}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Security Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="border-t border-[#2c2c2c] pt-10 flex justify-between items-center"
            >
              <h2 className="text-2xl font-semibold text-teal-400">Security</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-6 py-3 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-all"
              >
                <Lock size={18} className="inline mr-2" /> Change Password
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
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#1e1e1e] rounded-2xl p-8 w-full max-w-md border border-[#2c2c2c] shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-teal-400">Change Password</h2>
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <X size={24} />
                  </motion.button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 mb-2">Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2">New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-3 bg-black border border-[#2c2c2c] rounded-lg text-white"
                      placeholder="Confirm new password"
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsPasswordModalOpen(false)}
                      className="px-6 py-3 bg-[#2c2c2c] text-gray-400 rounded-full hover:bg-[#3c3c3c] transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={submitPasswordChange}
                      className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-full hover:opacity-90 transition-all"
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
