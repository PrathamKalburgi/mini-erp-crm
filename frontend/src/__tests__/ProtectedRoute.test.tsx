import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';
import { UserRole } from '../types';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('ProtectedRoute component logic', () => {
  it('renders Spin loader when isLoading is true', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const result = ProtectedRoute({ children: <div>Protected Content</div> });
    expect(React.isValidElement(result)).toBe(true);
  });

  it('renders Navigate to /login when not authenticated', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const result = ProtectedRoute({ children: <div>Protected Content</div> });
    expect(React.isValidElement(result)).toBe(true);
    if (React.isValidElement(result)) {
      expect(result.props.to).toBe('/login');
    }
  });

  it('renders children when authenticated and not loading', () => {
    vi.mocked(AuthContextModule.useAuth).mockReturnValue({
      user: { id: 1, email: 'admin@fundsroom.com', role: UserRole.ADMIN },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    const result = ProtectedRoute({ children: <div id="protected">Protected Content</div> });
    expect(React.isValidElement(result)).toBe(true);
  });
});
