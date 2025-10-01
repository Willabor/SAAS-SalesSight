/**
 * Global Upload State Manager
 * Manages upload state persistence across page navigation
 */

interface UploadState {
  isUploading: boolean;
  isPaused: boolean;
  fileName: string;
  startTime: number;
  currentStep: 'upload' | 'format' | 'flatten' | 'complete';
  stats: {
    processed: number;
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
  } | null;
  uploadType: 'receiving' | 'item-list' | 'sales';
}

interface UploadResult {
  success: boolean;
  uploaded: number;
  lines?: number;
  skipped?: number;
  failed: number;
  total: number;
  errors: string[];
  duplicateVouchers?: any[];
  stopped?: boolean;
}

const STORAGE_KEY = 'app_upload_state';
const STATE_CHECK_INTERVAL = 500; // Check every 500ms

// Global reference to active upload promise
let activeUploadPromise: Promise<any> | null = null;
let activeUploadController: (() => void) | null = null;

// Upload control flags
let isPausedFlag = false;
let isStoppedFlag = false;

/**
 * Save upload state to localStorage
 */
export function saveUploadState(state: UploadState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save upload state:', error);
  }
}

/**
 * Load upload state from localStorage
 */
export function loadUploadState(): UploadState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as UploadState;

    // Check if state is stale (older than 1 hour)
    const now = Date.now();
    if (state.startTime && (now - state.startTime) > 3600000) {
      clearUploadState();
      return null;
    }

    // If upload is complete or not actively uploading, clear stale state
    // This handles cases where the cleanup timer didn't run (browser closed, etc.)
    if (!state.isUploading || state.currentStep === 'complete') {
      // Check if it's been more than 5 seconds since completion
      const completionAge = now - state.startTime;
      if (completionAge > 5000) {
        clearUploadState();
        return null;
      }
    }

    // Sync control flags with loaded state
    isPausedFlag = state.isPaused;

    return state;
  } catch (error) {
    console.error('Failed to load upload state:', error);
    return null;
  }
}

/**
 * Clear upload state from localStorage
 */
export function clearUploadState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear upload state:', error);
  }
}

/**
 * Check if an upload is currently active
 */
export function isUploadActive(): boolean {
  const state = loadUploadState();
  return state?.isUploading === true && activeUploadPromise !== null;
}

/**
 * Get current upload state
 */
export function getCurrentUploadState(): UploadState | null {
  return loadUploadState();
}

/**
 * Set the active upload promise (internal use)
 */
export function setActiveUpload(promise: Promise<any> | null): void {
  activeUploadPromise = promise;

  if (promise) {
    // Auto-clear when promise resolves
    promise.finally(() => {
      if (activeUploadPromise === promise) {
        activeUploadPromise = null;
      }
    });
  }
}

/**
 * Start tracking an upload
 */
export function startUploadTracking(
  uploadType: 'receiving' | 'item-list' | 'sales',
  fileName: string,
  total: number,
  currentStep: 'upload' | 'format' | 'flatten' | 'complete' = 'flatten'
): void {
  const state: UploadState = {
    isUploading: true,
    isPaused: false,
    fileName,
    startTime: Date.now(),
    currentStep,
    stats: {
      processed: 0,
      total,
      uploaded: 0,
      skipped: 0,
      failed: 0,
    },
    uploadType,
  };
  saveUploadState(state);
}

/**
 * Update upload progress
 */
export function updateUploadProgress(stats: {
  processed: number;
  total: number;
  uploaded: number;
  skipped: number;
  failed: number;
}): void {
  const state = loadUploadState();
  if (state) {
    state.stats = stats;
    saveUploadState(state);
  }
}

/**
 * Mark upload as complete
 */
export function completeUpload(): void {
  const state = loadUploadState();
  if (state) {
    state.isUploading = false;
    state.currentStep = 'complete';
    saveUploadState(state);
  }
  activeUploadPromise = null;
}

/**
 * Mark upload as failed/cancelled
 */
export function cancelUpload(): void {
  clearUploadState();
  activeUploadPromise = null;
}

/**
 * Subscribe to upload state changes
 * Returns unsubscribe function
 */
export function subscribeToUploadState(
  callback: (state: UploadState | null) => void
): () => void {
  let isMounted = true;
  let previousState = loadUploadState();
  let clearTimer: NodeJS.Timeout | null = null;

  const checkInterval = setInterval(() => {
    if (!isMounted) return;

    const currentState = loadUploadState();
    const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState);

    if (stateChanged) {
      previousState = currentState;
      callback(currentState);
    }

    // If upload is complete and no longer active, schedule a single clear
    if (currentState && !currentState.isUploading && !activeUploadPromise && !clearTimer) {
      clearTimer = setTimeout(() => {
        if (!isUploadActive()) {
          clearUploadState();
          callback(null); // Notify subscribers that state was cleared
        }
        clearTimer = null;
      }, 3000);
    }
  }, STATE_CHECK_INTERVAL);

  // Return unsubscribe function
  return () => {
    isMounted = false;
    clearInterval(checkInterval);
    if (clearTimer) {
      clearTimeout(clearTimer);
    }
  };
}

/**
 * Execute an upload with state tracking
 */
export async function executeTrackedUpload<T extends UploadResult>(
  uploadType: 'receiving' | 'item-list' | 'sales',
  fileName: string,
  uploadFn: (
    onProgress: (stats: {
      processed: number;
      total: number;
      uploaded: number;
      skipped: number;
      failed: number;
    }) => void
  ) => Promise<T>,
  total: number,
  currentStep: 'upload' | 'format' | 'flatten' | 'complete' = 'flatten'
): Promise<T> {
  // Start tracking
  startUploadTracking(uploadType, fileName, total, currentStep);

  try {
    // Execute upload with progress tracking
    const promise = uploadFn((stats) => {
      updateUploadProgress(stats);
    });

    // Store the promise globally
    setActiveUpload(promise);

    // Wait for completion
    const result = await promise;

    // Mark as complete
    completeUpload();

    return result;
  } catch (error) {
    // Mark as failed
    cancelUpload();
    throw error;
  }
}

/**
 * Pause the current upload
 */
export function pauseUpload(): void {
  isPausedFlag = true;
  const state = loadUploadState();
  if (state) {
    state.isPaused = true;
    saveUploadState(state);
  }
}

/**
 * Resume the current upload
 */
export function resumeUpload(): void {
  isPausedFlag = false;
  const state = loadUploadState();
  if (state) {
    state.isPaused = false;
    saveUploadState(state);
  }
}

/**
 * Stop the current upload
 */
export function stopUpload(): void {
  isStoppedFlag = true;
  isPausedFlag = false;
  cancelUpload();
}

/**
 * Check if upload is paused
 */
export function isUploadPaused(): boolean {
  return isPausedFlag;
}

/**
 * Check if upload is stopped
 */
export function isUploadStopped(): boolean {
  return isStoppedFlag;
}

/**
 * Reset control flags (call when starting new upload)
 */
export function resetUploadControlFlags(): void {
  isPausedFlag = false;
  isStoppedFlag = false;
}
