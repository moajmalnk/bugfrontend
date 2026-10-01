import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  userService,
  type ActiveHoursData,
  type ActiveHoursPeriod,
} from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  LogIn,
  LogOut,
  RefreshCw,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface ActiveHoursProps {
  userId: string;
  userName: string;
}

const periodTabs: Array<{
  value: ActiveHoursPeriod;
  label: string;
  icon: typeof Clock;
}> = [
  { value: "daily", label: "Daily", icon: Clock },
  { value: "weekly", label: "Weekly", icon: CalendarDays },
  { value: "monthly", label: "Monthly", icon: Calendar },
  { value: "yearly", label: "Yearly", icon: TrendingUp },
];

const periodLabels: Record<ActiveHoursPeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  yearly: "This Year",
};

const periodDays: Record<ActiveHoursPeriod, string> = {
  daily: "today",
  weekly: "this week",
  monthly: "this month",
  yearly: "this year",
};

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours >= 100) return `${hours.toLocaleString()}h`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Why: the server computes presence in its own timezone (IST) and returns wall-clock
 * ISO strings. Reading the clock straight from the string keeps every viewer, in any
 * browser timezone, seeing the same times as the API and database.
 */
function wallClockMinutes(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  const total = wallClockMinutes(iso);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatHourLabel(hour: number): string {
  const h = hour % 24;
  return `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`;
}

function formatDay(date: string, pattern = "EEE, MMM dd, yyyy"): string {
  return format(parseISO(date), pattern);
}

export function ActiveHours({ userId, userName }: ActiveHoursProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ActiveHoursPeriod>("daily");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMobileTabSelectorOpen, setIsMobileTabSelectorOpen] = useState(false);

  useEffect(() => {
    setSelectedPeriod("daily");
    setSelectedDate(null);
  }, [userId]);

  const activePeriodTab = useMemo(
    () => periodTabs.find((tab) => tab.value === selectedPeriod) ?? periodTabs[0],
    [selectedPeriod]
  );

  const isLiveView = selectedDate === null;

  const { data, isPending, isError, error, refetch, isFetching } = useQuery<ActiveHoursData>({
    queryKey: ["activeHours", userId, selectedPeriod, selectedDate],
    queryFn: ({ signal }) =>
      userService.getActiveHours(userId, selectedPeriod, {
        date: selectedDate ?? undefined,
        signal,
      }),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: isLiveView ? 30_000 : false,
  });

  const changePeriod = (period: ActiveHoursPeriod) => {
    setSelectedDate(null);
    setSelectedPeriod(period);
  };

  const openDay = (date: string) => {
    setSelectedDate(date);
    setSelectedPeriod("daily");
  };

  const title = selectedDate ? formatDay(selectedDate) : periodLabels[selectedPeriod];

  return (
    <Card className="rounded-2xl">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2">
            <Activity className="h-5 w-5 shrink-0 text-blue-500" />
            <span className="truncate">Active Hours - {title}</span>
          </CardTitle>
          {data && <PresenceBadge presence={data.presence} />}
        </div>
        {selectedDate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit rounded-xl"
            onClick={() => setSelectedDate(null)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to today
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Tabs
          value={selectedPeriod}
          onValueChange={(value) => changePeriod(value as ActiveHoursPeriod)}
        >
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl" />
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <div className="lg:hidden p-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-2xl justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  onClick={() => setIsMobileTabSelectorOpen(true)}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {activePeriodTab?.icon && <activePeriodTab.icon className="h-4 w-4" />}
                    {activePeriodTab?.label}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </div>

              <TabsList className="hidden lg:grid w-full grid-cols-4 h-14 bg-transparent p-1">
                {periodTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <tab.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <Drawer open={isMobileTabSelectorOpen} onOpenChange={setIsMobileTabSelectorOpen}>
            <DrawerContent className="lg:hidden rounded-t-3xl border-gray-200/70 dark:border-gray-800/70 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Period
                </DrawerTitle>
                <DrawerDescription>View active hours by time period</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-6 flex flex-col gap-3 max-h-[65vh] overflow-y-auto">
                {periodTabs.map((tab) => {
                  const isActive = selectedPeriod === tab.value && isLiveView;
                  return (
                    <Button
                      key={tab.value}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        changePeriod(tab.value);
                        setIsMobileTabSelectorOpen(false);
                      }}
                      className={cn(
                        "w-full h-auto min-h-20 rounded-3xl px-4 py-4 flex items-center justify-between",
                        isActive
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-500 hover:to-red-600"
                          : "bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 hover:bg-gray-200/80 dark:hover:bg-gray-700/80"
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-full",
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                          )}
                        >
                          <tab.icon className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-semibold">{tab.label}</span>
                      </span>
                      {isActive && (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </DrawerContent>
          </Drawer>

          <TabsContent value={selectedPeriod} className="mt-0">
            {isPending ? (
              <ActiveHoursSkeleton />
            ) : isError ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-8 text-center">
                <Activity className="h-10 w-10 text-destructive/70" />
                <div>
                  <p className="font-medium text-foreground">Unable to load active hours</p>
                  <p className="text-sm text-muted-foreground">
                    {(error as Error)?.message || "Please try again."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={isFetching}
                  onClick={() => refetch()}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                  Retry
                </Button>
              </div>
            ) : (
              <ActiveHoursBody
                data={data}
                isSingleDay={selectedPeriod === "daily"}
                emptyLabel={selectedDate ? `on ${formatDay(selectedDate, "MMM dd, yyyy")}` : periodDays[selectedPeriod]}
                userName={userName}
                onOpenDay={openDay}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PresenceBadge({ presence }: { presence: ActiveHoursData["presence"] }) {
  if (presence.is_online) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Online now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
      {presence.last_seen_at
        ? `Last seen ${formatDistanceToNow(parseISO(presence.last_seen_at), { addSuffix: true })}`
        : "Never seen"}
    </span>
  );
}

function ActiveHoursBody({
  data,
  isSingleDay,
  emptyLabel,
  userName,
  onOpenDay,
}: {
  data: ActiveHoursData;
  isSingleDay: boolean;
  emptyLabel: string;
  userName: string;
  onOpenDay: (date: string) => void;
}) {
  const { summary } = data;
  const hasData = summary.total_minutes > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          tone="blue"
          value={formatDuration(summary.total_minutes)}
          label="Total active time"
        />
        <StatTile
          icon={TrendingUp}
          tone="green"
          value={isSingleDay ? formatDuration(summary.longest_session_minutes) : formatDuration(summary.average_minutes_per_active_day)}
          label={isSingleDay ? "Longest session" : "Avg / active day"}
        />
        <StatTile icon={Activity} tone="purple" value={String(summary.total_sessions)} label="Sessions" />
        <StatTile
          icon={Calendar}
          tone="orange"
          value={
            isSingleDay
              ? formatDuration(summary.total_sessions > 0 ? Math.round(summary.total_minutes / summary.total_sessions) : 0)
              : `${summary.active_days} / ${summary.days_elapsed}`
          }
          label={isSingleDay ? "Avg session" : "Active days"}
        />
      </div>

      {hasData && (
        <div className="grid grid-cols-12 gap-4">
          {isSingleDay ? (
            <>
              <InfoChip className="col-span-12 sm:col-span-6" icon={LogIn} label="First seen" value={formatClock(summary.first_activity_at)} />
              <InfoChip className="col-span-12 sm:col-span-6" icon={LogOut} label="Last seen" value={formatClock(summary.last_activity_at)} />
            </>
          ) : (
            <>
              <InfoChip
                className="col-span-12 sm:col-span-4"
                icon={Flame}
                label="Peak hour"
                value={summary.peak_hour === null ? "—" : `${formatHourLabel(summary.peak_hour)} – ${formatHourLabel(summary.peak_hour + 1)}`}
              />
              <InfoChip className="col-span-12 sm:col-span-4" icon={Timer} label="Longest session" value={formatDuration(summary.longest_session_minutes)} />
              <InfoChip
                className="col-span-12 sm:col-span-4"
                icon={LogOut}
                label="Last active"
                value={summary.last_activity_at ? format(parseISO(summary.last_activity_at), "MMM dd") + ", " + formatClock(summary.last_activity_at) : "—"}
              />
            </>
          )}
        </div>
      )}

      {!hasData ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Activity className="h-10 w-10 opacity-50" />
          <p className="font-medium">No activity recorded {emptyLabel}</p>
          <p className="text-sm">
            Time is tracked while {userName || "the user"} has BugRicer open in a visible tab.
          </p>
        </div>
      ) : isSingleDay ? (
        <DayTimeline sessions={data.sessions} />
      ) : (
        <>
          <HourlyDistribution hours={data.hourly_distribution} />
          <DailyBreakdown days={data.daily_breakdown} onOpenDay={onOpenDay} />
        </>
      )}
    </div>
  );
}

const toneClasses = {
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 [&_svg]:text-blue-500",
  green: "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 [&_svg]:text-green-500",
  purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 [&_svg]:text-purple-500",
  orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 [&_svg]:text-orange-500",
} as const;

function StatTile({
  icon: Icon,
  tone,
  value,
  label,
}: {
  icon: typeof Clock;
  tone: keyof typeof toneClasses;
  value: string;
  label: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl p-4 text-center", toneClasses[tone])}>
      <Icon className="h-6 w-6" />
      <p className="max-w-full truncate text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3", className)}>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ms-auto truncate text-sm font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function DayTimeline({ sessions }: { sessions: ActiveHoursData["sessions"] }) {
  const ordered = useMemo(() => [...sessions].reverse(), [sessions]);

  return (
    <div className="flex flex-col gap-4">
      <h4 className="flex items-center gap-2 text-lg font-semibold">
        <Clock className="h-5 w-5 text-muted-foreground" />
        Day timeline
      </h4>

      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col gap-1">
          <div className="relative h-8 overflow-hidden rounded-xl bg-muted/50">
            {sessions.map((s) => {
              const start = wallClockMinutes(s.start);
              const endRaw = wallClockMinutes(s.end);
              const end = endRaw <= start && s.minutes > 0 ? 1440 : endRaw;
              return (
                <Tooltip key={s.start}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute inset-y-1 rounded-md",
                        s.is_ongoing ? "bg-emerald-500" : "bg-blue-500"
                      )}
                      style={{
                        left: `${(start / 1440) * 100}%`,
                        width: `max(3px, ${((end - start) / 1440) * 100}%)`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {formatClock(s.start)} – {s.is_ongoing ? "now" : formatClock(s.end)} · {formatDuration(s.minutes)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            {[0, 6, 12, 18, 24].map((h) => (
              <span key={h}>{h === 24 ? "12 AM" : formatHourLabel(h)}</span>
            ))}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pe-1 [scrollbar-width:thin]">
        {ordered.map((s) => (
          <div key={s.start} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", s.is_ongoing ? "bg-emerald-500" : "bg-blue-500")} />
              <span className="truncate font-medium tabular-nums">
                {formatClock(s.start)} – {s.is_ongoing ? "now" : formatClock(s.end)}
              </span>
              {s.is_ongoing && (
                <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Live
                </span>
              )}
            </div>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{formatDuration(s.minutes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HourlyDistribution({ hours }: { hours: ActiveHoursData["hourly_distribution"] }) {
  const max = Math.max(1, ...hours.map((h) => h.minutes));

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 text-lg font-semibold">
        <Flame className="h-5 w-5 text-muted-foreground" />
        When active
      </h4>
      <TooltipProvider delayDuration={100}>
        <div className="flex h-24 items-end gap-[3px] rounded-xl bg-muted/30 p-3">
          {hours.map((h) => (
            <Tooltip key={h.hour}>
              <TooltipTrigger asChild>
                <div className="flex h-full flex-1 items-end">
                  <div
                    className={cn("w-full rounded-sm", h.minutes > 0 ? "bg-blue-500/80" : "bg-muted")}
                    style={{ height: `${Math.max(4, (h.minutes / max) * 100)}%` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {formatHourLabel(h.hour)} – {formatHourLabel(h.hour + 1)} · {formatDuration(h.minutes)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="flex justify-between px-3 text-[11px] text-muted-foreground">
        {[0, 6, 12, 18].map((h) => (
          <span key={h}>{formatHourLabel(h)}</span>
        ))}
        <span>11 PM</span>
      </div>
    </div>
  );
}

function DailyBreakdown({
  days,
  onOpenDay,
}: {
  days: ActiveHoursData["daily_breakdown"];
  onOpenDay: (date: string) => void;
}) {
  const max = Math.max(1, ...days.map((d) => d.total_minutes));

  return (
    <div className="flex flex-col gap-3">
      <h4 className="flex items-center gap-2 text-lg font-semibold">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        Daily breakdown
        <span className="text-sm font-normal text-muted-foreground">
          · {days.length} active {days.length === 1 ? "day" : "days"}
        </span>
      </h4>
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pe-1 [scrollbar-width:thin]">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => onOpenDay(day.date)}
            className="group flex flex-col gap-2 rounded-xl bg-muted/30 p-3 text-start transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{formatDay(day.date)}</span>
              <span className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{formatDuration(day.total_minutes)}</span>
                <span>
                  {day.session_count} {day.session_count === 1 ? "session" : "sessions"}
                </span>
                <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.max(2, (day.total_minutes / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatClock(day.first_seen)} – {formatClock(day.last_seen)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveHoursSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading active hours">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-12 rounded-xl sm:col-span-6" />
        <Skeleton className="col-span-12 h-12 rounded-xl sm:col-span-6" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-40 rounded-xl" />
        <Skeleton className="h-8 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
