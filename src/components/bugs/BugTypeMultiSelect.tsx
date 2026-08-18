import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { bugTypeService } from "@/services/bugTypeService";
import type { BugType } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Tags } from "lucide-react";
import { useMemo, useState } from "react";

type BugTypeMultiSelectProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
  compact?: boolean;
};

const SELECTED_CLASS =
  "border-sky-500 bg-sky-600 text-white shadow-sm ring-2 ring-sky-400/50";

export function BugTypeMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
  className,
  hideLabel = false,
  compact = false,
}: BugTypeMultiSelectProps) {
  const { data: types = [], isLoading } = useQuery({
    queryKey: ["bug-types", "active"],
    queryFn: () => bugTypeService.list(),
    staleTime: 5 * 60 * 1000,
  });

  const [open, setOpen] = useState(false);

  const selectedTypes = useMemo(
    () => types.filter((type: BugType) => selectedIds.includes(type.id)),
    [types, selectedIds]
  );

  const summary = useMemo(() => {
    if (isLoading) return "Loading…";
    if (selectedTypes.length === 0) return "Select types";
    if (selectedTypes.length === 1) return selectedTypes[0].name;
    return `${selectedTypes[0].name} +${selectedTypes.length - 1}`;
  }, [isLoading, selectedTypes]);

  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {hideLabel ? null : (
          <Label className="text-xs sm:text-sm">Bug Type</Label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled || isLoading}
              aria-label="Bug types"
              className={cn(
                "flex h-8 sm:h-9 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs sm:text-sm dark:border-gray-700 dark:bg-gray-800",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-left",
                  selectedTypes.length === 0 && "text-muted-foreground"
                )}
              >
                {summary}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[16rem] rounded-xl p-0"
          >
            <Command className="rounded-xl">
              <CommandInput placeholder="Search types..." />
              <CommandList className="max-h-60 [scrollbar-width:thin]">
                <CommandEmpty>No types found.</CommandEmpty>
                <CommandGroup>
                  {types.map((type: BugType) => {
                    const selected = selectedIds.includes(type.id);
                    return (
                      <CommandItem
                        key={type.id}
                        value={`${type.name} ${type.slug || ""}`}
                        disabled={disabled}
                        onSelect={() => toggle(type.id)}
                        className="rounded-xl"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            selected ? "opacity-100 text-sky-600" : "opacity-0"
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">{type.name}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {hideLabel ? null : (
        <Label className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full" />
          Bug Type
          <span className="text-xs font-normal text-muted-foreground">(optional · multi-select)</span>
        </Label>
      )}
      <div
        className={cn(
          "rounded-xl border border-sky-200/60 dark:border-sky-800/50 bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-950/15 dark:to-blue-950/10 shadow-sm",
          compact ? "p-2.5" : "p-4"
        )}
      >
        {compact ? null : (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
            <Tags className="h-3.5 w-3.5 shrink-0" />
            Choose one or more categories. Default priority from the type is suggested automatically.
          </p>
        )}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2">Loading types…</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No bug types configured yet. Admins can add them in Settings.
          </p>
        ) : (
          <div
            className={cn(
              "grid w-full gap-2",
              compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            )}
            role="group"
            aria-label="Bug types"
          >
            {types.map((type: BugType) => {
              const selected = selectedIds.includes(type.id);
              const priorityLabel =
                type.default_priority === "high"
                  ? "High"
                  : type.default_priority === "low"
                    ? "Low"
                    : "Med";
              return (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggle(type.id)}
                  className={cn(
                    "min-h-11 w-full cursor-pointer flex flex-col items-center justify-center gap-0.5 rounded-xl border px-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                    compact ? "py-2" : "py-2.5",
                    selected
                      ? SELECTED_CLASS
                      : "border-gray-200/80 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600"
                  )}
                >
                  <span className="text-center leading-tight">{type.name}</span>
                  {compact ? null : (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        selected ? "text-white/80" : "text-muted-foreground"
                      )}
                    >
                      Default: {priorityLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
