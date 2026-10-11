// Employee: "New Voucher".
//   Save as draft        -> POST /api/vouchers
//   Submit for approval  -> POST /api/vouchers, then POST /api/vouchers/:id/submit

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage, getFieldErrors } from '../../api/axiosClient.js';
import { createVoucher, submitVoucher } from '../../api/voucherApi.js';
import { Alert } from '../../components/Feedback.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import VoucherForm, { EMPTY_VOUCHER } from '../../components/VoucherForm.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { DEPARTMENTS } from '../../utils/constants.js';
import { todayInputValue } from '../../utils/formatters.js';

export default function CreateVoucherPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');

  // Start with today's date and the employee's own department already filled in.
  const [initialValues] = useState(() => ({
    ...EMPTY_VOUCHER,
    voucherDate: todayInputValue(),
    department: DEPARTMENTS.includes(user.department) ? user.department : '',
  }));

  function showFailure(error) {
    setServerErrors(getFieldErrors(error));
    setFormError(getErrorMessage(error, 'Could not save the voucher.'));
    setBusy(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveDraft(values, signatureFile) {
    setBusy(true);
    setServerErrors({});
    setFormError('');
    try {
      const voucher = await createVoucher(values, signatureFile);
      toast.success(`Voucher ${voucher.voucherNumber} saved as a draft.`);
      navigate(`/employee/vouchers/${voucher.id}`);
    } catch (error) {
      showFailure(error);
    }
  }

  async function handleSubmitForApproval(values, signatureFile) {
    setBusy(true);
    setServerErrors({});
    setFormError('');

    // Step 1: save the voucher (it always starts as a draft).
    let voucher;
    try {
      voucher = await createVoucher(values, signatureFile);
    } catch (error) {
      showFailure(error);
      return;
    }

    // Step 2: submit it. If this fails the draft is still safely saved.
    try {
      await submitVoucher(voucher.id);
      navigate(`/employee/vouchers/${voucher.id}/submitted`);
    } catch (error) {
      toast.error(`Voucher ${voucher.voucherNumber} was saved as a draft but could not be submitted: ${getErrorMessage(error)}`);
      navigate(`/employee/vouchers/${voucher.id}`);
    }
  }

  return (
    <>
      <PageHeader
        title="New Voucher"
        subtitle="Fill in the expense details. Save a draft to finish later, or submit it for approval."
        backTo="/employee/vouchers"
        backLabel="Back to my vouchers"
      />

      {formError && (
        <Alert type="error" title="The voucher was not saved">
          {formError}
        </Alert>
      )}

      <VoucherForm
        initialValues={initialValues}
        employee={user}
        cancelTo="/employee/vouchers"
        busy={busy}
        serverErrors={serverErrors}
        onSaveDraft={handleSaveDraft}
        onSubmitForApproval={handleSubmitForApproval}
      />
    </>
  );
}
