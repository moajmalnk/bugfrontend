/**
 * Utility functions for testing the LoadingErrorModal
 * These should only be used in development mode
 */

type LoadingErrorModalControls = {
  showModal: () => void;
  hideModal: () => void;
  handleRetry: () => void;
  handleRefresh: () => void;
  handleCancel: () => void;
};

type LoadingErrorTestWindow = Window & {
  triggerLoadingErrorModal?: () => void;
  simulateChunkLoadingError?: () => void;
};

// Global reference to the loading error modal hook (for testing)
let globalLoadingErrorModal: LoadingErrorModalControls | null = null;

export function setGlobalLoadingErrorModal(modal: LoadingErrorModalControls) {
  globalLoadingErrorModal = modal;
}

/**
 * Trigger the loading error modal for testing purposes
 * Only works in development mode
 */
export function triggerLoadingErrorModal() {
  if (import.meta.env.DEV && globalLoadingErrorModal) {
    globalLoadingErrorModal.showModal();
  }
}

/**
 * Simulate a chunk loading error for testing
 * Only works in development mode
 */
export function simulateChunkLoadingError() {
  if (import.meta.env.DEV) {
    // Simulate a chunk loading error
    const error = new Error('Loading chunk 123 failed');
    error.name = 'ChunkLoadError';

    // Dispatch a custom error event
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'Loading chunk 123 failed',
        filename: 'http://localhost:3000/assets/chunk-123.js',
        error: error,
      })
    );
  }
}

// Make functions available globally in development for easy testing
if (import.meta.env.DEV) {
  const testWindow = window as LoadingErrorTestWindow;
  testWindow.triggerLoadingErrorModal = triggerLoadingErrorModal;
  testWindow.simulateChunkLoadingError = simulateChunkLoadingError;
}
