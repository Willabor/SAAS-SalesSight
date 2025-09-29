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

export async function uploadDataWithProgress(
  type: 'item-list' | 'sales-transactions',
  data: any[],
  onProgress: (progress: { processed: number; total: number; uploaded: number; failed: number }) => void,
  mode?: string,
  fileName?: string,
  batchSize: number = 100
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  total: number;
  errors: string[];
}> {
  const endpoint = type === 'item-list' ? '/api/upload/item-list' : '/api/upload/sales-transactions';
  const total = data.length;
  let totalUploaded = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Process data in batches
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const processed = Math.min(i + batchSize, total);
    
    try {
      const payload: any = { data: batch, fileName };
      if (mode) {
        payload.mode = mode;
      }
      
      const response = await apiRequest('POST', endpoint, payload);
      const result = await response.json();
      
      totalUploaded += result.uploaded;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
      
      // Update progress
      onProgress({
        processed,
        total,
        uploaded: totalUploaded,
        failed: totalFailed
      });
      
      // Small delay between batches to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      // If batch fails, count all items in batch as failed
      totalFailed += batch.length;
      allErrors.push(`Batch ${i / batchSize + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      onProgress({
        processed,
        total,
        uploaded: totalUploaded,
        failed: totalFailed
      });
    }
  }

  return {
    success: totalFailed === 0,
    uploaded: totalUploaded,
    failed: totalFailed,
    total,
    errors: allErrors.slice(0, 10) // Limit to first 10 errors
  };
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
