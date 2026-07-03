import { toLocalCalendarDateString } from '@/lib/dateUtils';

/** YYYY-MM key for the calendar month containing `dateStr`. */
export function calendarMonthKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Inclusive date range for a calendar month (`YYYY-MM`). */
export function getCalendarMonthPeriod(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number);
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from: startDate, to: endDate };
}

/** First day of the calendar month for a submission date. */
export function getCalendarMonthStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Last day of the calendar month that begins on `periodStart` (YYYY-MM-01). */
export function getCalendarMonthEnd(periodStart: string): string {
  const startDate = new Date(`${periodStart}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) return periodStart;
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  return toLocalCalendarDateString(endDate);
}

function ordinalDay(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** e.g. "July 2026" */
export function formatCalendarMonthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/** e.g. "Jul 01 – Jul 31" */
export function formatCalendarMonthRange(key: string): string {
  const { from, to } = getCalendarMonthPeriod(key);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const startLabel = start.toLocaleDateString('en-IN', {
    month: 'short',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  const endLabel = end.toLocaleDateString('en-IN', {
    month: 'short',
    day: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  return `${startLabel} – ${endLabel}`;
}

/** e.g. "July 1st – July 31st" */
export function formatCalendarMonthRangeLong(key: string): string {
  const { from, to } = getCalendarMonthPeriod(key);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const monthName = start.toLocaleDateString('en-IN', {
    month: 'long',
    timeZone: 'Asia/Kolkata',
  });
  return `${monthName} ${ordinalDay(start.getDate())} – ${ordinalDay(end.getDate())}`;
}

/** e.g. "July 2026" — label for month-to-date working-day totals */
export function formatWorkingDaysPeriodLabel(dateStr: string): string {
  return formatCalendarMonthTitle(calendarMonthKey(dateStr));
}

export function computeMonthTotalsToDate(
  submissions: Array<{ submission_date?: string; hours_today?: number }>,
  dateStr: string
) {
  const { from } = getCalendarMonthPeriod(calendarMonthKey(dateStr));
  const dateSet = new Set<string>();
  let hours = 0;
  for (const s of submissions) {
    const d = String(s.submission_date || '').trim();
    if (!d || d < from || d > dateStr) continue;
    dateSet.add(d);
    hours += Number(s.hours_today || 0);
  }
  return {
    days: dateSet.size,
    hours,
    periodLabel: formatWorkingDaysPeriodLabel(dateStr),
    range: formatCalendarMonthRange(calendarMonthKey(dateStr)),
  };
}

/** Backward-compatible aliases used across overtime/admin screens. */
export const codoMonthKey = calendarMonthKey;
export const getCodoPeriodForMonth = getCalendarMonthPeriod;
