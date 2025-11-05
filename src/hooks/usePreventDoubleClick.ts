import { useRef } from 'react';

export function usePreventDoubleClick<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 1000
): T {
  const isProcessing = useRef(false);
  
  return (async (...args: Parameters<T>) => {
    if (isProcessing.current) {
      return;
    }
    
    isProcessing.current = true;
    try {
      return await fn(...args);
    } finally {
      setTimeout(() => {
        isProcessing.current = false;
      }, delay);
    }
  }) as T;
}
