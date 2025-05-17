import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Bell, User, LogOut, Menu } from 'lucide-react';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navigationTabs = [
    { label: 'Workflows', href: '/workflows' },
    { label: 'Runs', href: '/runs' },
    { label: 'Connections', href: '/connections' },
    { label: 'Analytics', href: '/analytics' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/workflows?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate("/login");
  };

  return (
    <div className="w-full bg-gradient-to-r from-[#1e3c72] to-[#2a5298] text-white py-3 fixed top-0 left-0 z-50">
      {/* Enhanced glass effect layers */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-lg z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] opacity-50 z-0"></div>
      
      <div className="container mx-auto px-6 flex items-center relative z-10">
        {/* Logo */}
        <NavLink to="/home" className="flex items-center gap-2 mr-8">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Workflow Manager</h2>
        </NavLink>
        
        {/* Navigation tabs - now left-aligned */}
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

        {/* Mobile menu button */}
        <button 
          className="md:hidden p-1 rounded-md hover:bg-white/10 transition-colors ml-auto"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu size={24} />
        </button>

        {/* Search and user controls - now properly right-aligned */}
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

          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-medium cursor-pointer">
            JD
          </div>

          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} className="inline" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile menu dropdown */}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;