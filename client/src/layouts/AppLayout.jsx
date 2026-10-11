// The frame around every page after login: sidebar on the left, top bar, page content.
// <Outlet /> is where React Router puts the current page.

import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { APP_NAME, ROLE_LABELS } from '../utils/constants.js';
import { initialsOf } from '../utils/formatters.js';
import Sidebar from './Sidebar.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false); // the slide-in menu on small screens

  // Close the mobile menu and go back to the top whenever the page changes.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // Keyboard support for the slide-in menu: move the focus into it when it opens,
  // and let the Escape key close it again.
  useEffect(() => {
    if (!menuOpen) return undefined;

    document.querySelector('#app-sidebar a')?.focus();

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        document.querySelector('.menu-button')?.focus();
      }
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}

      <div className="app-main">
        <header className="topbar">
          <button
            type="button"
            className="icon-button menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="app-sidebar"
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={22} />
          </button>

          <p className="topbar-title">{APP_NAME}</p>

          <div className="topbar-user">
            <Link to="/profile" className="user-chip" title="View my profile">
              <span className="avatar" aria-hidden="true">
                {initialsOf(user.fullName)}
              </span>
              <span className="user-chip-text">
                <span className="user-chip-name">{user.fullName}</span>
                <span className="user-chip-role">{ROLE_LABELS[user.role]}</span>
              </span>
            </Link>
            <button type="button" className="btn btn-secondary btn-small logout-button" onClick={logout}>
              <Icon name="logout" size={16} />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="page" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
