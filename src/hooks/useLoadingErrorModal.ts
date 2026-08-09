import { useState, useEffect, useCallback } from 'react';
import { setGlobalLoadingErrorModal } from '@/utils/testLoadingError';
import {
  isChunkLoadFailureMessage,
  isOfflineChunkFailure,
} from '@/lib/chunkLoadError';

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
    setState((prev) => ({
      ...prev,
      isOpen: true,
    }));
  }, []);

  const hideModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleRetry = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1,
    }));

    try {
      window.location.reload();
    } catch {
      handleRefresh();
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('chunk'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      /* ignore */
    }

    window.location.href = window.location.href + '?v=' + Date.now();
  }, []);

  const handleCancel = useCallback(() => {
    hideModal();
  }, [hideModal]);

  useEffect(() => {
    setGlobalLoadingErrorModal({
      showModal,
      hideModal,
      handleRetry,
      handleRefresh,
      handleCancel,
    });
  }, [showModal, hideModal, handleRetry, handleRefresh, handleCancel]);

  // Only surface deploy/cache chunk errors while online.
  // Offline dynamic-import failures are handled by ChunkErrorHandler ("You're offline").
  useEffect(() => {
    const maybeShow = (message: string) => {
      if (!isChunkLoadFailureMessage(message)) return;
      if (isOfflineChunkFailure(message)) return;
      showModal();
    };

    const handleError = (event: ErrorEvent) => {
      maybeShow(event?.message || '');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || '';
      maybeShow(reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [showModal]);

  useEffect(() => {
    if (!state.isOpen) {
      setState((prev) => ({
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

void MAX_RETRIES;
