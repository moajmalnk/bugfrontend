import { ENV } from '@/lib/env';

export type AttendanceDayException = {
  id?: number;
  user_id?: string;
  username?: string;
  role?: string | null;
  exception_date: string;
  allow_wfh: boolean;
  forgive_late: boolean;
  admin_note?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LateDayRow = {
  id: number;
  user_id?: string;
  username?: string;
  role?: string | null;
  submission_date: string;
  check_in_time?: string | null;
  is_late: boolean;
  late_strike_consumed: boolean;
  work_mode?: string | null;
};

export type AttendanceModeDay = {
  date: string;
  work_mode: 'office' | 'wfh';
  is_late?: boolean;
  check_in_time?: string | null;
  source?: 'checkin' | 'exception';
};

export type AttendanceExceptionsPayload = {
  user_id: string;
  today: string;
  exceptions: AttendanceDayException[];
  late_days: LateDayRow[];
  late_count: number;
  late_limit: number;
  office_only: boolean;
  office_only_week_start?: string | null;
  office_only_week_end?: string | null;
  upcoming_office_only_week?: { week_start: string; week_end: string } | null;
  allow_wfh_today?: boolean;
  forgive_late_today?: boolean;
  office_active_days?: number;
  wfh_active_days?: number;
  attendance_days?: AttendanceModeDay[];
  attendance_from?: string;
};

export type AttendanceExceptionUserSummary = {
  user_id: string;
  username: string;
  role?: string | null;
  exception_count: number;
  late_count: number;
  office_active_days?: number;
  latest_exception_date?: string | null;
  latest_late_date?: string | null;
};

export type AttendanceExceptionsAllPayload = {
  today: string;
  exceptions: AttendanceDayException[];
  late_days: LateDayRow[];
  users?: AttendanceExceptionUserSummary[];
  exception_count: number;
  late_count: number;
  office_active_days_total?: number;
  late_limit: number;
};

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

const API = `${ENV.API_URL}/attendance/exceptions.php`;

function uniqueDates(dates: string[]): string[] {
  return [...new Set(dates.map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
}

export async function listAttendanceExceptions(
  userId: string
): Promise<AttendanceExceptionsPayload> {
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data as AttendanceExceptionsPayload;
}

export async function listAllAttendanceExceptions(): Promise<AttendanceExceptionsAllPayload> {
  const params = new URLSearchParams({ scope: 'all' });
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data as AttendanceExceptionsAllPayload;
}

export async function saveAttendanceException(payload: {
  user_id: string;
  date?: string;
  dates?: string[];
  allow_wfh?: boolean;
  forgive_late?: boolean;
  admin_note?: string;
  action?: 'save' | 'forgive_late' | 'clear';
}): Promise<{ cleared?: number; saved_count?: number; message?: string }> {
  const dates = uniqueDates([
    ...(payload.dates ?? []),
    ...(payload.date ? [payload.date] : []),
  ]);
  if (dates.length === 0) {
    throw new Error('At least one valid date is required');
  }

  const body = {
    user_id: payload.user_id,
    dates,
    ...(dates.length === 1 ? { date: dates[0] } : {}),
    allow_wfh: payload.allow_wfh,
    forgive_late: payload.forgive_late,
    admin_note: payload.admin_note,
    action: payload.action ?? 'save',
  };

  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return {
    cleared: data?.data?.cleared,
    saved_count: data?.data?.saved_count,
    message: data?.message,
  };
}

/**
 * Why: Multi-remove on the all-users page may span several people;
 * clear each user's selected dates in one request per user.
 */
export async function clearAttendanceExceptionsForUsers(
  items: { user_id: string; date: string }[]
): Promise<number> {
  const byUser = new Map<string, string[]>();
  for (const item of items) {
    const uid = String(item.user_id);
    const date = item.date.trim();
    if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const list = byUser.get(uid) ?? [];
    list.push(date);
    byUser.set(uid, list);
  }

  let cleared = 0;
  for (const [userId, dates] of byUser) {
    const result = await saveAttendanceException({
      user_id: userId,
      dates: uniqueDates(dates),
      action: 'clear',
    });
    cleared += result.cleared ?? uniqueDates(dates).length;
  }
  return cleared;
}
