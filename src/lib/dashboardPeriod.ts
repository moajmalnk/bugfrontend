import { toLocalCalendarDateString } from "@/lib/dateUtils";
import {
  formatCalendarMonthRange,
  formatCalendarMonthTitle,
  getCalendarMonthPeriod,
} from "@/lib/workPeriodUtils";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CalendarClock,
  CalendarDays,
  Clock,
  Infinity,
} from "lucide-react";

export type WorkPeriodPreset =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "last_week"
  | "month"
  | "last_month"
  | "year"
  | "last_year"
  | "custom";

export type DashboardPeriod = {
  from: string;
  to: string;
  title: string;
  rangeLabel: string;
  hoursLabel: string;
};

export const WORK_PERIOD_PRESETS: {
  value: WorkPeriodPreset;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "all", label: "All", icon: Infinity },
  { value: "today", label: "Today", icon: Clock },
  { value: "yesterday", label: "Yesterday", icon: CalendarDays },
  { value: "week", label: "This week", icon: CalendarDays },
  { value: "last_week", label: "Last week", icon: CalendarDays },
  { value: "month", label: "This month", icon: Calendar },
  { value: "last_month", label: "Last month", icon: Calendar },
  { value: "year", label: "This year", icon: BarChart3 },
  { value: "last_year", label: "Last year", icon: BarChart3 },
  { value: "custom", label: "Custom", icon: CalendarClock },
];

export function shiftCalendarDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalCalendarDateString(d);
}

function getWeekPeriod(todayYmd: string): { from: string; to: string } {
  const d = new Date(`${todayYmd}T00:00:00`);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = shiftCalendarDate(todayYmd, mondayOffset);
  return { from, to: todayYmd };
}

function getLastWeekPeriod(todayYmd: string): { from: string; to: string } {
  const thisWeek = getWeekPeriod(todayYmd);
  const from = shiftCalendarDate(thisWeek.from, -7);
  const to = shiftCalendarDate(thisWeek.from, -1);
  return { from, to };
}

function getLastMonthPeriod(todayYmd: string): { from: string; to: string } {
  const d = new Date(`${todayYmd}T00:00:00`);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return getCalendarMonthPeriod(monthKey);
}

function getYearPeriod(todayYmd: string): { from: string; to: string } {
  const year = todayYmd.slice(0, 4);
  return { from: `${year}-01-01`, to: todayYmd };
}

function getLastYearPeriod(todayYmd: string): { from: string; to: string } {
  const year = String(Number(todayYmd.slice(0, 4)) - 1);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function formatShortYmd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Why: Role dashboards share the same period presets as Ops without importing AdminDashboard.
 */
export function resolveWorkPeriod(
  preset: WorkPeriodPreset,
  customFrom: string,
  customTo: string
): DashboardPeriod {
  const today = toLocalCalendarDateString(new Date());
  const yesterday = shiftCalendarDate(today, -1);

  if (preset === "all") {
    return {
      from: "2015-01-01",
      to: today,
      title: "All time",
      rangeLabel: "All records",
      hoursLabel: "Total hours",
    };
  }
  if (preset === "today") {
    return {
      from: today,
      to: today,
      title: "Today",
      rangeLabel: formatShortYmd(today),
      hoursLabel: "Hours today",
    };
  }
  if (preset === "yesterday") {
    return {
      from: yesterday,
      to: yesterday,
      title: "Yesterday",
      rangeLabel: formatShortYmd(yesterday),
      hoursLabel: "Hours yesterday",
    };
  }
  if (preset === "week") {
    const { from, to } = getWeekPeriod(today);
    return {
      from,
      to,
      title: "This week",
      rangeLabel: `${formatShortYmd(from)} – ${formatShortYmd(to)}`,
      hoursLabel: "Weekly hours",
    };
  }
  if (preset === "last_week") {
    const { from, to } = getLastWeekPeriod(today);
    return {
      from,
      to,
      title: "Last week",
      rangeLabel: `${formatShortYmd(from)} – ${formatShortYmd(to)}`,
      hoursLabel: "Weekly hours",
    };
  }
  if (preset === "last_month") {
    const { from, to } = getLastMonthPeriod(today);
    const monthKey = from.slice(0, 7);
    return {
      from,
      to,
      title: "Last month",
      rangeLabel: formatCalendarMonthRange(monthKey),
      hoursLabel: "Monthly hours",
    };
  }
  if (preset === "year") {
    const { from, to } = getYearPeriod(today);
    return {
      from,
      to,
      title: "This year",
      rangeLabel: `${from.slice(0, 4)} · YTD`,
      hoursLabel: "Yearly hours",
    };
  }
  if (preset === "last_year") {
    const { from, to } = getLastYearPeriod(today);
    return {
      from,
      to,
      title: "Last year",
      rangeLabel: from.slice(0, 4),
      hoursLabel: "Yearly hours",
    };
  }
  if (preset === "custom") {
    const from = customFrom || today;
    const to = customTo || customFrom || today;
    const [a, b] = from <= to ? [from, to] : [to, from];
    return {
      from: a,
      to: b,
      title: "Custom range",
      rangeLabel: `${formatShortYmd(a)} – ${formatShortYmd(b)}`,
      hoursLabel: "Period hours",
    };
  }

  const monthKey = today.slice(0, 7);
  const { from, to } = getCalendarMonthPeriod(monthKey);
  return {
    from,
    to,
    title: formatCalendarMonthTitle(monthKey),
    rangeLabel: formatCalendarMonthRange(monthKey),
    hoursLabel: "Monthly hours",
  };
}

export function dateInPeriod(
  iso: string | null | undefined,
  from: string,
  to: string
): boolean {
  if (!iso) return false;
  const raw = String(iso).trim();
  const ymd =
    /^\d{4}-\d{2}-\d{2}/.test(raw)
      ? raw.slice(0, 10)
      : toLocalCalendarDateString(new Date(raw));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  return ymd >= from && ymd <= to;
}
