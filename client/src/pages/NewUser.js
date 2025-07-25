import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Shield, Check, X, ChevronRight } from 'lucide-react';

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
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    document.title = "Cobalt | Create New User";
    if (!userId) {
      navigate('/login', { replace: true });
    }
  }, [userId, navigate]);

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
      const accessToken = localStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
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
        navigate('/manage-users');
      } else {
        setError('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('An error occurred while creating the user.');
    }
  };

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Please log in to create a new user.</p>
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
              <span className="text-white font-medium">Create New User</span>
            </div>
          </nav>
          <h1 className="sg-page-header-title" style={{ fontSize: '44px', fontWeight: 'bold', marginBottom: '16px' }}>
            Create New User
          </h1>
          <div className="w-3/4">
            <p className="sg-page-header-description" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Enter the details to create a new user account
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <section className="sg-workflow-card">
          <h2 className="sg-workflow-title flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            New User
          </h2>
          <p className="sg-workflow-description mb-6">Enter the details to create a new user account</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
                <X className="w-4 h-4" />
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
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={newUser.first_name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="surname">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    id="surname"
                    name="surname"
                    value={newUser.surname}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={newUser.email}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="role">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <select
                    id="role"
                    name="role"
                    value={newUser.role}
                    onChange={handleChange}
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="user">User - Standard access</option>
                    <option value="admin">Admin - Full system access</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={newUser.password}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={newUser.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full p-2 pl-10 border border-gray-300 text-gray-700 bg-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                onClick={() => navigate('/manage-users')}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded-lg"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 px-4 py-2 rounded-lg"
              >
                <Check className="h-4 w-4" />
                Create User
              </button>
            </div>
          </form>
        </section>
      </div>

    </main>
  );
};

export default NewUser;