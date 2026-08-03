import { ENV } from '@/lib/env';

export type AttendanceDayException = {
  id?: number;
  user_id?: string;
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
  submission_date: string;
  check_in_time?: string | null;
  is_late: boolean;
  late_strike_consumed: boolean;
  work_mode?: string | null;
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

export async function listAttendanceExceptions(
  userId: string
): Promise<AttendanceExceptionsPayload> {
  const params = new URLSearchParams({ user_id: userId });
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data as AttendanceExceptionsPayload;
}

export async function saveAttendanceException(payload: {
  user_id: string;
  date: string;
  allow_wfh?: boolean;
  forgive_late?: boolean;
  admin_note?: string;
  action?: 'save' | 'forgive_late' | 'clear';
}): Promise<void> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  await parseJson(res);
}
