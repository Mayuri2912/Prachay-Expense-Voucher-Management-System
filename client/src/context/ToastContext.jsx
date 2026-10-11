// Small pop-up notifications ("Voucher saved", "Could not reach the server").
//
//   const toast = useToast();
//   toast.success('Voucher saved as draft.');
//   toast.error('Something went wrong.');

import { createContext, useCallback, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';

export const ToastContext = createContext(null);

const VISIBLE_FOR_MS = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), VISIBLE_FOR_MS);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message) => show('success', message),
      error: (message) => show('error', message),
      info: (message) => show('info', message),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* aria-live makes screen readers announce new messages */}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon name={toast.type === 'success' ? 'check-circle' : toast.type === 'error' ? 'alert' : 'info'} />
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Dismiss message">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
