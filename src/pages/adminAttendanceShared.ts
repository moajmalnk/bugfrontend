import { eachDayOfInterval, format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import type { AttendanceDayException, AttendanceModeDay } from '@/services/attendanceExceptionService';
import type { LeaveRequest } from '@/services/leaveService';
import type { WfhRequest } from '@/services/wfhRequestService';
import type { User } from '@/types';

export function todayYMD() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function formatDay(date: string) {
  try {
    return format(parseISO(date), 'EEE, MMM d, yyyy');
  } catch {
    return date;
  }
}

/** Compact date for dense mobile roster chips. */
export function formatDayShort(date: string) {
  try {
    return format(parseISO(date), 'MMM d');
  } catch {
    return date;
  }
}

export function formatCheckIn(value?: string | null) {
  if (!value) return 'Late';
  try {
    return new Date(
      value.includes('T') ? value : value.replace(' ', 'T')
    ).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return null;
  try {
    return new Date(
      value.includes('T') ? value : value.replace(' ', 'T')
    ).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

export type AttendancePeriodRow = {
  key: string;
  label: string;
  office: number;
  wfh: number;
  late: number;
  /** Granted day exceptions (WFH allowed / late forgiven) in this period */
  exceptions: number;
  /** WFH requests approved in this period */
  approved: number;
  /** WFH requests rejected in this period */
  rejected: number;
  /** WFH requests still pending in this period */
  pending: number;
  /** Approved leave days in this period */
  leave: number;
  /** Pending leave days in this period */
  leavePending: number;
  total: number;
};

type PeriodBucket = {
  label: string;
  office: number;
  wfh: number;
  late: number;
  exceptions: number;
  approved: number;
  rejected: number;
  pending: number;
  leave: number;
  leavePending: number;
  sort: string;
};

function periodKeyForDate(
  dateStr: string,
  mode: 'day' | 'week' | 'month'
): { key: string; label: string; sort: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  try {
    const d = parseISO(dateStr);
    if (mode === 'day') {
      return {
        key: dateStr,
        label: format(d, 'EEE, MMM d, yyyy'),
        sort: dateStr,
      };
    }
    if (mode === 'week') {
      const start = startOfWeek(d, { weekStartsOn: 1 });
      const end = endOfWeek(d, { weekStartsOn: 1 });
      const key = format(start, 'yyyy-MM-dd');
      return {
        key,
        label: `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`,
        sort: key,
      };
    }
    const key = format(d, 'yyyy-MM');
    return {
      key,
      label: format(d, 'MMMM yyyy'),
      sort: key,
    };
  } catch {
    return null;
  }
}

function emptyBucket(label: string, sort: string): PeriodBucket {
  return {
    label,
    office: 0,
    wfh: 0,
    late: 0,
    exceptions: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    leave: 0,
    leavePending: 0,
    sort,
  };
}

function ymdRange(start: string, end: string): string[] {
  const a = String(start || '').trim().slice(0, 10);
  const b = String(end || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return [];
  try {
    return eachDayOfInterval({ start: parseISO(a), end: parseISO(b) }).map((d) =>
      format(d, 'yyyy-MM-dd')
    );
  } catch {
    return a === b ? [a] : [];
  }
}

/**
 * Why: Admins need day/week/month rollups of office days, granted exceptions,
 * and WFH request outcomes. Weeks use Mon–Sun (IST calendar dates as Y-m-d).
 */
export function buildAttendancePeriodRows(
  days: AttendanceModeDay[],
  mode: 'day' | 'week' | 'month',
  wfhRequests: WfhRequest[] = [],
  exceptions: AttendanceDayException[] = [],
  leaveRequests: LeaveRequest[] = []
): AttendancePeriodRow[] {
  const buckets = new Map<string, PeriodBucket>();

  for (const day of days) {
    const dateStr = String(day.date || '').trim();
    const period = periodKeyForDate(dateStr, mode);
    if (!period) continue;

    const cur = buckets.get(period.key) ?? emptyBucket(period.label, period.sort);
    if (day.work_mode === 'wfh') cur.wfh += 1;
    else cur.office += 1;
    if (day.is_late) cur.late += 1;
    buckets.set(period.key, cur);
  }

  for (const row of exceptions) {
    const dateStr = String(row.exception_date || '').trim().slice(0, 10);
    const period = periodKeyForDate(dateStr, mode);
    if (!period) continue;

    const cur = buckets.get(period.key) ?? emptyBucket(period.label, period.sort);
    cur.exceptions += 1;
    buckets.set(period.key, cur);
  }

  for (const req of wfhRequests) {
    const dateStr = String(req.request_date || '').trim().slice(0, 10);
    const period = periodKeyForDate(dateStr, mode);
    if (!period) continue;

    const status = String(req.status || '').toLowerCase();
    const cur = buckets.get(period.key) ?? emptyBucket(period.label, period.sort);
    if (status === 'approved') cur.approved += 1;
    else if (status === 'rejected') cur.rejected += 1;
    else if (status === 'pending') cur.pending += 1;
    buckets.set(period.key, cur);
  }

  for (const req of leaveRequests) {
    const status = String(req.status || '').toLowerCase();
    if (status !== 'approved' && status !== 'pending') continue;
    for (const dateStr of ymdRange(req.start_date, req.end_date)) {
      const period = periodKeyForDate(dateStr, mode);
      if (!period) continue;
      const cur = buckets.get(period.key) ?? emptyBucket(period.label, period.sort);
      if (status === 'approved') cur.leave += 1;
      else cur.leavePending += 1;
      buckets.set(period.key, cur);
    }
  }

  return [...buckets.entries()]
    .map(([key, v]) => ({
      key,
      label: v.label,
      office: v.office,
      wfh: v.wfh,
      late: v.late,
      exceptions: v.exceptions,
      approved: v.approved,
      rejected: v.rejected,
      pending: v.pending,
      leave: v.leave,
      leavePending: v.leavePending,
      total: v.office + v.wfh + v.leave,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function wfhStatusBadgeClass(status: string): string {
  switch (String(status).toLowerCase()) {
    case 'pending':
      return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
    case 'approved':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function exceptionKey(row: Pick<AttendanceDayException, 'user_id' | 'exception_date'>) {
  return `${row.user_id ?? ''}|${row.exception_date}`;
}

export function summarizeDates(dates: string[], max = 3): string {
  const sorted = [...dates].sort();
  if (sorted.length <= max) return sorted.map(formatDay).join('; ');
  return `${sorted.slice(0, max).map(formatDay).join('; ')}; +${sorted.length - max} more`;
}

export function isAccountActive(user: User): boolean {
  return user.account_active == null || Number(user.account_active) !== 0;
}

function presenceRank(status?: User['status']): number {
  if (status === 'active') return 0;
  if (status === 'idle') return 1;
  return 2;
}

/** Why: Roster prefers online people, then highest hours today, then checked-in. */
export function compareUsersByActivityThenHours(a: User, b: User): number {
  const presence = presenceRank(a.status) - presenceRank(b.status);
  if (presence !== 0) return presence;

  const aHours = Number(a.today_hours_worked ?? 0) || 0;
  const bHours = Number(b.today_hours_worked ?? 0) || 0;
  if (aHours !== bHours) return bHours - aHours;

  const aChecked = a.checked_in_today ? 0 : 1;
  const bChecked = b.checked_in_today ? 0 : 1;
  if (aChecked !== bChecked) return aChecked - bChecked;

  return String(a.username || '').localeCompare(String(b.username || ''), undefined, {
    sensitivity: 'base',
  });
}

export function formatHoursShort(hours: number | undefined): string | null {
  const n = Number(hours ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}h`;
}

export type UserRosterRow = {
  user: User;
  exceptionCount: number;
  lateCount: number;
  officeActiveDays: number;
  latestExceptionDate: string | null;
  latestLateDate: string | null;
};
