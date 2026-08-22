
export type UserTask = {
  id?: number;
  title: string;
  description?: string;
  project_id?: string | null;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in_progress' | 'done' | 'blocked';
  due_date?: string | null; // YYYY-MM-DD
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  expected_hours?: number;
  spent_hours?: number;
  created_at?: string;
  updated_at?: string;
};

export type { StatusOption, ProjectWorkUpdate } from '@/lib/projectWorkUpdates';
import type { StatusOption, ProjectWorkUpdate } from '@/lib/projectWorkUpdates';
import { readApiJson } from '@/lib/apiError';

function getAuthToken(): string | null {
  return (
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token')
  );
}

/** Why: Impersonation tokens use dashboard_access purpose; route to admin endpoints without logging JWT payload. */
function isImpersonating(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      purpose?: string;
      admin_id?: string;
      user_id?: string;
    };
    return (
      payload.purpose === 'dashboard_access' &&
      Boolean(payload.admin_id) &&
      Boolean(payload.user_id)
    );
  } catch {
    return false;
  }
}

function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type WorkSubmission = {
  submission_date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm:ss
  check_in_time?: string; // YYYY-MM-DD HH:mm:ss
  hours_today: number;
  overtime_hours?: number;
  requested_extra_hours?: number;
  approval_reason?: string;
  break_entries?: string[];
  total_break_minutes?: number;
  total_working_days?: number | null;
  total_hours_cumulative?: number | null;
  completed_tasks?: string;
  pending_tasks?: string;
  ongoing_tasks?: string;
  notes?: string;
  planned_work_status?: StatusOption;
  planned_work_notes?: string;
  planned_projects?: string[];
  planned_work?: string;
  project_updates?: ProjectWorkUpdate[];
};

import { ENV } from '@/lib/env';
const API = ENV.API_URL;

export async function listMyTasks(params: { status?: string; project_id?: string } = {}) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const endpoint = isImpersonating() ? 'list.php' : 'list_my_own_tasks.php';

  const res = await fetch(`${API}/tasks/${endpoint}${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

export async function createTask(task: UserTask) {
  const endpoint = isImpersonating() ? 'create.php' : 'create_own_task.php';

  const res = await fetch(`${API}/tasks/${endpoint}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create task');
  return res.json();
}

