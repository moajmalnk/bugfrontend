import { ENV } from '@/lib/env';
import { readApiJson } from '@/lib/apiError';

export type PayVerifyRoleFilter = 'all' | 'developer' | 'creator' | 'codo_tester' | 'mine';

export type PayVerifyEmployeeStatus = 'pending' | 'verified' | 'correction_needed';
export type PayVerifyAdminStatus = 'pending' | 'approved' | 'correction_requested';

export type PayVerifyWeek = {
  id?: string;
  user_id?: string;
  week_start: string;
  week_end: string;
  year_month?: string;
  worked_hours?: number | string;
  leave_hours?: number | string;
  ot_hours?: number | string;
  check_in_days?: number;
  leave_days?: number | string;
  office_days?: number;
  wfh_days?: number;
  late_days?: number;
  days_worked?: number;
  employee_status?: PayVerifyEmployeeStatus;
  employee_note?: string | null;
  employee_verified_at?: string | null;
  admin_status?: PayVerifyAdminStatus;
  admin_note?: string | null;
  admin_verified_at?: string | null;
  clip_start?: string;
  clip_end?: string;
  attendance_days?: Array<Record<string, unknown>>;
};

export type PayVerifyAdjustment = {
  id: string;
  month_verification_id?: string;
  type: 'advance' | 'deduction' | 'credit' | 'other';
  amount: number | string;
  reason: string;
  created_by?: string | null;
  created_at?: string;
};

export type PayVerifyMonth = {
  id?: string;
  user_id?: string;
  year_month?: string;
  period_start?: string;
  period_end?: string;
  total_hours?: number | string;
  worked_days?: number;
  leave_days?: number | string;
  leave_hours?: number | string;
  ot_hours?: number | string;
  check_in_days?: number;
  hourly_rate_used?: number | string | null;
  hourly_rate?: number | null;
  gross_estimate?: number | string;
  adjustments_total?: number | string;
  net_estimate?: number | string;
  include_ot?: number | boolean;
  employee_status?: PayVerifyEmployeeStatus;
  employee_note?: string | null;
  employee_verified_at?: string | null;
  admin_status?: PayVerifyAdminStatus;
  admin_note?: string | null;
  admin_verified_at?: string | null;
  adjustments?: PayVerifyAdjustment[];
  attendance_days?: Array<Record<string, unknown>>;
};

export type PayVerifyRateInfo = {
  current_rate?: number | null;
  effective_from?: string | null;
  previous_rate?: number | null;
  previous_from?: string | null;
  note?: string | null;
  rate_id?: string | null;
};

export type PayVerifyRateHistoryItem = {
  id: string;
  user_id: string;
  hourly_rate: number;
  effective_from: string;
  note?: string | null;
  updated_by?: string | null;
  updated_by_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  hike_amount?: number | null;
  hike_pct?: number | null;
};

export type PayVerifyRosterEntry = {
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    role_bucket: string;
    tester_type?: string | null;
  };
  weeks: PayVerifyWeek[];
  month: PayVerifyMonth;
  rate_info?: PayVerifyRateInfo | null;
};

export type PayVerifyMonthBounds = {
  min: string;
  max: string;
  joining_date?: string | null;
  clamped?: boolean;
  requested?: string;
};

export type PayVerifyMonthResponse = {
  month: string;
  period_start: string;
  period_end: string;
  period_label: string;
  role: string;
  weeks_meta: Array<{ week_start: string; week_end: string }>;
  roster: PayVerifyRosterEntry[];
  totals: {
    hours: number;
    gross: number;
    net: number;
    adjustments: number;
    verified_weeks: number;
    pending_weeks: number;
    locked_months: number;
  };
  is_admin: boolean;
  month_bounds?: PayVerifyMonthBounds;
};

export type PayVerifyUserMonthResponse = {
  month: string;
  period_start: string;
  period_end: string;
  period_label: string;
  user: {
    id: string;
    username: string;
    name?: string;
    role?: string;
    tester_type?: string | null;
  } | null;
  weeks: PayVerifyWeek[];
  month_verification: PayVerifyMonth;
  rate_info?: PayVerifyRateInfo | null;
  rate_history?: PayVerifyRateHistoryItem[];
  is_admin: boolean;
  is_self: boolean;
  month_bounds?: PayVerifyMonthBounds;
};

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

function baseUrl(): string {
  return `${ENV.API_URL.replace(/\/$/, '')}/attendance/pay_verify.php`;
}

type PayVerifyApiEnvelope = {
  success?: boolean;
  message?: unknown;
  data?: unknown;
};

