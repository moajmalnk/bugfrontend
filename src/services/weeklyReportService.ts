import { ENV } from '@/lib/env';
import { readApiJson } from '@/lib/apiError';

const WEEKLY_REPORT_FIELD_MAX = 20000;

export type WeeklyReportRecord = {
  id?: string;
  user_id?: string;
  week_start?: string;
  week_end?: string;
  report_date?: string;
  work_completed?: string;
  work_in_progress?: string;
  issues_blockers?: string | null;
  plan_next_week?: string;
  notified_at?: string | null;
};

export type WeeklyReportPayload = {
  required: boolean;
  is_saturday: boolean;
  week_start: string;
  week_end: string;
  week_label: string;
  report_date: string;
  date_label: string;
  user_name: string;
  report: WeeklyReportRecord | null;
  suggestions?: {
    work_completed?: string;
    work_in_progress?: string;
    plan_next_week?: string;
  };
};

export type WeeklyReportFields = {
  work_completed: string;
  work_in_progress: string;
  issues_blockers: string;
  plan_next_week: string;
};

const EMPTY_FIELDS: WeeklyReportFields = {
  work_completed: '',
  work_in_progress: '',
  issues_blockers: '',
  plan_next_week: '',
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Why: Saturday checkout week is Monday–Saturday in local civil date (IST office). */
export function isSaturdayYmd(ymd?: string): boolean {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 6;
}

export function mondaySaturdayWeek(ymd: string): { weekStart: string; weekEnd: string } {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { weekStart: toYmd(monday), weekEnd: toYmd(saturday) };
}

export function clampWeeklyReportField(value: string): string {
  return value.slice(0, WEEKLY_REPORT_FIELD_MAX);
}

export function emptyWeeklyReportFields(): WeeklyReportFields {
  return { ...EMPTY_FIELDS };
}

export function isWeeklyReportValid(fields: WeeklyReportFields): boolean {
  return (
    fields.work_completed.trim().length > 0 &&
    fields.work_in_progress.trim().length > 0 &&
    fields.plan_next_week.trim().length > 0
  );
}

export async function getWeeklyReport(date?: string): Promise<WeeklyReportPayload> {
  const qs = new URLSearchParams();
  if (date) qs.set('date', date);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${ENV.API_URL}/tasks/weekly_report.php${suffix}`, {
    headers: authHeaders(),
  });
  const data = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: WeeklyReportPayload;
  }>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(data.message || 'Failed to load weekly report');
  }
  return data.data;
}

export async function saveWeeklyReport(
  fields: WeeklyReportFields,
  reportDate?: string
): Promise<WeeklyReportPayload> {
  const res = await fetch(`${ENV.API_URL}/tasks/weekly_report.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      report_date: reportDate,
      work_completed: clampWeeklyReportField(fields.work_completed).trim(),
      work_in_progress: clampWeeklyReportField(fields.work_in_progress).trim(),
      issues_blockers: clampWeeklyReportField(fields.issues_blockers).trim(),
      plan_next_week: clampWeeklyReportField(fields.plan_next_week).trim(),
    }),
  });
  const data = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: WeeklyReportPayload;
  }>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(data.message || 'Failed to save weekly report');
  }
  return data.data;
}
