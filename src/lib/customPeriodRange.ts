import {
  endOfISOWeek,
  getISOWeeksInYear,
  setISOWeek,
  startOfISOWeek,
} from 'date-fns';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import { getCalendarMonthPeriod } from '@/lib/workPeriodUtils';

export type CustomPeriodMode = 'dates' | 'months' | 'weeks';

export const CUSTOM_PERIOD_MODES: {
  value: CustomPeriodMode;
  label: string;
}[] = [
  { value: 'dates', label: 'Dates' },
  { value: 'months', label: 'Months' },
  { value: 'weeks', label: 'Weeks' },
];

export const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Inclusive calendar-month range for `year` + zero-based month index. */
export function getMonthPeriod(
  year: number,
  monthIndex: number
): { from: string; to: string } {
  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return getCalendarMonthPeriod(key);
}

/** Inclusive ISO-week range (Mon–Sun) for ISO week-year + week number (1–53). */
export function getISOWeekPeriod(
  isoWeekYear: number,
  week: number
): { from: string; to: string } {
  const anchor = setISOWeek(new Date(isoWeekYear, 0, 4), week);
  const from = startOfISOWeek(anchor);
  const to = endOfISOWeek(anchor);
  return {
    from: toLocalCalendarDateString(from),
    to: toLocalCalendarDateString(to),
  };
}

export function getISOWeekCount(isoWeekYear: number): number {
  return getISOWeeksInYear(new Date(isoWeekYear, 0, 4));
}

export function formatWeekChipLabel(week: number): string {
  return `Week ${String(week).padStart(2, '0')}`;
}

export function formatWeekChipSubtitle(isoWeekYear: number, week: number): string {
  const { from, to } = getISOWeekPeriod(isoWeekYear, week);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function mergeMonthRange(
  year: number,
  startMonth: number,
  endMonth: number
): { from: string; to: string } {
  const a = Math.min(startMonth, endMonth);
  const b = Math.max(startMonth, endMonth);
  return {
    from: getMonthPeriod(year, a).from,
    to: getMonthPeriod(year, b).to,
  };
}

export function mergeWeekRange(
  isoWeekYear: number,
  startWeek: number,
  endWeek: number
): { from: string; to: string } {
  const a = Math.min(startWeek, endWeek);
  const b = Math.max(startWeek, endWeek);
  return {
    from: getISOWeekPeriod(isoWeekYear, a).from,
    to: getISOWeekPeriod(isoWeekYear, b).to,
  };
}

export function parseYearFromYmd(ymd?: string): number {
  if (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return Number(ymd.slice(0, 4));
  }
  return new Date().getFullYear();
}

export function isMonthDisabled(
  year: number,
  monthIndex: number,
  disableFuture: boolean
): boolean {
  if (!disableFuture) return false;
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth();
  if (year > ty) return true;
  if (year === ty && monthIndex > tm) return true;
  return false;
}

export function isWeekDisabled(
  isoWeekYear: number,
  week: number,
  disableFuture: boolean
): boolean {
  if (!disableFuture) return false;
  const { from } = getISOWeekPeriod(isoWeekYear, week);
  const today = toLocalCalendarDateString(new Date());
  return from > today;
}
