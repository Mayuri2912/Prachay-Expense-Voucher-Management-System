// Employee: "My Vouchers". The API only ever returns the logged-in employee's own vouchers.

import { Link } from 'react-router-dom';
import { listMyVouchers } from '../../api/voucherApi.js';
import Icon from '../../components/Icon.jsx';
import VoucherListView from '../../components/VoucherListView.jsx';

const newVoucherButton = (
  <Link to="/employee/vouchers/new" className="btn btn-primary">
    <Icon name="plus" size={16} />
    New voucher
  </Link>
);

export default function MyVouchersPage() {
  return (
    <VoucherListView
      title="My Vouchers"
      subtitle="Every voucher you have created, with its current status."
      fetchVouchers={listMyVouchers}
      showEmployee={false}
      headerActions={newVoucherButton}
      emptyTitle="You have not created any vouchers yet"
      emptyMessage="Create your first expense voucher to claim a reimbursement."
      emptyAction={newVoucherButton}
    />
  );
}
