// Validation for the login request.

import { AppError } from '../utils/AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginBody(body) {
  const input = body || {};
  const errors = {};

  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email) {
    errors.email = 'Email is required.';
  } else if (email.length > 150 || !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length > 72) {
    // bcrypt only looks at the first 72 bytes, so longer input is refused instead of silently cut.
    errors.password = 'Password must be 72 characters or fewer.';
  }

  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'Validation failed', errors);
  }

  return { email, password };
}
