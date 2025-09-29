import { apiRequest } from "./queryClient";

export async function uploadData(
  type: 'item-list' | 'sales-transactions',
  data: any[],
  mode?: string,
  fileName?: string
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  total: number;
  errors: string[];
}> {
  const endpoint = type === 'item-list' ? '/api/upload/item-list' : '/api/upload/sales-transactions';
  
  const payload: any = { data, fileName };
  if (mode) {
    payload.mode = mode;
  }
  
  const response = await apiRequest('POST', endpoint, payload);
  return response.json();
}

export async function getStats(type: 'item-list' | 'sales'): Promise<any> {
  const endpoint = type === 'item-list' ? '/api/stats/item-list' : '/api/stats/sales';
  const response = await apiRequest('GET', endpoint);
  return response.json();
}

export async function getUploadHistory(limit?: number): Promise<any[]> {
  const endpoint = `/api/upload-history${limit ? `?limit=${limit}` : ''}`;
  const response = await apiRequest('GET', endpoint);
  return response.json();
}
