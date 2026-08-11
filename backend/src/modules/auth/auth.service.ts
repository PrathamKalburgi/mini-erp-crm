import bcrypt from 'bcrypt';
import prisma from '../../lib/prisma';
import { signToken } from '../../config/jwt.config';
import { UnauthenticatedError, NotFoundError } from '../../utils/errors';
import { UserRole } from '../../constants/enums';

export interface UserResponseShape {
  id: number;
  email: string;
  role: UserRole;
}

export interface LoginResponseShape {
  access_token: string;
  token_type: string;
  user: UserResponseShape;
}

export class AuthService {
  public async login(emailInput: string, passwordInput: string): Promise<LoginResponseShape> {
    const normalizedEmail = emailInput.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthenticatedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(passwordInput, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthenticatedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const accessToken = signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      },
    };
  }

  public async getCurrentUser(userId: number): Promise<UserResponseShape> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
  }
}

export const authService = new AuthService();
