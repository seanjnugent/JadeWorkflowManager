import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeader, setShowHeader] = useState(true);
  const [activeTab, setActiveTab] = useState('Themes');
  const lastScrollY = useRef(0);
  const navigate = useNavigate();

  const navigationTabs = [
    { label: 'Home', href: '/home' },
    { label: 'Organisations', href: '/organisations' },
    { label: 'Help', href: '/help' },
    { label: 'About', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true);
      }

      lastScrollY.current = currentScrollY;
    };

    const throttledHandleScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', throttledHandleScroll);
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/results?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={`border-b bg-white z-10 ${showHeader ? 'fixed' : 'hidden'} relative`}>
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto">
          {navigationTabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveTab(tab.label);
                navigate(tab.href); // Navigate to the tab's href
              }}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 cursor-pointer ${
                activeTab === tab.label
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
