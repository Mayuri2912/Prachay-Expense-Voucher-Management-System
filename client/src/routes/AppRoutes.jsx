// Every page address in the application, grouped by who may open it.
//
//   /login                      public
//   /profile, /unauthorized     any logged-in user
//   /employee/...               Employee only
//   /director/...               Director only
//   /accounts/...               Accounts Team only

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import AppLayout from '../layouts/AppLayout.jsx';
import AccountsDashboard from '../pages/accounts/AccountsDashboard.jsx';
import ApprovedVouchersPage from '../pages/accounts/ApprovedVouchersPage.jsx';
import DirectorDashboard from '../pages/director/DirectorDashboard.jsx';
import PendingApprovalsPage from '../pages/director/PendingApprovalsPage.jsx';
import CreateVoucherPage from '../pages/employee/CreateVoucherPage.jsx';
import EditVoucherPage from '../pages/employee/EditVoucherPage.jsx';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard.jsx';
import MyVouchersPage from '../pages/employee/MyVouchersPage.jsx';
import SubmissionConfirmationPage from '../pages/employee/SubmissionConfirmationPage.jsx';
import { NotFoundPage, UnauthorizedPage } from '../pages/ErrorPages.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import AllVouchersPage from '../pages/shared/AllVouchersPage.jsx';
import VoucherDetailsPage from '../pages/shared/VoucherDetailsPage.jsx';
import { ROLE_HOME, ROLES } from '../utils/constants.js';
import ProtectedRoute from './ProtectedRoute.jsx';

// "/" sends each role to its own dashboard.
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={ROLE_HOME[user.role]} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Everything below needs a login. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute roles={[ROLES.EMPLOYEE]} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
            <Route path="/employee/vouchers" element={<MyVouchersPage />} />
            <Route path="/employee/vouchers/new" element={<CreateVoucherPage />} />
            <Route path="/employee/vouchers/:id" element={<VoucherDetailsPage />} />
            <Route path="/employee/vouchers/:id/edit" element={<EditVoucherPage />} />
            <Route path="/employee/vouchers/:id/submitted" element={<SubmissionConfirmationPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.DIRECTOR]} />}>
            <Route path="/director/dashboard" element={<DirectorDashboard />} />
            <Route path="/director/pending" element={<PendingApprovalsPage />} />
            <Route path="/director/vouchers" element={<AllVouchersPage />} />
            <Route path="/director/vouchers/:id" element={<VoucherDetailsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.ACCOUNTS]} />}>
            <Route path="/accounts/dashboard" element={<AccountsDashboard />} />
            <Route path="/accounts/approved" element={<ApprovedVouchersPage />} />
            <Route path="/accounts/vouchers" element={<AllVouchersPage />} />
            <Route path="/accounts/vouchers/:id" element={<VoucherDetailsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
