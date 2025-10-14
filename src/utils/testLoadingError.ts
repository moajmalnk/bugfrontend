/**
 * Utility functions for testing the LoadingErrorModal
 * These should only be used in development mode
 */

// Global reference to the loading error modal hook (for testing)
let globalLoadingErrorModal: any = null;

export function setGlobalLoadingErrorModal(modal: any) {
  globalLoadingErrorModal = modal;
}

/**
 * Trigger the loading error modal for testing purposes
 * Only works in development mode
 */
export function triggerLoadingErrorModal() {
  if (process.env.NODE_ENV === 'development' && globalLoadingErrorModal) {
    globalLoadingErrorModal.showModal();
    console.log('Loading error modal triggered for testing');
  } else {
    console.warn('triggerLoadingErrorModal can only be used in development mode');
  }
}

/**
 * Simulate a chunk loading error for testing
 * Only works in development mode
 */
export function simulateChunkLoadingError() {
  if (process.env.NODE_ENV === 'development') {
    // Simulate a chunk loading error
    const error = new Error('Loading chunk 123 failed');
    error.name = 'ChunkLoadError';
    
    // Dispatch a custom error event
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Loading chunk 123 failed',
      filename: 'http://localhost:3000/assets/chunk-123.js',
      error: error
    }));
    
    console.log('Simulated chunk loading error for testing');
  } else {
    console.warn('simulateChunkLoadingError can only be used in development mode');
  }
}

// Make functions available globally in development for easy testing
if (process.env.NODE_ENV === 'development') {
  (window as any).triggerLoadingErrorModal = triggerLoadingErrorModal;
  (window as any).simulateChunkLoadingError = simulateChunkLoadingError;
}
