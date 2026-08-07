import { ENV } from '@/lib/env';

export type WfhRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type WfhRequest = {
  id?: number;
  user_id: string;
  username?: string;
  role?: string | null;
  request_date: string;
  status: Exclude<WfhRequestStatus, 'none'> | string;
  user_note?: string | null;
  admin_note?: string | null;
  reviewed_by?: string | null;
  reviewed_by_username?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PendingWfhRequestsPayload = {
  today: string;
  pending: WfhRequest[];
  pending_count: number;
};

export type UserWfhRequestsPayload = {
  today: string;
  user_id: string;
  requests: WfhRequest[];
  rejected: WfhRequest[];
  request_count: number;
  rejected_count: number;
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

const API = `${ENV.API_URL}/attendance/wfh_requests.php`;

export async function listPendingWfhRequests(): Promise<PendingWfhRequestsPayload> {
  const params = new URLSearchParams({ pending: '1' });
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data as PendingWfhRequestsPayload;
}

export async function listUserWfhRequests(
  userId: string,
  status?: 'pending' | 'approved' | 'rejected' | 'all'
): Promise<UserWfhRequestsPayload> {
  const params = new URLSearchParams({
    user_id: userId,
    history: '1',
  });
  if (status && status !== 'all') {
    params.set('status', status);
  }
  const res = await fetch(`${API}?${params}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data as UserWfhRequestsPayload;
}

export async function requestWfhForToday(payload?: {
  date?: string;
  user_note?: string;
  note?: string;
  user_id?: string;
}): Promise<{ request: WfhRequest; policy?: Record<string, unknown>; message?: string }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      action: 'request',
      date: payload?.date,
      user_id: payload?.user_id,
      user_note: payload?.user_note ?? payload?.note,
    }),
  });
  const data = await parseJson(res);
  return {
    request: data.data?.request as WfhRequest,
    policy: data.data?.policy,
    message: data.message,
  };
}

export async function reviewWfhRequest(payload: {
  user_id: string;
  date: string;
  action: 'approve' | 'reject';
  admin_note?: string;
}): Promise<{ request: WfhRequest; exception?: unknown; policy?: Record<string, unknown>; message?: string }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      action: payload.action,
      user_id: payload.user_id,
      date: payload.date,
      admin_note: payload.admin_note,
    }),
  });
  const data = await parseJson(res);
  return {
    request: data.data?.request as WfhRequest,
    exception: data.data?.exception,
    policy: data.data?.policy,
    message: data.message,
  };
}

export async function deleteWfhRequest(payload: {
  user_id: string;
  date: string;
}): Promise<{
  deleted?: WfhRequest | null;
  exception?: unknown;
  policy?: Record<string, unknown>;
  message?: string;
}> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      action: 'delete',
      user_id: payload.user_id,
      date: payload.date,
    }),
  });
  const data = await parseJson(res);
  return {
    deleted: (data.data?.deleted as WfhRequest | null | undefined) ?? null,
    exception: data.data?.exception,
    policy: data.data?.policy,
    message: data.message,
  };
}
