import {
  calendarMonthKey,
  formatCalendarMonthTitle,
  getCalendarMonthPeriod,
} from '@/lib/workPeriodUtils';

export type MonthFilterValue = 'all' | string; // 'all' | 'YYYY-MM'

export type MonthFilterOption = {
  value: MonthFilterValue;
  label: string;
  shortLabel: string;
};

/** Current calendar month key in YYYY-MM. */
export function currentMonthKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Build month chip options: All + the last `count` calendar months (newest first).
 */
export function buildMonthFilterOptions(
  count = 12,
  now = new Date()
): MonthFilterOption[] {
  const months: MonthFilterOption[] = [
    { value: 'all', label: 'All months', shortLabel: 'All' },
  ];

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = formatCalendarMonthTitle(key);
    const shortLabel = d.toLocaleDateString('en-IN', {
      month: 'short',
      year: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
    months.push({ value: key, label, shortLabel });
  }

  return months;
}

/** Inclusive date range for a month filter (`null` when All). */
export function monthFilterRange(
  month: MonthFilterValue
): { from: string; to: string } | null {
  if (!month || month === 'all') return null;
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return getCalendarMonthPeriod(month);
}

/** True if `dateStr` (YYYY-MM-DD) falls in the selected month (or always when All). */
export function dateMatchesMonthFilter(
  dateStr: string | null | undefined,
  month: MonthFilterValue
): boolean {
  if (!month || month === 'all') return true;
  const d = String(dateStr || '').trim();
  if (!d) return false;
  return calendarMonthKey(d) === month;
}

/** True if [start, end] overlaps the selected month (or always when All). */
export function rangeOverlapsMonthFilter(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  month: MonthFilterValue
): boolean {
  if (!month || month === 'all') return true;
  const range = monthFilterRange(month);
  if (!range) return true;
  const start = String(startDate || '').trim();
  const end = String(endDate || start).trim();
  if (!start) return false;
  return start <= range.to && end >= range.from;
}

export { calendarMonthKey, formatCalendarMonthTitle, getCalendarMonthPeriod };
