import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type CaptionProps } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

type CalendarBounds = { fromYear: number; toYear: number };
const CalendarBoundsContext = React.createContext<CalendarBounds>({
  fromYear: CURRENT_YEAR - 15,
  toYear: CURRENT_YEAR + 15,
});

function CalendarCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation();
  const { fromYear, toYear } = React.useContext(CalendarBoundsContext);
  const [monthOpen, setMonthOpen] = React.useState(false);
  const [yearOpen, setYearOpen] = React.useState(false);
  const yearListRef = React.useRef<HTMLDivElement | null>(null);

  const years = React.useMemo(() => {
    const list: number[] = [];
    for (let y = fromYear; y <= toYear; y += 1) list.push(y);
    return list;
  }, [fromYear, toYear]);

  React.useEffect(() => {
    if (!yearOpen || !yearListRef.current) return;
    const active = yearListRef.current.querySelector<HTMLElement>(
      '[data-active-year="true"]'
    );
    active?.scrollIntoView({ block: "center" });
  }, [yearOpen, displayMonth]);

  const goMonth = (monthIndex: number) => {
    goToMonth(new Date(displayMonth.getFullYear(), monthIndex, 1));
    setMonthOpen(false);
  };

  const goYear = (year: number) => {
    goToMonth(new Date(year, displayMonth.getMonth(), 1));
    setYearOpen(false);
  };

  return (
    <div className="relative flex items-center justify-center gap-1 px-8 min-h-8 w-full">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!previousMonth}
        className="absolute left-0 h-7 w-7 rounded-xl bg-transparent p-0 opacity-60 hover:opacity-100 disabled:opacity-30"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center justify-center gap-1 min-w-0">
        <Popover open={monthOpen} onOpenChange={setMonthOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 max-w-[7.5rem] rounded-xl px-2 text-xs font-medium gap-1"
            >
              <span className="truncate">{format(displayMonth, "MMMM")}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            className="z-[220] w-[min(16rem,calc(100vw-2rem))] p-2 rounded-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((label, index) => {
                const active = displayMonth.getMonth() === index;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goMonth(index)}
                    className={cn(
                      "h-8 rounded-xl px-1 text-[11px] font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-foreground hover:bg-muted"
                    )}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={yearOpen} onOpenChange={setYearOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 min-w-[4.25rem] rounded-xl px-2 text-xs font-medium gap-1"
            >
              <span>{displayMonth.getFullYear()}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            className="z-[220] w-[min(16rem,calc(100vw-2rem))] p-2 rounded-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div
              ref={yearListRef}
              className="no-scrollbar max-h-[min(14rem,42vh)] overflow-y-auto overscroll-contain"
            >
              <div className="grid grid-cols-3 gap-1.5">
                {years.map((year) => {
                  const active = displayMonth.getFullYear() === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      data-active-year={active ? "true" : undefined}
                      onClick={() => goYear(year)}
                      className={cn(
                        "h-8 rounded-xl px-1 text-[11px] font-medium tabular-nums transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-foreground hover:bg-muted"
                      )}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={!nextMonth}
        className="absolute right-0 h-7 w-7 rounded-xl bg-transparent p-0 opacity-60 hover:opacity-100 disabled:opacity-30"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fixedWeeks = true,
  fromYear = CURRENT_YEAR - 15,
  toYear = CURRENT_YEAR + 15,
  components,
  captionLayout: _captionLayout,
  ...props
}: CalendarProps) {
  const isRange = props.mode === "range";

  return (
    <CalendarBoundsContext.Provider value={{ fromYear, toYear }}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        fixedWeeks={fixedWeeks}
        captionLayout="buttons"
        fromYear={fromYear}
        toYear={toYear}
        className={cn(
          "p-2 min-w-0 w-full max-w-[280px] sm:max-w-[300px]",
          className
        )}
        classNames={{
          months: "flex flex-col space-y-2",
          month: "space-y-2 w-full min-w-0",
          caption: "flex justify-center relative items-center w-full",
          caption_label: "sr-only",
          nav: "hidden",
          table: "w-full border-collapse table-fixed",
          tbody: "min-h-[calc(6*1.85rem)] sm:min-h-[calc(6*2.1rem)]",
          head_row: "flex w-full",
          head_cell:
            "text-muted-foreground rounded-md flex-1 min-w-0 font-normal text-[0.65rem] sm:text-[0.7rem] px-0 text-center",
          row: "flex w-full mt-0.5 h-7 sm:h-8",
          // Range mode: contiguous accent bar. Single mode: no cell fill (avoids square corners behind rounded day).
          cell: cn(
            "h-7 sm:h-8 flex-1 min-w-0 text-center text-xs p-0 relative focus-within:relative focus-within:z-20",
            isRange &&
              "[&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-full sm:h-8 p-0 font-normal aria-selected:opacity-100 text-xs rounded-xl"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl",
          day_today: "bg-accent text-accent-foreground rounded-xl",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Caption: CalendarCaption,
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          ...components,
        }}
        {...props}
      />
    </CalendarBoundsContext.Provider>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
