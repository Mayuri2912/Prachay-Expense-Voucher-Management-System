// Every successful response has the same shape:
//   { success: true, message?: '...', data: {...}, pagination?: {...} }
// Errors are produced by middleware/errorHandler.js:
//   { success: false, message: '...', errors?: { field: '...' } }

export function sendSuccess(res, { status = 200, message, data = null, pagination } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  body.data = data;
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
}
