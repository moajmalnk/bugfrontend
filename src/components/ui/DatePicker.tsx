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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start text-left font-normal text-xs sm:text-sm ${className || ''}`}>
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedDate ? format(selectedDate, 'PPP') : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" alignOffset={0}>
        <Calendar
          mode="single"
          selected={selectedDate}
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
      </PopoverContent>
    </Popover>
  );
}


