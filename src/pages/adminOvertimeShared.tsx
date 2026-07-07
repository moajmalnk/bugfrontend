import { toLocalCalendarDateString } from '@/lib/dateUtils';
import {
  calendarMonthKey,
  formatCalendarMonthRange,
  formatCalendarMonthTitle,
  getCalendarMonthPeriod,
} from '@/lib/workPeriodUtils';
import { CheckCircle2, Clock, Pencil, XCircle, CircleDashed } from 'lucide-react';

export type OvertimeRow = Record<string, unknown> & {
  id?: number;
  user_id?: number | string;
  username?: string;
  role?: string;
  submission_date?: string;
  hours_today?: number;
  overtime_hours?: number;
  requested_extra_hours?: number;
  approval_reason?: string;
  extra_hours_approval_status?: string;
  extra_hours_approved_amount?: number;
  extra_hours_reviewed_at?: string;
  extra_hours_admin_note?: string;
  start_time?: string;
  created_at?: string;
  updated_at?: string;
  check_in_time?: string;
  notes?: string;
  completed_tasks?: string;
};

function formatTimeKolkata(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  return d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
    .replace(/\s+/g, '');
}

/** Work day + time (submission saved or check-in), e.g. `2026-03-28 10:12PM` in Asia/Kolkata. */
export function formatSubmissionRequestedAt(
  submissionDate: string,
  createdAt: unknown,
  checkInTime?: unknown
): string {
  const datePart = String(submissionDate || '').trim();
  if (!datePart) return '—';

  const rawCreated = createdAt != null && String(createdAt).trim() !== '' ? String(createdAt).trim() : '';
  if (rawCreated) {
    const normalized = rawCreated.includes('T') ? rawCreated : rawCreated.replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T');
    const d = new Date(normalized);
    const t = formatTimeKolkata(d);
    if (t) return `${datePart} ${t}`;
  }

  const ci = checkInTime != null ? String(checkInTime).trim() : '';
  if (ci) {
    const timeOnly = ci.includes(' ') ? (ci.split(/\s+/).pop() as string) : ci;
    if (/^\d{1,2}:\d{2}/.test(timeOnly)) {
      const d2 = new Date(`${datePart}T${timeOnly}`);
      const t = formatTimeKolkata(d2);
      if (t) return `${datePart} ${t}`;
    }
  }

  return datePart;
}

export function getSubmissionWindow() {
  const base = new Date();
  const windowEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const windowStart = new Date(base.getFullYear(), base.getMonth() - 11, 1);
  return {
    from: toLocalCalendarDateString(windowStart),
    to: toLocalCalendarDateString(windowEnd),
  };
}

export function codoMonthKey(dateStr: string) {
  return calendarMonthKey(dateStr);
}

export function getCodoPeriodForMonth(key: string) {
  return getCalendarMonthPeriod(key);
}

export function computeTotalsInRange(list: OvertimeRow[], from: string, to: string) {
  const dateSet = new Set<string>();
  let hours = 0;
  for (const s of list) {
    const d = String(s.submission_date || '');
    if (!d) continue;
    if (d >= from && d <= to) {
      dateSet.add(d);
      hours += Number(s.hours_today || 0);
    }
  }
  return { days: dateSet.size, hours };
}

export function formatDateForDisplay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const monthName = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  const day = d.getDate();
  return `${monthName} ${day}`;
}

export function monthTabLinesForList(key: string, list: OvertimeRow[]) {
  const { from, to } = getCalendarMonthPeriod(key);
  const { days, hours } = computeTotalsInRange(list, from, to);
  const title = formatCalendarMonthTitle(key);
  const range = formatCalendarMonthRange(key);
  return {
    full: `${title} · ${hours} hours · ${days} ${days === 1 ? 'day' : 'days'}`,
    compactTitle: title,
    compactMeta: `${range} · ${hours} h · ${days} ${days === 1 ? 'day' : 'days'}`,
  };
}

/** Extra-hour workflow status (pending / approved / rejected / changed) — bordered pill, icon + label. */
export function statusPill(status: string | undefined) {
  const s = (status || 'none').toLowerCase();
  const shell =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize shrink-0 border-2 bg-white/95 text-gray-900 shadow-sm dark:bg-gray-950/75 dark:text-white';
  if (s === 'pending')
    return (
      <span className={`${shell} border-amber-500 dark:border-amber-400`}>
        <Clock className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Pending
      </span>
    );
  if (s === 'approved')
    return (
      <span className={`${shell} border-emerald-500 dark:border-emerald-400`}>
        <CheckCircle2 className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Approved
      </span>
    );
  if (s === 'rejected')
    return (
      <span className={`${shell} border-rose-500 dark:border-rose-400`}>
        <XCircle className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Rejected
      </span>
    );
  if (s === 'changed')
    return (
      <span className={`${shell} border-blue-600 dark:border-blue-500`}>
        <Pencil className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Changed
      </span>
    );
  return (
    <span className={`${shell} border-slate-400 dark:border-slate-500`}>
      <CircleDashed className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
      {s}
    </span>
  );
}

