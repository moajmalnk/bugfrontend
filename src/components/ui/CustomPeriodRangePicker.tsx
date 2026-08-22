import { DatePicker } from '@/components/ui/DatePicker';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CUSTOM_PERIOD_MODES,
  type CustomPeriodMode,
  MONTH_SHORT_LABELS,
  formatWeekChipLabel,
  formatWeekChipSubtitle,
  getISOWeekCount,
  getISOWeekPeriod,
  getMonthPeriod,
  isMonthDisabled,
  isWeekDisabled,
  mergeMonthRange,
  mergeWeekRange,
  parseYearFromYmd,
} from '@/lib/customPeriodRange';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  from?: string;
  to?: string;
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

function monthIndexFromYmd(ymd?: string): number | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return Number(ymd.slice(5, 7)) - 1;
}

function isMonthInRange(
  monthIndex: number,
  anchor: number | null,
  from?: string,
  to?: string,
  year?: number
): boolean {
  if (anchor !== null) {
    const lo = Math.min(anchor, monthIndex);
    const hi = Math.max(anchor, monthIndex);
    return monthIndex >= lo && monthIndex <= hi;
  }
  if (!from || !to || year === undefined) return false;
  const startMonth = monthIndexFromYmd(from);
  const endMonth = monthIndexFromYmd(to);
  if (startMonth === null || endMonth === null) return false;
  if (Number(from.slice(0, 4)) !== year || Number(to.slice(0, 4)) !== year) {
    return false;
  }
  const lo = Math.min(startMonth, endMonth);
  const hi = Math.max(startMonth, endMonth);
  return monthIndex >= lo && monthIndex <= hi;
}

function weekInAppliedRange(
  week: number,
  isoWeekYear: number,
  from?: string,
  to?: string
): boolean {
  if (!from || !to) return false;
  const start = parseYmd(from);
  const end = parseYmd(to);
  if (!start || !end) return false;
  const { from: wFrom, to: wTo } = getISOWeekPeriod(isoWeekYear, week);
  return wFrom >= from && wTo <= to;
}

