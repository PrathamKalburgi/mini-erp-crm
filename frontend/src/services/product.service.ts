import apiClient from './api.client';
import type { Product, StockMovement, PaginatedResponse, SingleResponse } from '../types';

export async function getProducts(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<Product>> {
  const response = await apiClient.get<PaginatedResponse<Product>>('/products', { params });
  return response.data;
}

export async function getProductById(id: number): Promise<Product> {
  const response = await apiClient.get<SingleResponse<Product>>(`/products/${id}`);
  return response.data.data;
}

export async function createProduct(data: Record<string, unknown>): Promise<Product> {
  const response = await apiClient.post<SingleResponse<Product>>('/products', data);
  return response.data.data;
}

export async function updateProduct(id: number, data: Record<string, unknown>): Promise<Product> {
  const response = await apiClient.patch<SingleResponse<Product>>(`/products/${id}`, data);
  return response.data.data;
}

export async function getStockMovements(params: Record<string, string | number | undefined>): Promise<PaginatedResponse<StockMovement>> {
  const response = await apiClient.get<PaginatedResponse<StockMovement>>('/stock-movements', { params });
  return response.data;
}
