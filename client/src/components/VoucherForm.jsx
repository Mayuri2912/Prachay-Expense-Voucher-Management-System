// The voucher form, shared by "New Voucher" and "Edit Draft Voucher".
//
// It has two ways to finish:
//   "Save as draft"        -> onSaveDraft(values, signatureFile)
//   "Submit for approval"  -> onSubmitForApproval(values, signatureFile)   (signature required)
//
// The parent page makes the API calls; this component only collects and validates the input.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DEPARTMENTS, EXPENSE_CATEGORIES } from '../utils/constants.js';
import { todayInputValue } from '../utils/formatters.js';
import { validateVoucherForm } from '../utils/validators.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { Alert } from './Feedback.jsx';
import Icon from './Icon.jsx';
import SignatureImage from './SignatureImage.jsx';
import SignatureUpload from './SignatureUpload.jsx';

export const EMPTY_VOUCHER = {
  voucherDate: todayInputValue(),
  expenseDate: '',
  department: '',
  expenseTitle: '',
  expenseCategory: '',
  expenseDescription: '',
  amount: '',
};

export default function VoucherForm({
  initialValues = EMPTY_VOUCHER,
  savedSignatureVoucherId = null, // set when the draft already has a signature on the server
  employee, // the logged-in user (shown read-only)
  cancelTo,
  busy = false,
  serverErrors = {}, // field errors sent back by the API
  onSaveDraft,
  onSubmitForApproval,
}) {
  const [values, setValues] = useState(initialValues);
  const [signatureFile, setSignatureFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = todayInputValue();
  const hasSignature = Boolean(signatureFile) || Boolean(savedSignatureVoucherId);
  // Errors from the server are shown under the same fields as the browser's own checks.
  const shownErrors = { ...serverErrors, ...errors };

  function setField(event) {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
    // Hide this field's error (from the browser or the server) as soon as the user edits it.
    setErrors({ ...errors, [name]: undefined });
  }

  // Runs the checks; when something is wrong it also moves the cursor to the first problem.
  function isValid({ signatureRequired }) {
    const found = validateVoucherForm(values);
    if (signatureRequired && !hasSignature) {
      found.signature = 'Upload your signature before submitting the voucher.';
    }
    setErrors(found);

    const firstField = Object.keys(found)[0];
    if (firstField) {
      const element = document.querySelector(`[name="${firstField}"], #voucher-${firstField}`);
      if (element) element.focus();
      return false;
    }
    return true;
  }

  function cleanValues() {
    return {
      ...values,
      expenseTitle: values.expenseTitle.trim(),
      expenseDescription: values.expenseDescription.trim(),
      amount: String(values.amount).trim(),
    };
  }

  function handleSaveDraft(event) {
    event.preventDefault();
    if (isValid({ signatureRequired: false })) {
      onSaveDraft(cleanValues(), signatureFile);
    }
  }

  function handleSubmitClick() {
    if (isValid({ signatureRequired: true })) {
      setConfirmOpen(true);
    }
  }

  function handleConfirmSubmit() {
    setConfirmOpen(false);
    onSubmitForApproval(cleanValues(), signatureFile);
  }

  const fieldError = (name) =>
    shownErrors[name] ? (
      <p className="form-error" id={`voucher-${name}-error`} role="alert">
        {shownErrors[name]}
      </p>
    ) : null;

  const invalid = (name) => (shownErrors[name] ? 'true' : undefined);

  return (
    <form className="voucher-form" onSubmit={handleSaveDraft} noValidate>
      {Object.values(shownErrors).some(Boolean) && (
        <Alert type="error" title="Please correct the highlighted fields">
          Some details are missing or not valid.
        </Alert>
      )}

      <section className="card">
        <h2 className="card-title">Employee</h2>
        <dl className="detail-grid detail-grid-3">
          <div>
            <dt>Employee name</dt>
            <dd>{employee.fullName}</dd>
          </div>
          <div>
            <dt>Employee ID</dt>
            <dd>{employee.employeeCode || '-'}</dd>
          </div>
          <div>
            <dt>Voucher number</dt>
            <dd className="muted">Generated automatically when saved</dd>
          </div>
        </dl>
      </section>

      <section className="card">
        <h2 className="card-title">Expense details</h2>
        <p className="card-hint">
          Fields marked <span className="required-mark">*</span> are required.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="voucher-voucherDate" className="form-label">
              Voucher date <span className="required-mark">*</span>
            </label>
            <input
              id="voucher-voucherDate"
              name="voucherDate"
              type="date"
              max={today}
              value={values.voucherDate}
              onChange={setField}
              aria-invalid={invalid('voucherDate')}
              required
            />
            {fieldError('voucherDate')}
          </div>

          <div className="form-field">
            <label htmlFor="voucher-expenseDate" className="form-label">
              Expense date <span className="required-mark">*</span>
            </label>
            <input
              id="voucher-expenseDate"
              name="expenseDate"
              type="date"
              max={values.voucherDate || today}
              value={values.expenseDate}
              onChange={setField}
              aria-invalid={invalid('expenseDate')}
              required
            />
            {fieldError('expenseDate')}
          </div>

          <div className="form-field">
            <label htmlFor="voucher-department" className="form-label">
              Department <span className="required-mark">*</span>
            </label>
            <select
              id="voucher-department"
              name="department"
              value={values.department}
              onChange={setField}
              aria-invalid={invalid('department')}
              required
            >
              <option value="">Select a department</option>
              {DEPARTMENTS.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            {fieldError('department')}
          </div>

          <div className="form-field">
            <label htmlFor="voucher-expenseCategory" className="form-label">
              Expense category <span className="required-mark">*</span>
            </label>
            <select
              id="voucher-expenseCategory"
              name="expenseCategory"
              value={values.expenseCategory}
              onChange={setField}
              aria-invalid={invalid('expenseCategory')}
              required
            >
              <option value="">Select a category</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {fieldError('expenseCategory')}
          </div>

          <div className="form-field form-field-wide">
            <label htmlFor="voucher-expenseTitle" className="form-label">
              Expense title <span className="required-mark">*</span>
            </label>
            <input
              id="voucher-expenseTitle"
              name="expenseTitle"
              type="text"
              maxLength={150}
              placeholder="e.g. Client visit travel to Mumbai"
              value={values.expenseTitle}
              onChange={setField}
              aria-invalid={invalid('expenseTitle')}
              required
            />
            {fieldError('expenseTitle')}
          </div>

          <div className="form-field">
            <label htmlFor="voucher-amount" className="form-label">
              Amount (₹) <span className="required-mark">*</span>
            </label>
            <input
              id="voucher-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={values.amount}
              onChange={setField}
              aria-invalid={invalid('amount')}
              required
            />
            {fieldError('amount')}
          </div>

          <div className="form-field form-field-full">
            <label htmlFor="voucher-expenseDescription" className="form-label">
              Expense description
            </label>
            <textarea
              id="voucher-expenseDescription"
              name="expenseDescription"
              rows={4}
              maxLength={1000}
              placeholder="What was the expense for? Mention bill numbers or people involved if relevant."
              value={values.expenseDescription}
              onChange={setField}
              aria-invalid={invalid('expenseDescription')}
            />
            <p className="form-hint">{values.expenseDescription.length} / 1000 characters</p>
            {fieldError('expenseDescription')}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Employee signature</h2>
        <p className="card-hint">
          You can save a draft without a signature, but a signature is required to submit the voucher for approval.
        </p>
        <SignatureUpload
          id="voucher-signature"
          label="Signature image"
          file={signatureFile}
          onChange={(file) => {
            setSignatureFile(file);
            setErrors({ ...errors, signature: undefined });
          }}
          error={shownErrors.signature}
          existing={
            savedSignatureVoucherId ? (
              <SignatureImage voucherId={savedSignatureVoucherId} type="employee" alt="Your saved signature" />
            ) : null
          }
          hint={
            savedSignatureVoucherId
              ? 'A signature is already saved. Choose a new image only if you want to replace it.'
              : undefined
          }
        />
      </section>

      <div className="form-actions">
        <Link to={cancelTo} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          <Icon name="file-text" size={16} />
          {busy ? 'Saving...' : 'Save as draft'}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSubmitClick} disabled={busy}>
          <Icon name="send" size={16} />
          Submit for approval
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit this voucher for approval?"
        message={
          <>
            <p>The voucher will be sent to the Director for approval.</p>
            <p>
              <strong>After submitting you will not be able to edit or delete it.</strong>
            </p>
          </>
        }
        confirmLabel="Yes, submit"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </form>
  );
}
