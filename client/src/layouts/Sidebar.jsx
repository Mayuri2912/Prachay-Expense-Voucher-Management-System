// The navigation menu. Each role sees only its own pages.
// (Hiding a link is just for convenience - the routes and the API are protected separately.)

import { Link, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { COMPANY_NAME, ROLE_HOME, ROLE_LABELS, ROLES } from '../utils/constants.js';

// `isActive` decides when a menu item is highlighted.
const MENU = {
  [ROLES.EMPLOYEE]: [
    { to: '/employee/dashboard', label: 'Dashboard', icon: 'dashboard', isActive: (path) => path === '/employee/dashboard' },
    { to: '/employee/vouchers/new', label: 'New Voucher', icon: 'file-plus', isActive: (path) => path === '/employee/vouchers/new' },
    {
      to: '/employee/vouchers',
      label: 'My Vouchers',
      icon: 'file-text',
      isActive: (path) => path.startsWith('/employee/vouchers') && path !== '/employee/vouchers/new',
    },
  ],
  [ROLES.DIRECTOR]: [
    { to: '/director/dashboard', label: 'Dashboard', icon: 'dashboard', isActive: (path) => path === '/director/dashboard' },
    { to: '/director/pending', label: 'Pending Approvals', icon: 'clock', isActive: (path) => path === '/director/pending' },
    { to: '/director/vouchers', label: 'All Vouchers', icon: 'layers', isActive: (path) => path.startsWith('/director/vouchers') },
  ],
  [ROLES.ACCOUNTS]: [
    { to: '/accounts/dashboard', label: 'Dashboard', icon: 'dashboard', isActive: (path) => path === '/accounts/dashboard' },
    { to: '/accounts/approved', label: 'Ready for Reimbursement', icon: 'check-circle', isActive: (path) => path === '/accounts/approved' },
    { to: '/accounts/vouchers', label: 'All Vouchers', icon: 'layers', isActive: (path) => path.startsWith('/accounts/vouchers') },
  ],
};

export default function Sidebar({ open, onNavigate }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const items = MENU[user.role] || [];

  return (
    <aside id="app-sidebar" className={open ? 'sidebar sidebar-open' : 'sidebar'}>
      <Link to={ROLE_HOME[user.role]} className="sidebar-brand" onClick={onNavigate}>
        <span className="brand-mark">
          <Icon name="file-text" size={20} />
        </span>
        <span>
          <span className="brand-name">{COMPANY_NAME}</span>
          <span className="brand-product">Expense Vouchers</span>
        </span>
      </Link>

      <nav className="sidebar-nav" aria-label="Main menu">
        <p className="sidebar-heading">{ROLE_LABELS[user.role]}</p>
        <ul>
          {items.map((item) => {
            const active = item.isActive(pathname);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={active ? 'nav-link nav-link-active' : 'nav-link'}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="sidebar-heading">Account</p>
        <ul>
          <li>
            <Link
              to="/profile"
              className={pathname === '/profile' ? 'nav-link nav-link-active' : 'nav-link'}
              aria-current={pathname === '/profile' ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon name="user" />
              My Profile
            </Link>
          </li>
          <li>
            <button type="button" className="nav-link nav-button" onClick={logout}>
              <Icon name="logout" />
              Log out
            </button>
          </li>
        </ul>
      </nav>

      <p className="sidebar-footer">Signed in as {user.fullName}</p>
    </aside>
  );
}
