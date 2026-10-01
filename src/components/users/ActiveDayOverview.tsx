import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { addDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  LogOut,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import {
  istTodayYmd,
  summarizeAttendance,
  type WorkModeFilter,
} from "@/lib/workModeAttendance";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  tone: "emerald" | "indigo" | "cyan" | "rose" | "amber" | "gray";
}) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    indigo: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    gray: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20",
  };
  return (
    <div className={cn("rounded-xl border p-3 sm:p-4 min-w-0", tones[tone])}>
      <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums leading-tight">{value}</div>
      {hint ? <div className="text-[11px] opacity-75 truncate">{hint}</div> : null}
    </div>
  );
}

type Props = {
  date: string;
  onDateChange: (ymd: string) => void;
  attended: User[];
  loading: boolean;
  modeFilter: WorkModeFilter;
  onModeFilterChange: (next: WorkModeFilter) => void;
  dayViewUnsupported?: boolean;
};

export function ActiveDayOverview({
  date,
  onDateChange,
  attended,
  loading,
  modeFilter,
  onModeFilterChange,
  dayViewUnsupported,
}: Props) {
  const today = istTodayYmd();
  const isToday = date === today;
  const day = parseISO(date);
  const s = summarizeAttendance(attended);
  const pct = (n: number) => (s.present ? `${Math.round((n / s.present) * 100)}% of present` : undefined);

  const shift = (delta: number) => {
    const next = format(addDays(day, delta), "yyyy-MM-dd");
    if (next <= today) onDateChange(next);
  };

  const segments: { value: WorkModeFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: s.present },
    { value: "office", label: "Office", count: s.office },
    { value: "wfh", label: "WFH", count: s.wfh },
    ...(s.unset > 0 || modeFilter === "unset"
      ? [{ value: "unset" as const, label: "Not recorded", count: s.unset }]
      : []),
  ];

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-emerald-50/20 dark:from-gray-800/20 dark:to-emerald-900/20 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/40 dark:border-gray-700/40 rounded-2xl p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Attendance · {isToday ? "Today" : format(day, "EEEE")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {format(day, "d MMMM yyyy")} · office and work-from-home check-ins
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => shift(-1)}
              disabled={loading}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-[170px]">
              <DatePicker
                value={date}
                onChange={(v) => v && v <= today && onDateChange(v)}
                disableFuture
                disabled={loading}
                displayFormat="EEE, d MMM yyyy"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => shift(1)}
              disabled={loading || isToday}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => onDateChange(today)}
                disabled={loading}
              >
                Today
              </Button>
            ) : null}
          </div>
        </div>

        {dayViewUnsupported ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              The server has not been updated for past-day attendance yet, so today&apos;s data is shown.
            </span>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[84px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard icon={UsersIcon} label="Present" value={s.present} tone="emerald" />
            <StatCard icon={Building2} label="In office" value={s.office} hint={pct(s.office)} tone="indigo" />
            <StatCard icon={Home} label="Work from home" value={s.wfh} hint={pct(s.wfh)} tone="cyan" />
            <StatCard icon={Clock} label="Late check-ins" value={s.late} hint="After 10:00 AM" tone="rose" />
            <StatCard icon={LogOut} label="Checked out" value={s.checkedOut} tone="amber" />
            <StatCard
              icon={Clock}
              label={isToday ? "Still working" : "No checkout"}
              value={s.present - s.checkedOut}
              tone="gray"
            />
          </div>
        )}

        <div role="radiogroup" aria-label="Filter by work mode" className="flex flex-wrap items-center gap-2">
          {segments.map((seg) => {
            const selected = modeFilter === seg.value;
            return (
              <button
                key={seg.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={loading}
                onClick={() => onModeFilterChange(seg.value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                )}
              >
                {seg.label}
                <span className="rounded-full bg-muted px-2 text-xs text-foreground tabular-nums">
                  {loading ? "–" : seg.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
