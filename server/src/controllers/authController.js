// Controllers stay thin: validate the input, call a service, send the response.

import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/response.js';
import { validateLoginBody } from '../validators/authValidator.js';

// POST /api/auth/login
export async function login(req, res) {
  const { email, password } = validateLoginBody(req.body);
  const result = await authService.login(email, password);

  sendSuccess(res, { message: 'Logged in successfully.', data: result });
}

// GET /api/auth/me  -> who does this token belong to?
export async function getCurrentUser(req, res) {
  sendSuccess(res, { data: { user: req.user } });
}
