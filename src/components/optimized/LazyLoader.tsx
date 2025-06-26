import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Loading components for different contexts
const PageSkeleton = () => (
  <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300 max-w-7xl">
    <div className="mb-8">
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <div className="flex items-center justify-between pt-2">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="h-8 w-24" />
    </div>
  </div>
);

const TableSkeleton = () => (
  <div className="space-y-3">
    <Skeleton className="h-10 w-full" />
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
);

const SpinnerSkeleton = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

// Helper function to handle both default and named exports
const createLazyComponent = (importFn: () => Promise<any>, exportName?: string) => {
  return lazy(() => importFn().then(module => ({
    default: exportName ? module[exportName] : module.default || module
  })));
};

// Lazy-loaded page components with preloading
export const LazyPages = {
  Dashboard: lazy(() => import('@/pages/Dashboard')),
  Bugs: lazy(() => import('@/pages/Bugs')),
  Projects: lazy(() => import('@/pages/Projects')),
  Users: lazy(() => import('@/pages/Users')),
  Settings: lazy(() => import('@/pages/Settings')),
  Profile: lazy(() => import('@/pages/Profile')),
  Activity: lazy(() => import('@/pages/Activity')),
  Fixes: lazy(() => import('@/pages/Fixes')),
  BugDetails: lazy(() => import('@/pages/BugDetails')),
  ProjectDetails: lazy(() => import('@/pages/ProjectDetails')),
  NewBug: lazy(() => import('@/pages/NewBug')),
  NewUpdate: lazy(() => import('@/pages/NewUpdate')),
  Updates: lazy(() => import('@/pages/Updates')),
  UpdateDetails: lazy(() => import('@/pages/UpdateDetails')),
  EditUpdate: lazy(() => import('@/pages/EditUpdate')),
  FixBug: lazy(() => import('@/pages/FixBug')),
  Reports: lazy(() => import('@/pages/Reports')),
  Messages: lazy(() => import('@/pages/Messages')),
} as const;

// Lazy-loaded component components
export const LazyComponents = {
  BugCard: createLazyComponent(() => import('@/components/bugs/BugCard'), 'BugCard'),
  EditBugDialog: lazy(() => import('@/components/bugs/EditBugDialog')),
  NewProjectDialog: createLazyComponent(() => import('@/components/projects/NewProjectDialog'), 'NewProjectDialog'),
  EditProjectDialog: createLazyComponent(() => import('@/components/projects/EditProjectDialog'), 'EditProjectDialog'),
  AddUserDialog: createLazyComponent(() => import('@/components/users/AddUserDialog'), 'AddUserDialog'),
  EditUserDialog: createLazyComponent(() => import('@/components/users/EditUserDialog'), 'EditUserDialog'),
  AnnouncementDialog: createLazyComponent(() => import('@/components/settings/AnnouncementDialog'), 'AnnouncementDialog'),
} as const;

// Loading skeleton types
type SkeletonType = 'page' | 'card' | 'table' | 'spinner';

// Props for LazyLoader component
interface LazyLoaderProps {
  component: ComponentType<any>;
  fallback?: ReactNode;
  skeletonType?: SkeletonType;
  preload?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Preload cache to avoid duplicate requests
const preloadCache = new Set<string>();

/**
 * Advanced LazyLoader component with performance optimizations
 */
export const LazyLoader: React.FC<LazyLoaderProps> = ({
  component: Component,
  fallback,
  skeletonType = 'page',
  preload = false,
  onLoad,
  onError,
}) => {
  // Get appropriate skeleton based on type
  const getSkeleton = () => {
    switch (skeletonType) {
      case 'card':
        return <CardSkeleton />;
      case 'table':
        return <TableSkeleton />;
      case 'spinner':
        return <SpinnerSkeleton />;
      case 'page':
      default:
        return <PageSkeleton />;
    }
  };

  // Preload component if requested
  React.useEffect(() => {
    if (preload && !preloadCache.has(Component.name)) {
      preloadCache.add(Component.name);
      // Trigger preload by creating a temporary instance
      const tempComponent = <Component />;
    }
  }, [Component, preload]);

  return (
    <Suspense 
      fallback={fallback || getSkeleton()}
    >
      <ErrorBoundary onError={onError}>
        <Component onLoad={onLoad} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Error boundary for lazy-loaded components
class ErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoader Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-lg font-semibold mb-2">
              Failed to load component
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for programmatic preloading
export const usePreloader = () => {
  const preloadComponent = React.useCallback(async (componentName: string) => {
    if (preloadCache.has(componentName)) return;
    
    preloadCache.add(componentName);
    
    try {
      // Find component in LazyPages or LazyComponents
      const component = (LazyPages as any)[componentName] || (LazyComponents as any)[componentName];
      if (component) {
        // Trigger preload by creating a temporary instance
        const tempComponent = <component.default />;
      }
    } catch (error) {
      console.warn('Failed to preload component:', componentName, error);
      preloadCache.delete(componentName);
    }
  }, []);

  const preloadMultiple = React.useCallback(async (componentNames: string[]) => {
    await Promise.allSettled(componentNames.map(preloadComponent));
  }, [preloadComponent]);

  const clearPreloadCache = React.useCallback(() => {
    preloadCache.clear();
  }, []);

  return {
    preloadComponent,
    preloadMultiple,
    clearPreloadCache,
    isPreloaded: (componentName: string) => preloadCache.has(componentName),
  };
};

// Higher-order component for automatic preloading
export const withPreloading = <P extends object>(
  Component: ComponentType<P>,
  preloadDependencies: string[] = []
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    const { preloadMultiple } = usePreloader();

    React.useEffect(() => {
      if (preloadDependencies.length > 0) {
        preloadMultiple(preloadDependencies);
      }
    }, [preloadMultiple]);

    return <Component {...(props as P)} ref={ref} />;
  });

  WrappedComponent.displayName = `withPreloading(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Performance monitoring hook
export const useLazyLoaderPerformance = () => {
  const [metrics, setMetrics] = React.useState({
    totalLoads: 0,
    successfulLoads: 0,
    failedLoads: 0,
    averageLoadTime: 0,
    preloadHits: preloadCache.size,
  });

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(prev => ({
        ...prev,
        preloadHits: preloadCache.size,
      }));
    };

    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return metrics;
};

export default LazyLoader; 