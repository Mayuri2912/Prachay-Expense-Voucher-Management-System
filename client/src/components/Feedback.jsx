// Small "what is happening" building blocks used on every page:
//   <LoadingSpinner />  while a request is running
//   <Alert />           an error, warning, success or info box
//   <EmptyState />      when a list has nothing to show

import Icon from './Icon.jsx';

export function LoadingSpinner({ label = 'Loading...', fullPage = false }) {
  return (
    <div className={fullPage ? 'loading loading-full' : 'loading'} role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

const ALERT_ICONS = {
  error: 'alert',
  warning: 'alert',
  success: 'check-circle',
  info: 'info',
};

// type: 'error' | 'warning' | 'success' | 'info'
export function Alert({ type = 'info', title, children, action }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon name={ALERT_ICONS[type]} size={20} className="alert-icon" />
      <div className="alert-body">
        {title && <p className="alert-title">{title}</p>}
        <div className="alert-text">{children}</div>
      </div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
