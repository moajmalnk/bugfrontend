import { Button } from "@/components/ui/button";
import { Clock, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface UndoDeleteNotificationProps {
  title: string;
  itemName: string;
  timeLeft: number;
  duration?: number;
  onUndo: () => void;
  onConfirmNow: () => void;
  isConfirming?: boolean;
  className?: string;
  /** Stack multiple notifications vertically (0 = bottom) */
  stackIndex?: number;
}

export function UndoDeleteNotification({
  title,
  itemName,
  timeLeft,
  duration = 10,
  onUndo,
  onConfirmNow,
  isConfirming = false,
  className,
  stackIndex = 0,
}: UndoDeleteNotificationProps) {
  const undoProgress = ((duration - timeLeft) / duration) * 100;
  const circleRadius = 18;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const bottomOffset = 16 + stackIndex * 120;

  return (
    <div
      className={cn(
        "fixed right-4 left-4 sm:left-auto sm:right-4 z-50",
        className
      )}
      style={{ bottom: bottomOffset }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl"></div>
        <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-sm mx-auto sm:mx-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-lg">
                <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12">
                <svg
                  className="w-10 h-10 sm:w-12 sm:h-12 transform -rotate-90"
                  viewBox="0 0 48 48"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r={circleRadius}
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`${circleCircumference}`}
                    strokeDashoffset={`${circleCircumference * (1 - undoProgress / 100)}`}
                    className="text-red-500 transition-all duration-1000 ease-linear"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                {title}
              </p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                "{itemName}"
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-red-500 animate-pulse" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Permanently deleted in
                    </span>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-md border border-red-200 dark:border-red-800">
                    <span className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">
                      {timeLeft}s
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${undoProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                onClick={onUndo}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-7 sm:h-8 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                Undo
              </Button>
              <Button
                onClick={onConfirmNow}
                disabled={isConfirming}
                size="sm"
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 text-xs px-3 py-1.5 h-7 sm:h-8 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              >
                Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UndoDeleteNotificationPortal({
  open,
  ...props
}: UndoDeleteNotificationProps & { open: boolean }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<UndoDeleteNotification {...props} />, document.body);
}
