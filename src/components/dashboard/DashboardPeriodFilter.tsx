import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
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
}: Props) {
  const activePreset =
    WORK_PERIOD_PRESETS.find((p) => p.value === preset) ??
    WORK_PERIOD_PRESETS.find((p) => p.value === "month") ??
    WORK_PERIOD_PRESETS[0];
  const ActivePresetIcon = activePreset.icon;

  const selectPreset = (value: WorkPeriodPreset) => {
    onPresetChange(value);
    if (value === "custom" && !customFrom) {
      const today = toLocalCalendarDateString(new Date());
      onCustomFromChange(shiftCalendarDate(today, -6));
      onCustomToChange(today);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 min-w-0 w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full sm:w-auto px-4 sm:px-5 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 font-semibold shadow-sm hover:shadow-md transition-all duration-300 rounded-xl min-w-0 max-w-full justify-between sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              <ActivePresetIcon className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
              <span className="truncate">{activePreset.label}</span>
              {preset !== "custom" ? (
                <>
                  <span className="text-muted-foreground font-normal shrink-0">·</span>
                  <span className="truncate text-xs sm:text-sm font-medium text-muted-foreground max-w-[9rem] md:max-w-[14rem]">
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
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-[80] w-[min(100vw-2rem,18rem)] rounded-2xl p-1.5"
        >
          <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Period filter
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {WORK_PERIOD_PRESETS.map((item) => {
            const Icon = item.icon;
            const isActive = preset === item.value;
            return (
              <DropdownMenuItem
                key={item.value}
                onSelect={() => selectPreset(item.value)}
                className={cn(
                  "rounded-xl gap-2 cursor-pointer",
                  isActive &&
                    "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="flex-1 font-medium">{item.label}</span>
                {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {preset === "custom" ? (
        <DateRangePicker
          from={customFrom}
          to={customTo}
          onChange={(nextFrom, nextTo) => {
            onCustomFromChange(nextFrom);
            onCustomToChange(nextTo);
          }}
          placeholder="From – To"
          disableFuture
          className="w-full sm:flex-1 sm:min-w-[14rem] sm:max-w-[22rem]"
        />
      ) : null}
    </div>
  );
}