function apiErrorMessage(json: PayVerifyApiEnvelope, status: number): string {
  return typeof json.message === 'string' && json.message.trim()
    ? json.message.trim()
    : `Request failed (${status})`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: authHeaders(), credentials: 'include' });
  const json = await readApiJson<PayVerifyApiEnvelope>(res);
  if (!res.ok || json.success === false) {
    throw new Error(apiErrorMessage(json, res.status));
  }
  return (json.data ?? json) as T;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await readApiJson<PayVerifyApiEnvelope>(res);
  if (!res.ok || json.success === false) {
    throw new Error(apiErrorMessage(json, res.status));
  }
  return (json.data ?? json) as T;
}

export function currentYearMonth(): string {
  // Why: Pay Verify periods follow IST business calendar (same as backend).
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    if (y && m) return `${y}-${m}`;
  } catch {
    // fall through
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Why: Same IST calendar day the backend uses for verify gates. */
export function todayIsoIst(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export type PayVerifyPeriodState = 'completed' | 'in_progress' | 'upcoming';

/**
 * Why: Only fully finished weeks/months may be verified — never tomorrow or open weeks.
 * Completed = period_end is strictly before today's IST date.
 */
export function payVerifyPeriodState(
  periodStart: string,
  periodEnd: string,
  today: string = todayIsoIst()
): PayVerifyPeriodState {
  if (periodEnd < today) return 'completed';
  if (periodStart > today) return 'upcoming';
  return 'in_progress';
}

export function canVerifyWeekPeriod(
  week: Pick<PayVerifyWeek, 'week_start' | 'week_end'>,
  today: string = todayIsoIst()
): boolean {
  return payVerifyPeriodState(week.week_start, week.week_end, today) === 'completed';
}

export function canVerifyMonthPeriod(
  periodStart: string,
  periodEnd: string,
  today: string = todayIsoIst()
): boolean {
  return payVerifyPeriodState(periodStart, periodEnd, today) === 'completed';
}

export function payVerifyPeriodHint(
  state: PayVerifyPeriodState,
  periodEnd: string
): string {
  if (state === 'completed') return 'Ready to verify';
  if (state === 'upcoming') return 'Not started yet';
  try {
    const end = new Date(`${periodEnd}T12:00:00`);
    const endLabel = end.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return `In progress · verify after ${endLabel}`;
  } catch {
    return 'In progress · verify after this period ends';
  }
}

export function shiftYearMonth(ym: string, delta: number): string {
  const [yStr, mStr] = ym.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Why: Salary for month M is reviewed during M+1. Until 1 Nov, default is September;
 * from 1 Nov the default becomes October. Always the previous calendar month in IST.
 */
export function defaultPayVerifyYearMonth(): string {
  return shiftYearMonth(currentYearMonth(), -1);
}

/** Clamp YYYY-MM into [min, max] inclusive. */
export function clampYearMonth(
  ym: string,
  bounds?: { min?: string; max?: string } | null
): string {
  if (!bounds) return ym;
  if (bounds.min && ym < bounds.min) return bounds.min;
  if (bounds.max && ym > bounds.max) return bounds.max;
  return ym;
}

/** Whether shifting the period by delta stays within joining→today bounds. */
export function canShiftYearMonth(
  ym: string,
  delta: number,
  bounds?: { min?: string; max?: string } | null
): boolean {
  const next = shiftYearMonth(ym, delta);
  if (bounds?.min && next < bounds.min) return false;
  if (bounds?.max && next > bounds.max) return false;
  return true;
}

/** Short label e.g. "Aug 2024" for period bound captions. */
export function formatYearMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function formatInr(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatHours(h: number | string | null | undefined): string {
  const n = Number(h ?? 0);
  if (!Number.isFinite(n)) return '0h';
  return `${n % 1 === 0 ? String(n) : n.toFixed(1)}h`;
}

export async function fetchPayVerifyMonth(
  month: string,
  role: PayVerifyRoleFilter = 'all'
): Promise<PayVerifyMonthResponse> {
  const qs = new URLSearchParams({ action: 'month', month, role });
  return getJson(`${baseUrl()}?${qs}`);
}

export async function fetchPayVerifyUserMonth(
  userId: string,
  month: string
): Promise<PayVerifyUserMonthResponse> {
  const qs = new URLSearchParams({ action: 'user-month', user_id: userId, month });
  return getJson(`${baseUrl()}?${qs}`);
}

export async function fetchPayVerifyPending(): Promise<{
  mine: number;
  admin: number;
  total: number;
}> {
  return getJson(`${baseUrl()}?action=pending`);
}

export async function employeeVerifyWeek(payload: {
  user_id?: string;
  week_start: string;
  status: 'verified' | 'correction_needed';
  note?: string;
}): Promise<{ week: PayVerifyWeek }> {
  return postJson(`${baseUrl()}?action=employee-week`, payload);
}

export async function adminVerifyWeek(payload: {
  user_id: string;
  week_start: string;
  status: 'approved' | 'correction_requested';
  note?: string;
}): Promise<{ week: PayVerifyWeek }> {
  return postJson(`${baseUrl()}?action=admin-week`, payload);
}

export async function employeeVerifyMonth(payload: {
  user_id?: string;
  month: string;
  status: 'verified' | 'correction_needed';
  note?: string;
}): Promise<{ month: PayVerifyMonth }> {
  return postJson(`${baseUrl()}?action=employee-month`, payload);
}

export async function adminLockMonth(payload: {
  user_id: string;
  month: string;
  action: 'lock' | 'unlock' | 'correction_requested';
  note?: string;
  include_ot?: boolean;
}): Promise<{ month: PayVerifyMonth }> {
  return postJson(`${baseUrl()}?action=admin-month`, payload);
}

export async function setHourlyRate(payload: {
  user_id: string;
  hourly_rate: number;
  effective_from?: string;
  note?: string;
}): Promise<{
  id: string;
  hourly_rate: number;
  effective_from: string;
  previous_rate?: number | null;
  hike_amount?: number | null;
  hike_pct?: number | null;
  note?: string | null;
  history?: PayVerifyRateHistoryItem[];
  rate_info?: PayVerifyRateInfo;
}> {
  return postJson(`${baseUrl()}?action=rate`, payload);
}

export async function fetchRateHistory(
  userId: string,
  asOf?: string
): Promise<{
  user_id: string;
  as_of: string;
  rate_info: PayVerifyRateInfo;
  history: PayVerifyRateHistoryItem[];
}> {
  const params = new URLSearchParams({ user_id: userId });
  if (asOf) params.set('as_of', asOf);
  return getJson(`${baseUrl()}?action=rate-history&${params}`);
}

export async function deleteHourlyRate(id: string): Promise<{
  id: string;
  user_id: string;
  rate_info: PayVerifyRateInfo;
  history: PayVerifyRateHistoryItem[];
}> {
  return postJson(`${baseUrl()}?action=delete-rate`, { id });
}

export async function addMonthAdjustment(payload: {
  user_id: string;
  month: string;
  type: 'advance' | 'deduction' | 'credit' | 'other';
  amount: number;
  reason: string;
}): Promise<{ month: PayVerifyMonth }> {
  return postJson(`${baseUrl()}?action=adjustment`, payload);
}

export async function deleteMonthAdjustment(id: string): Promise<{ month: PayVerifyMonth }> {
  return postJson(`${baseUrl()}?action=delete-adjustment`, { id });
}

export async function seedPayVerifyRates(): Promise<{ inserted: number }> {
  return postJson(`${baseUrl()}?action=seed-rates`, {});
}

export async function seedSeptemberAdjustments(): Promise<{ added: number }> {
  return postJson(`${baseUrl()}?action=seed-sept-adjustments`, {});
}

export function weekStatusLabel(week: PayVerifyWeek): string {
  if (week.admin_status === 'approved') return 'Done';
  if (week.admin_status === 'correction_requested' || week.employee_status === 'correction_needed') {
    return 'Correction';
  }
  if (week.employee_status === 'verified') return 'Reviewed';
  return 'Pending';
}

/** Why: Cards show employee vs admin progress separately — not one blended status. */
export function employeeWeekVerifyLabel(week: PayVerifyWeek): string {
  if (week.employee_status === 'verified') return 'Verified';
  if (week.employee_status === 'correction_needed') return 'Correction';
  return 'Pending';
}

export function adminWeekVerifyLabel(week: PayVerifyWeek): string {
  if (week.admin_status === 'approved') return 'Approved';
  if (week.admin_status === 'correction_requested') return 'Correction';
  if (week.employee_status === 'verified') return 'Awaiting';
  return 'Pending';
}

/**
 * Why: Payments UI should read as Pending → Ready to pay → Paid (not internal verify jargon).
 */
export function monthStatusLabel(month: PayVerifyMonth): string {
  if (month.admin_status === 'approved') return 'Paid';
  if (month.admin_status === 'correction_requested' || month.employee_status === 'correction_needed') {
    return 'Correction';
  }
  if (month.employee_status === 'verified') return 'Completed';
  return 'Pending';
}

export function employeeMonthVerifyLabel(month: PayVerifyMonth): string {
  if (month.employee_status === 'verified') return 'Verified';
  if (month.employee_status === 'correction_needed') return 'Correction';
  return 'Pending';
}

export function adminMonthVerifyLabel(month: PayVerifyMonth): string {
  if (month.admin_status === 'approved') return 'Paid';
  if (month.admin_status === 'correction_requested') return 'Correction';
  if (month.employee_status === 'verified') return 'Awaiting';
  return 'Pending';
}
