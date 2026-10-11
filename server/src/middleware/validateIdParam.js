// Makes sure the ":id" part of the URL is a positive whole number
// before any database query runs. The number is stored in req.voucherId.

import { AppError } from '../utils/AppError.js';

export function validateIdParam(req, res, next) {
  const { id } = req.params;

  if (!/^[1-9]\d{0,9}$/.test(id)) {
    throw new AppError(400, 'Invalid voucher id. It must be a positive whole number.');
  }

  req.voucherId = Number(id);
  next();
}