export function CustomPeriodRangePicker({
  from,
  to,
  onChange,
  placeholder = 'From – To',
  className,
  disableFuture = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CustomPeriodMode>('dates');
  const [year, setYear] = useState(() => parseYearFromYmd(from));
  const [monthAnchor, setMonthAnchor] = useState<number | null>(null);
  const [weekAnchor, setWeekAnchor] = useState<number | null>(null);

  const weekCount = useMemo(() => getISOWeekCount(year), [year]);
  const weeks = useMemo(
    () => Array.from({ length: weekCount }, (_, i) => i + 1),
    [weekCount]
  );

  const label = useMemo(() => {
    const start = parseYmd(from);
    const end = parseYmd(to);
    if (start && end) {
      return `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`;
    }
    if (start) return `${format(start, 'dd MMM yyyy')} – …`;
    return null;
  }, [from, to]);

  useEffect(() => {
    if (!open) {
      setMonthAnchor(null);
      setWeekAnchor(null);
      return;
    }
    setYear(parseYearFromYmd(from));
  }, [open, from]);

  const shiftYear = (delta: number) => {
    setYear((y) => y + delta);
    setMonthAnchor(null);
    setWeekAnchor(null);
  };

  const handleMonthClick = (monthIndex: number) => {
    if (isMonthDisabled(year, monthIndex, disableFuture)) return;

    if (monthAnchor === null) {
      setMonthAnchor(monthIndex);
      const p = getMonthPeriod(year, monthIndex);
      onChange(p.from, p.to);
      return;
    }

    const range = mergeMonthRange(year, monthAnchor, monthIndex);
    onChange(range.from, range.to);
    setMonthAnchor(null);
  };

  const handleWeekClick = (week: number) => {
    if (isWeekDisabled(year, week, disableFuture)) return;

    if (weekAnchor === null) {
      setWeekAnchor(week);
      const p = getISOWeekPeriod(year, week);
      onChange(p.from, p.to);
      return;
    }

    const range = mergeWeekRange(year, weekAnchor, week);
    onChange(range.from, range.to);
    setWeekAnchor(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-10 w-full min-w-0 justify-start rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-left font-medium text-xs sm:text-sm shadow-sm hover:shadow-md transition-all duration-300',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
          <span className="truncate">
            {label ?? (
              <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={16}
        className="z-[200] w-[min(100vw-2rem,26rem)] max-h-[min(85vh,36rem)] overflow-y-auto rounded-2xl border border-gray-200/70 dark:border-gray-700/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-0 shadow-2xl [scrollbar-width:thin]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
            {CUSTOM_PERIOD_MODES.map((item) => {
              const active = mode === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setMode(item.value);
                    setMonthAnchor(null);
                    setWeekAnchor(null);
                  }}
                  className={cn(
                    'rounded-lg py-2 text-xs sm:text-sm font-semibold transition-all duration-200',
                    active
                      ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-200 shadow-sm border border-border/60'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {mode === 'dates' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                  From
                </p>
                <DatePicker
                  value={from || ''}
                  onChange={(v) => onChange(v, to && to >= v ? to : v)}
                  placeholder="Start date"
                  displayFormat="d MMM yyyy"
                  disableFuture={disableFuture}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                  To
                </p>
                <DatePicker
                  value={to || ''}
                  onChange={(v) =>
                    onChange(from && from <= v ? from : v, v)
                  }
                  placeholder="End date"
                  displayFormat="d MMM yyyy"
                  disableFuture={disableFuture}
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={() => shiftYear(-1)}
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm sm:text-base font-bold tabular-nums text-foreground">
                  {year}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl shrink-0"
                  onClick={() => shiftYear(1)}
                  aria-label="Next year"
                  disabled={
                    disableFuture && year >= new Date().getFullYear()
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {mode === 'months' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {MONTH_SHORT_LABELS.map((label, monthIndex) => {
                    const disabled = isMonthDisabled(
                      year,
                      monthIndex,
                      disableFuture
                    );
                    const inRange = isMonthInRange(
                      monthIndex,
                      monthAnchor,
                      from,
                      to,
                      year
                    );
                    const isAnchor = monthAnchor === monthIndex;

                    return (
                      <Button
                        key={label}
                        type="button"
                        variant={inRange || isAnchor ? 'default' : 'outline'}
                        size="sm"
                        disabled={disabled}
                        onClick={() => handleMonthClick(monthIndex)}
                        className={cn(
                          'h-10 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200',
                          inRange || isAnchor
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        )}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[min(40vh,240px)] overflow-y-auto pr-0.5 [scrollbar-width:thin]">
                  {weeks.map((week) => {
                    const disabled = isWeekDisabled(year, week, disableFuture);
                    const inRange =
                      weekAnchor === week ||
                      (weekAnchor === null &&
                        weekInAppliedRange(week, year, from, to));

                    return (
                      <Button
                        key={week}
                        type="button"
                        variant={inRange ? 'default' : 'outline'}
                        size="sm"
                        disabled={disabled}
                        onClick={() => handleWeekClick(week)}
                        className={cn(
                          'h-auto min-h-10 rounded-xl px-2 py-2 flex flex-col items-start gap-0.5 text-left transition-all duration-200',
                          inRange
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                        )}
                      >
                        <span className="text-xs sm:text-sm font-bold leading-none">
                          {formatWeekChipLabel(week)}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] leading-tight truncate w-full',
                            inRange
                              ? 'text-indigo-100'
                              : 'text-muted-foreground'
                          )}
                        >
                          {formatWeekChipSubtitle(year, week)}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}

            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 bg-muted/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              onChange('', '');
              setMonthAnchor(null);
              setWeekAnchor(null);
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4"
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
