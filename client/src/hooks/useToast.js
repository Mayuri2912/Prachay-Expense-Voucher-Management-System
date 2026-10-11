import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext.jsx';

// Shortcut for showing notifications: toast.success(...), toast.error(...), toast.info(...)
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }
  return context;
}
