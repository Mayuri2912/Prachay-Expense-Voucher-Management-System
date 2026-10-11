// Accounts dashboard: organisation-wide totals, with approved vouchers
// (ready for reimbursement) clearly separated from those still awaiting approval.

import { Link } from 'react-router-dom';
import { getAccountsDashboard } from '../../api/dashboardApi.js';
import { Alert, EmptyState, LoadingSpinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { formatCurrency, formatDateTime } from '../../utils/formatters.js';

export default function AccountsDashboard() {
  const { data: stats, loading, error, reload } = useApiData(getAccountsDashboard, 'Could not load the dashboard.');

  return (
    <>
      <PageHeader title="Accounts Dashboard" subtitle="Expense vouchers across the organisation.">
        <Link to="/accounts/approved" className="btn btn-primary">
          <Icon name="check-circle" size={16} />
          Ready for reimbursement
        </Link>
      </PageHeader>

      {loading && <LoadingSpinner label="Loading the dashboard..." />}

      {error && (
        <Alert
          type="error"
          title="Could not load the dashboard"
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
            <StatCard
              label="Total Vouchers"
              value={stats.totalVouchers}
              icon="layers"
              tone="navy"
              hint={`Includes ${stats.draftVouchers} draft${stats.draftVouchers === 1 ? '' : 's'}`}
              to="/accounts/vouchers"
            />
            <StatCard
              label="Pending Approval"
              value={stats.pendingApproval}
              icon="clock"
              tone="amber"
              hint="Awaiting the Director - not payable yet"
              to="/accounts/vouchers?status=PENDING_APPROVAL"
            />
            <StatCard
              label="Approved Vouchers"
              value={stats.approvedVouchers}
              icon="check-circle"
              tone="green"
              hint="Ready for reimbursement"
              to="/accounts/approved"
            />
            <StatCard
              label="Rejected Vouchers"
              value={stats.rejectedVouchers}
              icon="x-circle"
              tone="red"
              to="/accounts/vouchers?status=REJECTED"
            />
            <StatCard
              label="Total Approved Expense Amount"
              value={formatCurrency(stats.totalApprovedAmount)}
              icon="rupee"
              tone="blue"
              hint="Sum of all approved vouchers"
            />
          </div>

          <Alert type="info" title="Which vouchers can be reimbursed?">
            Only <strong>Approved</strong> vouchers are ready for reimbursement. The {stats.pendingApproval} voucher
            {stats.pendingApproval === 1 ? '' : 's'} marked <strong>Pending Approval</strong> (
            {formatCurrency(stats.pendingAmount)}) {stats.pendingApproval === 1 ? 'is' : 'are'} still waiting for the
            Director and must not be paid yet.
          </Alert>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Recently approved vouchers</h2>
              <Link to="/accounts/approved" className="card-link">
                View all approved
              </Link>
            </div>

            {stats.recentApprovedVouchers.length === 0 ? (
              <EmptyState title="No approved vouchers yet" message="Vouchers appear here once the Director approves them." />
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Voucher No.</th>
                      <th scope="col">Employee</th>
                      <th scope="col">Expense</th>
                      <th scope="col">Approved On</th>
                      <th scope="col" className="cell-right">
                        Amount
                      </th>
                      <th scope="col" className="cell-right">
                        <span className="visually-hidden">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentApprovedVouchers.map((voucher) => (
                      <tr key={voucher.id}>
                        <td data-label="Voucher No.">
                          <Link to={`/accounts/vouchers/${voucher.id}`} className="table-link">
                            {voucher.voucherNumber}
                          </Link>
                        </td>
                        <td data-label="Employee">
                          <span className="cell-main">{voucher.employee.name}</span>
                          <span className="cell-sub">{voucher.department}</span>
                        </td>
                        <td data-label="Expense">
                          <span className="cell-main">{voucher.expenseTitle}</span>
                          <span className="cell-sub">{voucher.expenseCategory}</span>
                        </td>
                        <td data-label="Approved On">{formatDateTime(voucher.approvedAt)}</td>
                        <td data-label="Amount" className="cell-right cell-amount">
                          {formatCurrency(voucher.amount)}
                        </td>
                        <td className="cell-right cell-actions">
                          <Link to={`/accounts/vouchers/${voucher.id}`} className="btn btn-secondary btn-small">
                            <Icon name="eye" size={15} />
                            View
                            <span className="visually-hidden"> voucher {voucher.voucherNumber}</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
