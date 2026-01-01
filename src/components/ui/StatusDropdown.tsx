import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { CheckCircle2, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';

type StatusOption = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

type Props = {
    value?: StatusOption;
    onChange: (value: StatusOption) => void;
    placeholder?: string;
    className?: string;
};

const statusConfig = {
    not_started: {
        label: 'Not Started',
        icon: Clock,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    in_progress: {
        label: 'In Progress',
        icon: Clock,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
    },
    completed: {
        label: 'Completed',
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
    },
    blocked: {
        label: 'Blocked',
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
    },
    cancelled: {
        label: 'Cancelled',
        icon: Ban,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-800',
    },
};

export function StatusDropdown({ value = 'not_started', onChange, placeholder = 'Select status', className }: Props) {
    const currentStatus = statusConfig[value];
    const Icon = currentStatus.icon;

    return (
        <Select value={value} onValueChange={(val) => onChange(val as StatusOption)}>
            <SelectTrigger className={`w-full ${className || ''}`}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {(Object.keys(statusConfig) as StatusOption[]).map((status) => {
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    return (
                        <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                                <StatusIcon className={`h-4 w-4 ${config.color}`} />
                                <span className="font-medium">{config.label}</span>
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

// Export status config for use in other components
export { statusConfig };
export type { StatusOption };
