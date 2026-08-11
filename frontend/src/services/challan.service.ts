import apiClient from './api.client';
import type { SalesChallan, PaginatedResponse, SingleResponse } from '../types';

export async function getChallans(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<SalesChallan>> {
  const response = await apiClient.get<PaginatedResponse<SalesChallan>>('/challans', { params });
  return response.data;
}

export async function getChallanById(id: number): Promise<SalesChallan> {
  const response = await apiClient.get<SingleResponse<SalesChallan>>(`/challans/${id}`);
  return response.data.data;
}

export async function createChallan(data: { customer_id: number; items: Array<{ product_id: number; quantity: number }> }): Promise<SalesChallan> {
  const response = await apiClient.post<SingleResponse<SalesChallan>>('/challans', data);
  return response.data.data;
}

export async function updateChallan(id: number, data: Record<string, unknown>): Promise<SalesChallan> {
  const response = await apiClient.patch<SingleResponse<SalesChallan>>(`/challans/${id}`, data);
  return response.data.data;
}

export async function confirmChallan(id: number): Promise<SalesChallan> {
  const response = await apiClient.post<SingleResponse<SalesChallan>>(`/challans/${id}/confirm`, {});
  return response.data.data;
}

export async function cancelChallan(id: number): Promise<SalesChallan> {
  const response = await apiClient.post<SingleResponse<SalesChallan>>(`/challans/${id}/cancel`, {});
  return response.data.data;
}
