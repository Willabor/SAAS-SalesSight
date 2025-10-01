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
  batchSize: number = 100,
  checkPauseStop?: () => { isPaused: boolean; isStopped: boolean }
): Promise<{
  success: boolean;
  uploaded: number;
  failed: number;
  total: number;
  errors: string[];
  stopped?: boolean;
}> {
  const endpoint = type === 'item-list' ? '/api/upload/item-list' : '/api/upload/sales-transactions';
  const total = data.length;
  let totalUploaded = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Process data in batches
  for (let i = 0; i < data.length; i += batchSize) {
    // Check if upload should be paused or stopped
    if (checkPauseStop) {
      if (checkPauseStop().isStopped) {
        // Stop immediately - return current progress with stopped flag
        return {
          success: false,
          uploaded: totalUploaded,
          failed: totalFailed,
          total,
          errors: allErrors.slice(0, 10),
          stopped: true
        };
      }

      // Wait while paused - re-check isPaused each iteration for resume to work
      while (checkPauseStop().isPaused && !checkPauseStop().isStopped) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check again after pause in case it was stopped
      if (checkPauseStop().isStopped) {
        return {
          success: false,
          uploaded: totalUploaded,
          failed: totalFailed,
          total,
          errors: allErrors.slice(0, 10),
          stopped: true
        };
      }
    }

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

export async function uploadReceivingWithProgress(
  vouchers: any[],
  onProgress: (progress: { processed: number; total: number; uploaded: number; skipped: number; failed: number }) => void,
  fileName: string,
  batchSize: number = 50,
  checkPauseStop?: () => { isPaused: boolean; isStopped: boolean }
): Promise<{
  success: boolean;
  uploaded: number;
  lines: number;
  skipped: number;
  failed: number;
  total: number;
  errors: string[];
  duplicateVouchers: any[];
  stopped?: boolean;
}> {
  const endpoint = '/api/receiving/upload';
  const total = vouchers.length;
  let totalUploaded = 0;
  let totalLines = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];
  const allDuplicates: any[] = [];

  // Process vouchers in batches
  for (let i = 0; i < vouchers.length; i += batchSize) {
    // Check if upload should be paused or stopped
    if (checkPauseStop) {
      if (checkPauseStop().isStopped) {
        // Stop immediately - return current progress with stopped flag
        return {
          success: false,
          uploaded: totalUploaded,
          lines: totalLines,
          skipped: totalSkipped,
          failed: totalFailed,
          total: vouchers.length,
          errors: allErrors.slice(0, 10),
          duplicateVouchers: allDuplicates.slice(0, 10),
          stopped: true
        };
      }

      // Wait while paused - re-check isPaused each iteration for resume to work
      while (checkPauseStop().isPaused && !checkPauseStop().isStopped) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Check again after pause in case it was stopped
      if (checkPauseStop().isStopped) {
        return {
          success: false,
          uploaded: totalUploaded,
          lines: totalLines,
          skipped: totalSkipped,
          failed: totalFailed,
          total: vouchers.length,
          errors: allErrors.slice(0, 10),
          duplicateVouchers: allDuplicates.slice(0, 10),
          stopped: true
        };
      }
    }

    const batch = vouchers.slice(i, i + batchSize);
    const processed = Math.min(i + batchSize, total);

    try {
      const payload = { vouchers: batch, fileName };

      const response = await apiRequest('POST', endpoint, payload);
      const result = await response.json();

      totalUploaded += result.uploaded || 0;
      totalLines += result.lines || 0;
      totalSkipped += result.skipped || 0;
      totalFailed += result.failed || 0;
      allErrors.push(...(result.errors || []));
      allDuplicates.push(...(result.duplicateVouchers || []));

      // Update progress
      onProgress({
        processed,
        total,
        uploaded: totalUploaded,
        skipped: totalSkipped,
        failed: totalFailed
      });

      // Small delay between batches to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      // If batch fails, count all items in batch as failed
      totalFailed += batch.length;
      allErrors.push(`Batch ${i / batchSize + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      onProgress({
        processed,
        total,
        uploaded: totalUploaded,
        skipped: totalSkipped,
        failed: totalFailed
      });
    }
  }

  return {
    success: totalFailed === 0,
    uploaded: totalUploaded,
    lines: totalLines,
    skipped: totalSkipped,
    failed: totalFailed,
    total: vouchers.length,
    errors: allErrors.slice(0, 10), // Limit to first 10 errors
    duplicateVouchers: allDuplicates.slice(0, 10)
  };
}

export async function getUploadHistory(limit?: number): Promise<any[]> {
  const endpoint = `/api/upload-history${limit ? `?limit=${limit}` : ''}`;
  const response = await apiRequest('GET', endpoint);
  return response.json();
}
