// Role-based access control. Use after `authenticate`.
//
//   router.post('/:id/approve', authorize(ROLES.DIRECTOR), approveVoucher);

import { AppError } from '../utils/AppError.js';

export function authorize(...allowedRoles) {
  return function checkRole(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError(403, 'You do not have permission to perform this action.');
    }
    next();
  };
}
