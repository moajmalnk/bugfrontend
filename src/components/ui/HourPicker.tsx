import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { Clock } from 'lucide-react';

type Props = {
  value?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

export function HourPicker({ 
  value = 8, 
  onChange, 
  placeholder = 'Select hours', 
  className,
  min = 1,
  max = 24,
  step = 0.25
}: Props) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(value);

  useEffect(() => {
    setHour(value);
  }, [value]);

  const display = useMemo(() => {
    if (!value) return placeholder;
    return `${value} ${value === 1 ? 'Hour' : 'Hours'}`;
  }, [value, placeholder]);

  function commit() {
    const clamped = Math.max(min, Math.min(max, hour));
    onChange(clamped);
    setOpen(false);
  }

  const incrementHour = () => {
    const newHour = Math.min(max, hour + step);
    setHour(newHour);
  };

  const decrementHour = () => {
    const newHour = Math.max(min, hour - step);
    setHour(newHour);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-full justify-start ${className || ''}`}>
          <Clock className="mr-2 h-4 w-4" />
          {display}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[90vw] max-w-sm sm:w-[320px] p-4 space-y-4">
        <div className="text-base sm:text-lg font-semibold">Select Working Hours</div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hours</span>
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={decrementHour}
                disabled={hour <= min}
                className="h-8 w-8 p-0"
              >
                -
              </Button>
              <div className="text-lg font-semibold min-w-[60px] text-center">
                {hour}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={incrementHour}
                disabled={hour >= max}
                className="h-8 w-8 p-0"
              >
                +
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Quick Select</div>
            <div className="grid grid-cols-3 gap-2">
              {[4, 6, 8, 10, 12, 24].map((h) => (
                <Button
                  key={h}
                  type="button"
                  variant={hour === h ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHour(h)}
                  className="text-xs"
                >
                  {h}h
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Custom Input</label>
            <input
              id="hour-picker-custom"
              type="number"
              min={min}
              max={max}
              step={step}
              value={hour}
              onChange={(e) => setHour(Math.max(min, Math.min(max, Number(e.target.value))))}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              placeholder="Enter hours"
            />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button 
            onClick={() => {
              const now = new Date();
              const currentHour = now.getHours();
              setHour(Math.max(min, Math.min(max, currentHour)));
            }} 
            variant="outline" 
            className="w-full sm:w-auto"
          >
            Current Hour
          </Button>
          <Button onClick={commit} className="w-full sm:w-auto px-4">
            Set Hours
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
