import { UserRole } from '../constants/enums';

export interface AuthenticatedUserContext {
  user_id: number;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserContext;
    }
  }
}
