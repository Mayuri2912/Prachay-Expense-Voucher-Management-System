// Two simple pages:
//   <UnauthorizedPage />  the address exists, but this role may not open it (403)
//   <NotFoundPage />      the address does not exist (404)

import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { ROLE_HOME, ROLE_LABELS } from '../utils/constants.js';

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="message-page">
      <div className="message-icon message-icon-red">
        <Icon name="shield" size={34} />
      </div>
      <p className="message-code">403</p>
      <h1>Access denied</h1>
      <p>
        You are signed in as <strong>{ROLE_LABELS[user.role]}</strong>, and this page is not available for your role.
      </p>
      <Link to={ROLE_HOME[user.role]} className="btn btn-primary">
        Go to my dashboard
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="message-page message-page-standalone">
      <div className="message-icon">
        <Icon name="alert" size={34} />
      </div>
      <p className="message-code">404</p>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or has been moved.</p>
      <Link to={user ? ROLE_HOME[user.role] : '/login'} className="btn btn-primary">
        {user ? 'Go to my dashboard' : 'Go to the login page'}
      </Link>
    </div>
  );
}
