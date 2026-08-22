import { Button } from "@/components/ui/button";
import { CustomPeriodRangePicker } from "@/components/ui/CustomPeriodRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type DashboardPeriod,
  type WorkPeriodPreset,
  WORK_PERIOD_PRESETS,
  shiftCalendarDate,
} from "@/lib/dashboardPeriod";
import { toLocalCalendarDateString } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

type Props = {
  preset: WorkPeriodPreset;
  customFrom: string;
  customTo: string;
  period: DashboardPeriod;
  onPresetChange: (value: WorkPeriodPreset) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  isFetching?: boolean;
  /** When true, custom dates/months/weeks after today are disabled. Default true. */
  disableFuture?: boolean;
  className?: string;
};

export function DashboardPeriodFilter({
  preset,
  customFrom,
  customTo,
  period,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  isFetching,
  disableFuture = true,
  className,
}: Props) {
  const activePreset =
    WORK_PERIOD_PRESETS.find((p) => p.value === preset) ??
    WORK_PERIOD_PRESETS.find((p) => p.value === "month") ??
    WORK_PERIOD_PRESETS[0];
  const ActivePresetIcon = activePreset.icon;
  const isCustom = preset === "custom";

  const selectPreset = (value: WorkPeriodPreset) => {
    onPresetChange(value);
    if (value === "custom" && !customFrom) {
      const today = toLocalCalendarDateString(new Date());
      onCustomFromChange(shiftCalendarDate(today, -6));
      onCustomToChange(today);
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 min-w-0 w-full lg:w-auto lg:max-w-md xl:max-w-lg lg:ml-auto",
        isCustom && "md:grid-cols-[minmax(8.5rem,auto)_minmax(0,1fr)] lg:max-w-xl xl:max-w-2xl",
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full px-3 sm:px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-xl min-w-0 justify-between"
          >
            <span className="inline-flex items-center gap-1.5 min-w-0 flex-1">
              <ActivePresetIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
              <span className="truncate">{activePreset.label}</span>
              {!isCustom ? (
                <>
                  <span className="text-muted-foreground font-normal shrink-0 hidden sm:inline">
                    ·
                  </span>
                  <span className="truncate text-xs font-medium text-muted-foreground max-w-[6rem] sm:max-w-[8rem] hidden sm:inline">
                    {period.rangeLabel}
                  </span>
                </>
              ) : null}
              {isFetching ? (
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                  …
                </span>
              ) : null}
            </span>
            <ChevronDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-[80] w-44 rounded-xl p-1 shadow-lg"
        >
          <DropdownMenuLabel className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Period filter
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-0.5" />
          {WORK_PERIOD_PRESETS.map((item) => {
            const Icon = item.icon;
            const isActive = preset === item.value;
            return (
              <DropdownMenuItem
                key={item.value}
                onSelect={() => selectPreset(item.value)}
                className={cn(
                  "rounded-lg gap-1.5 py-1.5 px-2 text-sm cursor-pointer min-h-8",
                  isActive &&
                    "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                <span className="flex-1 font-medium leading-tight">{item.label}</span>
                {isActive ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {isCustom ? (
        <CustomPeriodRangePicker
          from={customFrom}
          to={customTo}
          onChange={(nextFrom, nextTo) => {
            onCustomFromChange(nextFrom);
            onCustomToChange(nextTo);
          }}
          placeholder="From – To"
          disableFuture={disableFuture}
          className="w-full min-w-0"
        />
      ) : null}
    </div>
  );
}
