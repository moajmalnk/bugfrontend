import { useState, useEffect, useCallback, useRef } from "react";

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
  const onConfirmRef = useRef(onConfirm);
  const onUndoRef = useRef(onUndo);

  onConfirmRef.current = onConfirm;
  onUndoRef.current = onUndo;

  const startCountdown = useCallback(() => {
    setIsCountingDown(true);
    setTimeLeft(duration);
  }, [duration]);

  const cancelCountdown = useCallback(() => {
    setIsCountingDown(false);
    setTimeLeft(duration);
    onUndoRef.current?.();
  }, [duration]);

  const confirmDelete = useCallback(() => {
    setIsCountingDown(false);
    setTimeLeft(duration);
    onConfirmRef.current();
  }, [duration]);

  useEffect(() => {
    if (!isCountingDown) return;

    if (timeLeft <= 0) {
      setIsCountingDown(false);
      setTimeLeft(duration);
      onConfirmRef.current();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCountingDown, timeLeft, duration]);

  return {
    isCountingDown,
    timeLeft,
    startCountdown,
    cancelCountdown,
    confirmDelete,
  };
};
