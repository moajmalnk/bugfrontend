import { useEffect, useMemo, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value?: string; // HH:mm:ss or HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
};

type Period = 'AM' | 'PM';

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: Period[] = ['AM', 'PM'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseTime(value?: string): { hour: number; minute: number; ampm: Period } {
  const [hStr, mStr] = String(value || '').split(':');
  let h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return { hour: 9, minute: 0, ampm: 'AM' };
  }
  const ampm: Period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { hour: h, minute: Math.max(0, Math.min(59, m)), ampm };
}

function toHms(hour: number, minute: number, ampm: Period): string {
  let h24 = hour % 12;
  if (ampm === 'PM') h24 += 12;
  return `${pad2(h24)}:${pad2(minute)}:00`;
}

function formatDisplay(value?: string, placeholder = 'Select time'): string {
  if (!value) return placeholder;
  const { hour, minute, ampm } = parseTime(value);
  return `${pad2(hour)}:${pad2(minute)} ${ampm}`;
}

function WheelColumn<T extends string | number>({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = selectedRef.current;
    const parent = listRef.current;
    if (!el || !parent) return;
    parent.scrollTop = Math.max(0, el.offsetTop - parent.clientHeight / 2 + el.clientHeight / 2);
  }, [selected]);

  return (
    <div className="min-w-0 space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        ref={listRef}
        className="h-40 overflow-y-auto rounded-xl border border-border bg-background p-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-xl [&::-webkit-scrollbar-thumb]:bg-border"
      >
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const isSelected = item === selected;
            return (
              <button
                key={String(item)}
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  'h-8 w-full shrink-0 rounded-xl text-sm font-semibold transition-colors',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                {typeof item === 'number' ? pad2(item) : item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  placeholder = 'Select time',
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseTime(value), [value]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [ampm, setAmpm] = useState<Period>(parsed.ampm);

  useEffect(() => {
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setAmpm(parsed.ampm);
  }, [parsed.hour, parsed.minute, parsed.ampm]);

  const display = formatDisplay(value, placeholder);

  const emit = (nextHour: number, nextMinute: number, nextAmpm: Period) => {
    onChange(toHms(nextHour, nextMinute, nextAmpm));
  };

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
      modal={false}
    >
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel || placeholder}
            className={cn(
              'flex h-10 w-full items-center rounded-xl border border-input bg-background px-3 pr-10 text-left text-xs font-medium sm:text-sm',
              !value && 'text-muted-foreground',
              disabled && 'cursor-not-allowed opacity-50',
              className
            )}
          >
            <span className="truncate">{display}</span>
          </button>
        </PopoverTrigger>
        <Clock
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-[min(100vw-1.5rem,280px)] rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-lg z-[1100]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-4">
            <WheelColumn
              label="Hours"
              items={HOURS}
              selected={hour}
              onSelect={(next) => {
                setHour(next);
                emit(next, minute, ampm);
              }}
            />
          </div>
          <div className="col-span-4">
            <WheelColumn
              label="Minutes"
              items={MINUTES}
              selected={minute}
              onSelect={(next) => {
                setMinute(next);
                emit(hour, next, ampm);
              }}
            />
          </div>
          <div className="col-span-4">
            <WheelColumn
              label="AM/PM"
              items={PERIODS}
              selected={ampm}
              onSelect={(next) => {
                setAmpm(next);
                emit(hour, minute, next);
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-xl px-2 text-xs text-blue-600 dark:text-blue-400"
            onClick={() => {
              const now = new Date();
              let h = now.getHours();
              const m = now.getMinutes();
              const nextAmpm: Period = h >= 12 ? 'PM' : 'AM';
              if (h === 0) h = 12;
              else if (h > 12) h -= 12;
              setHour(h);
              setMinute(m);
              setAmpm(nextAmpm);
              emit(h, m, nextAmpm);
            }}
          >
            Now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 rounded-xl px-2 text-xs text-blue-600 dark:text-blue-400"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
