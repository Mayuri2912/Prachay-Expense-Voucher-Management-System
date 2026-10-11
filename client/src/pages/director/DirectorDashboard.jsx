// Director dashboard: the approval queue, today's decisions and recent activity.

import { Link } from 'react-router-dom';
import { getDirectorDashboard } from '../../api/dashboardApi.js';
import { Alert, EmptyState, LoadingSpinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { formatCurrency, formatDateTime, formatRelativeTime } from '../../utils/formatters.js';

const ACTIVITY = {
  SUBMITTED: { icon: 'send', tone: 'amber', text: (item) => `${item.voucher.employeeName} submitted` },
  APPROVED: { icon: 'check', tone: 'green', text: (item) => `${item.performedByName} approved` },
  REJECTED: { icon: 'x', tone: 'red', text: (item) => `${item.performedByName} rejected` },
};

export default function DirectorDashboard() {
  const { data: stats, loading, error, reload } = useApiData(getDirectorDashboard, 'Could not load the dashboard.');

  return (
    <>
      <PageHeader title="Director Dashboard" subtitle="Vouchers waiting for your decision and recent activity.">
        <Link to="/director/pending" className="btn btn-primary">
          <Icon name="clock" size={16} />
          Review pending vouchers
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
          <div className="stat-grid stat-grid-4">
            <StatCard
              label="Pending Approval"
              value={stats.pendingApprovalCount}
              icon="clock"
              tone="amber"
              hint="Waiting for your decision"
              to="/director/pending"
            />
            <StatCard label="Approved Today" value={stats.approvedToday} icon="check-circle" tone="green" />
            <StatCard label="Rejected Today" value={stats.rejectedToday} icon="x-circle" tone="red" />
            <StatCard
              label="Total Pending Amount"
              value={formatCurrency(stats.totalPendingAmount)}
              icon="rupee"
              tone="blue"
              hint="Sum of all pending vouchers"
            />
          </div>

          <div className="two-column">
            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Waiting longest for approval</h2>
                <Link to="/director/pending" className="card-link">
                  View all pending
                </Link>
              </div>

              {stats.oldestPendingVouchers.length === 0 ? (
                <EmptyState icon="check-circle" title="Nothing is waiting" message="Every submitted voucher has been reviewed." />
              ) : (
                <ul className="simple-list">
                  {stats.oldestPendingVouchers.map((voucher) => (
                    <li key={voucher.id}>
                      <div>
                        <p className="cell-main">{voucher.expenseTitle}</p>
                        <p className="cell-sub">
                          {voucher.voucherNumber} · {voucher.employee.name} · submitted{' '}
                          {formatRelativeTime(voucher.submittedAt)}
                        </p>
                      </div>
                      <div className="simple-list-end">
                        <span className="cell-amount">{formatCurrency(voucher.amount)}</span>
                        <Link to={`/director/vouchers/${voucher.id}`} className="btn btn-secondary btn-small">
                          Review
                          <span className="visually-hidden"> voucher {voucher.voucherNumber}</span>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <div className="card-header">
                <h2 className="card-title">Recent voucher activity</h2>
                <Link to="/director/vouchers" className="card-link">
                  All vouchers
                </Link>
              </div>

              {stats.recentActivity.length === 0 ? (
                <EmptyState icon="activity" title="No activity yet" message="Submissions and decisions will appear here." />
              ) : (
                <ol className="timeline">
                  {stats.recentActivity.map((item) => {
                    const style = ACTIVITY[item.action];
                    return (
                      <li key={item.id} className="timeline-item">
                        <span className={`timeline-marker timeline-${style.tone}`}>
                          <Icon name={style.icon} size={14} />
                        </span>
                        <div>
                          <p className="timeline-title">
                            {style.text(item)}{' '}
                            <Link to={`/director/vouchers/${item.voucher.id}`} className="table-link">
                              {item.voucher.voucherNumber}
                            </Link>
                          </p>
                          <p className="timeline-meta">
                            {item.voucher.expenseTitle} · {formatCurrency(item.voucher.amount)} ·{' '}
                            <span title={formatDateTime(item.createdAt)}>{formatRelativeTime(item.createdAt)}</span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
