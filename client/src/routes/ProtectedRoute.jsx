// Guards a group of pages.
//
//   <Route element={<ProtectedRoute />}>                      any logged-in user
//   <Route element={<ProtectedRoute roles={['DIRECTOR']} />}>  only the Director
//
// Typing a protected address directly into the browser lands here first:
//   not logged in -> the login page
//   wrong role    -> the "Access denied" page
//
// This protects the SCREENS. The data is protected separately by the API.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../components/Feedback.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still checking the saved token - do not redirect yet.
  if (loading) {
    return <LoadingSpinner fullPage label="Checking your session..." />;
  }

  if (!user) {
    // Remember where the user wanted to go, so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
