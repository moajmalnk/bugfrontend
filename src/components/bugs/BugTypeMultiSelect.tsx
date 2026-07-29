import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { bugTypeService } from "@/services/bugTypeService";
import type { BugType } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";

type BugTypeMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

const SELECTED_CLASS =
  "border-sky-500 bg-sky-600 text-white shadow-sm ring-2 ring-sky-400/50";

export function BugTypeMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
  className,
}: BugTypeMultiSelectProps) {
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["bug-types", "active"],
    queryFn: () => bugTypeService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" />
        Bug Type
        <span className="text-xs font-normal text-muted-foreground">(optional · multi-select)</span>
      </Label>
      <div className="rounded-xl border border-sky-200/60 dark:border-sky-800/50 bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-950/15 dark:to-blue-950/10 p-4 shadow-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
          <Tags className="h-3.5 w-3.5 shrink-0" />
          Choose one or more categories that describe this bug
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading types…</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No bug types configured yet. Admins can add them in Settings.
          </p>
        ) : (
          <div
            className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
            role="group"
            aria-label="Bug types"
          >
            {types.map((type: BugType) => {
              const selected = selectedIds.includes(type.id);
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggle(type.id)}
                  className={cn(
                    "min-h-11 w-full cursor-pointer flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    selected
                      ? SELECTED_CLASS
                      : "border-gray-200/80 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  {type.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
