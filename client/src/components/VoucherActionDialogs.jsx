// The three pop-ups that move a voucher through the workflow:
//   <SubmitDialog />   Employee:  Draft -> Pending Approval   (employee signature required)
//   <ApproveDialog />  Director:  Pending Approval -> Approved (director signature required)
//   <RejectDialog />   Director:  Pending Approval -> Rejected (reason required)
//
// Each one checks its own input, then calls onConfirm. The page makes the API call.

import { useEffect, useState } from 'react';
import { formatCurrency } from '../utils/formatters.js';
import { Alert } from './Feedback.jsx';
import Modal from './Modal.jsx';
import SignatureImage from './SignatureImage.jsx';
import SignatureUpload from './SignatureUpload.jsx';

function VoucherSummary({ voucher }) {
  return (
    <dl className="dialog-summary">
      <div>
        <dt>Voucher</dt>
        <dd>{voucher.voucherNumber}</dd>
      </div>
      <div>
        <dt>Employee</dt>
        <dd>{voucher.employee.name}</dd>
      </div>
      <div>
        <dt>Amount</dt>
        <dd>{formatCurrency(voucher.amount)}</dd>
      </div>
    </dl>
  );
}

// ---------------------------------------------------------------------------
export function SubmitDialog({ open, voucher, busy, error, onConfirm, onCancel }) {
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureError, setSignatureError] = useState('');

  // Start clean every time the pop-up opens.
  useEffect(() => {
    if (open) {
      setSignatureFile(null);
      setSignatureError('');
    }
  }, [open]);

  function handleConfirm() {
    if (!voucher.hasEmployeeSignature && !signatureFile) {
      setSignatureError('Upload your signature before submitting the voucher.');
      return;
    }
    onConfirm(signatureFile);
  }

  return (
    <Modal
      open={open}
      title="Submit voucher for approval"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Submitting...' : 'Submit for approval'}
          </button>
        </>
      }
    >
      <VoucherSummary voucher={voucher} />
      <p>
        The voucher will be sent to the Director. <strong>After submitting you cannot edit or delete it.</strong>
      </p>

      <SignatureUpload
        id="submit-signature"
        label="Your signature"
        required={!voucher.hasEmployeeSignature}
        file={signatureFile}
        onChange={(file) => {
          setSignatureFile(file);
          setSignatureError('');
        }}
        error={signatureError}
        existing={
          voucher.hasEmployeeSignature ? (
            <SignatureImage voucherId={voucher.id} type="employee" alt="Your saved signature" />
          ) : null
        }
        hint={
          voucher.hasEmployeeSignature
            ? 'Your saved signature will be used. Choose a new image only to replace it.'
            : undefined
        }
      />

      {error && <Alert type="error">{error}</Alert>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
export function ApproveDialog({ open, voucher, busy, error, onConfirm, onCancel }) {
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureError, setSignatureError] = useState('');

  useEffect(() => {
    if (open) {
      setSignatureFile(null);
      setSignatureError('');
    }
  }, [open]);

  function handleConfirm() {
    if (!signatureFile) {
      setSignatureError('Upload your signature to approve the voucher.');
      return;
    }
    onConfirm(signatureFile);
  }

  return (
    <Modal
      open={open}
      title="Approve voucher"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-success" onClick={handleConfirm} disabled={busy}>
            {busy ? 'Approving...' : 'Approve voucher'}
          </button>
        </>
      }
    >
      <VoucherSummary voucher={voucher} />
      <p>
        Approving sends this voucher to the Accounts Team for reimbursement. This decision cannot be changed
        afterwards.
      </p>

      <SignatureUpload
        id="director-signature"
        label="Director signature"
        required
        file={signatureFile}
        onChange={(file) => {
          setSignatureFile(file);
          setSignatureError('');
        }}
        error={signatureError}
      />

      {error && <Alert type="error">{error}</Alert>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
const REASON_MIN = 3;
const REASON_MAX = 500;

export function RejectDialog({ open, voucher, busy, error, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setReasonError('');
    }
  }, [open]);

  function handleSubmit(event) {
    event.preventDefault();
    const text = reason.trim();

    if (!text) {
      setReasonError('A rejection reason is required.');
      return;
    }
    if (text.length < REASON_MIN) {
      setReasonError(`The rejection reason must be at least ${REASON_MIN} characters long.`);
      return;
    }
    onConfirm(text);
  }

  return (
    <Modal
      open={open}
      title="Reject voucher"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="reject-form" className="btn btn-danger" disabled={busy}>
            {busy ? 'Rejecting...' : 'Reject voucher'}
          </button>
        </>
      }
    >
      <VoucherSummary voucher={voucher} />

      <form id="reject-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="rejection-reason" className="form-label">
            Reason for rejection <span className="required-mark">*</span>
          </label>
          <textarea
            id="rejection-reason"
            rows={4}
            maxLength={REASON_MAX}
            placeholder="Explain why the voucher is rejected. The employee will see this message."
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError('');
            }}
            aria-invalid={reasonError ? 'true' : undefined}
            aria-describedby="rejection-reason-hint"
            required
          />
          <p id="rejection-reason-hint" className="form-hint">
            {reason.length} / {REASON_MAX} characters. This decision cannot be changed afterwards.
          </p>
          {reasonError && (
            <p className="form-error" role="alert">
              {reasonError}
            </p>
          )}
        </div>
      </form>

      {error && <Alert type="error">{error}</Alert>}
    </Modal>
  );
}
