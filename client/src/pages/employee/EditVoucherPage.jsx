// Employee: "Edit Draft Voucher". Only a voucher that is still a DRAFT can be opened here.
//   Save as draft        -> PUT /api/vouchers/:id
//   Submit for approval  -> PUT /api/vouchers/:id, then POST /api/vouchers/:id/submit

import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage, getFieldErrors } from '../../api/axiosClient.js';
import { getVoucher, submitVoucher, updateVoucher } from '../../api/voucherApi.js';
import { Alert, LoadingSpinner } from '../../components/Feedback.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import VoucherForm from '../../components/VoucherForm.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { STATUS, STATUS_LABELS } from '../../utils/constants.js';

export default function EditVoucherPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const fetchVoucher = useCallback(() => getVoucher(id), [id]);
  const { data, loading, error } = useApiData(fetchVoucher, 'Could not load the voucher.');

  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');

  const voucher = data?.voucher;
  const detailsPath = `/employee/vouchers/${id}`;

  function showFailure(requestError) {
    setServerErrors(getFieldErrors(requestError));
    setFormError(getErrorMessage(requestError, 'Could not save the voucher.'));
    setBusy(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSaveDraft(values, signatureFile) {
    setBusy(true);
    setServerErrors({});
    setFormError('');
    try {
      await updateVoucher(id, values, signatureFile);
      toast.success(`Draft ${voucher.voucherNumber} updated.`);
      navigate(detailsPath);
    } catch (requestError) {
      showFailure(requestError);
    }
  }

  async function handleSubmitForApproval(values, signatureFile) {
    setBusy(true);
    setServerErrors({});
    setFormError('');

    // Step 1: save the latest changes.
    try {
      await updateVoucher(id, values, signatureFile);
    } catch (requestError) {
      showFailure(requestError);
      return;
    }

    // Step 2: submit. If this fails the changes are still saved in the draft.
    try {
      await submitVoucher(id);
      navigate(`${detailsPath}/submitted`);
    } catch (requestError) {
      toast.error(`Your changes were saved, but the voucher could not be submitted: ${getErrorMessage(requestError)}`);
      navigate(detailsPath);
    }
  }

  return (
    <>
      <PageHeader
        title={voucher ? `Edit Draft ${voucher.voucherNumber}` : 'Edit Draft Voucher'}
        subtitle="Change the details, then save the draft or submit it for approval."
        backTo={voucher ? detailsPath : '/employee/vouchers'}
        backLabel={voucher ? 'Back to voucher' : 'Back to my vouchers'}
      />

      {loading && <LoadingSpinner label="Loading the voucher..." />}

      {error && (
        <Alert type="error" title="Could not open this voucher">
          {error}
        </Alert>
      )}

      {voucher && voucher.status !== STATUS.DRAFT && (
        <Alert
          type="warning"
          title="This voucher can no longer be edited"
          action={
            <Link to={detailsPath} className="btn btn-secondary btn-small">
              View voucher
            </Link>
          }
        >
          Its status is <strong>{STATUS_LABELS[voucher.status]}</strong>. Only draft vouchers can be edited.
        </Alert>
      )}

      {voucher && voucher.status === STATUS.DRAFT && (
        <>
          {formError && (
            <Alert type="error" title="The voucher was not saved">
              {formError}
            </Alert>
          )}

          <VoucherForm
            key={voucher.id}
            initialValues={{
              voucherDate: voucher.voucherDate,
              expenseDate: voucher.expenseDate,
              department: voucher.department,
              expenseTitle: voucher.expenseTitle,
              expenseCategory: voucher.expenseCategory,
              expenseDescription: voucher.expenseDescription || '',
              amount: voucher.amount,
            }}
            savedSignatureVoucherId={voucher.hasEmployeeSignature ? voucher.id : null}
            employee={user}
            cancelTo={detailsPath}
            busy={busy}
            serverErrors={serverErrors}
            onSaveDraft={handleSaveDraft}
            onSubmitForApproval={handleSubmitForApproval}
          />
        </>
      )}
    </>
  );
}
