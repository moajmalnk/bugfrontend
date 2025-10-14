import React, { useEffect, useState } from 'react';

interface BundleInfo {
  name: string;
  size: number;
  gzippedSize?: number;
  type: 'script' | 'style' | 'asset';
  priority: 'high' | 'medium' | 'low';
}

interface BundleAnalyzerProps {
  enabled?: boolean;
  showDetails?: boolean;
}

export const BundleAnalyzer: React.FC<BundleAnalyzerProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  showDetails = false,
}) => {
  const [bundles, setBundles] = useState<BundleInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const analyzeBundles = () => {
      const bundleInfo: BundleInfo[] = [];
      let total = 0;

      // Analyze script tags
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach((script) => {
        const src = script.getAttribute('src');
        if (src && !src.includes('chrome-extension')) {
          bundleInfo.push({
            name: src.split('/').pop() || src,
            size: 0, // Size would need to be fetched
            type: 'script',
            priority: src.includes('vendor') ? 'high' : 'medium',
          });
        }
      });

      // Analyze link tags (CSS)
      const styles = document.querySelectorAll('link[rel="stylesheet"]');
      styles.forEach((style) => {
        const href = style.getAttribute('href');
        if (href && !href.includes('chrome-extension')) {
          bundleInfo.push({
            name: href.split('/').pop() || href,
            size: 0,
            type: 'style',
            priority: 'medium',
          });
        }
      });

      // Analyze performance entries
      if ('performance' in window) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        resources.forEach((resource) => {
          const name = resource.name.split('/').pop() || resource.name;
          const size = resource.transferSize || 0;
          
          if (size > 0) {
            let type: 'script' | 'style' | 'asset' = 'asset';
            let priority: 'high' | 'medium' | 'low' = 'low';
            
            if (resource.name.includes('.js')) {
              type = 'script';
              priority = resource.name.includes('vendor') || resource.name.includes('main') ? 'high' : 'medium';
            } else if (resource.name.includes('.css')) {
              type = 'style';
              priority = 'medium';
            } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) {
              type = 'asset';
              priority = size > 100000 ? 'high' : 'low';
            }
            
            bundleInfo.push({
              name,
              size,
              type,
              priority,
            });
            
            total += size;
          }
        });
      }

      setBundles(bundleInfo);
      setTotalSize(total);
    };

    // Analyze after a delay to ensure all resources are loaded
    const timeoutId = setTimeout(analyzeBundles, 2000);
    
    return () => clearTimeout(timeoutId);
  }, [enabled]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'script': return '📜';
      case 'style': return '🎨';
      case 'asset': return '📁';
      default: return '📄';
    }
  };

  if (!enabled || bundles.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/90 text-white p-4 rounded-lg max-w-md max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">Bundle Analyzer</h3>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
        >
          {isVisible ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div className="text-xs mb-3">
        <div>Total Size: <span className="font-mono">{formatSize(totalSize)}</span></div>
        <div>Resources: <span className="font-mono">{bundles.length}</span></div>
      </div>

      {isVisible && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {bundles
            .sort((a, b) => b.size - a.size)
            .slice(0, 20) // Show top 20 largest resources
            .map((bundle, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span>{getTypeIcon(bundle.type)}</span>
                  <span className="truncate" title={bundle.name}>
                    {bundle.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <span className={`font-mono ${getPriorityColor(bundle.priority)}`}>
                    {formatSize(bundle.size)}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {bundle.priority}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

// Hook for bundle analysis
export const useBundleAnalysis = () => {
  const [bundles, setBundles] = useState<BundleInfo[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeBundles = async () => {
    setIsAnalyzing(true);
    
    try {
      const bundleInfo: BundleInfo[] = [];
      
      if ('performance' in window) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        resources.forEach((resource) => {
          const name = resource.name.split('/').pop() || resource.name;
          const size = resource.transferSize || 0;
          
          if (size > 0) {
            let type: 'script' | 'style' | 'asset' = 'asset';
            let priority: 'high' | 'medium' | 'low' = 'low';
            
            if (resource.name.includes('.js')) {
              type = 'script';
              priority = resource.name.includes('vendor') || resource.name.includes('main') ? 'high' : 'medium';
            } else if (resource.name.includes('.css')) {
              type = 'style';
              priority = 'medium';
            } else if (resource.name.match(/\.(png|jpg|jpeg|gif|svg|webp|avif)$/i)) {
              type = 'asset';
              priority = size > 100000 ? 'high' : 'low';
            }
            
            bundleInfo.push({
              name,
              size,
              type,
              priority,
            });
          }
        });
      }
      
      setBundles(bundleInfo.sort((a, b) => b.size - a.size));
    } catch (error) {
      console.error('Bundle analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getLargestBundles = (count: number = 10) => {
    return bundles.slice(0, count);
  };

  const getBundlesByType = (type: 'script' | 'style' | 'asset') => {
    return bundles.filter(bundle => bundle.type === type);
  };

  const getTotalSize = () => {
    return bundles.reduce((total, bundle) => total + bundle.size, 0);
  };

  const getTotalSizeByType = (type: 'script' | 'style' | 'asset') => {
    return bundles
      .filter(bundle => bundle.type === type)
      .reduce((total, bundle) => total + bundle.size, 0);
  };

  return {
    bundles,
    isAnalyzing,
    analyzeBundles,
    getLargestBundles,
    getBundlesByType,
    getTotalSize,
    getTotalSizeByType,
  };
};

export default BundleAnalyzer;
