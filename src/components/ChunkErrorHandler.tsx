import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, WifiOff, ArrowLeft } from 'lucide-react';
import {
  isChunkLoadFailureMessage,
  isOfflineChunkFailure,
} from '@/lib/chunkLoadError';
import { isBrowserOnline, subscribeNetworkStatus } from '@/lib/networkStatus';

interface ChunkErrorHandlerProps {
  children: React.ReactNode;
}

type ChunkFailureKind = 'offline' | 'stale';

export function ChunkErrorHandler({ children }: ChunkErrorHandlerProps) {
  const [failureKind, setFailureKind] = useState<ChunkFailureKind | null>(null);
  const [errorInfo, setErrorInfo] = useState('');

  const captureFailure = useCallback((rawMessage: string) => {
    if (!isChunkLoadFailureMessage(rawMessage) && !rawMessage.toLowerCase().includes('loading chunk')) {
      // Also accept vite dynamic import failures that mention .tsx/.js module URLs
      const looksLikeDynamicImport =
        /failed to fetch dynamically imported module/i.test(rawMessage) ||
        /importing a module script failed/i.test(rawMessage);
      if (!looksLikeDynamicImport) return;
    }

    const offline = isOfflineChunkFailure(rawMessage);
    setErrorInfo(rawMessage || 'Failed to load application page');
    setFailureKind(offline ? 'offline' : 'stale');
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      if (
        isChunkLoadFailureMessage(message) ||
        (event.filename &&
          (event.filename.includes('chunk') || event.filename.includes('.js')) &&
          /failed to fetch|loading chunk|dynamically imported/i.test(message))
      ) {
        captureFailure(message);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message || String(reason ?? '');
      if (isChunkLoadFailureMessage(message)) {
        captureFailure(message);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [captureFailure]);

  // When connectivity returns after an offline chunk miss, reload the route automatically
  useEffect(() => {
    if (failureKind !== 'offline') return;

    return subscribeNetworkStatus((online) => {
      if (online) {
        window.location.reload();
      }
    });
  }, [failureKind]);

  const handleRetry = () => {
    if (!isBrowserOnline() && failureKind === 'offline') return;
    setFailureKind(null);
    setErrorInfo('');
    window.location.reload();
  };

  const handleGoBack = () => {
    const finish = () => {
      setFailureKind(null);
      setErrorInfo('');
    };

    if (window.history.length > 1) {
      const onPop = () => {
        window.removeEventListener('popstate', onPop);
        finish();
      };
      window.addEventListener('popstate', onPop);
      window.history.back();
      window.setTimeout(() => {
        window.removeEventListener('popstate', onPop);
        finish();
      }, 400);
      return;
    }

    window.location.href = '/';
  };

  const handleForceRefresh = () => {
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    window.location.reload();
  };

  if (failureKind === 'offline') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <WifiOff className="h-8 w-8 text-amber-500 shrink-0" />
            <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              This page hasn&apos;t been downloaded yet, so it can&apos;t open without a
              connection. BugRicer will reload it automatically when you&apos;re back online.
            </p>

            <div className="flex flex-col gap-2">
              <Button onClick={handleGoBack} className="w-full rounded-xl" variant="default">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go back
              </Button>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full rounded-xl"
                disabled={!isBrowserOnline()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Already-visited pages may still work offline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (failureKind === 'stale') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <h1 className="text-xl font-semibold text-foreground">Update required</h1>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              A newer version of BugRicer is available, or cached files are out of date.
              Refresh to load the latest app.
            </p>

            {errorInfo && import.meta.env.DEV && (
              <div className="bg-muted p-3 rounded-xl">
                <p className="text-xs text-muted-foreground font-mono break-all">{errorInfo}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={handleRetry} className="w-full rounded-xl" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={handleForceRefresh} variant="outline" className="w-full rounded-xl">
                Clear cache &amp; refresh
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
