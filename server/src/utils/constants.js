// Fixed lists used across the backend.
// The frontend keeps a copy in client/src/utils/constants.js - keep the two in sync.

export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  DIRECTOR: 'DIRECTOR',
  ACCOUNTS: 'ACCOUNTS',
};

// Workflow: DRAFT -> PENDING_APPROVAL -> APPROVED or REJECTED
export const VOUCHER_STATUS = {
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

export const HISTORY_ACTIONS = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
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

// Signature uploads: only these image types are accepted.
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// "sortBy" values accepted by the list endpoints, mapped to real SQL columns.
// Sorting only ever uses a column from this list, never text typed by the user.
export const SORTABLE_COLUMNS = {
  voucherNumber: 'v.voucher_number',
  voucherDate: 'v.voucher_date',
  expenseDate: 'v.expense_date',
  employeeName: 'e.full_name',
  department: 'v.department',
  category: 'v.expense_category',
  title: 'v.expense_title',
  amount: 'v.amount',
  status: 'v.status',
  createdAt: 'v.created_at',
  updatedAt: 'v.updated_at',
};

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};
