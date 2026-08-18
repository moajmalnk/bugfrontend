import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface PageJumpSelectProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Extra classes on the compact wrapper (e.g. md:hidden). */
  className?: string;
  id?: string;
}

/**
 * Why: Native <select> page lists (60+ options) open the OS picker and cover
 * the viewport on mobile. This Radix dropdown stays compact and scrollable.
 */
export function PageJumpSelect({
  currentPage,
  totalPages,
  onPageChange,
  className,
  id,
}: PageJumpSelectProps) {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);
  const pages = useMemo(
    () => Array.from({ length: safeTotal }, (_, i) => i + 1),
    [safeTotal]
  );
  const searchable = safeTotal > 8;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border/30 bg-gradient-to-r from-muted/20 to-muted/30 px-1.5 py-1",
        className
      )}
    >
      <Select
        value={String(safeCurrent)}
        onValueChange={(v) => onPageChange(Number(v))}
      >
        <SelectTrigger
          id={id}
          className="h-9 min-w-[3.75rem] w-auto border-0 bg-transparent px-2 shadow-none font-semibold text-primary hover:bg-transparent focus:ring-0 focus:ring-offset-0"
          aria-label="Go to page"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          className="z-[100] max-h-60 min-w-[7.5rem] rounded-xl"
          searchable={searchable}
          searchPlaceholder="Go to page..."
        >
          {pages.map((page) => (
            <SelectItem key={page} value={String(page)} className="rounded-xl">
              {page}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="pr-2 text-sm font-medium text-muted-foreground whitespace-nowrap">
        <span className="font-semibold text-primary">{safeTotal}</span>
      </span>
    </div>
  );
}
