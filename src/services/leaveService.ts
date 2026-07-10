import { ENV } from '@/lib/env';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LeaveBalance = {
  id: number;
  code: string;
  name: string;
  monthly_quota: number;
  used: number;
  remaining: number;
};

export type LeaveRequest = {
  id: number;
  user_id: string;
  username?: string | null;
  role?: string | null;
  leave_type_id: number;
  leave_type_code?: string | null;
  leave_type_name?: string | null;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string | null;
  status: LeaveStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AttendanceStatus = {
  user_id: string;
  date: string;
  joining_date?: string | null;
  allowed: boolean;
  reason?: string | null;
  message?: string | null;
  on_leave: boolean;
  before_joining: boolean;
  leave?: {
    id: number;
    leave_type_code?: string | null;
    leave_type_name?: string | null;
    start_date: string;
    end_date: string;
  } | null;
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

const API = `${ENV.API_URL}/leave`;

export async function getLeaveTypes(month?: string, userId?: string): Promise<{
  month: string;
  user_id: string;
  types: LeaveBalance[];
}> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (userId) params.set('user_id', userId);
  const qs = params.toString();
  const res = await fetch(`${API}/types.php${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data;
}

export async function getMyLeaveRequests(status?: LeaveStatus): Promise<LeaveRequest[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API}/mine.php${qs}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return Array.isArray(data.data) ? data.data : [];
}

export async function listLeaveRequests(opts?: {
  status?: LeaveStatus | '';
  user_id?: string;
  month?: string;
  pending_only?: boolean;
}): Promise<LeaveRequest[]> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.user_id) params.set('user_id', opts.user_id);
  if (opts?.month) params.set('month', opts.month);
  if (opts?.pending_only) params.set('pending_only', '1');
  const qs = params.toString();
  const res = await fetch(`${API}/list.php${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return Array.isArray(data.data) ? data.data : [];
}

export async function requestLeave(body: {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}): Promise<LeaveRequest> {
  const res = await fetch(`${API}/request.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function cancelLeaveRequest(id: number): Promise<LeaveRequest> {
  const res = await fetch(`${API}/cancel.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function reviewLeaveRequest(body: {
  id: number;
  action: 'approve' | 'reject';
  admin_note?: string;
}): Promise<LeaveRequest> {
  const res = await fetch(`${API}/review.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function getAttendanceStatus(userId: string, date: string): Promise<AttendanceStatus> {
  const params = new URLSearchParams({ user_id: userId, date });
  const res = await fetch(`${API}/attendance_status.php?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data;
}

export function leaveStatusPillClass(status: string): string {
  switch (String(status).toLowerCase()) {
    case 'pending':
      return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800';
    case 'approved':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  }
}
