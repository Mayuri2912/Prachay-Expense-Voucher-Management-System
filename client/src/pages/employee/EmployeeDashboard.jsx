// Employee dashboard: statistics for the logged-in employee's own vouchers only.

import { Link } from 'react-router-dom';
import { getEmployeeDashboard } from '../../api/dashboardApi.js';
import { Alert, EmptyState, LoadingSpinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import VoucherTable from '../../components/VoucherTable.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { useAuth } from '../../hooks/useAuth.js';
import { formatCurrency } from '../../utils/formatters.js';

const newVoucherButton = (
  <Link to="/employee/vouchers/new" className="btn btn-primary">
    <Icon name="plus" size={16} />
    New voucher
  </Link>
);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { data: stats, loading, error, reload } = useApiData(getEmployeeDashboard, 'Could not load your dashboard.');

  return (
    <>
      <PageHeader title={`Welcome, ${user.fullName.split(' ')[0]}`} subtitle="An overview of your expense vouchers.">
        {newVoucherButton}
      </PageHeader>

      {loading && <LoadingSpinner label="Loading your dashboard..." />}

      {error && (
        <Alert
          type="error"
          title="Could not load your dashboard"
          action={
            <button type="button" className="btn btn-secondary btn-small" onClick={reload}>
              Try again
            </button>
          }
        >
          {error}
        </Alert>
      )}

      {stats && !loading && !error && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Vouchers" value={stats.totalVouchers} icon="layers" tone="navy" to="/employee/vouchers" />
            <StatCard
              label="Draft Vouchers"
              value={stats.draftVouchers}
              icon="file-text"
              tone="slate"
              hint="Not submitted yet"
              to="/employee/vouchers?status=DRAFT"
            />
            <StatCard
              label="Pending Approval"
              value={stats.pendingApproval}
              icon="clock"
              tone="amber"
              hint={`${formatCurrency(stats.pendingAmount)} waiting`}
              to="/employee/vouchers?status=PENDING_APPROVAL"
            />
            <StatCard
              label="Approved Vouchers"
              value={stats.approvedVouchers}
              icon="check-circle"
              tone="green"
              hint={`${formatCurrency(stats.approvedAmount)} approved`}
              to="/employee/vouchers?status=APPROVED"
            />
            <StatCard
              label="Rejected Vouchers"
              value={stats.rejectedVouchers}
              icon="x-circle"
              tone="red"
              to="/employee/vouchers?status=REJECTED"
            />
            <StatCard
              label="Total Amount Claimed"
              value={formatCurrency(stats.totalAmountClaimed)}
              icon="rupee"
              tone="blue"
              hint="All submitted vouchers (drafts excluded)"
            />
          </div>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Recently updated vouchers</h2>
              <Link to="/employee/vouchers" className="card-link">
                View all
              </Link>
            </div>

            {stats.recentVouchers.length === 0 ? (
              <EmptyState
                title="You have not created any vouchers yet"
                message="Create your first expense voucher to claim a reimbursement."
                action={newVoucherButton}
              />
            ) : (
              <VoucherTable
                vouchers={stats.recentVouchers}
                showEmployee={false}
                detailsPath={(voucher) => `/employee/vouchers/${voucher.id}`}
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
