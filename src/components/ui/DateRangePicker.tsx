import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

type Props = {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  placeholder?: string;
  className?: string;
  disableFuture?: boolean;
};

function parseYmd(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Pick date range",
  className,
  disableFuture,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = useMemo<DateRange | undefined>(() => {
    const start = parseYmd(from);
    const end = parseYmd(to);
    if (!start && !end) return undefined;
    return { from: start, to: end };
  }, [from, to]);

  const disabled = useMemo(() => {
    if (!disableFuture) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { after: today };
  }, [disableFuture]);

  const label = useMemo(() => {
    const start = parseYmd(from);
    const end = parseYmd(to);
    if (start && end) {
      return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
    }
    if (start) return `${format(start, "dd MMM yyyy")} – …`;
    return null;
  }, [from, to]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 w-full min-w-0 justify-start rounded-xl text-left font-normal text-xs sm:text-sm",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {label ?? <span className="text-muted-foreground">{placeholder}</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[min(100vw-1.5rem,320px)] overflow-hidden z-[200] rounded-2xl"
        align="end"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            From – To
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select start, then end date
          </p>
        </div>
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={selected}
          defaultMonth={selected?.from ?? selected?.to}
          onSelect={(range) => {
            if (!range?.from) {
              onChange("", "");
              return;
            }
            const nextFrom = toYmd(range.from);
            const nextTo = range.to ? toYmd(range.to) : nextFrom;
            onChange(nextFrom, nextTo);
            if (range.from && range.to) {
              setOpen(false);
            }
          }}
          disabled={disabled}
          initialFocus
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
            onClick={() => {
              onChange("", "");
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
            onClick={() => {
              const today = toYmd(new Date());
              onChange(today, today);
              setOpen(false);
            }}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
