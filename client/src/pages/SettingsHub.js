import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, ListChecks, Menu, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const AdminHub = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-600">Please log in to access the admin hub.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans">
      <div className="container mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Menu className="mr-2 text-blue-600" /> Admin Hub
        </h1>
        <div className="flex flex-wrap gap-4 mt-5">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-[20px] bg-[#00bcd4] text-white text-lg font-bold transition-transform"
          >
            <Link to="/settings/users" className="flex flex-col items-center justify-center w-full h-full !text-white">
              <Users className="w-12 h-12 mb-2" />
              Manage Users
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-[20px] bg-[#00bcd4] text-white text-lg font-bold transition-transform"
          >
            <Link to="/settings/create-user" className="flex flex-col items-center justify-center w-full h-full !text-white">
              <UserPlus className="w-12 h-12 mb-2" />
              Create User
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-[20px] bg-[#00bcd4] text-white text-lg font-bold transition-transform"
          >
            <Link to="/settings/dropdowns" className="flex flex-col items-center justify-center w-full h-full !text-white">
              <ListChecks  className="w-12 h-12 mb-2" />
              Manage Permissions
            </Link>
          </motion.div>
                    <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center justify-center w-[200px] h-[200px] rounded-[20px] bg-[#00bcd4] text-white text-lg font-bold transition-transform"
          >
            <Link to="/settings/dropdowns" className="flex flex-col items-center justify-center w-full h-full !text-white">
              <Activity  className="w-12 h-12 mb-2" />
              System Health
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminHub;