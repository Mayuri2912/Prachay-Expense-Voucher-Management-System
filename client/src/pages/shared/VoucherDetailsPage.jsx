// Voucher details - one page for all three roles.
// The buttons depend on the role AND the voucher's status:
//
//   Employee + Draft             -> Edit, Delete, Submit for approval
//   Director + Pending Approval  -> Approve (with signature), Reject (with reason)
//   Accounts                     -> view and print only
//
// The buttons are only a convenience. If someone calls the API directly,
// the backend applies exactly the same rules and refuses.

import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../api/axiosClient.js';
import { approveVoucher, deleteVoucher, getVoucher, rejectVoucher, submitVoucher } from '../../api/voucherApi.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { Alert, LoadingSpinner } from '../../components/Feedback.jsx';
import Icon from '../../components/Icon.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { ApproveDialog, RejectDialog, SubmitDialog } from '../../components/VoucherActionDialogs.jsx';
import VoucherDocument from '../../components/VoucherDocument.jsx';
import VoucherTimeline from '../../components/VoucherTimeline.jsx';
import WorkflowProgress from '../../components/WorkflowProgress.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { ROLE_BASE_PATH, ROLES, STATUS } from '../../utils/constants.js';
import { formatDateTime } from '../../utils/formatters.js';

// The coloured message under the title that explains where the voucher stands.
function StatusNotice({ voucher, role }) {
  const reviewer = voucher.reviewedBy?.name || 'the Director';

  if (voucher.status === STATUS.REJECTED) {
    return (
      <Alert type="error" title={`Rejected by ${reviewer} on ${formatDateTime(voucher.rejectedAt)}`}>
        <p className="rejection-reason">
          <strong>Reason:</strong> {voucher.rejectionReason}
        </p>
        {role === ROLES.EMPLOYEE && (
          <p>A rejected voucher cannot be edited. To claim this expense again, create a new voucher.</p>
        )}
      </Alert>
    );
  }

  if (voucher.status === STATUS.APPROVED) {
    return (
      <Alert type="success" title={`Approved by ${reviewer} on ${formatDateTime(voucher.approvedAt)}`}>
        {role === ROLES.ACCOUNTS
          ? 'This voucher is ready for reimbursement processing.'
          : 'This voucher has been passed to the Accounts Team for reimbursement. It can no longer be changed.'}
      </Alert>
    );
  }

  if (voucher.status === STATUS.PENDING_APPROVAL) {
    if (role === ROLES.DIRECTOR) {
      return (
        <Alert type="warning" title="Waiting for your decision">
          Review the details and signature below, then approve or reject this voucher. The expense details entered by
          the employee cannot be changed.
        </Alert>
      );
    }
    if (role === ROLES.ACCOUNTS) {
      return (
        <Alert type="warning" title="Awaiting the Director's approval">
          This voucher has not been approved yet, so it is not ready for reimbursement.
        </Alert>
      );
    }
    return (
      <Alert type="info" title="Submitted - waiting for the Director's approval">
        This voucher is now read-only. You will see the decision here as soon as it is made.
      </Alert>
    );
  }

  // Draft
  if (role === ROLES.EMPLOYEE) {
    return (
      <Alert type="info" title="This voucher is a draft">
        {voucher.hasEmployeeSignature
          ? 'You can still edit or delete it. Submit it for approval when it is ready.'
          : 'You can still edit or delete it. Your signature is required when you submit it for approval.'}
      </Alert>
    );
  }
  return (
    <Alert type="info" title="This voucher is still a draft">
      The employee has not submitted it for approval yet.
    </Alert>
  );
}

export default function VoucherDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const fetchVoucher = useCallback(() => getVoucher(id), [id]);
  const { data, loading, error, errorStatus, reload } = useApiData(fetchVoucher, 'Could not load the voucher.');

  const [openDialog, setOpenDialog] = useState(null); // 'submit' | 'delete' | 'approve' | 'reject' | null
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const basePath = ROLE_BASE_PATH[user.role];
  const listPath = `${basePath}/vouchers`;
  const voucher = data?.voucher;

  function showDialog(name) {
    setActionError('');
    setOpenDialog(name);
  }

  function closeDialog() {
    if (!busy) setOpenDialog(null);
  }

  // Runs one workflow action and handles success and failure in the same way for all of them.
  async function runAction(action, onSuccess) {
    setBusy(true);
    setActionError('');
    try {
      await action();
      setOpenDialog(null);
      onSuccess();
    } catch (requestError) {
      if (requestError.response?.status === 409) {
        // 409 = the voucher changed in the meantime (for example it was already approved).
        // Close the pop-up, explain, and show the latest state.
        setOpenDialog(null);
        toast.error(getErrorMessage(requestError));
        reload();
      } else {
        setActionError(getErrorMessage(requestError));
      }
    } finally {
      setBusy(false);
    }
  }

  const handleSubmit = (signatureFile) =>
    runAction(
      () => submitVoucher(voucher.id, signatureFile),
      () => navigate(`${listPath}/${voucher.id}/submitted`)
    );

  const handleDelete = () =>
    runAction(
      () => deleteVoucher(voucher.id),
      () => {
        toast.success(`Draft ${voucher.voucherNumber} deleted.`);
        navigate(listPath);
      }
    );

  const handleApprove = (signatureFile) =>
    runAction(
      () => approveVoucher(voucher.id, signatureFile),
      () => {
        toast.success(`Voucher ${voucher.voucherNumber} approved.`);
        reload();
      }
    );

  const handleReject = (reason) =>
    runAction(
      () => rejectVoucher(voucher.id, reason),
      () => {
        toast.success(`Voucher ${voucher.voucherNumber} rejected.`);
        reload();
      }
    );

  // ----- Loading and error states -----
  if (loading && !data) {
    return <LoadingSpinner label="Loading the voucher..." />;
  }

  if (error && !data) {
    const title =
      errorStatus === 403
        ? 'You do not have access to this voucher'
        : errorStatus === 404 || errorStatus === 400
          ? 'Voucher not found'
          : 'Could not load the voucher';
    return (
      <>
        <PageHeader title="Voucher Details" backTo={listPath} backLabel="Back to vouchers" />
        <Alert
          type="error"
          title={title}
          action={
            errorStatus ? null : (
              <button type="button" className="btn btn-secondary btn-small" onClick={reload}>
                Try again
              </button>
            )
          }
        >
          {error}
        </Alert>
      </>
    );
  }

  const isOwnDraft = user.role === ROLES.EMPLOYEE && voucher.status === STATUS.DRAFT;
  const canDecide = user.role === ROLES.DIRECTOR && voucher.status === STATUS.PENDING_APPROVAL;

  return (
    <>
      <PageHeader
        title={`Voucher ${voucher.voucherNumber}`}
        subtitle={voucher.expenseTitle}
        backTo={listPath}
        backLabel="Back to vouchers"
      >
        {isOwnDraft && (
          <>
            <Link to={`${listPath}/${voucher.id}/edit`} className="btn btn-secondary">
              <Icon name="edit" size={16} />
              Edit
            </Link>
            <button type="button" className="btn btn-danger-outline" onClick={() => showDialog('delete')}>
              <Icon name="trash" size={16} />
              Delete
            </button>
            <button type="button" className="btn btn-primary" onClick={() => showDialog('submit')}>
              <Icon name="send" size={16} />
              Submit for approval
            </button>
          </>
        )}

        {canDecide && (
          <>
            <button type="button" className="btn btn-danger-outline" onClick={() => showDialog('reject')}>
              <Icon name="x-circle" size={16} />
              Reject
            </button>
            <button type="button" className="btn btn-success" onClick={() => showDialog('approve')}>
              <Icon name="check-circle" size={16} />
              Approve
            </button>
          </>
        )}

        <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
          <Icon name="printer" size={16} />
          Print / Save as PDF
        </button>
      </PageHeader>

      <div className="no-print">
        <StatusNotice voucher={voucher} role={user.role} />
      </div>

      <WorkflowProgress voucher={voucher} />
      <VoucherDocument voucher={voucher} />
      <VoucherTimeline history={data.history} />

      {/* ----- Pop-ups ----- */}
      {isOwnDraft && (
        <>
          <SubmitDialog
            open={openDialog === 'submit'}
            voucher={voucher}
            busy={busy}
            error={actionError}
            onConfirm={handleSubmit}
            onCancel={closeDialog}
          />
          <ConfirmDialog
            open={openDialog === 'delete'}
            title="Delete this draft?"
            message={
              <>
                <p>
                  Draft <strong>{voucher.voucherNumber}</strong> ({voucher.expenseTitle}) will be permanently deleted.
                  This cannot be undone.
                </p>
                {actionError && <Alert type="error">{actionError}</Alert>}
              </>
            }
            confirmLabel="Delete draft"
            danger
            busy={busy}
            onConfirm={handleDelete}
            onCancel={closeDialog}
          />
        </>
      )}

      {canDecide && (
        <>
          <ApproveDialog
            open={openDialog === 'approve'}
            voucher={voucher}
            busy={busy}
            error={actionError}
            onConfirm={handleApprove}
            onCancel={closeDialog}
          />
          <RejectDialog
            open={openDialog === 'reject'}
            voucher={voucher}
            busy={busy}
            error={actionError}
            onConfirm={handleReject}
            onCancel={closeDialog}
          />
        </>
      )}
    </>
  );
}
