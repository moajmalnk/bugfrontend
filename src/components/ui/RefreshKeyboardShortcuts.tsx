import React, { useEffect } from 'react';
import { useProfessionalRefresh } from './ProfessionalRefreshButton';

interface RefreshKeyboardShortcutsProps {
  enabled?: boolean;
}

export function RefreshKeyboardShortcuts({ enabled = true }: RefreshKeyboardShortcutsProps) {
  const { refresh } = useProfessionalRefresh();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl + R for regular refresh
      if (event.ctrlKey && event.code === 'KeyR' && !event.shiftKey) {
        event.preventDefault();
        refresh('regular');
      }
      
      // Ctrl + Shift + R for hard refresh
      if (event.ctrlKey && event.shiftKey && event.code === 'KeyR') {
        event.preventDefault();
        refresh('hard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, refresh]);

  return null; // This component doesn't render anything
}
