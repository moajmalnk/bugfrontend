import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Clock } from 'lucide-react';

type Props = {
  value?: string; // HH:mm:ss or HH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function TimePicker({ value, onChange, placeholder = 'Select time', className }: Props) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (!value) return;
    const [hStr, mStr] = value.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    setAmpm(h >= 12 ? 'PM' : 'AM');
    if (h === 0) h = 12; else if (h > 12) h = h - 12;
    setHour(h);
    setMinute(m);
  }, [value]);

  const display = useMemo(() => {
    if (!value) return placeholder;
    const [hStr, mStr] = value.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    const ampmLocal = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12; else if (h > 12) h = h - 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampmLocal}`;
  }, [value, placeholder]);

  function commit() {
    let h24 = hour % 12;
    if (ampm === 'PM') h24 += 12;
    const val = `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    onChange(val);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${className || ''}`}>
          <Clock className="mr-2 h-4 w-4" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[90vw] max-w-sm sm:w-[320px] p-4 space-y-4">
        <div className="text-base sm:text-lg font-semibold">Select Time</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-start">
          <div className="space-y-1 col-span-1">
            <div className="text-xs text-muted-foreground">Hour</div>
            <input
              aria-label="Hour"
              inputMode="numeric"
              type="number"
              min={1}
              max={12}
              value={hour}
              onChange={(e)=>setHour(Math.max(1, Math.min(12, parseInt(e.target.value||'1',10))))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div className="space-y-1 col-span-1">
            <div className="text-xs text-muted-foreground">Minute</div>
            <input
              aria-label="Minute"
              inputMode="numeric"
              type="number"
              min={0}
              max={59}
              value={minute}
              onChange={(e)=>setMinute(Math.max(0, Math.min(59, parseInt(e.target.value||'0',10))))}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <div className="text-xs text-muted-foreground">Period</div>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={ampm==='AM'?'default':'outline'} className="w-full" onClick={()=>setAmpm('AM')}>AM</Button>
              <Button type="button" variant={ampm==='PM'?'default':'outline'} className="w-full" onClick={()=>setAmpm('PM')}>PM</Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button onClick={()=>{ const now=new Date(); let h=now.getHours(); const m=now.getMinutes(); setAmpm(h>=12?'PM':'AM'); if(h===0)h=12; else if(h>12)h=h-12; setHour(h); setMinute(m); }} variant="outline" className="w-full sm:w-auto">Now</Button>
          <Button onClick={commit} className="w-full sm:w-auto px-4">Set Time</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


