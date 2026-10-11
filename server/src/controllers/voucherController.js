// Voucher controllers: validate the input, call the service, send the response.
// Who is allowed to call each one is decided in routes/voucherRoutes.js.

import { existsSync } from 'node:fs';
import * as voucherService from '../services/voucherService.js';
import { resolveSignaturePath } from '../services/signatureService.js';
import { AppError } from '../utils/AppError.js';
import { VOUCHER_STATUS } from '../utils/constants.js';
import { sendSuccess } from '../utils/response.js';
import { validateListQuery, validateRejectBody, validateVoucherBody } from '../validators/voucherValidator.js';

function sendVoucherList(res, result) {
  sendSuccess(res, {
    data: { vouchers: result.vouchers, summary: result.summary },
    pagination: result.pagination,
  });
}

// ----------------------------- Lists -----------------------------

// GET /api/vouchers/my  (Employee) - the logged-in employee's own vouchers only
export async function listMyVouchers(req, res) {
  const filters = validateListQuery(req.query);
  sendVoucherList(res, await voucherService.listVouchers(filters, { employeeId: req.user.id }));
}

// GET /api/vouchers  (Director, Accounts) - every voucher in the organisation
export async function listAllVouchers(req, res) {
  const filters = validateListQuery(req.query);
  sendVoucherList(res, await voucherService.listVouchers(filters));
}

// GET /api/vouchers/pending  (Director) - vouchers waiting for a decision
export async function listPendingVouchers(req, res) {
  const filters = validateListQuery(req.query);
  sendVoucherList(res, await voucherService.listVouchers(filters, { status: VOUCHER_STATUS.PENDING_APPROVAL }));
}

// GET /api/vouchers/approved  (Accounts, Director) - vouchers ready for reimbursement
export async function listApprovedVouchers(req, res) {
  const filters = validateListQuery(req.query);
  sendVoucherList(res, await voucherService.listVouchers(filters, { status: VOUCHER_STATUS.APPROVED }));
}

// ----------------------------- Details -----------------------------

// GET /api/vouchers/:id  (owner, Director, Accounts)
export async function getVoucher(req, res) {
  const details = await voucherService.getVoucherDetails(req.voucherId, req.user);
  sendSuccess(res, { data: details });
}

// GET /api/vouchers/:id/signatures/:type  (owner, Director, Accounts)
// :type is "employee" or "director". The image is only sent after the same
// permission check as the voucher itself, so signatures are never public.
export async function getSignature(req, res) {
  const { type } = req.params;
  if (type !== 'employee' && type !== 'director') {
    throw new AppError(400, 'Signature type must be "employee" or "director".');
  }

  const voucher = await voucherService.getVoucherRowForUser(req.voucherId, req.user);
  const storedPath = type === 'employee' ? voucher.employee_signature_path : voucher.director_signature_path;
  const filePath = resolveSignaturePath(storedPath);

  if (!filePath || !existsSync(filePath)) {
    throw new AppError(404, 'No signature image is available for this voucher.');
  }

  res.set('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
}

// ----------------------------- Employee actions -----------------------------

// POST /api/vouchers  (Employee) - multipart/form-data, optional "signature" file
export async function createVoucher(req, res) {
  const data = validateVoucherBody(req.body);
  const details = await voucherService.createVoucher(req.user, data, req.file);

  sendSuccess(res, { status: 201, message: 'Voucher saved as draft.', data: details });
}

// PUT /api/vouchers/:id  (Employee, own draft only)
export async function updateVoucher(req, res) {
  const data = validateVoucherBody(req.body);
  const details = await voucherService.updateDraftVoucher(req.voucherId, req.user, data, req.file);

  sendSuccess(res, { message: 'Draft voucher updated.', data: details });
}

// DELETE /api/vouchers/:id  (Employee, own draft only)
export async function deleteVoucher(req, res) {
  const deleted = await voucherService.deleteDraftVoucher(req.voucherId, req.user);

  sendSuccess(res, { message: `Draft voucher ${deleted.voucherNumber} deleted.`, data: deleted });
}

// POST /api/vouchers/:id/submit  (Employee, own draft only)
export async function submitVoucher(req, res) {
  const details = await voucherService.submitVoucher(req.voucherId, req.user, req.file);

  sendSuccess(res, { message: 'Voucher submitted for approval.', data: details });
}

// ----------------------------- Director actions -----------------------------

// POST /api/vouchers/:id/approve  (Director) - multipart/form-data with a "signature" file
// Only the signature is read from the request; any other field sent is ignored.
export async function approveVoucher(req, res) {
  const details = await voucherService.approveVoucher(req.voucherId, req.user, req.file);

  sendSuccess(res, { message: 'Voucher approved.', data: details });
}

// POST /api/vouchers/:id/reject  (Director) - JSON body { "reason": "..." }
export async function rejectVoucher(req, res) {
  const { reason } = validateRejectBody(req.body);
  const details = await voucherService.rejectVoucher(req.voucherId, req.user, reason);

  sendSuccess(res, { message: 'Voucher rejected.', data: details });
}
