// Collects every route group under /api.

import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import voucherRoutes from './voucherRoutes.js';

const router = Router();

// Simple "is the API alive?" check - no login needed.
router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

router.use('/auth', authRoutes);
router.use('/vouchers', voucherRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
