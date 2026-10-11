import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Shortcut for reading the logged-in user and the login / logout functions.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return context;
}
