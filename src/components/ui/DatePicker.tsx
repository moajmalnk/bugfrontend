import { useMemo, useState } from 'react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

type Props = {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disableFuture?: boolean;
  allowOnlyTodayAndYesterday?: boolean;
};

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disableFuture, allowOnlyTodayAndYesterday }: Props) {
  const selectedDate = useMemo(() => (value ? new Date(value) : undefined), [value]);
  const [open, setOpen] = useState(false);
  const disabled = useMemo(() => {
    if (allowOnlyTodayAndYesterday) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      return {
        before: yesterday,
        after: today
      } as any;
    }
    
    if (!disableFuture) return undefined;
    const today = new Date();
    today.setHours(0,0,0,0);
    return { after: today } as any;
  }, [disableFuture, allowOnlyTodayAndYesterday]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start text-left font-normal text-xs sm:text-sm ${className || ''}`}>
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedDate ? format(selectedDate, 'PPP') : <span className="text-muted-foreground">{placeholder}</span>}
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
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(d) => {
            if (!d) return;
            const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
              .toISOString()
              .slice(0, 10);
            onChange(iso);
            setOpen(false);
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
              onChange('');
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
              const t = new Date();
              const iso = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()))
                .toISOString()
                .slice(0, 10);
              onChange(iso);
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