export async function updateTask(task: Partial<UserTask> & { id: number }) {
  const res = await fetch(`${API}/tasks/update.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function deleteTask(id: number) {
  const res = await fetch(`${API}/tasks/delete.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to delete task');
  return res.json();
}

export async function submitWork(payload: WorkSubmission) {
  const endpoint = isImpersonating() ? 'submit_work.php' : 'submit_own_work.php';

  const res = await fetch(`${API}/tasks/${endpoint}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readApiJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Failed to submit work');
  }
  return data;
}

export async function getTemplate(date: string, since?: string) {
  const qs = new URLSearchParams({ date, ...(since ? { since } : {}) });
  const res = await fetch(`${API}/tasks/today_template.php?${qs.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to generate template');
  return res.json();
}

export async function listMySubmissions(params: { from?: string; to?: string } = {}) {
  const qs = new URLSearchParams({ ...params, _t: Date.now().toString() });
  const endpoint = isImpersonating() ? 'my_submissions.php' : 'my_own_submissions.php';

  const res = await fetch(`${API}/tasks/${endpoint}${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load submissions');
  return res.json();
}

export function parseSubmissionsListResponse(res: unknown): {
  submissions: any[];
  serverToday?: string;
} {
  const payload = res as { data?: unknown; server_today?: string };
  const submissions = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(res)
      ? res
      : [];
  const serverToday =
    typeof payload?.server_today === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(payload.server_today)
      ? payload.server_today
      : undefined;
  return { submissions, serverToday };
}

export async function listAllRequestSubmissions(
  params: { from?: string; to?: string; pending_only?: boolean } = {}
) {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.pending_only) qs.set('pending_only', '1');
  qs.set('_t', Date.now().toString());
  const res = await fetch(`${API}/tasks/all_request_submissions.php?${qs.toString()}`, {
    headers: authHeaders(),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: unknown;
  };
  if (!res.ok) {
    throw new Error(data.message || 'Failed to load request submissions');
  }
  if (data.success === false) {
    throw new Error(data.message || 'Failed to load request submissions');
  }
  return data;
}

/** Server decides the date range; `data` is either Row[] (legacy) or { submissions, window }. */
export function normalizeAllRequestSubmissionsResponse(
  res: unknown,
  fallbackWindow: { from: string; to: string }
): {
  submissions: Record<string, unknown>[];
  adminHoursSubmissions: Record<string, unknown>[];
  window: { from: string; to: string };
} {
  if (!res || typeof res !== 'object') {
    return { submissions: [], adminHoursSubmissions: [], window: fallbackWindow };
  }
  const root = res as { data?: unknown };
  const payload = root.data;

  if (Array.isArray(payload)) {
    return { submissions: payload, adminHoursSubmissions: [], window: fallbackWindow };
  }

  if (payload && typeof payload === 'object') {
    const bundle = payload as {
      submissions?: unknown;
      admin_hours_submissions?: unknown;
      window?: { from?: string; to?: string };
    };
    const list = Array.isArray(bundle.submissions) ? bundle.submissions : [];
    const adminList = Array.isArray(bundle.admin_hours_submissions)
      ? bundle.admin_hours_submissions
      : [];
    const w =
      bundle.window?.from && bundle.window?.to
        ? { from: bundle.window.from, to: bundle.window.to }
        : fallbackWindow;
    return {
      submissions: list as Record<string, unknown>[],
      adminHoursSubmissions: adminList as Record<string, unknown>[],
      window: w,
    };
  }

  return { submissions: [], adminHoursSubmissions: [], window: fallbackWindow };
}

export async function reviewOvertimeRequest(body: {
  id: number;
  action: 'approve' | 'reject' | 'change';
  approved_hours?: number;
  admin_note?: string;
}) {
  const res = await fetch(`${API}/tasks/review_overtime_request.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to update request');
  return data as { success?: boolean; message?: string; data?: Record<string, unknown> };
}

export async function deleteSubmission(arg: { id?: number; submission_date?: string }) {
  const res = await fetch(`${API}/tasks/delete_submission.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to delete submission');
  return data;
}

export async function adminUpsertWorkSubmission(body: {
  user_id: string;
  submission_date: string;
  hours_today: number;
  admin_note: string;
  work_note?: string;
}) {
  const res = await fetch(`${API}/tasks/admin_upsert_work_submission.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to save work hours');
  return data as { success?: boolean; message?: string; data?: Record<string, unknown> };
}

export async function adminUpdateWorkSubmission(body: {
  id: number;
  hours_today?: number;
  overtime_hours?: number;
  requested_extra_hours?: number;
  approval_reason?: string | null;
  extra_hours_approval_status?: string;
  extra_hours_approved_amount?: number | null;
  start_time?: string | null;
  check_in_time?: string | null;
  completed_tasks?: string;
  pending_tasks?: string;
  ongoing_tasks?: string;
  notes?: string;
  planned_work?: string | null;
  planned_work_status?: string | null;
  planned_work_notes?: string | null;
  planned_projects?: string[];
  break_entries?: string[];
  total_break_minutes?: number;
  admin_note?: string;
}) {
  const res = await fetch(`${API}/tasks/admin_update_work_submission.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || 'Failed to update submission');
  return data as { success?: boolean; message?: string; data?: Record<string, unknown> };
}

export async function checkIn(
  submissionDate?: string,
  plannedProjects?: string[],
  plannedWork?: string,
  plannedWorkStatus?: StatusOption,
  workMode?: 'office' | 'wfh',
  location?: { latitude: number; longitude: number; accuracy?: number | null } | null
): Promise<{
  success: boolean;
  check_in_time: string;
  submission_date: string;
  message?: string;
  work_mode?: 'office' | 'wfh';
  is_late?: boolean;
  is_sunday?: boolean;
  late_count?: number;
  late_limit?: number;
  office_only?: boolean;
  office_only_week_start?: string | null;
  office_only_week_end?: string | null;
  upcoming_office_only_week?: { week_start: string; week_end: string } | null;
  warning?: string | null;
  restriction_created?: boolean;
  check_in_distance_m?: number | null;
}> {
  if (!workMode || (workMode !== 'office' && workMode !== 'wfh')) {
    throw new Error('Please select Office or WFH before checking in.');
  }

  const body: Record<string, unknown> = {
    submission_date: submissionDate || new Date().toISOString().split('T')[0],
    planned_projects: plannedProjects || [],
    planned_work: plannedWork || '',
    planned_work_status: plannedWorkStatus || 'not_started',
    work_mode: workMode,
  };

  if (workMode === 'office' && location) {
    body.latitude = location.latitude;
    body.longitude = location.longitude;
    if (typeof location.accuracy === 'number') {
      body.accuracy = location.accuracy;
    }
  }

  const res = await fetch(`${API}/tasks/check_in.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Get response text first to handle empty responses
  const responseText = await res.text();

  if (!responseText) {
    throw new Error('Empty response from server');
  }

  let responseData: { success?: boolean; message?: string; data?: Record<string, unknown>; check_in_time?: string; submission_date?: string };
  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new Error('Invalid response from server. Please try again.');
  }

  if (!res.ok || !responseData.success) {
    throw new Error(responseData.message || 'Failed to check in');
  }

  // Extract data from response (responseData.data contains the actual data)
  const data = (responseData.data || responseData) as {
    check_in_time?: string;
    submission_date?: string;
    work_mode?: 'office' | 'wfh';
    is_late?: boolean;
    is_sunday?: boolean;
    late_count?: number;
    late_limit?: number;
    office_only?: boolean;
    office_only_week_start?: string | null;
    office_only_week_end?: string | null;
    upcoming_office_only_week?: { week_start: string; week_end: string } | null;
    warning?: string | null;
    restriction_created?: boolean;
    check_in_distance_m?: number | null;
  };
  return {
    success: Boolean(responseData.success),
    check_in_time: String(data.check_in_time || responseData.check_in_time || ''),
    submission_date: String(data.submission_date || responseData.submission_date || ''),
    message: responseData.message,
    work_mode: data.work_mode,
    is_late: Boolean(data.is_late),
    is_sunday: Boolean(data.is_sunday),
    late_count: typeof data.late_count === 'number' ? data.late_count : undefined,
    late_limit: typeof data.late_limit === 'number' ? data.late_limit : undefined,
    office_only: Boolean(data.office_only),
    office_only_week_start: data.office_only_week_start ?? null,
    office_only_week_end: data.office_only_week_end ?? null,
    upcoming_office_only_week: data.upcoming_office_only_week ?? null,
    warning: data.warning ?? null,
    restriction_created: Boolean(data.restriction_created),
    check_in_distance_m:
      typeof data.check_in_distance_m === 'number' ? data.check_in_distance_m : null,
  };
}

export type WorkActivityPayload = {
  action: 'break_start' | 'break_end';
  submission_date: string;
  started_at?: string;
  duration_minutes?: number;
};

export async function notifyWorkActivity(payload: WorkActivityPayload): Promise<void> {
  try {
    await fetch(`${API}/tasks/work_activity.php`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Fire-and-forget: break notifications must not block the UI
  }
}


