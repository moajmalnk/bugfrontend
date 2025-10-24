
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
      console.log('Token payload for tasks:', payload); // Debugging
      
      // If this is a dashboard access token with admin_id, we're impersonating
      if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
        console.log('Impersonation detected, using list_tasks.php'); // Debugging
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
  console.log('Using endpoint for tasks:', endpoint); // Debugging
  
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
  console.log('Using endpoint for create task:', endpoint); // Debugging
  
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
  console.log('Using endpoint for submit:', endpoint);
  
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
  const qs = new URLSearchParams({...params, _t: Date.now().toString()});
  
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
  console.log('Using endpoint:', endpoint);
  
  const res = await fetch(`${API}/tasks/${endpoint}${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load submissions');
  const data = await res.json();
  console.log('Submissions response:', data);
  return data;
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


