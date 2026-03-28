/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_URL } from './config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchApi(endpoint: string, options?: any) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return {};
  }

  return response.json();
}

export const shopsApi = {
  getAll: () => fetchApi('/api/shops'),
  getById: (id: number) => fetchApi(`/api/shops/${id}`),
  getByOwner: (userId: number) => fetchApi(`/api/shops/owner/${userId}`),
  create: (data: { name: string; description?: string }) =>
    fetchApi('/api/shops', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; description?: string }) =>
    fetchApi(`/api/shops/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi(`/api/shops/${id}`, { method: 'DELETE' }),
};

export const productsApi = {
  getByShop: (shopId: number) => fetchApi(`/api/shop-products/shop/${shopId}`),
  getById: (id: number) => fetchApi(`/api/shop-products/${id}`),
  create: (data: { shop_id: number; name: string; description?: string; price: number; stock?: number; category?: string; image_url?: string }) =>
    fetchApi('/api/shop-products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; description?: string; price?: number; stock?: number; category?: string; image_url?: string }) =>
    fetchApi(`/api/shop-products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchApi(`/api/shop-products/${id}`, { method: 'DELETE' }),
};

export const ordersApi = {
  getByShop: (shopId: number) => fetchApi(`/api/shop-orders/shop/${shopId}`),
  getById: (id: number) => fetchApi(`/api/shop-orders/${id}`),
  create: (data: { shop_id: number; items: unknown[]; total: number }) =>
    fetchApi('/api/shop-orders', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    fetchApi(`/api/shop-orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  resetStatus: (id: number) =>
    fetchApi(`/api/shop-orders/${id}/reset`, { method: 'POST' }),
};