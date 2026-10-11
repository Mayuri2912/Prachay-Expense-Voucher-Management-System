// Director: vouchers that have been submitted and are waiting for a decision.
// The status is fixed by the API endpoint (GET /api/vouchers/pending), so there is no status filter here.

import { listPendingVouchers } from '../../api/voucherApi.js';
import VoucherListView from '../../components/VoucherListView.jsx';

export default function PendingApprovalsPage() {
  return (
    <VoucherListView
      title="Pending Approvals"
      subtitle="Open a voucher to approve it with your signature or reject it with a reason."
      fetchVouchers={listPendingVouchers}
      showStatus={false}
      emptyTitle="No vouchers are waiting for approval"
      emptyMessage="Every submitted voucher has already been reviewed."
    />
  );
}
