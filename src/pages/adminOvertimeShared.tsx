import { toLocalCalendarDateString } from '@/lib/dateUtils';
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
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  if (day <= 5) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getCodoPeriodForMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const startDate = `${y}-${String(m).padStart(2, '0')}-06`;
  let nextYear = y;
  let nextMonth = m + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = y + 1;
  }
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
  return { from: startDate, to: endDate };
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
  const { from, to } = getCodoPeriodForMonth(key);
  const { days, hours } = computeTotalsInRange(list, from, to);
  const startDisplay = formatDateForDisplay(from);
  const endDisplay = formatDateForDisplay(to);
  return {
    full: `${startDisplay} to ${endDisplay} (${hours} hours) (${days} ${days === 1 ? 'day' : 'days'})`,
    compactTitle: `${startDisplay} → ${endDisplay}`,
    compactMeta: `${hours} h · ${days} ${days === 1 ? 'day' : 'days'}`,
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
