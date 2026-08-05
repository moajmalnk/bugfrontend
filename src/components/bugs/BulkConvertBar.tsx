import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRightLeft, X } from "lucide-react";

type BulkConvertBarProps = {
  selectedCount: number;
  pageSelectableCount: number;
  allPageSelected: boolean;
  onToggleSelectPage: (select: boolean) => void;
  onClear: () => void;
  onBulkConvert: () => void;
};

/**
 * Why: Sticky actions for multi-select convert without cluttering every card.
 */
export function BulkConvertBar({
  selectedCount,
  pageSelectableCount,
  allPageSelected,
  onToggleSelectPage,
  onClear,
  onBulkConvert,
}: BulkConvertBarProps) {
  if (pageSelectableCount <= 0 && selectedCount <= 0) return null;

  return (
    <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200/70 dark:border-sky-800/60 bg-sky-50/90 dark:bg-sky-950/40 backdrop-blur-sm px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
          <Checkbox
            checked={allPageSelected && pageSelectableCount > 0}
            onCheckedChange={(v) => onToggleSelectPage(v === true)}
            disabled={pageSelectableCount <= 0}
            aria-label="Select all on this page"
            className="h-5 w-5 rounded-md"
          />
          Select page
        </label>
        {selectedCount > 0 ? (
          <span className="text-sm text-muted-foreground tabular-nums">
            {selectedCount} selected
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            Select bugs to move in bulk
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl h-9"
            onClick={onClear}
          >
            <X className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={selectedCount === 0}
          onClick={onBulkConvert}
          className="rounded-xl h-9 bg-sky-600 hover:bg-sky-700 text-white disabled:opacity-50"
        >
          <ArrowRightLeft className="h-4 w-4 mr-1.5" />
          Bulk convert{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </Button>
      </div>
    </div>
  );
}
