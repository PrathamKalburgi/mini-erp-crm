import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt.config';
import { UnauthenticatedError } from '../utils/errors';
import { AUTHORIZATION_SCHEME } from '../constants/enums';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthenticatedError('Authentication header is required', 'UNAUTHENTICATED');
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0] !== AUTHORIZATION_SCHEME) {
    throw new UnauthenticatedError('Authorization header must use Bearer scheme', 'UNAUTHENTICATED');
  }

  const token = parts[1];
  const payload = verifyToken(token);

  req.user = {
    user_id: payload.sub,
    email: payload.email,
    role: payload.role,
  };

  next();
}
