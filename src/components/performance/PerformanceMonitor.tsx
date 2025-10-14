import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const updateMetrics = () => {
      const newMetrics: PerformanceMetrics = { ...metrics };

      // First Contentful Paint (FCP)
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        newMetrics.fcp = fcpEntry.startTime;
      }

      // Largest Contentful Paint (LCP)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        newMetrics.lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }

      // First Input Delay (FID)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const fidEntry = fidEntries[0] as PerformanceEventTiming;
        newMetrics.fid = fidEntry.processingStart - fidEntry.startTime;
      }

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsEntries = performance.getEntriesByType('layout-shift');
      for (const entry of clsEntries) {
        const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      newMetrics.cls = clsValue;

      // Time to First Byte (TTFB)
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationEntry) {
        newMetrics.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      }

      // First Meaningful Paint (FMP) - approximated
      const paintEntries = performance.getEntriesByType('paint');
      const fmpEntry = paintEntries.find(entry => entry.name === 'first-meaningful-paint');
      if (fmpEntry) {
        newMetrics.fmp = fmpEntry.startTime;
      }

      // Time to Interactive (TTI) - approximated using domContentLoaded
      if (navigationEntry) {
        newMetrics.tti = navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime;
      }

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    };

    // Initial metrics collection
    updateMetrics();

    // Set up observers for dynamic metrics
    if ('PerformanceObserver' in window) {
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          const fidEntry = entry as PerformanceEventTiming;
          setMetrics(prev => ({ 
            ...prev, 
            fid: fidEntry.processingStart - fidEntry.startTime 
          }));
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value;
          }
        }
        setMetrics(prev => ({ ...prev, cls: prev.cls! + clsValue }));
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Cleanup observers
      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, [enabled, onMetricsUpdate]);

  // Log metrics in development
  useEffect(() => {
    if (enabled && process.env.NODE_ENV === 'development') {
      console.group('🚀 Performance Metrics');
      console.log('First Contentful Paint (FCP):', metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'Not available');
      console.log('Largest Contentful Paint (LCP):', metrics.lcp ? `${metrics.lcp.toFixed(2)}ms` : 'Not available');
      console.log('First Input Delay (FID):', metrics.fid ? `${metrics.fid.toFixed(2)}ms` : 'Not available');
      console.log('Cumulative Layout Shift (CLS):', metrics.cls !== null ? metrics.cls.toFixed(4) : 'Not available');
      console.log('Time to First Byte (TTFB):', metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'Not available');
      console.log('First Meaningful Paint (FMP):', metrics.fmp ? `${metrics.fmp.toFixed(2)}ms` : 'Not available');
      console.log('Time to Interactive (TTI):', metrics.tti ? `${metrics.tti.toFixed(2)}ms` : 'Not available');
      console.groupEnd();
    }
  }, [metrics, enabled]);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/80 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
      <div className="font-bold mb-2">Performance Metrics</div>
      <div className="space-y-1">
        <div>FCP: {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : '...'}</div>
        <div>LCP: {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : '...'}</div>
        <div>FID: {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : '...'}</div>
        <div>CLS: {metrics.cls !== null ? metrics.cls.toFixed(3) : '...'}</div>
        <div>TTFB: {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : '...'}</div>
      </div>
    </div>
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
    const updateMetrics = () => {
      const newMetrics: PerformanceMetrics = { ...metrics };

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

      setMetrics(newMetrics);
    };

    updateMetrics();
  }, []);

  return metrics;
};

export default PerformanceMonitor;