export type UserRequestGroup = {
  userId: string;
  username: string;
  role: string;
  list: OvertimeRow[];
  pending: number;
};

export type AdminHoursGroup = {
  userId: string;
  username: string;
  role: string;
  list: OvertimeRow[];
};

export function parseAdminHoursNote(notes: unknown): { stamp: string; reason: string } | null {
  const text = String(notes || '');
  const match = text.match(/\[ADMIN HOURS ENTRY[^\]]*\]\s*\n?([\s\S]*?)(?:\n\n\[ADMIN HOURS ENTRY|$)/);
  if (!match) return null;
  const stampMatch = text.match(/\[ADMIN HOURS ENTRY[^\]]*\]/);
  return {
    stamp: stampMatch ? stampMatch[0] : '[ADMIN HOURS ENTRY]',
    reason: match[1].trim(),
  };
}

export function isAdminHoursEntry(row: OvertimeRow): boolean {
  return String(row.notes || '').includes('[ADMIN HOURS ENTRY');
}

export function adminHoursStatusPill() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/50">
      <Clock className="h-3 w-3" />
      Admin entry
    </span>
  );
}

export function groupAdminHoursByUser(rows: OvertimeRow[]): AdminHoursGroup[] {
  const m = new Map<string, AdminHoursGroup>();
  for (const r of rows) {
    if (!isAdminHoursEntry(r)) continue;
    const uid = String(r.user_id ?? '').trim();
    if (!uid) continue;
    const un = String(r.username || `User ${uid}`);
    const role = String(r.role || '');
    if (!m.has(uid)) {
      m.set(uid, { userId: uid, username: un, role, list: [] });
    }
    m.get(uid)!.list.push(r);
  }
  return Array.from(m.values()).sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
  );
}

export function groupRowsByUser(rows: OvertimeRow[]): UserRequestGroup[] {
  const m = new Map<string, UserRequestGroup>();
  for (const r of rows) {
    const uid = String(r.user_id ?? '').trim();
    if (!uid) continue;
    const un = String(r.username || `User ${uid}`);
    const role = String(r.role || '');
    if (!m.has(uid)) {
      m.set(uid, { userId: uid, username: un, role, list: [], pending: 0 });
    }
    const g = m.get(uid)!;
    g.list.push(r);
    const st = String(r.extra_hours_approval_status || '').toLowerCase();
    if (st === 'pending') g.pending += 1;
  }
  return Array.from(m.values()).sort((a, b) =>
    a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
  );
}

/** URL for admin manual hours page (dedicated route, not a modal). */
export function buildAdminAddHoursPath(
  role: string,
  userId: string,
  opts?: { date?: string; returnTo?: string; month?: string; from?: 'ot' | 'stats'; periodStart?: string; label?: string }
): string {
  const params = new URLSearchParams();
  if (opts?.date) params.set('date', opts.date);

  const fromStats = opts?.from === 'stats' && opts.periodStart;
  const base = fromStats
    ? `/${role}/users/${userId}/add-hours`
    : `/${role}/overtime-requests/${userId}/add-hours`;

  if (fromStats) {
    const labelQ = opts.label ? `?label=${encodeURIComponent(opts.label)}` : '';
    params.set('return', `/${role}/users/${userId}/work-stats/${opts.periodStart}${labelQ}`);
  } else {
    if (opts?.month) params.set('month', opts.month);
    if (opts?.returnTo) {
      params.set('return', opts.returnTo);
    } else {
      const otReturn = `/${role}/overtime-requests/${userId}${opts?.month ? `?month=${opts.month}` : ''}`;
      params.set('return', otReturn);
    }
  }

  const query = params.toString();
  return `${base}${query ? `?${query}` : ''}`;
}

export function resolveAdminAddHoursReturn(
  role: string,
  userId: string,
  returnParam: string,
  monthParam: string
): string {
  if (returnParam.startsWith('/')) {
    return returnParam;
  }
  if (monthParam) {
    return `/${role}/overtime-requests/${userId}?month=${encodeURIComponent(monthParam)}`;
  }
  return `/${role}/overtime-requests/${userId}`;
}
