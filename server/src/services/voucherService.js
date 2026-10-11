// All voucher database queries and business rules live in this file.
//
// Workflow:  DRAFT -> PENDING_APPROVAL -> APPROVED
//                                      -> REJECTED
//
// Every status change is written as "UPDATE ... WHERE id = ? AND status = <expected status>".
// If two requests arrive at the same moment, only the first one changes a row; the second
// one sees "0 rows changed" and receives a 409 error. That is what prevents a voucher
// from being approved (or rejected) twice.

import { pool, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { HISTORY_ACTIONS, ROLES, SORTABLE_COLUMNS, STATUS_LABELS, VOUCHER_STATUS } from '../utils/constants.js';
import { todayInOfficeTimezone } from '../utils/dates.js';
import { deleteSignature, saveSignature } from './signatureService.js';

// One SELECT used everywhere, so a voucher always has the same fields.
// The employee name is read from the users table (it is not copied into vouchers).
export const VOUCHER_SELECT = `
  SELECT v.id, v.voucher_number, v.voucher_date, v.expense_date, v.department,
         v.expense_title, v.expense_category, v.expense_description, v.amount, v.status,
         v.employee_signature_path, v.director_signature_path,
         v.submitted_at, v.approved_at, v.rejected_at, v.rejection_reason,
         v.created_at, v.updated_at,
         v.employee_id, e.full_name AS employee_name, e.employee_code, e.email AS employee_email,
         v.reviewed_by, r.full_name AS reviewer_name
    FROM vouchers v
    JOIN users e ON e.id = v.employee_id
    LEFT JOIN users r ON r.id = v.reviewed_by`;

// Converts a database row (snake_case) into the JSON sent to the browser (camelCase).
// File paths are deliberately NOT included - the browser only learns whether a
// signature exists and must fetch the image through the protected signature endpoint.
export function toVoucherResponse(row) {
  return {
    id: row.id,
    voucherNumber: row.voucher_number,
    voucherDate: row.voucher_date,
    expenseDate: row.expense_date,
    department: row.department,
    expenseTitle: row.expense_title,
    expenseCategory: row.expense_category,
    expenseDescription: row.expense_description,
    amount: row.amount, // DECIMAL arrives as a string such as "4850.00" - exact, no rounding
    status: row.status,
    employee: {
      id: row.employee_id,
      name: row.employee_name,
      employeeCode: row.employee_code,
      email: row.employee_email,
    },
    hasEmployeeSignature: Boolean(row.employee_signature_path),
    hasDirectorSignature: Boolean(row.director_signature_path),
    submittedAt: row.submitted_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    reviewedBy: row.reviewed_by ? { id: row.reviewed_by, name: row.reviewer_name } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Reading vouchers
// ---------------------------------------------------------------------------

async function findVoucherRow(voucherId) {
  const [rows] = await pool.execute(`${VOUCHER_SELECT} WHERE v.id = ?`, [voucherId]);
  return rows[0] || null;
}

// Loads a voucher and checks that this user is allowed to see it.
// Employees may only see their own vouchers; the Director and Accounts may see all.
export async function getVoucherRowForUser(voucherId, user) {
  const row = await findVoucherRow(voucherId);
  if (!row) {
    throw new AppError(404, 'Voucher not found.');
  }
  if (user.role === ROLES.EMPLOYEE && row.employee_id !== user.id) {
    throw new AppError(403, 'You can only access vouchers that you created.');
  }
  return row;
}

async function getHistory(voucherId) {
  const [rows] = await pool.execute(
    `SELECT h.id, h.action, h.from_status, h.to_status, h.remarks, h.created_at,
            u.id AS user_id, u.full_name AS user_name, u.role AS user_role
       FROM voucher_history h
       JOIN users u ON u.id = h.performed_by
      WHERE h.voucher_id = ?
      ORDER BY h.created_at ASC, h.id ASC`,
    [voucherId]
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    remarks: row.remarks,
    createdAt: row.created_at,
    performedBy: { id: row.user_id, name: row.user_name, role: row.user_role },
  }));
}

// Voucher + its audit trail, for the details page.
export async function getVoucherDetails(voucherId, user) {
  const row = await getVoucherRowForUser(voucherId, user);
  const history = await getHistory(voucherId);
  return { voucher: toVoucherResponse(row), history };
}

// "50%_off" must be searched literally, so the LIKE wildcards are escaped.
function likeContains(text) {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

// Builds the WHERE part of a list query. Only fixed SQL text is concatenated;
// every value typed by the user goes into `params` and is sent separately (?).
function buildWhereClause(filters, scope) {
  const conditions = [];
  const params = [];

  // scope = restrictions the user cannot override (set by the controller).
  if (scope.employeeId) {
    conditions.push('v.employee_id = ?');
    params.push(scope.employeeId);
  }
  const status = scope.status || filters.status;
  if (status) {
    conditions.push('v.status = ?');
    params.push(status);
  }

  if (filters.voucherNumber) {
    conditions.push('v.voucher_number LIKE ?');
    params.push(likeContains(filters.voucherNumber));
  }
  if (filters.employeeName && !scope.employeeId) {
    conditions.push('e.full_name LIKE ?');
    params.push(likeContains(filters.employeeName));
  }
  if (filters.department) {
    conditions.push('v.department = ?');
    params.push(filters.department);
  }
  if (filters.category) {
    conditions.push('v.expense_category = ?');
    params.push(filters.category);
  }
  if (filters.dateFrom) {
    conditions.push('v.expense_date >= ?');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('v.expense_date <= ?');
    params.push(filters.dateTo);
  }
  if (filters.minAmount) {
    conditions.push('v.amount >= ?');
    params.push(filters.minAmount);
  }
  if (filters.maxAmount) {
    conditions.push('v.amount <= ?');
    params.push(filters.maxAmount);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

// Search + filter + sort + pagination, all done by MySQL.
//   filters : validated query parameters (see validators/voucherValidator.js)
//   scope   : { employeeId } for "my vouchers", { status } for the pending / approved lists
export async function listVouchers(filters, scope = {}) {
  const { whereSql, params } = buildWhereClause(filters, scope);

  // 1. How many vouchers match, and what they add up to.
  const [summaryRows] = await pool.execute(
    `SELECT COUNT(*) AS total, COALESCE(SUM(v.amount), 0) AS total_amount
       FROM vouchers v
       JOIN users e ON e.id = v.employee_id
       ${whereSql}`,
    params
  );
  const totalItems = Number(summaryRows[0].total);

  // 2. One page of results. The sort column comes from a fixed list, never from user text.
  const sortColumn = SORTABLE_COLUMNS[filters.sortBy];
  const direction = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const offset = (filters.page - 1) * filters.limit;

  const [rows] = await pool.execute(
    `${VOUCHER_SELECT}
     ${whereSql}
     ORDER BY ${sortColumn} ${direction}, v.id ${direction}
     LIMIT ? OFFSET ?`,
    // MySQL prepared statements want LIMIT/OFFSET sent as strings; both are validated integers.
    [...params, String(filters.limit), String(offset)]
  );

  return {
    vouchers: rows.map(toVoucherResponse),
    summary: { totalAmount: summaryRows[0].total_amount },
    pagination: {
      page: filters.page,
      limit: filters.limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / filters.limit)),
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers used by the write operations
// ---------------------------------------------------------------------------

async function addHistory(connection, { voucherId, action, fromStatus, toStatus, userId, remarks = null }) {
  await connection.execute(
    `INSERT INTO voucher_history (voucher_id, action, from_status, to_status, performed_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [voucherId, action, fromStatus, toStatus, userId, remarks]
  );
}

// Produces the next voucher number, e.g. EV-2026-00015.
// The counter row stays locked until the surrounding transaction ends,
// so two vouchers can never receive the same number.
async function nextVoucherNumber(connection) {
  const year = Number(todayInOfficeTimezone().slice(0, 4));

  await connection.execute(
    `INSERT INTO voucher_sequences (seq_year, last_number) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
    [year]
  );
  const [rows] = await connection.execute('SELECT last_number FROM voucher_sequences WHERE seq_year = ?', [year]);

  return `EV-${year}-${String(rows[0].last_number).padStart(5, '0')}`;
}

// Loads the employee's own voucher and insists that it is still a draft.
async function getOwnDraftRow(voucherId, user, actionWord) {
  const row = await getVoucherRowForUser(voucherId, user);
  if (row.status !== VOUCHER_STATUS.DRAFT) {
    throw new AppError(
      409,
      `Only draft vouchers can be ${actionWord}. This voucher is ${STATUS_LABELS[row.status]}.`
    );
  }
  return row;
}

// Loads a voucher and insists that it is waiting for the Director's decision.
async function getPendingRow(voucherId, actionWord) {
  const row = await findVoucherRow(voucherId);
  if (!row) {
    throw new AppError(404, 'Voucher not found.');
  }
  if (row.status === VOUCHER_STATUS.DRAFT) {
    throw new AppError(409, `This voucher has not been submitted yet, so it cannot be ${actionWord}.`);
  }
  if (row.status !== VOUCHER_STATUS.PENDING_APPROVAL) {
    throw new AppError(409, `This voucher has already been ${STATUS_LABELS[row.status].toLowerCase()}.`);
  }
  return row;
}

// ---------------------------------------------------------------------------
// Employee operations
// ---------------------------------------------------------------------------

// Creates a voucher. It always starts as DRAFT, whatever the request says.
export async function createVoucher(user, data, signatureFile) {
  const signaturePath = signatureFile ? await saveSignature(signatureFile, 'employee') : null;

  try {
    const voucherId = await withTransaction(async (connection) => {
      const voucherNumber = await nextVoucherNumber(connection);

      const [result] = await connection.execute(
        `INSERT INTO vouchers
           (voucher_number, employee_id, voucher_date, expense_date, department, expense_title,
            expense_category, expense_description, amount, employee_signature_path, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT')`,
        [
          voucherNumber,
          user.id,
          data.voucherDate,
          data.expenseDate,
          data.department,
          data.expenseTitle,
          data.expenseCategory,
          data.expenseDescription,
          data.amount,
          signaturePath,
        ]
      );

      await addHistory(connection, {
        voucherId: result.insertId,
        action: HISTORY_ACTIONS.CREATED,
        fromStatus: null,
        toStatus: VOUCHER_STATUS.DRAFT,
        userId: user.id,
      });

      return result.insertId;
    });

    return getVoucherDetails(voucherId, user);
  } catch (error) {
    await deleteSignature(signaturePath); // do not leave an unused file behind
    throw error;
  }
}

// Updates the employee's own DRAFT. A new signature image replaces the old one.
export async function updateDraftVoucher(voucherId, user, data, signatureFile) {
  const current = await getOwnDraftRow(voucherId, user, 'edited');
  const newSignaturePath = signatureFile ? await saveSignature(signatureFile, 'employee') : null;

  try {
    await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `UPDATE vouchers
            SET voucher_date = ?, expense_date = ?, department = ?, expense_title = ?,
                expense_category = ?, expense_description = ?, amount = ?,
                employee_signature_path = COALESCE(?, employee_signature_path)
          WHERE id = ? AND employee_id = ? AND status = 'DRAFT'`,
        [
          data.voucherDate,
          data.expenseDate,
          data.department,
          data.expenseTitle,
          data.expenseCategory,
          data.expenseDescription,
          data.amount,
          newSignaturePath,
          voucherId,
          user.id,
        ]
      );
      if (result.affectedRows === 0) {
        throw new AppError(409, 'This voucher is no longer a draft, so it cannot be edited.');
      }

      await addHistory(connection, {
        voucherId,
        action: HISTORY_ACTIONS.UPDATED,
        fromStatus: VOUCHER_STATUS.DRAFT,
        toStatus: VOUCHER_STATUS.DRAFT,
        userId: user.id,
      });
    });
  } catch (error) {
    await deleteSignature(newSignaturePath);
    throw error;
  }

  if (newSignaturePath) {
    await deleteSignature(current.employee_signature_path); // the old image is no longer used
  }
  return getVoucherDetails(voucherId, user);
}

// Deletes the employee's own DRAFT (its history rows are removed by ON DELETE CASCADE).
export async function deleteDraftVoucher(voucherId, user) {
  const current = await getOwnDraftRow(voucherId, user, 'deleted');

  const [result] = await pool.execute(
    `DELETE FROM vouchers WHERE id = ? AND employee_id = ? AND status = 'DRAFT'`,
    [voucherId, user.id]
  );
  if (result.affectedRows === 0) {
    throw new AppError(409, 'This voucher is no longer a draft, so it cannot be deleted.');
  }

  await deleteSignature(current.employee_signature_path);
  return { id: voucherId, voucherNumber: current.voucher_number };
}

// DRAFT -> PENDING_APPROVAL. The employee's signature is mandatory.
// It may already be saved on the draft, or it can be uploaded with this request.
export async function submitVoucher(voucherId, user, signatureFile) {
  const current = await getOwnDraftRow(voucherId, user, 'submitted');

  if (!signatureFile && !current.employee_signature_path) {
    throw new AppError(400, 'Validation failed', {
      signature: 'Upload your signature before submitting the voucher.',
    });
  }

  const newSignaturePath = signatureFile ? await saveSignature(signatureFile, 'employee') : null;

  try {
    await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `UPDATE vouchers
            SET status = 'PENDING_APPROVAL',
                submitted_at = NOW(),
                employee_signature_path = COALESCE(?, employee_signature_path)
          WHERE id = ? AND employee_id = ? AND status = 'DRAFT'`,
        [newSignaturePath, voucherId, user.id]
      );
      if (result.affectedRows === 0) {
        throw new AppError(409, 'This voucher has already been submitted.');
      }

      await addHistory(connection, {
        voucherId,
        action: HISTORY_ACTIONS.SUBMITTED,
        fromStatus: VOUCHER_STATUS.DRAFT,
        toStatus: VOUCHER_STATUS.PENDING_APPROVAL,
        userId: user.id,
      });
    });
  } catch (error) {
    await deleteSignature(newSignaturePath);
    throw error;
  }

  if (newSignaturePath) {
    await deleteSignature(current.employee_signature_path);
  }
  return getVoucherDetails(voucherId, user);
}

