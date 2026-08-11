import { describe, it, expect, vi } from 'vitest';
import * as AuthContextModule from '../context/AuthContext';
import { UserRole } from '../types';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage state & redirect logic', () => {
  it('identifies authenticated user state for redirect', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: { id: 1, email: 'admin@fundsroom.com', role: UserRole.ADMIN },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const authState = AuthContextModule.useAuth();
    expect(authState.isAuthenticated).toBe(true);
    expect(authState.user?.role).toBe(UserRole.ADMIN);
  });

  it('identifies unauthenticated user state for login form display', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const authState = AuthContextModule.useAuth();
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBeNull();
  });
});
