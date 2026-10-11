// Employee: the confirmation screen shown right after a voucher is submitted for approval.

import { useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getVoucher } from '../../api/voucherApi.js';
import { Alert, LoadingSpinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { STATUS } from '../../utils/constants.js';
import { formatCurrency, formatDateTime } from '../../utils/formatters.js';

export default function SubmissionConfirmationPage() {
  const { id } = useParams();
  const fetchVoucher = useCallback(() => getVoucher(id), [id]);
  const { data, loading, error } = useApiData(fetchVoucher, 'Could not load the voucher.');

  if (loading) {
    return <LoadingSpinner label="Loading the voucher..." />;
  }
  if (error) {
    return (
      <Alert type="error" title="Could not load the voucher">
        {error}
      </Alert>
    );
  }

  const { voucher } = data;

  // This page only makes sense for a voucher that really has been submitted.
  if (voucher.status === STATUS.DRAFT) {
    return <Navigate to={`/employee/vouchers/${voucher.id}`} replace />;
  }

  return (
    <div className="card confirmation-card">
      <div className="message-icon message-icon-green">
        <Icon name="check-circle" size={36} />
      </div>
      <h1>Voucher submitted for approval</h1>
      <p className="muted">
        Your voucher has been sent to the Director. You will see the decision on your dashboard and in “My Vouchers”.
      </p>

      <dl className="confirmation-details">
        <div>
          <dt>Voucher number</dt>
          <dd>{voucher.voucherNumber}</dd>
        </div>
        <div>
          <dt>Expense</dt>
          <dd>{voucher.expenseTitle}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>{formatCurrency(voucher.amount)}</dd>
        </div>
        <div>
          <dt>Submitted on</dt>
          <dd>{formatDateTime(voucher.submittedAt)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={voucher.status} />
          </dd>
        </div>
      </dl>

      <p className="form-hint">A submitted voucher is read-only: it can no longer be edited or deleted.</p>

      <div className="confirmation-actions">
        <Link to={`/employee/vouchers/${voucher.id}`} className="btn btn-primary">
          <Icon name="eye" size={16} />
          View voucher
        </Link>
        <Link to="/employee/vouchers/new" className="btn btn-secondary">
          <Icon name="plus" size={16} />
          Create another voucher
        </Link>
        <Link to="/employee/vouchers" className="btn btn-ghost">
          Go to my vouchers
        </Link>
      </div>
    </div>
  );
}
