import { useMemo, useState } from 'react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, getDaysInMonth, isSameMonth } from 'date-fns';

function toYMD(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}

function parseYMD(value: string): Date {
  // Local noon avoids DST edge flips when selecting calendar days
  const [y, m, day] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, day || 1, 12, 0, 0, 0);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
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
};

type SingleProps = CommonProps & {
  mode?: 'single';
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  values?: never;
};

type MultipleProps = CommonProps & {
  mode: 'multiple';
  values?: string[]; // YYYY-MM-DD[]
  onChange: (values: string[]) => void;
  value?: never;
};

type Props = SingleProps | MultipleProps;

function formatMultiLabel(values: string[]): string {
  if (values.length === 0) return '';
  const sorted = [...values].sort();
  if (sorted.length === 1) return format(parseYMD(sorted[0]), 'PPP');
  if (sorted.length === 2) {
    return `${format(parseYMD(sorted[0]), 'MMM d')} · ${format(parseYMD(sorted[1]), 'MMM d')}`;
  }

  const first = parseYMD(sorted[0]);
  const last = parseYMD(sorted[sorted.length - 1]);
  if (isSameMonth(first, last)) {
    const monthDays = ymdDaysInMonth(first, {});
    if (sorted.length === monthDays.length && sorted.every((d, i) => d === monthDays[i])) {
      return `${format(first, 'MMMM yyyy')} (full month)`;
    }
    return `${format(first, 'MMM yyyy')} · ${sorted.length} days`;
  }

  return `${sorted.length} dates selected`;
}

export function DatePicker(props: Props) {
  const {
    placeholder = 'Pick a date',
    className,
    disableFuture,
    allowOnlyTodayAndYesterday,
  } = props;
  const isMultiple = props.mode === 'multiple';
  const [open, setOpen] = useState(false);

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

  const disabled = useMemo(() => {
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
      ? format(selectedDates[0], 'PPP')
      : '';

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

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-start text-left font-normal text-xs sm:text-sm ${className || ''}`}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {label ? label : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 max-w-[min(100vw-1.5rem,300px)] overflow-hidden z-[200] rounded-2xl"
        align="start"
        side="bottom"
        alignOffset={0}
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        {isMultiple ? (
          <Calendar
            mode="multiple"
            selected={selectedDates}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            onSelect={(days) => {
              const next = (days ?? []).map(toYMD).sort();
              props.onChange(next);
            }}
            disabled={disabled}
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
              setOpen(false);
            }}
            disabled={disabled}
            initialFocus
          />
        )}
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
                  ? `Clear ${format(displayMonth, 'MMM')}`
                  : `Select ${format(displayMonth, 'MMM')}`}
              </Button>
            </div>
          ) : null}
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
                  props.onChange('');
                }
                if (!isMultiple) setOpen(false);
              }}
            >
              Clear
            </Button>
            <div className="flex items-center gap-1">
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
                    setOpen(false);
                  }
                }}
              >
                Today
              </Button>
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
      </PopoverContent>
    </Popover>
  );
}
