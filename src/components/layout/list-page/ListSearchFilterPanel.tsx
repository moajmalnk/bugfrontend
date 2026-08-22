import { Button } from "@/components/ui/button";
import { RotateCcw, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listFilterIconBg,
  listFilterUnderlay,
  listSearchInputClass,
  LIST_FILTER_PANEL,
  LIST_FILTER_GRID,
  type ListPageAccent,
} from "./listPageStyles";

interface ListSearchFilterPanelProps {
  title?: string;
  description?: string;
  headerExtra?: React.ReactNode;
  accent?: ListPageAccent;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchMaxLength?: number;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  filterChips?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ListSearchFilterPanel({
  title = "Search & Filter",
  description,
  headerExtra,
  accent = "blue",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchMaxLength = 200,
  onClearAll,
  hasActiveFilters = false,
  filterChips,
  children,
  className,
}: ListSearchFilterPanelProps) {
  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <div className={listFilterUnderlay(accent)} />
      <div className={LIST_FILTER_PANEL}>
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <div className={listFilterIconBg(accent)}>
                <Search className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  {headerExtra}
                </div>
                {description ? (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            {hasActiveFilters && onClearAll ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="h-10 rounded-xl shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Clear all
              </Button>
            ) : null}
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              maxLength={searchMaxLength}
              onChange={(e) =>
                onSearchChange(e.target.value.slice(0, searchMaxLength))
              }
              className={listSearchInputClass(accent)}
              aria-label={title}
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                aria-label="Clear search"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {children ? (
            <div className={LIST_FILTER_GRID}>{children}</div>
          ) : null}

          {filterChips}
        </div>
      </div>
    </div>
  );
}
