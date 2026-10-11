// The coloured status label. The same labels and colours are used on every screen.

import { STATUS_LABELS } from '../utils/constants.js';

const STATUS_CLASS = {
  DRAFT: 'badge-draft',
  PENDING_APPROVAL: 'badge-pending',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] || 'badge-draft'}`}>
      <span className="badge-dot" aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}
