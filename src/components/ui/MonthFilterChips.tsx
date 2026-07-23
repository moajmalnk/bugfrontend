import { Button } from '@/components/ui/button';
import {
  buildMonthFilterOptions,
  type MonthFilterValue,
} from '@/lib/monthFilter';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

type MonthFilterChipsProps = {
  value: MonthFilterValue;
  onChange: (value: MonthFilterValue) => void;
  /** How many past months to offer (plus All). Default 12. */
  count?: number;
  className?: string;
  /** Prefer short labels (e.g. "Jul 26") on very dense toolbars. */
  compact?: boolean;
};

export function MonthFilterChips({
  value,
  onChange,
  count = 12,
  className,
  compact = false,
}: MonthFilterChipsProps) {
  const options = useMemo(() => buildMonthFilterOptions(count), [count]);

  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="group" aria-label="Filter by month">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={value === opt.value ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => onChange(opt.value)}
          title={opt.label}
        >
          {compact && opt.value !== 'all' ? opt.shortLabel : opt.label}
        </Button>
      ))}
    </div>
  );
}