// ---------------------------------------------------------------------------
// Director operations
// Only the approval columns are written. The employee's expense details are
// never part of these UPDATE statements, so the Director cannot change them.
// ---------------------------------------------------------------------------

// PENDING_APPROVAL -> APPROVED. The Director's signature is mandatory.
export async function approveVoucher(voucherId, director, signatureFile) {
  if (!signatureFile) {
    throw new AppError(400, 'Validation failed', {
      signature: 'Upload your signature to approve the voucher.',
    });
  }

  await getPendingRow(voucherId, 'approved');

  const signaturePath = await saveSignature(signatureFile, 'director');

  try {
    await withTransaction(async (connection) => {
      const [result] = await connection.execute(
        `UPDATE vouchers
            SET status = 'APPROVED',
                reviewed_by = ?,
                director_signature_path = ?,
                approved_at = NOW()
          WHERE id = ? AND status = 'PENDING_APPROVAL'`,
        [director.id, signaturePath, voucherId]
      );
      if (result.affectedRows === 0) {
        throw new AppError(409, 'This voucher has already been processed.');
      }

      await addHistory(connection, {
        voucherId,
        action: HISTORY_ACTIONS.APPROVED,
        fromStatus: VOUCHER_STATUS.PENDING_APPROVAL,
        toStatus: VOUCHER_STATUS.APPROVED,
        userId: director.id,
      });
    });
  } catch (error) {
    await deleteSignature(signaturePath);
    throw error;
  }

  return getVoucherDetails(voucherId, director);
}

// PENDING_APPROVAL -> REJECTED. A reason is mandatory (checked by the validator).
export async function rejectVoucher(voucherId, director, reason) {
  await getPendingRow(voucherId, 'rejected');

  await withTransaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE vouchers
          SET status = 'REJECTED',
              reviewed_by = ?,
              rejection_reason = ?,
              rejected_at = NOW()
        WHERE id = ? AND status = 'PENDING_APPROVAL'`,
      [director.id, reason, voucherId]
    );
    if (result.affectedRows === 0) {
      throw new AppError(409, 'This voucher has already been processed.');
    }

    await addHistory(connection, {
      voucherId,
      action: HISTORY_ACTIONS.REJECTED,
      fromStatus: VOUCHER_STATUS.PENDING_APPROVAL,
      toStatus: VOUCHER_STATUS.REJECTED,
      userId: director.id,
      remarks: reason,
    });
  });

  return getVoucherDetails(voucherId, director);
}
