import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ChunkErrorHandlerProps {
  children: React.ReactNode;
}

export function ChunkErrorHandler({ children }: ChunkErrorHandlerProps) {
  const [hasChunkError, setHasChunkError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string>('');

  useEffect(() => {
    // Handle chunk loading errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.filename &&
        (event.filename.includes('.js') || 
         event.filename.includes('chunk') ||
         event.message.includes('Loading chunk'))
      ) {
        console.error('Chunk loading error detected:', event);
        setErrorInfo(event.message || 'Failed to load application chunk');
        setHasChunkError(true);
      }
    };

    // Handle unhandled promise rejections from chunk loading
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason &&
        event.reason.message &&
        (event.reason.message.includes('Loading chunk') ||
         event.reason.message.includes('ChunkLoadError'))
      ) {
        console.error('Chunk loading rejection:', event.reason);
        setErrorInfo(event.reason.message);
        setHasChunkError(true);
      }
    };

    // Handle dynamic import errors
    const handleUnhandledError = (event: ErrorEvent) => {
      if (
        event.error &&
        (event.error.name === 'ChunkLoadError' ||
         event.error.message.includes('Loading chunk') ||
         event.error.message.includes('Loading CSS chunk'))
      ) {
        console.error('Chunk error detected:', event.error);
        setErrorInfo(event.error.message);
        setHasChunkError(true);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('error', handleUnhandledError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleUnhandledError);
    };
  }, []);

  const handleRetry = () => {
    setHasChunkError(false);
    setErrorInfo('');
    // Force a hard refresh to reload all chunks
    window.location.reload();
  };

  const handleForceRefresh = () => {
    // Clear all caches and force reload
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Clear service worker cache if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
    
    // Force reload
    window.location.reload();
  };

  if (hasChunkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4">
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <h1 className="text-xl font-semibold text-foreground">
                Loading Error
              </h1>
            </div>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">
                The application failed to load properly. This usually happens when:
              </p>
              
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Network connectivity issues</li>
                <li>• Cached files are outdated</li>
                <li>• Server configuration problems</li>
              </ul>
              
              {errorInfo && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {errorInfo}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  onClick={handleForceRefresh}
                  variant="outline"
                  className="w-full"
                >
                  Force Refresh & Clear Cache
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                If the problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
