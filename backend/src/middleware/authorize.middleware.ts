import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../constants/enums';
import { ForbiddenError, UnauthenticatedError } from '../utils/errors';

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthenticatedError('Authentication required before authorization check', 'UNAUTHENTICATED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Access denied: insufficient permissions for role', 'FORBIDDEN');
    }

    next();
  };
}
