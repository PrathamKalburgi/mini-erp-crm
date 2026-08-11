import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.types';
import { UnauthenticatedError } from '../utils/errors';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production');
    }
    return 'super-secret-key-min-32-chars-long-change-in-production';
  }
  return secret;
};

const getJwtExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '24h';
};

export function signToken(payload: { sub: number; email: string; role: any }): string {
  const secret = getJwtSecret();
  const expiresIn = getJwtExpiresIn();

  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };

  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    },
    secret,
    options
  );
}

export function verifyToken(token: string): JwtPayload {
  const secret = getJwtSecret();
  try {
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    if (!decoded || typeof decoded !== 'object' || !decoded.sub || !decoded.email || !decoded.role) {
      throw new UnauthenticatedError('Invalid token claims structure', 'UNAUTHENTICATED');
    }
    return {
      sub: Number(decoded.sub),
      email: String(decoded.email),
      role: decoded.role as any,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (err: any) {
    if (err instanceof UnauthenticatedError) {
      throw err;
    }
    throw new UnauthenticatedError('Invalid, expired, or malformed authentication token', 'UNAUTHENTICATED');
  }
}
