
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
};

export type WorkSubmission = {
  submission_date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm:ss
  hours_today: number;
  total_working_days?: number | null;
  total_hours_cumulative?: number | null;
  completed_tasks?: string;
  pending_tasks?: string;
  ongoing_tasks?: string;
  notes?: string;
};

import { ENV } from '@/lib/env';
const API = ENV.API_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listMyTasks(params: { status?: string; project_id?: string } = {}) {
  const qs = new URLSearchParams(params as any).toString();
  // Use own tasks endpoint to bypass impersonation for personal tasks
  const res = await fetch(`${API}/tasks/list_my_own_tasks.php${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load tasks');
  return res.json();
}

export async function createTask(task: UserTask) {
  // Use own task endpoint to bypass impersonation for personal tasks
  const res = await fetch(`${API}/tasks/create_own_task.php`, {
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
  // Use own work submission endpoint to bypass impersonation for personal work
  const res = await fetch(`${API}/tasks/submit_own_work.php`, {
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
  const qs = new URLSearchParams(params as any).toString();
  // Use own submissions endpoint to bypass impersonation for personal submissions
  const res = await fetch(`${API}/tasks/my_own_submissions.php${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load submissions');
  return res.json();
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


