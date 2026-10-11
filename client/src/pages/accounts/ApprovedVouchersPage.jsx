// Accounts: approved vouchers only - the ones that are ready for reimbursement processing.
// The status is fixed by the API endpoint (GET /api/vouchers/approved).

import { listApprovedVouchers } from '../../api/voucherApi.js';
import { Alert } from '../../components/Feedback.jsx';
import VoucherListView from '../../components/VoucherListView.jsx';

export default function ApprovedVouchersPage() {
  return (
    <VoucherListView
      title="Ready for Reimbursement"
      subtitle="Vouchers approved by the Director."
      fetchVouchers={listApprovedVouchers}
      showStatus={false}
      notice={
        <Alert type="success" title="Approved vouchers only">
          Every voucher in this list has been approved and signed by the Director, so it can be processed for
          reimbursement. Vouchers still awaiting approval are listed under “All Vouchers”.
        </Alert>
      }
      emptyTitle="No approved vouchers yet"
      emptyMessage="Vouchers appear here as soon as the Director approves them."
    />
  );
}
