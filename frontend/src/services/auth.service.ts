import apiClient from './api.client';
import type { LoginResponse, User } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<{ data: User }>('/auth/me');
  return response.data.data;
}
