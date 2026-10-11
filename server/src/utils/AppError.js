// An error that is safe to show to the user.
// Throw it anywhere; the central error handler turns it into a JSON response.
//
//   throw new AppError(404, 'Voucher not found');
//   throw new AppError(400, 'Validation failed', { amount: 'Amount must be greater than zero' });

export class AppError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors; // optional { fieldName: 'message' } object
  }
}
