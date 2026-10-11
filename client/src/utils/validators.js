// Form validation in the browser. It gives instant feedback, but it is only a
// convenience: the backend repeats every one of these checks (and is the one that counts).

import { DEPARTMENTS, EXPENSE_CATEGORIES, SIGNATURE_MAX_MB, SIGNATURE_TYPES } from './constants.js';
import { todayInputValue } from './formatters.js';

// Returns { fieldName: 'message' } - an empty object means the form is valid.
// The checks are in the same order as the fields on the screen, so the first
// error found is also the first one the user sees.
export function validateVoucherForm(values) {
  const errors = {};
  const today = todayInputValue();

  if (!values.voucherDate) {
    errors.voucherDate = 'Voucher date is required.';
  } else if (values.voucherDate > today) {
    errors.voucherDate = 'Voucher date cannot be in the future.';
  }

  if (!values.expenseDate) {
    errors.expenseDate = 'Expense date is required.';
  } else if (values.expenseDate > today) {
    errors.expenseDate = 'Expense date cannot be in the future.';
  } else if (values.voucherDate && values.expenseDate > values.voucherDate) {
    errors.expenseDate = 'Expense date cannot be after the voucher date.';
  }

  if (!values.department) {
    errors.department = 'Department is required.';
  } else if (!DEPARTMENTS.includes(values.department)) {
    errors.department = 'Select a department from the list.';
  }

  if (!values.expenseCategory) {
    errors.expenseCategory = 'Expense category is required.';
  } else if (!EXPENSE_CATEGORIES.includes(values.expenseCategory)) {
    errors.expenseCategory = 'Select an expense category from the list.';
  }

  const title = values.expenseTitle.trim();
  if (!title) {
    errors.expenseTitle = 'Expense title is required.';
  } else if (title.length < 3) {
    errors.expenseTitle = 'Expense title must be at least 3 characters long.';
  } else if (title.length > 150) {
    errors.expenseTitle = 'Expense title must be 150 characters or fewer.';
  }

  const amount = String(values.amount).trim();
  if (!amount) {
    errors.amount = 'Amount is required.';
  } else if (Number.isNaN(Number(amount))) {
    errors.amount = 'Amount must be a number.';
  } else if (Number(amount) <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount)) {
    errors.amount = 'Amount can have at most 2 decimal places.';
  }

  if (values.expenseDescription.trim().length > 1000) {
    errors.expenseDescription = 'Description must be 1000 characters or fewer.';
  }

  return errors;
}

// Returns an error message for a chosen signature file, or '' when it is acceptable.
export function validateSignatureFile(file) {
  if (!file) return '';
  if (!SIGNATURE_TYPES.includes(file.type)) {
    return 'The signature must be a JPEG, PNG or WebP image.';
  }
  if (file.size > SIGNATURE_MAX_MB * 1024 * 1024) {
    return `The signature image must be ${SIGNATURE_MAX_MB} MB or smaller.`;
  }
  return '';
}

export function validateLoginForm({ email, password }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  }

  return errors;
}
