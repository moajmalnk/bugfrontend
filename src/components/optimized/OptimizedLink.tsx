import React, { ComponentProps, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

interface OptimizedLinkProps extends ComponentProps<typeof RouterLink> {
  /**
   * Enable preloading of the route on hover
   */
  preload?: boolean;
  
  /**
   * Prefetch the route when link becomes visible
   */
  prefetch?: boolean;
  
  /**
   * Custom loading component for lazy routes
   */
  loadingComponent?: React.ComponentType;
  
  /**
   * Priority for preloading (high, low)
   */
  priority?: 'high' | 'low';
  
  /**
   * Track click analytics
   */
  trackClick?: boolean;
  
  /**
   * Custom prefetch delay in ms
   */
  prefetchDelay?: number;
  
  /**
   * Disable the link while loading
   */
  disableWhileLoading?: boolean;
}

// Route-based code splitting mapping with proper lazy loading functions
const ROUTE_COMPONENTS = {
  '/projects': () => import('@/pages/Projects'),
  '/bugs': () => import('@/pages/Bugs'),
  '/users': () => import('@/pages/Users'),
  '/settings': () => import('@/pages/Settings'),
  '/profile': () => import('@/pages/Profile'),
  '/activities': () => import('@/pages/Activity'),
  '/fixes': () => import('@/pages/Fixes'),
} as const;

// Lazy components for React rendering
const LAZY_COMPONENTS = {
  '/projects': lazy(() => import('@/pages/Projects')),
  '/bugs': lazy(() => import('@/pages/Bugs')),
  '/users': lazy(() => import('@/pages/Users')),
  '/settings': lazy(() => import('@/pages/Settings')),
  '/profile': lazy(() => import('@/pages/Profile')),
  '/activities': lazy(() => import('@/pages/Activity')),
  '/fixes': lazy(() => import('@/pages/Fixes')),
} as const;

// Preloader cache to avoid duplicate requests
const preloadCache = new Set<string>();
const prefetchCache = new Set<string>();

// Loading fallback component
const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

// Intersection Observer for prefetching
let observer: IntersectionObserver | null = null;

/**
 * High-performance Link component with advanced optimizations
 */
export const OptimizedLink: React.FC<OptimizedLinkProps> = ({
  to,
  children,
  preload = true,
  prefetch = true,
  loadingComponent: LoadingComponent = DefaultLoadingComponent,
  priority = 'low',
  trackClick = false,
  prefetchDelay = 100,
  disableWhileLoading = false,
  onMouseEnter,
  onClick,
  className,
  ...props
}) => {
  const navigate = useNavigate();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrefetched, setIsPrefetched] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();
  
  const targetPath = typeof to === 'string' ? to : to.pathname || '';
  
  // Check if route has code splitting
  const hasCodeSplitting = targetPath in ROUTE_COMPONENTS;
  
  /**
   * Preload route component and dependencies
   */
  const preloadRoute = useCallback(async (path: string, immediate = false) => {
    if (preloadCache.has(path)) return;
    
    preloadCache.add(path);
    
    try {
      if (hasCodeSplitting && ROUTE_COMPONENTS[path as keyof typeof ROUTE_COMPONENTS]) {
        // Preload the component using the import function
        const componentLoader = ROUTE_COMPONENTS[path as keyof typeof ROUTE_COMPONENTS];
        
        if (immediate) {
          await componentLoader();
        } else {
          // Use requestIdleCallback for low-priority preloading
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => componentLoader());
          } else {
            setTimeout(() => componentLoader(), 0);
          }
        }
      }
      
      // Preload API data if available
      if (path.includes('/projects/') || path.includes('/bugs/')) {
        const pathId = path.split('/').pop();
        if (pathId && pathId !== 'new') {
          // Prefetch API data for specific routes
          fetch(`/api/${path.split('/')[1]}/${pathId}`, {
            method: 'HEAD', // Just check if resource exists
          }).catch(() => {}); // Silently fail
        }
      }
      
    } catch (error) {
      //.warn('Failed to preload route:', path, error);
      preloadCache.delete(path);
    }
  }, [hasCodeSplitting]);
  
  /**
   * Handle mouse enter with debounced preloading
   */
  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (preload && !preloadCache.has(targetPath)) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      // Delay preloading to avoid unnecessary requests
      hoverTimeoutRef.current = setTimeout(() => {
        preloadRoute(targetPath, priority === 'high');
      }, priority === 'high' ? 0 : prefetchDelay);
    }
    
    onMouseEnter?.(event);
  }, [preload, targetPath, preloadRoute, priority, prefetchDelay, onMouseEnter]);
  
  /**
   * Handle optimized navigation
   */
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Track click analytics
    if (trackClick) {
      try {
        // Send analytics data
        if ('gtag' in window) {
          (window as any).gtag('event', 'click', {
            event_category: 'navigation',
            event_label: targetPath,
          });
        }
      } catch (error) {
        //.warn('Analytics tracking failed:', error);
      }
    }
    
    // Handle loading state for code-split routes
    if (hasCodeSplitting && disableWhileLoading) {
      setIsLoading(true);
      
      try {
        // Preload component before navigation
        await preloadRoute(targetPath, true);
        
        // Small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        //.error('Failed to preload route before navigation:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    onClick?.(event);
  }, [trackClick, targetPath, hasCodeSplitting, disableWhileLoading, preloadRoute, onClick]);
  
  /**
   * Handle mouse leave cleanup
   */
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = undefined;
    }
  }, []);
  
  /**
   * Intersection Observer for viewport-based prefetching
   */
  useEffect(() => {
    if (!prefetch || !linkRef.current) return;
    
    // Create observer if it doesn't exist
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const link = entry.target as HTMLAnchorElement;
              const href = link.getAttribute('data-prefetch-href');
              
              if (href && !prefetchCache.has(href)) {
                prefetchCache.add(href);
                
                // Delay prefetch to avoid overwhelming the browser
                setTimeout(() => {
                  preloadRoute(href);
                }, prefetchDelay);
                
                // Stop observing this element
                observer?.unobserve(entry.target);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Start prefetching when link is 50px away from viewport
          threshold: 0.1,
        }
      );
    }
    
    const currentLink = linkRef.current;
    currentLink.setAttribute('data-prefetch-href', targetPath);
    observer.observe(currentLink);
    
    return () => {
      if (currentLink && observer) {
        observer.unobserve(currentLink);
      }
    };
  }, [prefetch, targetPath, preloadRoute, prefetchDelay]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Combine class names with loading state
  const combinedClassName = [
    className,
    isLoading && disableWhileLoading ? 'opacity-75 pointer-events-none' : '',
    'transition-opacity duration-200',
  ].filter(Boolean).join(' ');
  
  return (
    <RouterLink
      ref={linkRef}
      to={to}
      className={combinedClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      {isLoading && disableWhileLoading ? (
        <span className="inline-flex items-center gap-2">
          <LoadingComponent />
          {children}
        </span>
      ) : (
        children
      )}
    </RouterLink>
  );
};

