import React, { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface LoadingErrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  showRetryOption?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export function LoadingErrorModal({
  open,
  onOpenChange,
  onRefresh,
  onCancel,
  title = "Application Update Required",
  description = "A loading error occurred. The application needs to be refreshed to load the latest updates.",
  showRetryOption = true,
  retryCount = 0,
  maxRetries = 3
}: LoadingErrorModalProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Try to reload the current page
      window.location.reload();
    } catch (error) {
      console.error('[LoadingErrorModal] Retry failed:', error);
      onRefresh();
    }
  };

  const handleRefresh = async () => {
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
      
      console.log('[LoadingErrorModal] All caches cleared before refresh');
    } catch (error) {
      console.warn('[LoadingErrorModal] Failed to clear some caches before refresh:', error);
    }
    
    // Force reload with cache bypass
    window.location.href = window.location.href + '?v=' + Date.now();
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
            {retryCount > 0 && (
              <span className="block mt-2 text-xs">
                Retry attempt: {retryCount}/{maxRetries}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {showRetryOption && retryCount < maxRetries && (
            <Button
              variant="outline"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          )}
          
          <AlertDialogAction
            onClick={handleRefresh}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isRetrying ? 'Force Refresh' : 'Refresh Application'}
          </AlertDialogAction>
          
          <AlertDialogCancel
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
