import { ENV } from '@/lib/env';

export type BugDatesCategory =
  | 'growth_program'
  | 'observance'
  | 'holiday'
  | 'milestone'
  | 'company_event';

export type BugDatesRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type BugDatesVisibility = 'company' | 'hr_only' | 'admins';
export type BugDatesStatus = 'approved' | 'pending_approval' | 'rejected';

export type BugDatesEvent = {
  id: number;
  title: string;
  description?: string | null;
  category: BugDatesCategory | string;
  recurrence_type: BugDatesRecurrence | string;
  recurrence_days?: string[] | number[] | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location_or_link?: string | null;
  is_office_closed?: boolean;
  auto_hooks?: Record<string, unknown> | null;
  visibility?: BugDatesVisibility | string;
  status: BugDatesStatus | string;
  created_by?: string;
  created_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BugDatesCalendarItem = BugDatesEvent & {
  source?: string;
  layer?: string;
  occurrence_date: string;
  leave_request_id?: number;
  wfh_request_id?: number;
  user_id?: string;
  username?: string | null;
  leave_type_code?: string | null;
  leave_type_name?: string | null;
  is_half_day?: boolean;
  half_day_type?: string | null;
  reason?: string | null;
  /** Hours credited toward work stats for this leave day (e.g. Official Leave = 8). */
  credited_hours?: number | null;
  is_official_leave?: boolean;
  project_id?: string;
  project_name?: string | null;
  milestone_key?: string;
  years?: number;
};

export type GrowthProgramSession = {
  id: number;
  event_id: number;
  event_title?: string | null;
  session_date: string;
  host_user_id?: string | null;
  host_name?: string | null;
  agenda_topic?: string | null;
  summary_notes?: string | null;
  recording_or_drive_link?: string | null;
  weekly_report_task_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BugDatesEventInput = {
  id?: number;
  title: string;
  description?: string | null;
  category: BugDatesCategory | string;
  recurrence_type?: BugDatesRecurrence | string;
  recurrence_days?: string[] | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location_or_link?: string | null;
  is_office_closed?: boolean;
  auto_hooks?: Record<string, unknown> | null;
  visibility?: BugDatesVisibility | string;
  status?: BugDatesStatus | string;
  action?: 'create' | 'update' | 'delete';
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

const API = `${ENV.API_URL}/bugdates`;

export async function getBugDatesCalendar(params: {
  from: string;
  to: string;
  categories?: string[];
}): Promise<{ from: string; to: string; items: BugDatesCalendarItem[]; count: number }> {
  const qs = new URLSearchParams({ from: params.from, to: params.to });
  if (params.categories?.length) {
    qs.set('categories', params.categories.join(','));
  }
  const res = await fetch(`${API}/calendar.php?${qs}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data;
}

export async function getBugDatesHolidays(from: string, to: string): Promise<string[]> {
  const qs = new URLSearchParams({ from, to });
  const res = await fetch(`${API}/holidays.php?${qs}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data?.dates ?? [];
}

export async function listBugDatesEvents(params?: {
  status?: string;
  category?: string;
}): Promise<BugDatesEvent[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.category) qs.set('category', params.category);
  const q = qs.toString();
  const res = await fetch(`${API}/events.php${q ? `?${q}` : ''}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data ?? [];
}

export async function createBugDatesEvent(input: BugDatesEventInput): Promise<BugDatesEvent> {
  const res = await fetch(`${API}/events.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...input, action: 'create' }),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateBugDatesEvent(input: BugDatesEventInput & { id: number }): Promise<BugDatesEvent> {
  const res = await fetch(`${API}/events.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...input, action: 'update' }),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function deleteBugDatesEvent(id: number): Promise<void> {
  const res = await fetch(`${API}/events.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id, action: 'delete' }),
  });
  await parseJson(res);
}

export async function reviewBugDatesEvent(
  id: number,
  action: 'approve' | 'reject'
): Promise<BugDatesEvent> {
  const res = await fetch(`${API}/events_review.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id, action }),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function listGrowthSessions(params?: {
  event_id?: number;
  from?: string;
  to?: string;
}): Promise<GrowthProgramSession[]> {
  const qs = new URLSearchParams();
  if (params?.event_id) qs.set('event_id', String(params.event_id));
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const q = qs.toString();
  const res = await fetch(`${API}/sessions.php${q ? `?${q}` : ''}`, { headers: authHeaders() });
  const data = await parseJson(res);
  return data.data ?? [];
}

export async function saveGrowthSession(input: {
  event_id: number;
  session_date: string;
  host_user_id?: string | null;
  agenda_topic?: string | null;
  summary_notes?: string | null;
  recording_or_drive_link?: string | null;
  generate_todo?: boolean;
}): Promise<GrowthProgramSession> {
  const res = await fetch(`${API}/sessions.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function generateBugCreativeCard(input: {
  event_id: number;
  occurrence_date: string;
  title?: string;
  hook_content?: string;
  material_type?: string;
}): Promise<{
  asset_id: string;
  title?: string;
  scheduled_date?: string;
  already_exists?: boolean;
}> {
  const res = await fetch(`${API}/generate_creative.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function generateBugDatesTodo(input: {
  event_id: number;
  occurrence_date: string;
  title?: string;
  description?: string;
  assigned_to?: string;
}): Promise<{ task_id: string | number; already_exists?: boolean }> {
  const res = await fetch(`${API}/generate_todo.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJson(res);
  return data.data;
}

export const BUGDATES_LAYER_COLORS: Record<string, string> = {
  growth_program: 'bg-teal-500/90 text-white',
  observance: 'bg-amber-500/90 text-white',
  holiday: 'bg-rose-500/90 text-white',
  company_event: 'bg-indigo-500/90 text-white',
  milestone: 'bg-violet-500/90 text-white',
  leave: 'bg-sky-500/90 text-white',
  official_leave: 'bg-amber-500/90 text-white',
  wfh: 'bg-cyan-600/90 text-white',
  birthday: 'bg-pink-500/90 text-white',
  anniversary: 'bg-fuchsia-500/90 text-white',
  project_milestone: 'bg-orange-500/90 text-white',
};
