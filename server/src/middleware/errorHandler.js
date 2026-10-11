// Central error handling. Every error thrown in a route ends up here
// (Express 5 forwards errors from async functions automatically).

import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

// Runs when no route matched the request.
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  // 1. Errors we threw on purpose - safe to show as they are.
  if (error instanceof AppError) {
    const body = { success: false, message: error.message };
    if (error.errors) body.errors = error.errors;
    return res.status(error.statusCode).json(body);
  }

  // 2. Upload problems reported by Multer.
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? `The signature image must be ${env.maxSignatureSizeMb} MB or smaller.`
        : 'Upload one image in the form field named "signature".';
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: { signature: message },
    });
  }

  // 3. A request body that could not be read.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'The request body is not valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'The request body is too large.' });
  }
  if (error.message === 'Unexpected end of form' || error.message === 'Multipart: Boundary not found') {
    return res.status(400).json({ success: false, message: 'The uploaded form data is incomplete or malformed.' });
  }

  // 4. Anything else is a bug or a database problem. Log the details on the
  //    server, but never send SQL or stack traces to the browser.
  console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server. Please try again.',
  });
}
