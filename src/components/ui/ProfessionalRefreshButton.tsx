import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, RotateCcw, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProfessionalRefreshButtonProps {
  onRefresh?: () => void;
  onHardRefresh?: () => void;
  onClearCache?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showDropdown?: boolean;
  label?: string;
  showIcons?: boolean;
}

export function ProfessionalRefreshButton({
  onRefresh,
  onHardRefresh,
  onClearCache,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default',
  showDropdown = true,
  label = 'Refresh',
  showIcons = true
}: ProfessionalRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);

  const handleRegularRefresh = async () => {
    if (disabled || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        // Default behavior - regular refresh
        window.location.reload();
      }
    } catch (error) {
      console.error('Regular refresh failed:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleHardRefresh = async () => {
    if (disabled || isHardRefreshing) return;
    
    setIsHardRefreshing(true);
    try {
      if (onHardRefresh) {
        await onHardRefresh();
      } else {
        // Default behavior - hard refresh with cache clearing
        await clearAllCaches();
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
      }
    } catch (error) {
      console.error('Hard refresh failed:', error);
    } finally {
      setTimeout(() => setIsHardRefreshing(false), 1000);
    }
  };

  const handleClearCache = async () => {
    try {
      if (onClearCache) {
        await onClearCache();
      } else {
        await clearAllCaches();
      }
    } catch (error) {
      console.error('Clear cache failed:', error);
    }
  };

  const clearAllCaches = async () => {
    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear localStorage cache entries
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('chunk') || key.includes('vite'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage cache entries
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('cache') || key.includes('chunk') || key.includes('vite'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      console.log('All caches cleared successfully');
    } catch (error) {
      console.warn('Failed to clear some caches:', error);
    }
  };

  if (!showDropdown) {
    return (
      <Button
        onClick={handleRegularRefresh}
        disabled={disabled || isRefreshing}
        variant={variant}
        size={size}
        className={`${className} ${isRefreshing ? 'animate-pulse' : ''}`}
      >
        {showIcons && (
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
        {isRefreshing ? 'Refreshing...' : label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          disabled={disabled || isRefreshing || isHardRefreshing}
          variant={variant}
          size={size}
          className={`${className} ${(isRefreshing || isHardRefreshing) ? 'animate-pulse' : ''}`}
        >
          {showIcons && (
            <RefreshCw className={`mr-2 h-4 w-4 ${(isRefreshing || isHardRefreshing) ? 'animate-spin' : ''}`} />
          )}
          {(isRefreshing || isHardRefreshing) ? 'Refreshing...' : label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleRegularRefresh}
          disabled={disabled || isRefreshing}
          className="cursor-pointer"
        >
          {showIcons && <RefreshCw className="mr-2 h-4 w-4" />}
          <div className="flex flex-col">
            <span className="font-medium">Regular Refresh</span>
            <span className="text-xs text-muted-foreground">Reload the page normally</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuItem
          onClick={handleHardRefresh}
          disabled={disabled || isHardRefreshing}
          className="cursor-pointer"
        >
          {showIcons && <RotateCcw className="mr-2 h-4 w-4" />}
          <div className="flex flex-col">
            <span className="font-medium">Hard Refresh</span>
            <span className="text-xs text-muted-foreground">Clear cache and reload</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleClearCache}
          disabled={disabled}
          className="cursor-pointer"
        >
          {showIcons && <Zap className="mr-2 h-4 w-4" />}
          <div className="flex flex-col">
            <span className="font-medium">Clear Cache Only</span>
            <span className="text-xs text-muted-foreground">Clear all cached data</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook for using the refresh functionality
export function useProfessionalRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async (type: 'regular' | 'hard' = 'regular') => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      if (type === 'hard') {
        // Clear all caches before refresh
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        }
        
        // Clear localStorage cache entries
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('cache') || key.includes('chunk') || key.includes('vite'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Force reload with cache bypass
        window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
      } else {
        // Regular refresh
        window.location.reload();
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return {
    refresh,
    isRefreshing
  };
}
