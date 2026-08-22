import { useQueryClient } from '@tanstack/react-query';
import { Button } from './button';
import { useEffect, useRef } from 'react';

export function ButtonWithRecovery({
  onClick,
  disabled,
  ...props
}: React.ComponentProps<typeof Button> & { onClick?: () => void | Promise<void> }) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !onClick) return;

    timeoutRef.current = setTimeout(() => {
      queryClient.clear();
      try {
        const button = e.currentTarget as HTMLButtonElement;
        if (button.disabled) {
          button.disabled = false;
        }
      } catch {
        /* ignore DOM reset failures */
      }
    }, 5000);

    try {
      const result = onClick();
      if (result instanceof Promise) {
        await result;
      }
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
};
