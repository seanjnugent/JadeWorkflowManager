import React from 'react';
import { Link } from 'react-router-dom';

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/workflows', label: 'Workflows' },
  { to: '/runs', label: 'Runs' },
  { to: '/analytics', label: 'Analytics', adminOnly: true },
  { to: '/settings', label: 'Settings', adminOnly: true },
  { to: '/help', label: 'Help' },
];

const Navigation = ({ currentPath, user }) => {
  const isAdmin = user?.role === 'admin';

  return (
    <ul className="ds_site-navigation__list">
      {navItems
        .filter(item => !item.adminOnly || (item.adminOnly && isAdmin))
        .map((item, index) => {
          const isActive = currentPath === item.to || (item.to === '/datasets' && currentPath.startsWith('/dataset'));
          return (
            <li key={index} className="ds_site-navigation__item">
              <Link
                to={item.to}
                className={`ds_site-navigation__link ${isActive ? 'ds_current' : ''}`}
                aria-current={isActive ? 'true' : undefined}
                tabIndex={0}
              >
                <span className="label-nav">{item.label}</span>
              </Link>
            </li>
          );
        })}
    </ul>
  );
};

export default Navigation;