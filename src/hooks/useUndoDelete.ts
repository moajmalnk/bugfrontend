import { useState, useEffect, useCallback } from 'react';

interface UseUndoDeleteOptions {
  duration?: number; // Duration in seconds
  onConfirm: () => void; // Called when countdown reaches 0
  onUndo?: () => void; // Called when user clicks undo
}

interface UseUndoDeleteReturn {
  isCountingDown: boolean;
  timeLeft: number;
  startCountdown: () => void;
  cancelCountdown: () => void;
  confirmDelete: () => void;
}

export const useUndoDelete = ({
  duration = 10,
  onConfirm,
  onUndo,
}: UseUndoDeleteOptions): UseUndoDeleteReturn => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);

  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setTimeLeft(duration);
  }, [duration]);

  const cancelCountdown = useCallback(() => {
    setIsCountingDown(false);
    setTimeLeft(duration);
    onUndo?.();
  }, [duration, onUndo]);

  const confirmDelete = useCallback(() => {
    setIsCountingDown(false);
    setTimeLeft(duration);
    onConfirm();
  }, [duration, onConfirm]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isCountingDown && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsCountingDown(false);
            onConfirm();
            return duration;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCountingDown, timeLeft, duration, onConfirm]);

  return {
    isCountingDown,
    timeLeft,
    startCountdown,
    cancelCountdown,
    confirmDelete,
  };
};
