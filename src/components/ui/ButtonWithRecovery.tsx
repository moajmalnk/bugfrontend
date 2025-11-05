import { useQueryClient } from '@tanstack/react-query';
import { Button } from './button';
import { useEffect, useRef } from 'react';

export function ButtonWithRecovery({ 
  onClick, 
  disabled, 
  ...props 
}: React.ComponentProps<typeof Button> & { onClick?: () => void | Promise<void> }) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const clickStartTimeRef = useRef<number>(0);
  const buttonIdRef = useRef<string>(`btn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // Log button mount/unmount
  useEffect(() => {
    const buttonLabel = (props as any).children || (props as any)['aria-label'] || 'Unknown Button';
    console.log(`🔵 [ButtonWithRecovery] Mounted:`, {
      buttonId: buttonIdRef.current,
      label: buttonLabel,
      disabled,
      hasOnClick: !!onClick
    });
    
    return () => {
      console.log(`🔴 [ButtonWithRecovery] Unmounted:`, {
        buttonId: buttonIdRef.current,
        label: buttonLabel
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const buttonLabel = (props as any).children || (props as any)['aria-label'] || 'Unknown Button';
    const clickTime = Date.now();
    clickStartTimeRef.current = clickTime;
    
    console.group(`🟢 [ButtonWithRecovery] Click Started`);
    console.log(`Button ID:`, buttonIdRef.current);
    console.log(`Label:`, buttonLabel);
    console.log(`Disabled:`, disabled);
    console.log(`Has onClick:`, !!onClick);
    console.log(`Event target:`, e.target);
    console.log(`Event currentTarget:`, e.currentTarget);
    console.log(`Timestamp:`, new Date().toISOString());
    
    if (disabled) {
      console.warn(`⚠️ [ButtonWithRecovery] Button is disabled, ignoring click`);
      console.groupEnd();
      return;
    }
    
    if (!onClick) {
      console.warn(`⚠️ [ButtonWithRecovery] No onClick handler provided`);
      console.groupEnd();
      return;
    }
    
    // Set a timeout to detect if button gets stuck
    timeoutRef.current = setTimeout(() => {
      const elapsed = Date.now() - clickStartTimeRef.current;
      console.error(`❌ [ButtonWithRecovery] Button appears STUCK after ${elapsed}ms!`, {
        buttonId: buttonIdRef.current,
        label: buttonLabel,
        elapsedMs: elapsed,
        disabled: (e.currentTarget as HTMLButtonElement).disabled,
        isProcessing: true
      });
      
      // Check React Query state
      const queryState = queryClient.getQueryCache().getAll();
      console.log(`📊 [ButtonWithRecovery] React Query Cache State:`, {
        totalQueries: queryState.length,
        staleQueries: queryState.filter(q => q.isStale()).length,
        fetchingQueries: queryState.filter(q => q.state.fetchStatus === 'fetching').length
      });
      
      // Clear cache as recovery mechanism
      console.warn(`🔄 [ButtonWithRecovery] Attempting recovery: Clearing React Query cache...`);
      queryClient.clear();
      
      // Try to reset button state
      try {
        const button = e.currentTarget as HTMLButtonElement;
        if (button.disabled) {
          console.warn(`🔄 [ButtonWithRecovery] Button is still disabled, trying to enable...`);
          button.disabled = false;
        }
      } catch (err) {
        console.error(`❌ [ButtonWithRecovery] Failed to reset button:`, err);
      }
    }, 5000); // 5 seconds
    
    try {
      console.log(`⏳ [ButtonWithRecovery] Executing onClick handler...`);
      const result = onClick();
      
      // Check if it's a promise
      if (result instanceof Promise) {
        console.log(`⏳ [ButtonWithRecovery] onClick returned Promise, waiting...`);
        await result;
        const elapsed = Date.now() - clickStartTimeRef.current;
        console.log(`✅ [ButtonWithRecovery] onClick Promise resolved in ${elapsed}ms`);
      } else {
        const elapsed = Date.now() - clickStartTimeRef.current;
        console.log(`✅ [ButtonWithRecovery] onClick completed synchronously in ${elapsed}ms`);
      }
    } catch (error) {
      const elapsed = Date.now() - clickStartTimeRef.current;
      console.error(`❌ [ButtonWithRecovery] onClick threw error after ${elapsed}ms:`, {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      throw error; // Re-throw to allow error handling upstream
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        const elapsed = Date.now() - clickStartTimeRef.current;
        console.log(`✅ [ButtonWithRecovery] Cleanup completed, total time: ${elapsed}ms`);
      }
      console.groupEnd();
    }
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return <Button onClick={handleClick} disabled={disabled} {...props} />;
}
