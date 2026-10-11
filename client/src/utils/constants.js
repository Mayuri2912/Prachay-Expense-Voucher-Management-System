// Fixed lists used across the frontend.
// The backend keeps its own copy in server/src/utils/constants.js - keep the two in sync.
// (The backend always re-validates, so a mismatch can never store bad data.)

export const APP_NAME = 'Expense Voucher Management System';
export const COMPANY_NAME = 'Prachay Group';

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  DIRECTOR: 'DIRECTOR',
  ACCOUNTS: 'ACCOUNTS',
};

export const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  DIRECTOR: 'Director',
  ACCOUNTS: 'Accounts Team',
};

// Where each role lands after logging in, and the start of all its page addresses.
export const ROLE_HOME = {
  EMPLOYEE: '/employee/dashboard',
  DIRECTOR: '/director/dashboard',
  ACCOUNTS: '/accounts/dashboard',
};

export const ROLE_BASE_PATH = {
  EMPLOYEE: '/employee',
  DIRECTOR: '/director',
  ACCOUNTS: '/accounts',
};

// Workflow: DRAFT -> PENDING_APPROVAL -> APPROVED or REJECTED
export const STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const HISTORY_LABELS = {
  CREATED: 'Voucher created as a draft',
  UPDATED: 'Draft edited',
  SUBMITTED: 'Submitted for approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const DEPARTMENTS = [
  'Administration',
  'Compliance',
  'Finance',
  'Human Resources',
  'Information Technology',
  'Marketing',
  'Operations',
  'Research',
  'Sales',
];

export const EXPENSE_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Meals',
  'Local Conveyance',
  'Client Meeting',
  'Office Supplies',
  'Software',
  'Training',
  'Internet and Phone',
  'Miscellaneous',
];

// Choices in the "Sort by" dropdown. `value` is the sortBy parameter the API accepts.
export const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date created' },
  { value: 'voucherNumber', label: 'Voucher number' },
  { value: 'voucherDate', label: 'Voucher date' },
  { value: 'expenseDate', label: 'Expense date' },
  { value: 'employeeName', label: 'Employee name' },
  { value: 'department', label: 'Department' },
  { value: 'category', label: 'Category' },
  { value: 'amount', label: 'Amount' },
  { value: 'status', label: 'Status' },
];

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
export const DEFAULT_PAGE_SIZE = 10;

// Signature upload rules (the backend enforces the same ones).
export const SIGNATURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const SIGNATURE_MAX_MB = 2;
