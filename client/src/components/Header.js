import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, Menu } from 'lucide-react';
import { useLogout } from '../utils/AuthUtils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  const navigationTabs = [
    { label: 'Workflows', href: '/workflows' },
    { label: 'Runs', href: '/runs' },
    { label: 'Connections', href: '/connections' },
    { label: 'Analytics', href: '/analytics' },
  ];

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const logout = useLogout();
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchUser = async () => {
      const accessToken = localStorage.getItem('access_token');

      if (!userId || !accessToken) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/users/user/${userId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            navigate('/login', { replace: true });
            return;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        if (!data.user) {
          throw new Error('User not found');
        }

        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('Failed to load user data.');
        setTimeout(() => setError(''), 5000);
      }
    };

    fetchUser();
  }, [userId, navigate]);

  const getInitials = () => {
    if (!user || !user.first_name || !user.surname) return '--';
    return `${user.first_name.charAt(0).toUpperCase()}${user.surname.charAt(0).toUpperCase()}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/workflows?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  if (!userId) {
    return null; // Render nothing until redirected to login
  }

  return (
    <div className="w-full bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-3 fixed top-0 left-0 z-50">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center mx-auto max-w-2xl">
          {error}
        </div>
      )}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-lg z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] opacity-50 z-0"></div>
      
      <div className="container mx-auto px-6 flex items-center relative z-10">
        <NavLink to="/home" className="flex items-center gap-2 mr-8">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Workflow Manager</h2>
        </NavLink>
        
        <nav className="hidden md:flex items-center space-x-1 flex-1">
          {navigationTabs.map((tab) => (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={({ isActive }) =>
                `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 backdrop-blur-sm text-white'
                    : 'text-white/90 hover:bg-white/10 hover:backdrop-blur-sm'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <button 
          className="md:hidden p-1 rounded-md hover:bg-white/10 transition-colors ml-auto"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu size={24} />
        </button>

        <div className="flex items-center gap-4 ml-auto">
          <form onSubmit={handleSubmit} className="relative hidden md:block">
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-white/50 placeholder-white/70 w-64"
            />
            <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </form>

          <button className="p-2 rounded-md text-white/90 hover:text-white hover:bg-white/10 transition-colors">
            <Bell size={20} />
          </button>

          <button
            onClick={() => navigate(`/profile/${userId}`)}
            className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-medium cursor-pointer hover:from-blue-600 hover:to-cyan-500 transition-colors"
            title={user ? `${user.first_name} ${user.surname}` : 'Profile'}
          >
            {user ? getInitials() : '--'}
          </button>

          <button
            onClick={logout}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} className="inline" />
            <span>Logout</span>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-gradient-to-r from-[#1e3c72] to-[#2a5298] py-3 px-6 shadow-lg md:hidden z-20">
            {navigationTabs.map((tab) => (
              <NavLink
                key={tab.href}
                to={tab.href}
                className="block px-4 py-2 rounded-md text-sm font-medium text-white/90 hover:bg-white/10 mb-1"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {tab.label}
              </NavLink>
            ))}
            <NavLink
              to={`/profile/${userId}`}
              className="block px-4 py-2 rounded-md text-sm font-medium text-white/90 hover:bg-white/10 mb-1"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <User size={16} className="inline mr-2" />
              Profile
            </NavLink>
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-2 rounded-md text-sm font-medium text-white/90 hover:bg-white/10 mb-1"
            >
              <LogOut size={16} className="inline mr-2" />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;