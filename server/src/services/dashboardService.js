// Dashboard statistics. Every number is calculated by MySQL from the real
// voucher rows at the moment the dashboard is opened - nothing is hardcoded.

import { pool } from '../config/db.js';
import { startOfTodayInOfficeTimezone } from '../utils/dates.js';
import { VOUCHER_SELECT, toVoucherResponse } from './voucherService.js';

// In MySQL a comparison such as (status = 'DRAFT') is 1 or 0, so SUM(...) counts the matching rows.
const STATUS_COUNTS = `
  COUNT(*)                                AS total,
  COALESCE(SUM(status = 'DRAFT'), 0)            AS draft,
  COALESCE(SUM(status = 'PENDING_APPROVAL'), 0) AS pending,
  COALESCE(SUM(status = 'APPROVED'), 0)         AS approved,
  COALESCE(SUM(status = 'REJECTED'), 0)         AS rejected`;

// Employee: only the logged-in employee's own vouchers.
export async function getEmployeeDashboard(employeeId) {
  const [statRows] = await pool.execute(
    `SELECT ${STATUS_COUNTS},
            COALESCE(SUM(CASE WHEN status <> 'DRAFT' THEN amount END), 0)            AS total_claimed,
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount END), 0)          AS approved_amount,
            COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount END), 0)  AS pending_amount
       FROM vouchers
      WHERE employee_id = ?`,
    [employeeId]
  );
  const stats = statRows[0];

  const [recentRows] = await pool.execute(
    `${VOUCHER_SELECT}
      WHERE v.employee_id = ?
      ORDER BY v.updated_at DESC, v.id DESC
      LIMIT 5`,
    [employeeId]
  );

  return {
    totalVouchers: Number(stats.total),
    draftVouchers: Number(stats.draft),
    pendingApproval: Number(stats.pending),
    approvedVouchers: Number(stats.approved),
    rejectedVouchers: Number(stats.rejected),
    // "Claimed" = every voucher that was actually submitted (pending + approved + rejected).
    totalAmountClaimed: stats.total_claimed,
    approvedAmount: stats.approved_amount,
    pendingAmount: stats.pending_amount,
    recentVouchers: recentRows.map(toVoucherResponse),
  };
}

// Director: the approval queue and today's decisions.
export async function getDirectorDashboard() {
  const startOfToday = startOfTodayInOfficeTimezone();

  const [statRows] = await pool.execute(
    `SELECT COALESCE(SUM(status = 'PENDING_APPROVAL'), 0)                             AS pending_count,
            COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount END), 0)   AS pending_amount,
            COALESCE(SUM(status = 'APPROVED' AND approved_at >= ?), 0)                AS approved_today,
            COALESCE(SUM(status = 'REJECTED' AND rejected_at >= ?), 0)                AS rejected_today
       FROM vouchers`,
    [startOfToday, startOfToday]
  );
  const stats = statRows[0];

  // Recent activity comes from the audit trail: submissions and decisions.
  const [activityRows] = await pool.execute(
    `SELECT h.id, h.action, h.remarks, h.created_at,
            v.id AS voucher_id, v.voucher_number, v.expense_title, v.amount, v.status,
            e.full_name AS employee_name,
            u.full_name AS performed_by_name
       FROM voucher_history h
       JOIN vouchers v ON v.id = h.voucher_id
       JOIN users e ON e.id = v.employee_id
       JOIN users u ON u.id = h.performed_by
      WHERE h.action IN ('SUBMITTED', 'APPROVED', 'REJECTED')
      ORDER BY h.created_at DESC, h.id DESC
      LIMIT 8`
  );

  const [pendingRows] = await pool.execute(
    `${VOUCHER_SELECT}
      WHERE v.status = 'PENDING_APPROVAL'
      ORDER BY v.submitted_at ASC, v.id ASC
      LIMIT 5`
  );

  return {
    pendingApprovalCount: Number(stats.pending_count),
    totalPendingAmount: stats.pending_amount,
    approvedToday: Number(stats.approved_today),
    rejectedToday: Number(stats.rejected_today),
    recentActivity: activityRows.map((row) => ({
      id: row.id,
      action: row.action,
      remarks: row.remarks,
      createdAt: row.created_at,
      performedByName: row.performed_by_name,
      voucher: {
        id: row.voucher_id,
        voucherNumber: row.voucher_number,
        expenseTitle: row.expense_title,
        amount: row.amount,
        status: row.status,
        employeeName: row.employee_name,
      },
    })),
    oldestPendingVouchers: pendingRows.map(toVoucherResponse),
  };
}

// Accounts: organisation-wide totals and the vouchers ready for reimbursement.
export async function getAccountsDashboard() {
  const [statRows] = await pool.execute(
    `SELECT ${STATUS_COUNTS},
            COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN amount END), 0)          AS approved_amount,
            COALESCE(SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN amount END), 0)  AS pending_amount
       FROM vouchers`
  );
  const stats = statRows[0];

  const [recentRows] = await pool.execute(
    `${VOUCHER_SELECT}
      WHERE v.status = 'APPROVED'
      ORDER BY v.approved_at DESC, v.id DESC
      LIMIT 6`
  );

  return {
    totalVouchers: Number(stats.total),
    draftVouchers: Number(stats.draft),
    pendingApproval: Number(stats.pending),
    approvedVouchers: Number(stats.approved),
    rejectedVouchers: Number(stats.rejected),
    totalApprovedAmount: stats.approved_amount,
    pendingAmount: stats.pending_amount,
    recentApprovedVouchers: recentRows.map(toVoucherResponse),
  };
}
