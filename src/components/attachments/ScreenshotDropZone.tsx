import { cn } from "@/lib/utils";
import { ImagePlus } from "lucide-react";
import { useCallback, useRef, useState } from "react";

export interface ScreenshotDropZoneProps {
  /** Called with dropped or pasted file list; parent should filter to images and add previews. */
  onAddFiles: (files: File[]) => void;
  onOpenPicker: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Same look as the dashed "Attach Files" / voice cards, with drag-and-drop support.
 */
export function ScreenshotDropZone({
  onAddFiles,
  onOpenPicker,
  disabled = false,
  className,
}: ScreenshotDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const resetDrag = useCallback(() => {
    dragDepth.current = 0;
    setIsDragging(false);
  }, []);

  const handleDragEnter = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    resetDrag();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onAddFiles(files);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenPicker();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Add screenshots — drop images, click to browse, or paste in this column"
      aria-disabled={disabled}
      onClick={() => !disabled && onOpenPicker()}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        "group relative flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 outline-none",
        "border-gray-300 dark:border-gray-600",
        "hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
        "focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDragging &&
          "border-blue-500 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/30",
        disabled && "pointer-events-none cursor-not-allowed opacity-50",
        className
      )}
    >
      <div className="pointer-events-none flex flex-col items-center justify-center">
        <div
          className={cn(
            "mb-3 rounded-full bg-blue-100 p-3 transition-colors dark:bg-blue-900/30",
            "group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40",
            isDragging && "bg-blue-200 dark:bg-blue-800/50"
          )}
        >
          <ImagePlus
            className="h-6 w-6 text-blue-600 dark:text-blue-400"
            aria-hidden
          />
        </div>
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {isDragging ? "Drop images here" : "Add Screenshots"}
        </span>
      </div>
    </div>
  );
}
