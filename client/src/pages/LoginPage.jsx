// The login screen. After a successful login each role is sent to its own dashboard.

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage, getFieldErrors } from '../api/axiosClient.js';
import { Alert, LoadingSpinner } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { APP_NAME, COMPANY_NAME, ROLE_BASE_PATH, ROLE_HOME } from '../utils/constants.js';
import { validateLoginForm } from '../utils/validators.js';

// Shown only while running "npm run dev" (import.meta.env.DEV) - never in a production build.
// Clicking one fills in the email; the shared demo password is written in README.md.
const DEMO_ACCOUNTS = [
  { label: 'Employee', email: 'employee1@prachay.test' },
  { label: 'Director', email: 'director@prachay.test' },
  { label: 'Accounts', email: 'accounts@prachay.test' },
];

// Go back to the page the user originally asked for, but only if their role may open it.
function landingPageFor(user, requestedPath) {
  const allowed =
    requestedPath && (requestedPath.startsWith(ROLE_BASE_PATH[user.role]) || requestedPath === '/profile');
  return allowed ? requestedPath : ROLE_HOME[user.role];
}

export default function LoginPage() {
  const { user, loading, login, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <LoadingSpinner fullPage label="Checking your session..." />;
  }
  // Already logged in? There is nothing to do here.
  if (user) {
    return <Navigate to={landingPageFor(user, location.state?.from)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const found = validateLoginForm({ email, password });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(landingPageFor(loggedInUser, location.state?.from), { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setFormError(getErrorMessage(error, 'Could not log in. Please try again.'));
      setSubmitting(false);
    }
  }

  function fillDemoEmail(demoEmail) {
    setEmail(demoEmail);
    setErrors({});
    setFormError('');
    document.getElementById('login-password')?.focus();
  }

  return (
    <div className="login-page">
      <section className="login-brand" aria-hidden="true">
        <div className="login-brand-inner">
          <span className="brand-mark brand-mark-large">
            <Icon name="file-text" size={28} />
          </span>
          <p className="login-company">{COMPANY_NAME}</p>
          <h2>{APP_NAME}</h2>
          <p className="login-tagline">Create, approve and track expense vouchers in one place.</p>
          <ul className="login-points">
            <li>
              <Icon name="file-plus" /> Employees raise and track their vouchers
            </li>
            <li>
              <Icon name="check-circle" /> The Director approves or rejects with a signature
            </li>
            <li>
              <Icon name="rupee" /> Accounts sees what is ready for reimbursement
            </li>
          </ul>
        </div>
      </section>

      <main className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <h1>Sign in</h1>
          <p className="muted">Use your work email and password.</p>

          {sessionExpired && !formError && (
            <Alert type="warning">Your session has expired. Please sign in again.</Alert>
          )}
          {formError && <Alert type="error">{formError}</Alert>}

          <div className="form-field">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={errors.email ? 'true' : undefined}
              autoFocus
              required
            />
            {errors.email && (
              <p className="form-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <div className="password-field">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={errors.password ? 'true' : undefined}
                required
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} />
              </button>
            </div>
            {errors.password && (
              <p className="form-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            <Icon name="lock" size={16} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          {import.meta.env.DEV && (
            <div className="demo-box">
              <p className="demo-title">Demo accounts (local development only)</p>
              <div className="demo-buttons">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => fillDemoEmail(account.email)}
                  >
                    {account.label}
                  </button>
                ))}
              </div>
              <p className="form-hint">
                Click a role to fill in its email. The demo password is listed in README.md under “Demo login
                credentials”.
              </p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
