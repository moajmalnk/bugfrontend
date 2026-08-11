import { useEffect, useMemo, useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, getDaysInMonth, isSameMonth, isValid, parse } from "date-fns";
import { cn } from "@/lib/utils";

function toYMD(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function parseYMD(value: string): Date {
  // Local noon avoids DST edge flips when selecting calendar days
  const [y, m, day] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1, 12, 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function atLocalNoon(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/** Why: Accept common typed DOB / HR date shapes without forcing calendar-only UX. */
const TYPED_DATE_FORMATS = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "d-M-yyyy",
  "dd.MM.yyyy",
  "d.M.yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd MMMM yyyy",
  "d MMMM yyyy",
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "MMM d yyyy",
  "MMMM d yyyy",
] as const;

function parseTypedDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{8}$/.test(trimmed)) {
    const day = Number(trimmed.slice(0, 2));
    const month = Number(trimmed.slice(2, 4));
    const year = Number(trimmed.slice(4, 8));
    const d = new Date(year, month - 1, day, 12, 0, 0, 0);
    if (
      isValid(d) &&
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  for (const pattern of TYPED_DATE_FORMATS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (!isValid(parsed)) continue;
    // Why: Reject overflow dates (31/02) that date-fns may coerce into March.
    if (format(parsed, pattern).toLowerCase() !== trimmed.toLowerCase()) continue;
    return atLocalNoon(parsed);
  }

  return null;
}

/**
 * Why: Build YYYY-MM-DD lists for month / multi-day exception grants while
 * honouring the same disableFuture / today-only bounds as day clicks.
 */
function ymdDaysInMonth(
  month: Date,
  opts: { disableFuture?: boolean; allowOnlyTodayAndYesterday?: boolean }
): string[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const count = getDaysInMonth(month);
  const today = startOfLocalDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const out: string[] = [];
  for (let day = 1; day <= count; day += 1) {
    const d = new Date(year, monthIndex, day, 12, 0, 0, 0);
    const local = startOfLocalDay(d);
    if (opts.allowOnlyTodayAndYesterday) {
      if (local < yesterday || local > today) continue;
    } else if (opts.disableFuture && local > today) {
      continue;
    }
    out.push(toYMD(d));
  }
  return out;
}

type CommonProps = {
  placeholder?: string;
  className?: string;
  disableFuture?: boolean;
  allowOnlyTodayAndYesterday?: boolean;
  disabled?: boolean;
  /** date-fns format for the closed trigger label (single mode). Default: d MMM yyyy */
  displayFormat?: string;
  /** Inclusive year bounds for month/year caption dropdowns */
  fromYear?: number;
  toYear?: number;
  /** Footer “Today” shortcut. Hide for DOB-style fields. Default true. */
  showToday?: boolean;
};

type SingleProps = CommonProps & {
  mode?: "single";
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  values?: never;
};

type MultipleProps = CommonProps & {
  mode: "multiple";
  values?: string[]; // YYYY-MM-DD[]
  onChange: (values: string[]) => void;
  value?: never;
};

type Props = SingleProps | MultipleProps;

function formatMultiLabel(values: string[]): string {
  if (values.length === 0) return "";
  const sorted = [...values].sort();
  if (sorted.length === 1) return format(parseYMD(sorted[0]), "PPP");
  if (sorted.length === 2) {
    return `${format(parseYMD(sorted[0]), "MMM d")} · ${format(parseYMD(sorted[1]), "MMM d")}`;
  }

  const first = parseYMD(sorted[0]);
  const last = parseYMD(sorted[sorted.length - 1]);
  if (isSameMonth(first, last)) {
    const monthDays = ymdDaysInMonth(first, {});
    if (sorted.length === monthDays.length && sorted.every((d, i) => d === monthDays[i])) {
      return `${format(first, "MMMM yyyy")} (full month)`;
    }
    return `${format(first, "MMM yyyy")} · ${sorted.length} days`;
  }

  return `${sorted.length} dates selected`;
}

export function DatePicker(props: Props) {
  const {
    placeholder = "Pick a date",
    className,
    disableFuture,
    allowOnlyTodayAndYesterday,
    disabled = false,
    displayFormat = "d MMM yyyy",
    fromYear,
    toYear,
    showToday = true,
  } = props;
  const isMultiple = props.mode === "multiple";
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const yearNow = new Date().getFullYear();
  const calendarFromYear = fromYear ?? yearNow - 15;
  const calendarToYear = toYear ?? yearNow + 15;

  const multiValues = isMultiple ? props.values : undefined;
  const singleValue = !isMultiple ? props.value : undefined;

  const selectedDates = useMemo(() => {
    if (isMultiple) {
      return (multiValues ?? []).map(parseYMD);
    }
    return singleValue ? [parseYMD(singleValue)] : [];
  }, [isMultiple, multiValues, singleValue]);

  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    if (selectedDates.length > 0) return selectedDates[selectedDates.length - 1];
    return new Date();
  });

  // Why: named separately from props.disabled (button lock) — Calendar needs day matchers.
  const disabledDays = useMemo(() => {
    if (allowOnlyTodayAndYesterday) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      return {
        before: yesterday,
        after: today,
      } as any;
    }

    if (!disableFuture) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { after: today } as any;
  }, [disableFuture, allowOnlyTodayAndYesterday]);

  const monthDays = useMemo(
    () =>
      ymdDaysInMonth(displayMonth, {
        disableFuture,
        allowOnlyTodayAndYesterday,
      }),
    [displayMonth, disableFuture, allowOnlyTodayAndYesterday]
  );

  const monthFullySelected = useMemo(() => {
    if (!isMultiple || monthDays.length === 0) return false;
    const selected = new Set(props.values ?? []);
    return monthDays.every((d) => selected.has(d));
  }, [isMultiple, monthDays, props]);

  const label = isMultiple
    ? formatMultiLabel(props.values ?? [])
    : selectedDates[0]
      ? format(selectedDates[0], displayFormat)
      : "";

  useEffect(() => {
    if (isMultiple || focused) return;
    setDraft(label);
  }, [isMultiple, focused, label]);

  const isAllowedDate = (d: Date): boolean => {
    if (!isValid(d)) return false;
    const y = d.getFullYear();
    if (y < calendarFromYear || y > calendarToYear) return false;
    const local = startOfLocalDay(d);
    const today = startOfLocalDay(new Date());
    if (allowOnlyTodayAndYesterday) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return local >= yesterday && local <= today;
    }
    if (disableFuture && local > today) return false;
    return true;
  };

  const commitTypedDate = (raw: string, opts?: { revertInvalid?: boolean }) => {
    if (isMultiple) return;
    const trimmed = raw.trim();
    if (!trimmed) {
      props.onChange("");
      setDraft("");
      return;
    }
    const parsed = parseTypedDate(trimmed);
    if (!parsed || !isAllowedDate(parsed)) {
      if (opts?.revertInvalid !== false) setDraft(label);
      return;
    }
    props.onChange(toYMD(parsed));
    setDisplayMonth(parsed);
    setDraft(format(parsed, displayFormat));
  };

  const toggleMonth = () => {
    if (!isMultiple) return;
    const current = new Set(props.values ?? []);
    if (monthFullySelected) {
      for (const d of monthDays) current.delete(d);
    } else {
      for (const d of monthDays) current.add(d);
    }
    props.onChange([...current].sort());
  };

  const calendarFooter = (
    <div className="flex flex-col gap-1 border-t border-border/60 px-2.5 py-1.5">
      {isMultiple ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground leading-tight min-w-0">
            Tap days to multi-select · or whole month
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-blue-600 dark:text-blue-400"
            disabled={monthDays.length === 0}
            onClick={toggleMonth}
          >
            {monthFullySelected
              ? `Clear ${format(displayMonth, "MMM")}`
              : `Select ${format(displayMonth, "MMM")}`}
          </Button>
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground leading-tight px-0.5">
          Type a date (e.g. 11/08/2003) or pick from the calendar
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
          onClick={() => {
            if (isMultiple) {
              props.onChange([]);
            } else {
              props.onChange("");
              setDraft("");
            }
            if (!isMultiple) setOpen(false);
          }}
        >
          Clear
        </Button>
        <div className="flex items-center gap-1">
          {showToday ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
              onClick={() => {
                const iso = toYMD(new Date());
                setDisplayMonth(new Date());
                if (isMultiple) {
                  const set = new Set(props.values ?? []);
                  set.add(iso);
                  props.onChange([...set].sort());
                } else {
                  props.onChange(iso);
                  setDraft(format(new Date(), displayFormat));
                  setOpen(false);
                }
              }}
            >
              Today
            </Button>
          ) : null}
          {isMultiple ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const calendarBody = isMultiple ? (
    <Calendar
      mode="multiple"
      selected={selectedDates}
      month={displayMonth}
      onMonthChange={setDisplayMonth}
      onSelect={(days) => {
        const next = (days ?? []).map(toYMD).sort();
        props.onChange(next);
      }}
      disabled={disabledDays}
      fromYear={calendarFromYear}
      toYear={calendarToYear}
      initialFocus
    />
  ) : (
    <Calendar
      mode="single"
      selected={selectedDates[0]}
      month={displayMonth}
      onMonthChange={setDisplayMonth}
      onSelect={(d) => {
        if (!d) return;
        props.onChange(toYMD(d));
        setDraft(format(d, displayFormat));
        setOpen(false);
      }}
      disabled={disabledDays}
      fromYear={calendarFromYear}
      toYear={calendarToYear}
    />
  );

  if (!isMultiple) {
    return (
      <Popover
        open={disabled ? false : open}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
        }}
        modal={false}
      >
        <div className={cn("relative w-full", className)}>
          <PopoverAnchor asChild>
            <div className="relative w-full">
              <Input
                type="text"
                inputMode="text"
                autoComplete="bday"
                disabled={disabled}
                value={draft}
                placeholder={placeholder}
                aria-label={placeholder}
                className="h-10 rounded-xl pr-10 text-xs sm:text-sm"
                onFocus={() => setFocused(true)}
                onBlur={() => {
                  setFocused(false);
                  commitTypedDate(draft);
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  setDraft(next);
                  const parsed = parseTypedDate(next);
                  if (parsed && isAllowedDate(parsed)) {
                    props.onChange(toYMD(parsed));
                    setDisplayMonth(parsed);
                  } else if (!next.trim()) {
                    props.onChange("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTypedDate(draft);
                    (e.target as HTMLInputElement).blur();
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(true);
                  }
                  if (e.key === "Escape" && open) {
                    e.preventDefault();
                    setOpen(false);
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl text-muted-foreground hover:text-foreground"
                aria-label="Open calendar"
                onMouseDown={(e) => {
                  // Why: Keep input focus/blur order predictable when opening the calendar.
                  e.preventDefault();
                }}
                onClick={() => setOpen((prev) => !prev)}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </PopoverAnchor>
          <PopoverContent
            className="w-auto p-0 max-w-[min(100vw-1.5rem,300px)] overflow-hidden z-[1100] rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
            align="start"
            side="bottom"
            alignOffset={0}
            sideOffset={4}
            collisionPadding={12}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onWheel={(e) => e.stopPropagation()}
          >
            {calendarBody}
            {calendarFooter}
          </PopoverContent>
        </div>
      </Popover>
    );
  }

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={`w-full justify-between text-left font-normal text-xs sm:text-sm ${className || ""}`}
        >
          <span className="truncate min-w-0">
            {label ? label : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[min(100vw-1.5rem,300px)] overflow-hidden z-[1100] rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
        align="start"
        side="bottom"
        alignOffset={0}
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        {calendarBody}
        {calendarFooter}
      </PopoverContent>
    </Popover>
  );
}
