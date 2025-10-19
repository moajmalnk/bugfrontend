import React, { useEffect, useState, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
  fmp: number | null;
  tti: number | null;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fmp: null,
    tti: null,
  });

  const observersRef = useRef<PerformanceObserver[]>([]);
  const clsValueRef = useRef(0);

  const collectInitialMetrics = useCallback(() => {
    try {
      const newMetrics: PerformanceMetrics = {
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
        fmp: null,
        tti: null,
      };

      // First Contentful Paint (FCP)
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        newMetrics.fcp = fcpEntry.startTime;
      }

      // Largest Contentful Paint (LCP) - Using PerformanceObserver
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            newMetrics.lcp = lastEntry.startTime;
            setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // Fallback for browsers that don't support PerformanceObserver
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          newMetrics.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        }
      }

      // First Input Delay (FID) - Using PerformanceObserver
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0) {
            const fidEntry = entries[0] as PerformanceEventTiming;
            const fid = fidEntry.processingStart - fidEntry.startTime;
            newMetrics.fid = fid;
            setMetrics(prev => ({ ...prev, fid }));
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // Fallback for browsers that don't support PerformanceObserver
        const fidEntries = performance.getEntriesByType('first-input');
        if (fidEntries.length > 0) {
          const fidEntry = fidEntries[0] as PerformanceEventTiming;
          newMetrics.fid = fidEntry.processingStart - fidEntry.startTime;
        }
      }

      // Cumulative Layout Shift (CLS) - Using PerformanceObserver
      let clsValue = 0;
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          for (const entry of entries) {
            const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!layoutShiftEntry.hadRecentInput) {
              clsValue += layoutShiftEntry.value;
            }
          }
          newMetrics.cls = clsValue;
          clsValueRef.current = clsValue;
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Fallback for browsers that don't support PerformanceObserver
        const clsEntries = performance.getEntriesByType('layout-shift');
        for (const entry of clsEntries) {
          const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        newMetrics.cls = clsValue;
        clsValueRef.current = clsValue;
      }

      // Time to First Byte (TTFB)
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        newMetrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        newMetrics.tti = navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime;
      }

      // First Meaningful Paint (FMP) - approximated using FCP if available
      if (fcpEntry) {
        newMetrics.fmp = fcpEntry.startTime;
      }

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    } catch (error) {
      console.warn('Failed to collect initial performance metrics:', error);
    }
  }, [onMetricsUpdate]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Collect initial metrics after a short delay to ensure performance entries are available
    const timeoutId = setTimeout(collectInitialMetrics, 100);

    // Set up observers for dynamic metrics
    if ('PerformanceObserver' in window) {
      try {
        // LCP Observer
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observersRef.current.push(lcpObserver);

        // FID Observer
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            const fidEntry = entry as PerformanceEventTiming;
            const fidValue = fidEntry.processingStart - fidEntry.startTime;
            setMetrics(prev => ({ ...prev, fid: fidValue }));
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        observersRef.current.push(fidObserver);

        // CLS Observer
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!layoutShiftEntry.hadRecentInput) {
              clsValueRef.current += layoutShiftEntry.value;
              setMetrics(prev => ({ ...prev, cls: clsValueRef.current }));
            }
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observersRef.current.push(clsObserver);
      } catch (error) {
        console.warn('Failed to set up performance observers:', error);
      }
    }

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      observersRef.current.forEach(observer => {
        try {
          observer.disconnect();
        } catch (error) {
          console.warn('Failed to disconnect performance observer:', error);
        }
      });
      observersRef.current = [];
    };
  }, [enabled, collectInitialMetrics]);

  // Log metrics in development with throttling
  useEffect(() => {
    if (enabled && process.env.NODE_ENV === 'development') {
      // Throttle console logging to avoid spam - only log once per session
      const hasLogged = sessionStorage.getItem('performance-metrics-logged');
      if (!hasLogged) {
        const timeoutId = setTimeout(() => {
          console.group('🚀 Performance Metrics');
          console.log('First Contentful Paint (FCP):', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'Not available');
          console.log('Largest Contentful Paint (LCP):', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'Not available');
          console.log('First Input Delay (FID):', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'Not available');
          console.log('Cumulative Layout Shift (CLS):', metrics.cls !== null ? metrics.cls.toFixed(4) : 'Not available');
          console.log('Time to First Byte (TTFB):', metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'Not available');
          console.log('First Meaningful Paint (FMP):', metrics.fmp ? `${metrics.fmp.toFixed(2)}ms` : 'Not available');
          console.log('Time to Interactive (TTI):', metrics.tti ? `${metrics.tti.toFixed(2)}ms` : 'Not available');
          console.groupEnd();
          sessionStorage.setItem('performance-metrics-logged', 'true');
        }, 1000); // Increased delay to 1 second

        return () => clearTimeout(timeoutId);
      }
    }
  }, [metrics, enabled]);

  // Helper function to get performance level color
  const getPerformanceColor = (metric: string, value: number | null) => {
    if (value === null) return 'text-gray-400';
    
    switch (metric) {
      case 'fcp':
        return value <= 1800 ? 'text-green-400' : value <= 3000 ? 'text-yellow-400' : 'text-red-400';
      case 'lcp':
        return value <= 2500 ? 'text-green-400' : value <= 4000 ? 'text-yellow-400' : 'text-red-400';
      case 'fid':
        return value <= 100 ? 'text-green-400' : value <= 300 ? 'text-yellow-400' : 'text-red-400';
      case 'cls':
        return value <= 0.1 ? 'text-green-400' : value <= 0.25 ? 'text-yellow-400' : 'text-red-400';
      case 'ttfb':
        return value <= 800 ? 'text-green-400' : value <= 1800 ? 'text-yellow-400' : 'text-red-400';
      default:
        return 'text-white';
    }
  };

  if (!enabled) return null;

  return (
    // <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-3 rounded-lg text-xs font-mono max-w-xs border border-gray-700">
    //   <div className="font-bold mb-2 text-cyan-400">Performance Metrics</div>
    //   <div className="space-y-1">
    //     <div className="flex justify-between">
    //       <span>FCP:</span>
    //       <span className={getPerformanceColor('fcp', metrics.fcp)}>
    //         {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : '...'}
    //       </span>
    //     </div>
    //     <div className="flex justify-between">
    //       <span>LCP:</span>
    //       <span className={getPerformanceColor('lcp', metrics.lcp)}>
    //         {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : '...'}
    //       </span>
    //     </div>
    //     <div className="flex justify-between">
    //       <span>FID:</span>
    //       <span className={getPerformanceColor('fid', metrics.fid)}>
    //         {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : '...'}
    //       </span>
    //     </div>
    //     <div className="flex justify-between">
    //       <span>CLS:</span>
    //       <span className={getPerformanceColor('cls', metrics.cls)}>
    //         {metrics.cls !== null ? metrics.cls.toFixed(3) : '...'}
    //       </span>
    //     </div>
    //     <div className="flex justify-between">
    //       <span>TTFB:</span>
    //       <span className={getPerformanceColor('ttfb', metrics.ttfb)}>
    //         {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : '...'}
    //       </span>
    //     </div>
    //   </div>
    //   <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
    //     <div className="flex justify-between">
    //       <span>TTI:</span>
    //       <span>{metrics.tti ? `${metrics.tti.toFixed(0)}ms` : '...'}</span>
    //     </div>
    //   </div>
    // </div>
    null
  );
};

