// Voucher routes. Read each line from left to right:
//   authenticate (applied to all) -> authorize(role) -> validate id -> read upload -> controller
//
// This file is the single place that decides WHICH ROLE may call WHICH endpoint.
// Ownership ("is this my voucher?") and status rules are checked in services/voucherService.js.

import { Router } from 'express';
import * as vouchers from '../controllers/voucherController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { uploadSignature } from '../middleware/upload.js';
import { validateIdParam } from '../middleware/validateIdParam.js';
import { ROLES } from '../utils/constants.js';

const { EMPLOYEE, DIRECTOR, ACCOUNTS } = ROLES;
const router = Router();

// Every voucher route needs a valid login.
router.use(authenticate);

// ---- Lists (these fixed paths must come before "/:id") ----
router.get('/my', authorize(EMPLOYEE), vouchers.listMyVouchers);
router.get('/pending', authorize(DIRECTOR), vouchers.listPendingVouchers);
router.get('/approved', authorize(ACCOUNTS, DIRECTOR), vouchers.listApprovedVouchers);
router.get('/', authorize(DIRECTOR, ACCOUNTS), vouchers.listAllVouchers);

// ---- Employee: create, edit, delete, submit ----
router.post('/', authorize(EMPLOYEE), uploadSignature, vouchers.createVoucher);
router.put('/:id', authorize(EMPLOYEE), validateIdParam, uploadSignature, vouchers.updateVoucher);
router.delete('/:id', authorize(EMPLOYEE), validateIdParam, vouchers.deleteVoucher);
router.post('/:id/submit', authorize(EMPLOYEE), validateIdParam, uploadSignature, vouchers.submitVoucher);

// ---- Director: approve or reject ----
router.post('/:id/approve', authorize(DIRECTOR), validateIdParam, uploadSignature, vouchers.approveVoucher);
router.post('/:id/reject', authorize(DIRECTOR), validateIdParam, vouchers.rejectVoucher);

// ---- Everyone (employees only reach their own vouchers) ----
router.get('/:id', validateIdParam, vouchers.getVoucher);
router.get('/:id/signatures/:type', validateIdParam, vouchers.getSignature);

export default router;
