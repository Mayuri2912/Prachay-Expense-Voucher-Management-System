import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { getCurrentUser, login } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Slows down password guessing: at most 20 login attempts per 15 minutes from one address.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === 'test', // the automated tests log in many times
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getCurrentUser);

export default router;