// Hook for accessing performance metrics
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: null,
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
    fmp: null,
    tti: null,
  });

  useEffect(() => {
    const collectMetrics = () => {
      try {
        const newMetrics: PerformanceMetrics = {
          fcp: null,
          lcp: null,
          fid: null,
          cls: null,
          ttfb: null,
          fmp: null,
          tti: null,
        };

        // Collect all available metrics
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) newMetrics.fcp = fcpEntry.startTime;

        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          newMetrics.lcp = lcpEntries[lcpEntries.length - 1].startTime;
        }

        const fidEntries = performance.getEntriesByType('first-input');
        if (fidEntries.length > 0) {
          const fidEntry = fidEntries[0] as PerformanceEventTiming;
          newMetrics.fid = fidEntry.processingStart - fidEntry.startTime;
        }

        let clsValue = 0;
        const clsEntries = performance.getEntriesByType('layout-shift');
        for (const entry of clsEntries) {
          const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        newMetrics.cls = clsValue;

        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          newMetrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
          newMetrics.tti = navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime;
        }

        // First Meaningful Paint (FMP) - approximated using FCP if available
        if (fcpEntry) {
          newMetrics.fmp = fcpEntry.startTime;
        }

        setMetrics(newMetrics);
      } catch (error) {
        console.warn('Failed to collect performance metrics:', error);
      }
    };

    // Collect metrics after a short delay to ensure performance entries are available
    const timeoutId = setTimeout(collectMetrics, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return metrics;
};

export default PerformanceMonitor;
