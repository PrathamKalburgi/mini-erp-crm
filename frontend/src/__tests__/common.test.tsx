import { describe, it, expect } from 'vitest';
import { UserRole } from '../types';

describe('Frontend Types & Constants', () => {
  it('UserRole enum values match CONTRACTS.md exactly', () => {
    expect(UserRole.ADMIN).toBe('ADMIN');
    expect(UserRole.SALES).toBe('SALES');
    expect(UserRole.WAREHOUSE).toBe('WAREHOUSE');
    expect(UserRole.ACCOUNTS).toBe('ACCOUNTS');
  });
});
