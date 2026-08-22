import { ENV } from '@/lib/env';
import { readApiJson } from '@/lib/apiError';

export type RecycleBinEntityType =
  | 'bug'
  | 'project'
  | 'update'
  | 'user'
  | 'client'
  | 'weekly_report'
  | 'announcement'
  | 'feedback'
  | 'short'
  | 'activity'
  | 'doc'
  | 'sheet'
  | 'role'
  | 'performance_review'
  | 'work_submission'
  | 'shared_task'
  | 'user_task'
  | 'codo_rule';

export type RecycleBinItem = {
  id: string;
  entity_type: RecycleBinEntityType;
  entity_id: string;
  title: string;
  subtitle?: string | null;
  project_id?: string | null;
  metadata?: Record<string, unknown> | null;
  deleted_by: string;
  deleted_by_username?: string | null;
  deleted_at: string;
  expires_at?: string | null;
  entity_label?: string;
};

export type RecycleBinListResult = {
  items: RecycleBinItem[];
  total: number;
  page: number;
  limit: number;
};

export type RecycleBinStats = Record<string, number>;

function authHeaders(): HeadersInit {
  const token =
    sessionStorage.getItem('token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function listRecycleBin(params: {
  entity_type?: string;
  q?: string;
  deleted_by?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}): Promise<RecycleBinListResult> {
  const qs = new URLSearchParams();
  if (params.entity_type && params.entity_type !== 'all') {
    qs.set('entity_type', params.entity_type);
  }
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.deleted_by?.trim()) qs.set('deleted_by', params.deleted_by.trim());
  if (params.date_from) qs.set('date_from', params.date_from);
  if (params.date_to) qs.set('date_to', params.date_to);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));

  const res = await fetch(`${ENV.API_URL}/recycle_bin/list.php?${qs.toString()}`, {
    headers: authHeaders(),
  });
  const payload = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: RecycleBinListResult;
  }>(res);
  if (!res.ok || payload.success === false || !payload.data) {
    throw new Error(payload.message || 'Failed to load recycle bin');
  }
  return {
    items: payload.data.items ?? [],
    total: payload.data.total ?? 0,
    page: payload.data.page ?? 1,
    limit: payload.data.limit ?? 20,
  };
}

export async function fetchRecycleBinStats(): Promise<RecycleBinStats> {
  const res = await fetch(`${ENV.API_URL}/recycle_bin/stats.php`, {
    headers: authHeaders(),
  });
  const payload = await readApiJson<{
    success?: boolean;
    data?: { stats?: RecycleBinStats; total?: number };
  }>(res);
  if (!res.ok || payload.success === false) {
    return { all: 0 };
  }
  return payload.data?.stats ?? { all: payload.data?.total ?? 0 };
}

export async function restoreRecycleBinItem(id: string): Promise<void> {
  const res = await fetch(`${ENV.API_URL}/recycle_bin/restore.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  const payload = await readApiJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || payload.success === false) {
    throw new Error(payload.message || 'Restore failed');
  }
}

export async function purgeRecycleBinItem(id: string): Promise<void> {
  const res = await fetch(`${ENV.API_URL}/recycle_bin/purge.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  const payload = await readApiJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || payload.success === false) {
    throw new Error(payload.message || 'Purge failed');
  }
}

export async function bulkRecycleBinAction(
  action: 'restore' | 'purge',
  ids: string[]
): Promise<{ restored?: number; purged?: number; failed: Array<{ id: string; error: string }> }> {
  const res = await fetch(`${ENV.API_URL}/recycle_bin/bulk.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, ids }),
  });
  const payload = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: { restored?: number; purged?: number; failed: Array<{ id: string; error: string }> };
  }>(res);
  if (!res.ok || payload.success === false) {
    throw new Error(payload.message || 'Bulk action failed');
  }
  return payload.data ?? { failed: [] };
}

export const RECYCLE_BIN_ENTITY_LABELS: Record<string, string> = {
  all: 'All items',
  bug: 'Bugs',
  project: 'Projects',
  update: 'Updates',
  user: 'Users',
  client: 'Clients',
  weekly_report: 'Weekly reports',
  announcement: 'Announcements',
  feedback: 'Feedback',
  short: 'Shorts',
  activity: 'Activities',
  doc: 'Documents',
  sheet: 'Sheets',
  role: 'Roles',
  performance_review: 'Reviews',
  work_submission: 'Submissions',
  shared_task: 'Shared tasks',
  user_task: 'Tasks',
  codo_rule: 'CODO rules',
};
