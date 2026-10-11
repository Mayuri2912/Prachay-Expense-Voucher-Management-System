// Checks the JWT sent in the "Authorization: Bearer <token>" header.
// On success the logged-in user is available as req.user for the rest of the request.

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { findActiveUserById } from '../services/authService.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Please log in to continue.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
  } catch {
    throw new AppError(401, 'Your session has expired or is invalid. Please log in again.');
  }

  // Load the user from the database on every request. This way a deleted or
  // disabled account stops working immediately, and the role always comes
  // from the database rather than from whatever the token claims.
  const user = await findActiveUserById(Number(payload.sub));
  if (!user) {
    throw new AppError(401, 'This account is no longer active. Please log in again.');
  }

  req.user = user;
  next();
}
