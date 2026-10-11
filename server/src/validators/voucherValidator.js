// Server-side validation for voucher requests.
//
// Each function receives raw input, checks it, and either
//   * returns a clean object that is safe to hand to the service layer, or
//   * throws AppError(400, 'Validation failed', { field: 'message', ... }).
//
// The frontend validates too, but only for convenience - these checks are the ones that count.

import { AppError } from '../utils/AppError.js';
import {
  DEPARTMENTS,
  EXPENSE_CATEGORIES,
  PAGINATION,
  SORTABLE_COLUMNS,
  VOUCHER_STATUS,
} from '../utils/constants.js';
import { isValidDateString, todayInOfficeTimezone } from '../utils/dates.js';

// Up to 10 digits, optionally followed by 1 or 2 decimals: fits DECIMAL(12,2).
const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;

// Turns an incoming value into a trimmed string.
// Returns '' when the value is missing and null when it is an array/object (never valid here).
function clean(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function throwIfErrors(errors) {
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Validation failed', errors);
  }
}

// ---------------------------------------------------------------------------
// Create / edit a voucher
// ---------------------------------------------------------------------------
export function validateVoucherBody(body) {
  const input = body || {};
  const errors = {};
  const today = todayInOfficeTimezone();

  const department = clean(input.department);
  if (!department) {
    errors.department = 'Department is required.';
  } else if (!DEPARTMENTS.includes(department)) {
    errors.department = 'Select a department from the list.';
  }

  const expenseTitle = clean(input.expenseTitle);
  if (!expenseTitle) {
    errors.expenseTitle = 'Expense title is required.';
  } else if (expenseTitle.length < 3) {
    errors.expenseTitle = 'Expense title must be at least 3 characters long.';
  } else if (expenseTitle.length > 150) {
    errors.expenseTitle = 'Expense title must be 150 characters or fewer.';
  }

  const expenseCategory = clean(input.expenseCategory);
  if (!expenseCategory) {
    errors.expenseCategory = 'Expense category is required.';
  } else if (!EXPENSE_CATEGORIES.includes(expenseCategory)) {
    errors.expenseCategory = 'Select an expense category from the list.';
  }

  const expenseDescription = clean(input.expenseDescription);
  if (expenseDescription === null) {
    errors.expenseDescription = 'Description must be text.';
  } else if (expenseDescription.length > 1000) {
    errors.expenseDescription = 'Description must be 1000 characters or fewer.';
  }

  const expenseDate = clean(input.expenseDate);
  if (!expenseDate) {
    errors.expenseDate = 'Expense date is required.';
  } else if (!isValidDateString(expenseDate)) {
    errors.expenseDate = 'Expense date must be a valid date (YYYY-MM-DD).';
  } else if (expenseDate > today) {
    errors.expenseDate = 'Expense date cannot be in the future.';
  }

  // The voucher date is optional in the request; it defaults to today.
  const voucherDate = clean(input.voucherDate) || today;
  if (!isValidDateString(voucherDate)) {
    errors.voucherDate = 'Voucher date must be a valid date (YYYY-MM-DD).';
  } else if (voucherDate > today) {
    errors.voucherDate = 'Voucher date cannot be in the future.';
  } else if (!errors.expenseDate && expenseDate > voucherDate) {
    errors.expenseDate = 'Expense date cannot be after the voucher date.';
  }

  const amount = clean(input.amount);
  if (!amount) {
    errors.amount = 'Amount is required.';
  } else if (!/^-?\d+(\.\d+)?$/.test(amount)) {
    errors.amount = 'Amount must be a number.';
  } else if (Number(amount) <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (!MONEY_PATTERN.test(amount)) {
    errors.amount = 'Amount can have at most 2 decimal places and 10 digits before the decimal point.';
  }

  throwIfErrors(errors);

  // Note what is NOT returned: status, voucher number, employee id, signature paths.
  // Those are always decided by the server, whatever the request contains.
  return {
    department,
    expenseTitle,
    expenseCategory,
    expenseDescription: expenseDescription || null,
    expenseDate,
    voucherDate,
    amount, // kept as text so MySQL stores the exact DECIMAL value
  };
}

// ---------------------------------------------------------------------------
// Reject a voucher
// ---------------------------------------------------------------------------
export function validateRejectBody(body) {
  const reason = clean((body || {}).reason);
  const errors = {};

  if (!reason) {
    errors.reason = 'A rejection reason is required.';
  } else if (reason.length < 3) {
    errors.reason = 'The rejection reason must be at least 3 characters long.';
  } else if (reason.length > 500) {
    errors.reason = 'The rejection reason must be 500 characters or fewer.';
  }

  throwIfErrors(errors);
  return { reason };
}

// ---------------------------------------------------------------------------
// Search, filter, sort and pagination query parameters
//   ?voucherNumber=&employeeName=&department=&category=&status=
//   &dateFrom=&dateTo=&minAmount=&maxAmount=&sortBy=&sortOrder=&page=&limit=
// ---------------------------------------------------------------------------
export function validateListQuery(query) {
  const input = query || {};
  const errors = {};

  const voucherNumber = clean(input.voucherNumber);
  if (voucherNumber === null || voucherNumber.length > 30) {
    errors.voucherNumber = 'Voucher number must be text of 30 characters or fewer.';
  }

  const employeeName = clean(input.employeeName);
  if (employeeName === null || employeeName.length > 100) {
    errors.employeeName = 'Employee name must be text of 100 characters or fewer.';
  }

  const department = clean(input.department);
  if (department === null || (department && !DEPARTMENTS.includes(department))) {
    errors.department = 'Unknown department.';
  }

  const category = clean(input.category);
  if (category === null || (category && !EXPENSE_CATEGORIES.includes(category))) {
    errors.category = 'Unknown expense category.';
  }

  const status = clean(input.status);
  if (status === null || (status && !Object.values(VOUCHER_STATUS).includes(status))) {
    errors.status = `Status must be one of: ${Object.values(VOUCHER_STATUS).join(', ')}.`;
  }

  const dateFrom = clean(input.dateFrom);
  if (dateFrom === null || (dateFrom && !isValidDateString(dateFrom))) {
    errors.dateFrom = 'From date must be a valid date (YYYY-MM-DD).';
  }
  const dateTo = clean(input.dateTo);
  if (dateTo === null || (dateTo && !isValidDateString(dateTo))) {
    errors.dateTo = 'To date must be a valid date (YYYY-MM-DD).';
  }
  if (dateFrom && dateTo && !errors.dateFrom && !errors.dateTo && dateFrom > dateTo) {
    errors.dateTo = 'To date cannot be earlier than the from date.';
  }

  const minAmount = clean(input.minAmount);
  if (minAmount === null || (minAmount && !MONEY_PATTERN.test(minAmount))) {
    errors.minAmount = 'Minimum amount must be a positive number with at most 2 decimals.';
  }
  const maxAmount = clean(input.maxAmount);
  if (maxAmount === null || (maxAmount && !MONEY_PATTERN.test(maxAmount))) {
    errors.maxAmount = 'Maximum amount must be a positive number with at most 2 decimals.';
  }
  if (minAmount && maxAmount && !errors.minAmount && !errors.maxAmount && Number(minAmount) > Number(maxAmount)) {
    errors.maxAmount = 'Maximum amount cannot be less than the minimum amount.';
  }

  const sortBy = clean(input.sortBy) || 'createdAt';
  if (!Object.hasOwn(SORTABLE_COLUMNS, sortBy)) {
    errors.sortBy = `sortBy must be one of: ${Object.keys(SORTABLE_COLUMNS).join(', ')}.`;
  }

  const sortOrder = (clean(input.sortOrder) || 'desc').toLowerCase();
  if (sortOrder !== 'asc' && sortOrder !== 'desc') {
    errors.sortOrder = 'sortOrder must be "asc" or "desc".';
  }

  const pageText = clean(input.page) || '1';
  if (!/^[1-9]\d{0,5}$/.test(pageText)) {
    errors.page = 'page must be a whole number starting from 1.';
  }

  const limitText = clean(input.limit) || String(PAGINATION.DEFAULT_LIMIT);
  if (!/^[1-9]\d{0,2}$/.test(limitText) || Number(limitText) > PAGINATION.MAX_LIMIT) {
    errors.limit = `limit must be a whole number between 1 and ${PAGINATION.MAX_LIMIT}.`;
  }

  throwIfErrors(errors);

  return {
    voucherNumber,
    employeeName,
    department,
    category,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder,
    page: Number(pageText),
    limit: Number(limitText),
  };
}
