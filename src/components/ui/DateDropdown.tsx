import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Calendar as CalendarIcon } from 'lucide-react';

type Props = {
    value?: string; // YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
};

function todayYMD() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function yesterdayYMD() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
}

export function DateDropdown({ value, onChange, placeholder = 'Select date', className }: Props) {
    const today = todayYMD();
    const yesterday = yesterdayYMD();

    const displayValue = useMemo(() => {
        if (!value) return undefined;
        if (value === today) return 'today';
        if (value === yesterday) return 'yesterday';
        return undefined;
    }, [value, today, yesterday]);

    return (
        <Select
            value={displayValue}
            onValueChange={(val) => {
                if (val === 'today') {
                    onChange(today);
                } else if (val === 'yesterday') {
                    onChange(yesterday);
                }
            }}
        >
            <SelectTrigger className={`w-full ${className || ''}`}>
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <SelectValue placeholder={placeholder} />
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="today">
                    <div className="flex flex-col">
                        <span className="font-medium">Today</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(today).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'Asia/Kolkata'
                            })}
                        </span>
                    </div>
                </SelectItem>
                <SelectItem value="yesterday">
                    <div className="flex flex-col">
                        <span className="font-medium">Yesterday</span>
                        <span className="text-xs text-muted-foreground">
                            {new Date(yesterday).toLocaleDateString('en-IN', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'Asia/Kolkata'
                            })}
                        </span>
                    </div>
                </SelectItem>
            </SelectContent>
        </Select>
    );
}
