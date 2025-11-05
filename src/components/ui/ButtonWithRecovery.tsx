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
  
  const handleClick = async () => {
    if (disabled || !onClick) return;
    
    // Set a timeout to detect if button gets stuck
    timeoutRef.current = setTimeout(() => {
      console.warn('Button appears stuck, clearing cache...');
      queryClient.clear(); // Clear React Query cache
    }, 5000); // 5 seconds
    
    try {
      await onClick();
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
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
