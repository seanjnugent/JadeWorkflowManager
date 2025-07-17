import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Shield, Check, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';


const NewUser = () => {
  const navigate = useNavigate();
  const [newUser, setNewUser] = useState({
    first_name: '',
    surname: '',
    email: '',
    role: 'user',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
 
  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (newUser.password !== newUser.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: newUser.first_name,
        surname: newUser.surname,
        email: newUser.email,
        role: newUser.role,
        password: newUser.password,
      }),
    });

    if (response.ok) {
      navigate('/users');
    } else {
      setError('Failed to create user');
    }
  } catch (error) {
    console.error('Error creating user:', error);
    setError('An error occurred while creating the user.');
  }
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
            <h1 className="text-xl font-semibold text-gray-900">Create New User</h1>
            <p className="text-gray-600 text-sm mt-1">Enter the details to create a new user account</p>
          </div>
        </div>

        <div className="bg-white border border-gray-300 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="first_name">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={newUser.first_name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="surname">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={newUser.surname}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <select
                    id="role"
                    name="role"
                    value={newUser.role}
                    onChange={handleChange}
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={newUser.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-8 border border-gray-300 text-gray-700 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                onClick={() => navigate('/users')}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 border border-blue-900 px-4 py-2"
              >
                <Check className="h-4 w-4" />
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
};

export default NewUser;