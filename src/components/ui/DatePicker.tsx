import { useMemo, useState } from 'react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

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

  const label = isMultiple
    ? formatMultiLabel(props.values ?? [])
    : selectedDates[0]
      ? format(selectedDates[0], 'PPP')
      : '';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
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
            defaultMonth={selectedDates[selectedDates.length - 1]}
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
            defaultMonth={selectedDates[0]}
            onSelect={(d) => {
              if (!d) return;
              props.onChange(toYMD(d));
              setOpen(false);
            }}
            disabled={disabled}
            initialFocus
          />
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-1.5">
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
      </PopoverContent>
    </Popover>
  );
}
