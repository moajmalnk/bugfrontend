import React, { useState, useRef, useEffect, useCallback, ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /**
   * Image source URL
   */
  src: string;
  
  /**
   * Fallback image URL if main image fails to load
   */
  fallbackSrc?: string;
  
  /**
   * Alt text for accessibility
   */
  alt: string;
  
  /**
   * Enable lazy loading (default: true)
   */
  lazy?: boolean;
  
  /**
   * Enable WebP format when available (default: true)
   */
  webp?: boolean;
  
  /**
   * Responsive image sizes
   */
  sizes?: string;
  
  /**
   * Source set for different screen densities
   */
  srcSet?: string;
  
  /**
   * Quality for image optimization (1-100)
   */
  quality?: number;
  
  /**
   * Enable blur placeholder while loading
   */
  placeholder?: boolean;
  
  /**
   * Custom placeholder component
   */
  placeholderComponent?: React.ComponentType;
  
  /**
   * Intersection observer root margin for lazy loading
   */
  rootMargin?: string;
  
  /**
   * Custom loading component
   */
  loadingComponent?: React.ComponentType;
  
  /**
   * Enable fade-in animation when loaded
   */
  fadeIn?: boolean;
  
  /**
   * Callback when image loads successfully
   */
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  
  /**
   * Callback when image fails to load
   */
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  
  /**
   * Priority loading for above-the-fold images
   */
  priority?: boolean;
  
  /**
   * Custom aspect ratio (width:height)
   */
  aspectRatio?: string;
}

// Default placeholder component
const DefaultPlaceholder = () => (
  <div className="bg-gray-200 animate-pulse flex items-center justify-center">
    <svg
      className="w-8 h-8 text-gray-400"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" />
    </svg>
  </div>
);

// Loading component
const DefaultLoading = () => (
  <div className="bg-gray-100 animate-pulse flex items-center justify-center">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * Check if WebP is supported by the browser
 */
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// Cache WebP support check
let webpSupported: boolean | null = null;

/**
 * Generate optimized image URL with transformations
 */
const generateOptimizedUrl = (
  src: string,
  {
    webp = true,
    quality = 80,
    width,
    height,
  }: {
    webp?: boolean;
    quality?: number;
    width?: number;
    height?: number;
  } = {}
): string => {
  // If it's already a data URL or external URL, return as-is
  if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }
  
  const params = new URLSearchParams();
  
  if (webp && webpSupported) {
    params.set('format', 'webp');
  }
  
  if (quality && quality !== 80) {
    params.set('quality', quality.toString());
  }
  
  if (width) {
    params.set('w', width.toString());
  }
  
  if (height) {
    params.set('h', height.toString());
  }
  
  const queryString = params.toString();
  const separator = src.includes('?') ? '&' : '?';
  
  return queryString ? `${src}${separator}${queryString}` : src;
};

/**
 * Intersection Observer instance for lazy loading
 */
let intersectionObserver: IntersectionObserver | null = null;

