import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
import { useLogout } from '../utils/AuthUtils';
import Navigation from './Navigation';
import '../App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const menuCheckboxRef = useRef(null);
  const menuButtonRef = useRef(null);
  const skipLinkRef = useRef(null);
  const logout = useLogout();
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

  // Set --header-height CSS variable
  useEffect(() => {
    const header = document.querySelector('.ds_site-header');
    if (header) {
      const height = header.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }, []);

  // Focus the skip link on route change
  useEffect(() => {
    if (skipLinkRef.current) {
      skipLinkRef.current.focus();
    }
  }, [location.pathname]);

  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    if (menuCheckboxRef.current) {
      menuCheckboxRef.current.checked = !isMenuOpen;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleMenu();
    }
  };

  // Update checkbox state when isMenuOpen changes
  useEffect(() => {
    if (menuCheckboxRef.current) {
      menuCheckboxRef.current.checked = isMenuOpen;
    }
  }, [isMenuOpen]);

  // Handle outside click to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMenuOpen &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target)
      ) {
        const mobileNav = document.getElementById('mobile-navigation');
        if (mobileNav && !mobileNav.contains(event.target)) {
          setIsMenuOpen(false);
          if (menuCheckboxRef.current) {
            menuCheckboxRef.current.checked = false;
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const getInitials = () => {
    if (!user || !user.first_name || !user.surname) return '--';
    return `${user.first_name.charAt(0).toUpperCase()}${user.surname.charAt(0).toUpperCase()}`;
  };

  if (!userId) {
    return null; // Render nothing until redirected to login
  }

  return (
    <header className="ds_site-header ds_site-header--gradient" role="banner">
      {/* Skip to main content link */}
      <div className="ds_skip-links" ref={skipLinkRef}>
        <ul className="ds_skip-links__list">
          <li className="ds_skip-links__item">
            <a className="ds_skip-links__link" href="#main-content">
              Skip to main content
            </a>
          </li>
        </ul>
      </div>

      <div className="ds_wrapper">
        <div className="ds_site-header__content">
          <div className="ds_site-branding">
            <NavLink to="/home" className="ds_site-branding__logo ds_site-branding__link">
              <img
                className="ds_site-branding__logo-image"
                src="/assets/images/logos/scottish-government.svg"
                alt="Scottish Government"
              />
            </NavLink>
            <div className="ds_site-branding__title">Cinnabar</div>
          </div>

          {/* User actions positioned at header level */}
          <div className="ds_site-header__user-actions">
            <button
              className="ds_site-header__action-button ds_site-header__action-icon"
              title="Notifications"
            >
              <Bell className="ds_icon" size={18} />
              <span className="visually-hidden">Notifications</span>
            </button>

            <button
              onClick={() => navigate(`/profile/${userId}`)}
              className="ds_site-header__action-button ds_site-header__action-avatar"
              title={user ? `${user.first_name} ${user.surname}` : 'Profile'}
            >
              <span className="ds_site-header__avatar-initials">
                {user ? getInitials() : '--'}
              </span>
            </button>

            <button
              onClick={logout}
              className="ds_site-header__action-button ds_site-header__action-logout"
              title="Logout"
            >
              <LogOut className="ds_icon" size={18} />
              <span className="ds_site-header__logout-text">Logout</span>
            </button>
          </div>

          <div className="ds_site-header__controls">
            <button
              aria-controls="mobile-navigation"
              className="ds_site-header__control js-toggle-menu"
              aria-expanded={isMenuOpen}
              ref={menuButtonRef}
              onClick={toggleMenu}
              onKeyDown={handleKeyDown}
            >
              <span className="ds_site-header__control-text">Menu</span>
              {isMenuOpen ? (
                <X className="ds_icon ds_site-header__control-icon" aria-hidden="true" />
              ) : (
                <Menu className="ds_icon ds_site-header__control-icon" aria-hidden="true" />
              )}
            </button>
          </div>

          <input
            className="ds_site-navigation__toggle"
            id="menu"
            type="checkbox"
            ref={menuCheckboxRef}
            onChange={(e) => setIsMenuOpen(e.target.checked)}
            aria-hidden="true"
          />

          <nav
            id="mobile-navigation"
            className={`ds_site-navigation ds_site-navigation--mobile ${isMenuOpen ? 'ds_site-navigation--open' : ''}`}
            data-module="ds-mobile-navigation-menu"
            aria-hidden={!isMenuOpen}
          >
            <Navigation currentPath={location.pathname} />
          </nav>
        </div>
      </div>

      <div className="ds_site-header__navigation">
        <div className="ds_wrapper">
          <nav className="ds_site-navigation">
            <Navigation currentPath={location.pathname} />
          </nav>
        </div>
      </div>

      {error && (
        <div className="ds_notification ds_notification--error" role="alert">
          <div className="ds_wrapper">
            <div className="ds_notification__content">
              <h2 className="visually-hidden">Error</h2>
              <p className="ds_notification__text">{error}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