/**
 * Higher-order component for wrapping routes with Suspense
 */
export const withSuspense = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  LoadingComponent: React.ComponentType = DefaultLoadingComponent
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...(props as P)} ref={ref} />
    </Suspense>
  ));
  
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Hook for programmatic route preloading
 */
export const useRoutePreloader = () => {
  const preloadRoute = useCallback(async (path: string) => {
    if (preloadCache.has(path)) return;
    
    preloadCache.add(path);
    
    try {
      if (path in ROUTE_COMPONENTS) {
        const componentLoader = ROUTE_COMPONENTS[path as keyof typeof ROUTE_COMPONENTS];
        await componentLoader();
      }
    } catch (error) {
      //.warn('Failed to preload route:', path, error);
      preloadCache.delete(path);
    }
  }, []);
  
  const preloadRoutes = useCallback(async (paths: string[]) => {
    await Promise.allSettled(paths.map(preloadRoute));
  }, [preloadRoute]);
  
  const clearPreloadCache = useCallback(() => {
    preloadCache.clear();
    prefetchCache.clear();
  }, []);
  
  return {
    preloadRoute,
    preloadRoutes,
    clearPreloadCache,
    isPreloaded: (path: string) => preloadCache.has(path),
  };
};

/**
 * Performance metrics hook
 */
export const useLinkPerformance = () => {
  const [metrics, setMetrics] = useState({
    preloadHits: 0,
    preloadMisses: 0,
    averageNavigationTime: 0,
    totalNavigations: 0,
  });
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        preloadHits: preloadCache.size,
        preloadMisses: prefetchCache.size - preloadCache.size,
        averageNavigationTime: 0, // Would need to implement timing
        totalNavigations: preloadCache.size + prefetchCache.size,
      });
    };
    
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

/**
 * Get the lazy component for a route
 */
export const getLazyComponent = (path: string) => {
  return LAZY_COMPONENTS[path as keyof typeof LAZY_COMPONENTS];
};

export default OptimizedLink; 