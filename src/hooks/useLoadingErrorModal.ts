import { useState, useEffect, useCallback } from 'react';

interface LoadingErrorModalState {
  isOpen: boolean;
  retryCount: number;
  isRetrying: boolean;
}

interface UseLoadingErrorModalReturn {
  isOpen: boolean;
  retryCount: number;
  isRetrying: boolean;
  showModal: () => void;
  hideModal: () => void;
  handleRetry: () => void;
  handleRefresh: () => void;
  handleCancel: () => void;
}

const MAX_RETRIES = 3;

export function useLoadingErrorModal(): UseLoadingErrorModalReturn {
  const [state, setState] = useState<LoadingErrorModalState>({
    isOpen: false,
    retryCount: 0,
    isRetrying: false,
  });

  const showModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
    }));
  }, []);

  const hideModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleRetry = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      // Try to reload the current page
      window.location.reload();
    } catch (error) {
      console.error('[useLoadingErrorModal] Retry failed:', error);
      handleRefresh();
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      // Clear all caches before refresh
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage cache if any
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('chunk'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('[useLoadingErrorModal] All caches cleared before refresh');
    } catch (error) {
      console.warn('[useLoadingErrorModal] Failed to clear some caches before refresh:', error);
    }
    
    // Force reload with cache bypass
    window.location.href = window.location.href + '?v=' + Date.now();
  }, []);

  const handleCancel = useCallback(() => {
    hideModal();
  }, [hideModal]);

  // Set up global error handlers
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event?.message || '';
      if (
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Loading chunk") ||
        message.includes("expected a JavaScript module script") ||
        message.includes("Loading CSS chunk") ||
        message.includes("MIME type") ||
        message.includes("module script")
      ) {
        console.warn('[useLoadingErrorModal] Chunk loading error detected:', message);
        showModal();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || '';
      if (
        reason.includes("Failed to fetch dynamically imported module") ||
        reason.includes("Loading chunk") ||
        reason.includes("expected a JavaScript module script") ||
        reason.includes("Loading CSS chunk") ||
        reason.includes("MIME type") ||
        reason.includes("module script")
      ) {
        console.warn('[useLoadingErrorModal] Chunk loading promise rejection:', reason);
        showModal();
      }
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [showModal]);

  // Reset retry count when modal is closed
  useEffect(() => {
    if (!state.isOpen) {
      setState(prev => ({
        ...prev,
        retryCount: 0,
        isRetrying: false,
      }));
    }
  }, [state.isOpen]);

  return {
    isOpen: state.isOpen,
    retryCount: state.retryCount,
    isRetrying: state.isRetrying,
    showModal,
    hideModal,
    handleRetry,
    handleRefresh,
    handleCancel,
  };
}
