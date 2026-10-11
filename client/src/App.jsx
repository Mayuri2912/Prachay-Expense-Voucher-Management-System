// The root component: providers on the outside, pages on the inside.
//
//   BrowserRouter  - page addresses (React Router)
//   AuthProvider   - who is logged in
//   ToastProvider  - pop-up notifications

import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
