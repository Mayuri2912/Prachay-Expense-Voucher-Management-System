// Director and Accounts: every voucher in the organisation, with search, filters, sorting and paging.

import { listAllVouchers } from '../../api/voucherApi.js';
import VoucherListView from '../../components/VoucherListView.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLES } from '../../utils/constants.js';

export default function AllVouchersPage() {
  const { user } = useAuth();

  const subtitle =
    user.role === ROLES.DIRECTOR
      ? 'Every voucher in the organisation. Only vouchers that are Pending Approval can be approved or rejected.'
      : 'Every voucher in the organisation (view only). Only Approved vouchers are ready for reimbursement.';

  return (
    <VoucherListView
      title="All Vouchers"
      subtitle={subtitle}
      fetchVouchers={listAllVouchers}
      emptyTitle="There are no vouchers yet"
      emptyMessage="Vouchers appear here as soon as employees create them."
    />
  );
}
