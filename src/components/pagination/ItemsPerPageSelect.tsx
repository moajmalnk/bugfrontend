import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Rows3 } from "lucide-react";

const DEFAULT_OPTIONS = [10, 25, 50];

export interface ItemsPerPageSelectProps {
  value: number;
  onChange: (value: number) => void;
  /** Defaults to [10, 25, 50]. Projects uses [12, 25, 50]. */
  options?: number[];
  disabled?: boolean;
  /** Optional id for label association */
  id?: string;
  /** Match Search & Filter dropdowns (rounded-xl, h-11) */
  showIcon?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function ItemsPerPageSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled,
  id,
  showIcon = true,
  className,
  triggerClassName,
}: ItemsPerPageSelectProps) {
  const str = String(value);
  const valid = options.some((n) => String(n) === str);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon ? (
        <div className="p-1.5 bg-primary rounded-lg shrink-0" aria-hidden>
          <Rows3 className="h-4 w-4 text-white" />
        </div>
      ) : null}
      <Select
        value={valid ? str : String(options[0])}
        onValueChange={(v) => onChange(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className={cn(
            "h-11 min-w-[92px] w-[92px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium",
            triggerClassName
          )}
          aria-label="Items per page"
        >
          <SelectValue placeholder={String(options[0])} />
        </SelectTrigger>
        <SelectContent position="popper" className="z-[100]">
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
