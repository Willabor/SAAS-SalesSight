// lib/api.ts - Updated calculateMetricsWithProgress function

interface ProgressCallback {
  (progress: {
    processed: number;
    total: number;
    uploaded: number;
    failed: number;
    skipped: number;
  }): void;
}

interface ControlFlags {
  isPaused: boolean;
  isStopped: boolean;
}

export async function calculateMetricsWithProgress(
  onProgress: ProgressCallback,
  batchSize: number = 100,
  getControlFlags: () => ControlFlags
): Promise<{ uploaded: number; failed: number; stopped: boolean }> {
  
  let totalProcessed = 0;
  let totalUploaded = 0;
  let totalFailed = 0;
  let offset = 0;
  let hasMore = true;
  let estimatedTotal = 0;

  try {
    const countResponse = await fetch('/api/receiving-metrics/count', {
      credentials: 'include',
    });
    
    if (countResponse.ok) {
      const countData = await countResponse.json();
      estimatedTotal = countData.total;
    }

    onProgress({
      processed: 0,
      total: estimatedTotal,
      uploaded: 0,
      failed: 0,
      skipped: 0,
    });

    while (hasMore) {
      const { isPaused, isStopped } = getControlFlags();

      if (isStopped) {
        return { uploaded: totalUploaded, failed: totalFailed, stopped: true };
      }

      while (isPaused) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const flags = getControlFlags();
        if (flags.isStopped) {
          return { uploaded: totalUploaded, failed: totalFailed, stopped: true };
        }
        if (!flags.isPaused) break;
      }

      const response = await fetch('/api/receiving-metrics/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ batchSize, offset }),
      });

      if (!response.ok) {
        throw new Error(`Calculation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      totalProcessed += result.processed;
      totalUploaded += result.processed;
      hasMore = result.hasMore;
      offset = result.nextOffset || (offset + batchSize);

      onProgress({
        processed: totalProcessed,
        total: estimatedTotal || totalProcessed,
        uploaded: totalUploaded,
        failed: totalFailed,
        skipped: 0,
      });

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { uploaded: totalUploaded, failed: totalFailed, stopped: false };
  } catch (error) {
    console.error('Metrics calculation error:', error);
    throw error;
  }
}
