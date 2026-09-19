import { ENV } from '@/lib/env';

export type CursorTipPhase =
  | 'modes'
  | 'commands'
  | 'skills'
  | 'workflow'
  | 'review';

export type CursorTip = {
  id: number;
  phase: CursorTipPhase;
  tip_key: string;
  title: string;
  subtitle?: string | null;
  description: string;
  analogy_en?: string | null;
  analogy_ml?: string | null;
  when_to_use?: string | null;
  when_not_to_use?: string | null;
  example_bad?: string | null;
  example_good?: string | null;
  example_language?: string | null;
  sort_order: number;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CursorTipCounts = {
  all: number;
  modes: number;
  commands: number;
  skills: number;
  workflow: number;
  review: number;
};

export type CursorTipPayload = {
  phase: CursorTipPhase;
  title: string;
  description: string;
  subtitle?: string;
  tip_key?: string;
  sort_order?: number;
  is_active?: boolean;
  analogy_en?: string | null;
  analogy_ml?: string | null;
  when_to_use?: string | null;
  when_not_to_use?: string | null;
  example_bad?: string | null;
  example_good?: string | null;
  example_language?: string | null;
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

const API = `${ENV.API_URL}/cursor_tips`;

export async function listCursorTips(opts?: {
  phase?: CursorTipPhase | '';
  q?: string;
  include_inactive?: boolean;
}): Promise<{ tips: CursorTip[]; counts: CursorTipCounts }> {
  const params = new URLSearchParams();
  if (opts?.phase) params.set('phase', opts.phase);
  if (opts?.q) params.set('q', opts.q);
  if (opts?.include_inactive) params.set('include_inactive', '1');
  const qs = params.toString();
  const res = await fetch(`${API}/list.php${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return {
    tips: Array.isArray(data?.data?.tips) ? data.data.tips : [],
    counts: data?.data?.counts || {
      all: 0,
      modes: 0,
      commands: 0,
      skills: 0,
      workflow: 0,
      review: 0,
    },
  };
}

export async function createCursorTip(
  body: CursorTipPayload
): Promise<CursorTip> {
  const res = await fetch(`${API}/create.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateCursorTip(
  body: CursorTipPayload & { id: number }
): Promise<CursorTip> {
  const res = await fetch(`${API}/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function deleteCursorTip(id: number): Promise<void> {
  const res = await fetch(`${API}/delete.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  await parseJson(res);
}
