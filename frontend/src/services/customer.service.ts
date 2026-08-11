import apiClient from './api.client';
import type { Customer, CustomerFollowUpNote, PaginatedResponse, SingleResponse } from '../types';

export async function getCustomers(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<Customer>> {
  const response = await apiClient.get<PaginatedResponse<Customer>>('/customers', { params });
  return response.data;
}

export async function getCustomerById(id: number): Promise<Customer> {
  const response = await apiClient.get<SingleResponse<Customer>>(`/customers/${id}`);
  return response.data.data;
}

export async function createCustomer(data: Record<string, unknown>): Promise<Customer> {
  const response = await apiClient.post<SingleResponse<Customer>>('/customers', data);
  return response.data.data;
}

export async function updateCustomer(id: number, data: Record<string, unknown>): Promise<Customer> {
  const response = await apiClient.patch<SingleResponse<Customer>>(`/customers/${id}`, data);
  return response.data.data;
}

export async function getFollowUpNotes(customerId: number, params: Record<string, string | number | undefined>): Promise<PaginatedResponse<CustomerFollowUpNote>> {
  const response = await apiClient.get<PaginatedResponse<CustomerFollowUpNote>>(`/customers/${customerId}/follow-up-notes`, { params });
  return response.data;
}

export async function addFollowUpNote(customerId: number, note: string): Promise<CustomerFollowUpNote> {
  const response = await apiClient.post<SingleResponse<CustomerFollowUpNote>>(`/customers/${customerId}/follow-up-notes`, { note });
  return response.data.data;
}
