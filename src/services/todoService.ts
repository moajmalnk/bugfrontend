
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

export type StatusOption = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

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
};

import { ENV } from '@/lib/env';
const API = ENV.API_URL;

function authHeaders() {
  // Prioritize sessionStorage first (where impersonation tokens are stored)
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listMyTasks(params: { status?: string; project_id?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();

  // Check if we're in impersonation mode by looking at the token
  // Prioritize sessionStorage first (where impersonation tokens are stored)
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
  let useOwnTasks = true; // Default to own tasks

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      // If this is a dashboard access token with admin_id, we're impersonating
      if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
        useOwnTasks = false; // Use regular tasks endpoint to respect impersonation
      } else {
        console.log('Normal mode, using list_my_own_tasks.php'); // Debugging
      }
    } catch (e) {
      // If token parsing fails, default to own tasks
      console.log('Token parsing error:', e);
    }
  }

  // Use appropriate endpoint based on impersonation mode
  const endpoint = useOwnTasks ? 'list_my_own_tasks.php' : 'list.php';
  // console.log('Using endpoint for tasks:', endpoint); // Debugging

  const res = await fetch(`${API}/tasks/${endpoint}${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load tasks');
  const data = await res.json();
  console.log('Tasks response:', data);
  return data;
}

export async function createTask(task: UserTask) {
  // Check if we're in impersonation mode by looking at the token
  // Prioritize sessionStorage first (where impersonation tokens are stored)
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
  let useOwnTask = true; // Default to own task creation

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload for create task:', payload); // Debugging

      // If this is a dashboard access token with admin_id, we're impersonating
      if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
        console.log('Impersonation detected, using create_task.php'); // Debugging
        useOwnTask = false; // Use regular task creation endpoint to respect impersonation
      } else {
        console.log('Normal mode, using create_own_task.php'); // Debugging
      }
    } catch (e) {
      // If token parsing fails, default to own task creation
      console.log('Token parsing error:', e);
    }
  }

  // Use appropriate endpoint based on impersonation mode
  const endpoint = useOwnTask ? 'create_own_task.php' : 'create.php';
  // console.log('Using endpoint for create task:', endpoint); // Debugging

  const res = await fetch(`${API}/tasks/${endpoint}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create task');
  const data = await res.json();
  console.log('Create task response:', data);
  return data;
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
  // Check if we're in impersonation mode by looking at the token
  // Prioritize sessionStorage first (where impersonation tokens are stored)
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
  let useOwnWork = true; // Default to own work submission

  if (token) {
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload for submit work:', tokenPayload);

      // If this is a dashboard access token with admin_id, we're impersonating
      if (tokenPayload.purpose === 'dashboard_access' && tokenPayload.admin_id && tokenPayload.user_id) {
        console.log('Impersonation detected, using submit_work.php');
        useOwnWork = false; // Use regular work submission endpoint to respect impersonation
      } else {
        console.log('Normal mode, using submit_own_work.php');
      }
    } catch (e) {
      // If token parsing fails, default to own work submission
      console.log('Token parsing error:', e);
    }
  }

  // Use appropriate endpoint based on impersonation mode
  const endpoint = useOwnWork ? 'submit_own_work.php' : 'submit_work.php';
  // console.log('Using endpoint for submit:', endpoint);

  const res = await fetch(`${API}/tasks/${endpoint}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to submit work');
  return res.json();
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
  // Add cache-busting parameter to ensure fresh data
  const qs = new URLSearchParams({ ...params, _t: Date.now().toString() });

  // Check if we're in impersonation mode by looking at the token
  // Prioritize sessionStorage first (where impersonation tokens are stored)
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
  let useOwnSubmissions = true; // Default to own submissions

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload for submissions:', payload);

      // If this is a dashboard access token with admin_id, we're impersonating
      if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
        console.log('Impersonation detected, using my_submissions.php');
        useOwnSubmissions = false; // Use regular submissions endpoint to respect impersonation
      } else {
        console.log('Normal mode, using my_own_submissions.php');
      }
    } catch (e) {
      // If token parsing fails, default to own submissions
      console.log('Token parsing error:', e);
    }
  }

  // Use appropriate endpoint based on impersonation mode
  const endpoint = useOwnSubmissions ? 'my_own_submissions.php' : 'my_submissions.php';
  // console.log('Using endpoint:', endpoint);

  const res = await fetch(`${API}/tasks/${endpoint}${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load submissions');
  const data = await res.json();
  // console.log('Submissions response:', data);
  return data;
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
): { submissions: Record<string, unknown>[]; window: { from: string; to: string } } {
  if (!res || typeof res !== 'object') {
    return { submissions: [], window: fallbackWindow };
  }
  const root = res as { data?: unknown };
  const payload = root.data;

  if (Array.isArray(payload)) {
    return { submissions: payload, window: fallbackWindow };
  }

  if (payload && typeof payload === 'object') {
    const bundle = payload as {
      submissions?: unknown;
      window?: { from?: string; to?: string };
    };
    const list = Array.isArray(bundle.submissions) ? bundle.submissions : [];
    const w =
      bundle.window?.from && bundle.window?.to
        ? { from: bundle.window.from, to: bundle.window.to }
        : fallbackWindow;
    return { submissions: list as Record<string, unknown>[], window: w };
  }

  return { submissions: [], window: fallbackWindow };
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
  if (!res.ok) throw new Error('Failed to delete submission');
  return res.json();
}

export async function checkIn(
  submissionDate?: string,
  plannedProjects?: string[],
  plannedWork?: string,
  plannedWorkStatus?: StatusOption
): Promise<{ success: boolean; check_in_time: string; submission_date: string; message?: string }> {
  const res = await fetch(`${API}/tasks/check_in.php`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_date: submissionDate || new Date().toISOString().split('T')[0],
      planned_projects: plannedProjects || [],
      planned_work: plannedWork || '',
      planned_work_status: plannedWorkStatus || 'not_started'
    }),
  });

  // Get response text first to handle empty responses
  const responseText = await res.text();

  if (!responseText) {
    throw new Error('Empty response from server');
  }

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    console.error('Failed to parse JSON response:', responseText);
    throw new Error('Invalid JSON response from server: ' + responseText.substring(0, 100));
  }

  if (!res.ok || !responseData.success) {
    throw new Error(responseData.message || 'Failed to check in');
  }

  // Extract data from response (responseData.data contains the actual data)
  const data = responseData.data || responseData;
  return {
    success: responseData.success,
    check_in_time: data.check_in_time || responseData.check_in_time,
    submission_date: data.submission_date || responseData.submission_date,
    message: responseData.message
  };
}


