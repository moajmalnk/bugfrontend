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

export type CreditableSubmission = {
  submission_date?: string;
  hours_today?: number | string | null;
  overtime_hours?: number | string | null;
  extra_hours_approval_status?: string | null;
  extra_hours_approved_amount?: number | string | null;
};

/**
 * Why: Combined work + approved OT for submit / month-to-date UIs that do not
 * also show overtime separately. Team Analytics and individual Work Stats use
 * raw hours_today and add OT once for Net instead. Legacy rows may already hold
 * OT inside `hours_today` (e.g. 10h), hence max(worked, regular ≤8 + approved).
 * Keep in sync with br_credited_hours_sql() on the backend.
 */
export function creditedHours(s: CreditableSubmission): number {
  const worked = Number(s.hours_today) || 0;
  const status = String(s.extra_hours_approval_status || '').toLowerCase();
  if (status !== 'approved' && status !== 'changed') return worked;
  const approved = Number(s.extra_hours_approved_amount ?? s.overtime_hours) || 0;
  if (approved <= 0) return worked;
  return Math.round(Math.max(worked, Math.min(worked, 8) + approved) * 100) / 100;
}

export function computeMonthTotalsToDate(
  submissions: CreditableSubmission[],
  dateStr: string
) {
  const { from } = getCalendarMonthPeriod(calendarMonthKey(dateStr));
  const dateSet = new Set<string>();
  let hours = 0;
  for (const s of submissions) {
    const d = String(s.submission_date || '').trim();
    if (!d || d < from || d > dateStr) continue;
    dateSet.add(d);
    hours += creditedHours(s);
  }
  return {
    days: dateSet.size,
    hours: Math.round(hours * 100) / 100,
    periodLabel: formatWorkingDaysPeriodLabel(dateStr),
    range: formatCalendarMonthRange(calendarMonthKey(dateStr)),
  };
}

/** Backward-compatible aliases used across overtime/admin screens. */
export const codoMonthKey = calendarMonthKey;
export const getCodoPeriodForMonth = getCalendarMonthPeriod;