/**
 * High-performance Image component with multiple optimizations
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc,
  lazy = true,
  webp = true,
  quality = 80,
  placeholder = true,
  placeholderComponent: PlaceholderComponent = DefaultPlaceholder,
  loadingComponent: LoadingComponent = DefaultLoading,
  rootMargin = '50px',
  fadeIn = true,
  priority = false,
  aspectRatio,
  onLoad,
  onError,
  className,
  style,
  ...props
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  
  /**
   * Initialize WebP support check
   */
  useEffect(() => {
    if (webpSupported === null && webp) {
      checkWebPSupport().then((supported) => {
        webpSupported = supported;
        
        // Re-generate URL with WebP support info
        if (isInView) {
          const optimizedSrc = generateOptimizedUrl(src, {
            webp: webp && supported,
            quality,
          });
          setCurrentSrc(optimizedSrc);
        }
      });
    }
  }, [src, webp, quality, isInView]);
  
  /**
   * Generate optimized image URL
   */
  useEffect(() => {
    if (isInView && src) {
      const optimizedSrc = generateOptimizedUrl(src, {
        webp: webp && (webpSupported ?? false),
        quality,
      });
      setCurrentSrc(optimizedSrc);
    }
  }, [src, isInView, webp, quality]);
  
  /**
   * Handle image load success
   */
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.(event);
  }, [onLoad]);
  
  /**
   * Handle image load error with fallback
   */
  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsError(true);
    
    // Try fallback image if available
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsError(false);
      return;
    }
    
    onError?.(event);
  }, [currentSrc, fallbackSrc, onError]);
  
  /**
   * Intersection Observer for lazy loading
   */
  useEffect(() => {
    if (!lazy || priority || !imgRef.current) return;
    
    // Create observer if it doesn't exist
    if (!intersectionObserver) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              intersectionObserver?.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin,
          threshold: 0.1,
        }
      );
    }
    
    const currentImg = imgRef.current;
    intersectionObserver.observe(currentImg);
    
    return () => {
      if (currentImg && intersectionObserver) {
        intersectionObserver.unobserve(currentImg);
      }
    };
  }, [lazy, priority, rootMargin]);
  
  /**
   * Preload critical images
   */
  useEffect(() => {
    if (priority && currentSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = currentSrc;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, currentSrc]);
  
  // Calculate aspect ratio styles
  const aspectRatioStyle = aspectRatio
    ? {
        aspectRatio,
        objectFit: 'cover' as const,
      }
    : {};
  
  // Combine styles
  const combinedStyle = {
    ...aspectRatioStyle,
    transition: fadeIn ? 'opacity 0.3s ease-in-out' : undefined,
    opacity: fadeIn ? (isLoaded ? 1 : 0) : 1,
    ...style,
  };
  
  // Combine class names
  const combinedClassName = [
    className,
    'max-w-full h-auto',
    fadeIn && !isLoaded ? 'opacity-0' : '',
    isLoaded ? 'opacity-100' : '',
  ].filter(Boolean).join(' ');
  
  // Show placeholder when not in view or loading
  if (!isInView && lazy && !priority) {
    return (
      <div
        ref={imgRef}
        className={`${className || ''} flex items-center justify-center bg-gray-200`}
        style={style}
        aria-label={`Loading ${alt}`}
      >
        <PlaceholderComponent />
      </div>
    );
  }
  
  // Show loading state
  if (isInView && !isLoaded && !isError && placeholder) {
    return (
      <div
        className={`${className || ''} flex items-center justify-center bg-gray-100`}
        style={style}
        aria-label={`Loading ${alt}`}
      >
        <LoadingComponent />
        {currentSrc && (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            style={{ display: 'none' }}
            {...props}
          />
        )}
      </div>
    );
  }
  
  // Show error state
  if (isError && !fallbackSrc) {
    return (
      <div
        className={`${className || ''} flex items-center justify-center bg-red-50 border border-red-200`}
        style={style}
        aria-label={`Failed to load ${alt}`}
      >
        <div className="text-red-500 text-center p-4">
          <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }
  
  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={combinedClassName}
      style={combinedStyle}
      onLoad={handleLoad}
      onError={handleError}
      loading={priority ? 'eager' : lazy ? 'lazy' : undefined}
      decoding="async"
      {...props}
    />
  );
};

/**
 * Hook for monitoring image performance
 */
export const useImagePerformance = () => {
  const [metrics, setMetrics] = useState({
    totalImages: 0,
    loadedImages: 0,
    errorImages: 0,
    averageLoadTime: 0,
    webpSupported: webpSupported ?? false,
  });
  
  useEffect(() => {
    const updateMetrics = () => {
      // Get all OptimizedImage instances from DOM
      const images = document.querySelectorAll('img[data-optimized]');
      const loaded = document.querySelectorAll('img[data-optimized][data-loaded="true"]');
      const errors = document.querySelectorAll('img[data-optimized][data-error="true"]');
      
      setMetrics(prev => ({
        ...prev,
        totalImages: images.length,
        loadedImages: loaded.length,
        errorImages: errors.length,
        webpSupported: webpSupported ?? false,
      }));
    };
    
    // Update metrics periodically
    const interval = setInterval(updateMetrics, 2000);
    updateMetrics();
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

/**
 * Higher-order component for image optimization
 */
export const withImageOptimization = <P extends object>(
  Component: React.ComponentType<P & { imageSrc?: string }>
) => {
  return React.forwardRef<any, P & { imageSrc?: string }>((props, ref) => {
    const { imageSrc, ...restProps } = props;
    
    if (!imageSrc) {
      return <Component {...(restProps as P)} ref={ref} />;
    }
    
    return (
      <Component
        {...(restProps as P)}
        ref={ref}
        imageSrc={generateOptimizedUrl(imageSrc, {
          webp: true,
          quality: 80,
        })}
      />
    );
  });
};

export default OptimizedImage; 