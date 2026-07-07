import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Input } from './input';
import { Clock } from 'lucide-react';

type Props = {
  value?: number | string | null;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

function normalizeHours(value: number | string | null | undefined, fallback = 8): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function formatHourDisplay(value: number | string | null | undefined) {
  return normalizeHours(value).toFixed(2);
}

export function HourPicker({
  value = 8,
  onChange,
  placeholder = 'Select hours',
  className,
  min = 1,
  max = 24,
  step = 0.25,
}: Props) {
  const [open, setOpen] = useState(false);
  const numericValue = normalizeHours(value);
  const [hour, setHour] = useState(numericValue);

  useEffect(() => {
    setHour(normalizeHours(value));
  }, [value]);

  const display = useMemo(() => {
    if (value === null || value === undefined || value === '') return placeholder;
    const hours = normalizeHours(value, NaN);
    if (!Number.isFinite(hours) || hours <= 0) return placeholder;
    return `${formatHourDisplay(hours)} ${hours === 1 ? 'Hour' : 'Hours'}`;
  }, [value, placeholder]);

  const quickOptions = useMemo(
    () => [4, 6, 8, 10, 12, 24].filter((h) => h >= min && h <= max),
    [min, max]
  );

  function commit() {
    const clamped = Math.max(min, Math.min(max, hour));
    onChange(clamped);
    setOpen(false);
  }

  const incrementHour = () => {
    setHour((prev) => Math.min(max, Math.round((prev + step) * 100) / 100));
  };

  const decrementHour = () => {
    setHour((prev) => Math.max(min, Math.round((prev - step) * 100) / 100));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${className || ''}`}>
          <Clock className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[--radix-popover-trigger-width] min-w-[16rem] p-4 space-y-4"
      >
        <div className="text-base font-semibold text-foreground">Select Working Hours</div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">Hours</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={decrementHour}
                disabled={hour <= min}
                className="h-9 w-9 shrink-0 border-2 p-0"
                aria-label="Decrease hours"
              >
                -
              </Button>
              <span className="min-w-[4.5rem] text-center text-lg font-semibold tabular-nums">
                {formatHourDisplay(hour)}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={incrementHour}
                disabled={hour >= max}
                className="h-9 w-9 shrink-0 border-2 p-0"
                aria-label="Increase hours"
              >
                +
              </Button>
            </div>
          </div>

          {quickOptions.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Quick Select</div>
              <div
                className={`grid w-full gap-2 ${
                  quickOptions.length <= 3
                    ? 'grid-cols-3'
                    : quickOptions.length === 4
                      ? 'grid-cols-4'
                      : 'grid-cols-3'
                }`}
              >
                {quickOptions.map((h) => (
                  <Button
                    key={h}
                    type="button"
                    variant={hour === h ? 'default' : 'outline'}
                    onClick={() => setHour(h)}
                    className="h-10 w-full px-0 text-xs font-semibold sm:text-sm"
                  >
                    {h}h
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="hour-picker-custom" className="text-xs font-medium text-muted-foreground">
              Custom Input
            </label>
            <Input
              id="hour-picker-custom"
              type="number"
              min={min}
              max={max}
              step={step}
              value={hour}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isNaN(next)) return;
                setHour(Math.max(min, Math.min(max, next)));
              }}
              className="h-11 w-full border-2"
              placeholder="Enter hours"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => {
              const now = new Date();
              const currentHour = now.getHours() + now.getMinutes() / 60;
              setHour(Math.max(min, Math.min(max, Math.round(currentHour * 100) / 100)));
            }}
            variant="outline"
            className="h-11 w-full"
          >
            Current Hour
          </Button>
          <Button type="button" onClick={commit} className="h-11 w-full">
            Set Hours
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
