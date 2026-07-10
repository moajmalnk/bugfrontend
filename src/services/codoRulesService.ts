import { ENV } from '@/lib/env';

export type CodoRulePhase = 'developer' | 'tester' | 'project';

export type CodoCommonRule = {
  id: number;
  phase: CodoRulePhase;
  rule_key: string;
  title: string;
  subtitle?: string | null;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_username?: string | null;
  updated_by_username?: string | null;
};

export type CodoRuleCounts = {
  all: number;
  developer: number;
  tester: number;
  project: number;
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

const API = `${ENV.API_URL}/codo`;

export async function listCodoRules(opts?: {
  phase?: CodoRulePhase | '';
  q?: string;
  include_inactive?: boolean;
}): Promise<{ rules: CodoCommonRule[]; counts: CodoRuleCounts }> {
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
    rules: Array.isArray(data?.data?.rules) ? data.data.rules : [],
    counts: data?.data?.counts || { all: 0, developer: 0, tester: 0, project: 0 },
  };
}

export async function createCodoRule(body: {
  phase: CodoRulePhase;
  title: string;
  description: string;
  subtitle?: string;
  rule_key?: string;
  sort_order?: number;
}): Promise<CodoCommonRule> {
  const res = await fetch(`${API}/create.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateCodoRule(body: {
  id: number;
  phase?: CodoRulePhase;
  title?: string;
  description?: string;
  subtitle?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<CodoCommonRule> {
  const res = await fetch(`${API}/update.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function deleteCodoRule(id: number, hard = true): Promise<void> {
  const res = await fetch(`${API}/delete.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ id, hard }),
  });
  await parseJson(res);
}
