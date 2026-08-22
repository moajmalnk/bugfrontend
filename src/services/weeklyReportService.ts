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
  attendance?: WeeklyReportAttendance;
  attendance_text?: string;
};

export type WeeklyReportFields = {
  work_completed: string;
  work_in_progress: string;
  issues_blockers: string;
  plan_next_week: string;
};

export type WeeklyReportAttendanceDay = {
  date: string;
  date_label: string;
  day_status: 'worked' | 'leave' | 'off';
  check_in?: string | null;
  hours: number;
  break_minutes: number;
  work_mode?: 'office' | 'wfh' | null;
  is_late?: boolean;
  leave_type_name?: string | null;
  leave_type_code?: string | null;
  overtime_hours?: number;
};

export type WeeklyReportAttendance = {
  summary: {
    days_worked: number;
    total_hours: number;
    break_minutes: number;
    leave_days: number;
    check_ins: number;
    office_days: number;
    wfh_days: number;
    late_days: number;
    overtime_hours: number;
  };
  days: WeeklyReportAttendanceDay[];
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

export type WeeklyReportListItem = {
  id: string;
  user_id: string;
  user_name: string;
  user_role?: string | null;
  week_start: string;
  week_end: string;
  week_label: string;
  report_date: string;
  date_label: string;
  work_completed: string;
  work_in_progress: string;
  issues_blockers: string;
  plan_next_week: string;
  notified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  counts?: {
    completed: number;
    wip: number;
    blockers: number;
    plan: number;
  };
  attendance?: WeeklyReportAttendance;
  attendance_text?: string;
};

export type WeeklyReportListPayload = {
  scope: 'team' | 'mine';
  can_view_team: boolean;
  current_week_start: string;
  current_week_end: string;
  current_week_label: string;
  items: WeeklyReportListItem[];
  total: number;
  page: number;
  limit: number;
  week_start: string | null;
  week_end: string | null;
  week_label: string | null;
};

export type ListWeeklyReportsParams = {
  scope?: 'team' | 'mine';
  week_start?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export function todayYmdLocal(): string {
  return toYmd(new Date());
}

export function formatWeekRangeLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  return `${startLabel} – ${endLabel}`;
}

export function recentMondaySaturdayWeeks(count = 16, fromYmd = todayYmdLocal()): {
  weekStart: string;
  weekEnd: string;
  label: string;
}[] {
  const current = mondaySaturdayWeek(fromYmd);
  const weeks = [];
  for (let i = 0; i < count; i += 1) {
    const [y, m, d] = current.weekStart.split('-').map(Number);
    const monday = new Date(y, m - 1, d);
    monday.setDate(monday.getDate() - i * 7);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const weekStart = toYmd(monday);
    const weekEnd = toYmd(saturday);
    weeks.push({
      weekStart,
      weekEnd,
      label: formatWeekRangeLabel(weekStart, weekEnd),
    });
  }
  return weeks;
}

export function weeklyReportLines(text?: string | null): string[] {
  return String(text || '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

export function formatWeeklyReportAttendanceBlock(
  attendance?: WeeklyReportAttendance | null
): string {
  if (!attendance) return '';
  const s = attendance.summary;
  const lines = [
    'Weekly Attendance Summary',
    `Worked days: ${s.days_worked}`,
    `Total hours: ${s.total_hours.toFixed(2)} h`,
    `Break: ${s.break_minutes} min`,
    `Leave days: ${s.leave_days}`,
    `Check-ins: ${s.check_ins}`,
    `Office days: ${s.office_days}`,
    `WFH days: ${s.wfh_days}`,
    `Late days: ${s.late_days}`,
    `Overtime: ${s.overtime_hours.toFixed(2)} h`,
    '',
    'Daily Attendance',
  ];

  for (const day of attendance.days) {
    const parts = [day.date_label];
    if (day.day_status === 'leave') {
      parts.push(day.leave_type_name ? `Leave (${day.leave_type_name})` : 'Leave');
      if (day.hours > 0) parts.push(`${day.hours.toFixed(2)} h credited`);
    } else if (day.day_status === 'worked') {
      if (day.check_in) parts.push(`Check-in ${day.check_in}`);
      if (day.hours > 0) parts.push(`${day.hours.toFixed(2)} h worked`);
      if (day.break_minutes > 0) parts.push(`${day.break_minutes} min break`);
      if (day.work_mode === 'wfh') parts.push('WFH');
      else if (day.work_mode === 'office') parts.push('Office');
      if (day.is_late) parts.push('Late');
      if ((day.overtime_hours ?? 0) > 0) {
        parts.push(`${(day.overtime_hours ?? 0).toFixed(2)} h OT`);
      }
    } else {
      parts.push('No record');
    }
    lines.push(`- ${parts.join(' · ')}`);
  }

  return lines.join('\n');
}

export function formatWeeklyReportDocument(item: {
  user_name: string;
  date_label: string;
  week_label: string;
  work_completed: string;
  work_in_progress: string;
  issues_blockers?: string | null;
  plan_next_week: string;
  attendance?: WeeklyReportAttendance | null;
  attendance_text?: string | null;
}): string {
  const bullets = (text: string, empty = '—') => {
    const lines = weeklyReportLines(text);
    if (lines.length === 0) return `- ${empty}`;
    return lines.map((line) => `- ${line}`).join('\n');
  };
  const blockers = String(item.issues_blockers || '').trim() || 'No major blockers.';
  const sections = [
    'WEEKLY REPORT',
    '',
    `Name: ${item.user_name}`,
    `Date: ${item.date_label}`,
    `Week: ${item.week_label}`,
    '',
    'Work Completed This Week',
    bullets(item.work_completed),
    '',
    'Work in Progress',
    bullets(item.work_in_progress),
    '',
    'Issues / Blockers',
    bullets(blockers, 'No major blockers.'),
    '',
    'Plan for Next Week',
    bullets(item.plan_next_week),
  ];

  const attendanceBlock =
    String(item.attendance_text || '').trim() ||
    formatWeeklyReportAttendanceBlock(item.attendance);
  if (attendanceBlock) {
    sections.push('', attendanceBlock);
  }

  return sections.join('\n');
}

export async function listWeeklyReports(
  params: ListWeeklyReportsParams = {}
): Promise<WeeklyReportListPayload> {
  const qs = new URLSearchParams();
  if (params.scope) qs.set('scope', params.scope);
  if (params.week_start) qs.set('week_start', params.week_start);
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetch(`${ENV.API_URL}/tasks/weekly_reports.php${suffix}`, {
    headers: authHeaders(),
  });
  const data = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: WeeklyReportListPayload;
  }>(res);
  if (!res.ok || data.success === false || !data.data) {
    throw new Error(data.message || 'Failed to load weekly reports');
  }
  return data.data;
}

export async function adminUpdateWeeklyReport(
  id: string,
  fields: WeeklyReportFields
): Promise<WeeklyReportListItem> {
  const res = await fetch(`${ENV.API_URL}/tasks/admin_weekly_report.php?id=${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({
      id,
      work_completed: clampWeeklyReportField(fields.work_completed).trim(),
      work_in_progress: clampWeeklyReportField(fields.work_in_progress).trim(),
      issues_blockers: clampWeeklyReportField(fields.issues_blockers).trim(),
      plan_next_week: clampWeeklyReportField(fields.plan_next_week).trim(),
    }),
  });
  const data = await readApiJson<{
    success?: boolean;
    message?: string;
    data?: { report?: WeeklyReportListItem };
  }>(res);
  if (!res.ok || data.success === false || !data.data?.report) {
    throw new Error(data.message || 'Failed to update weekly report');
  }
  return data.data.report;
}

export async function adminDeleteWeeklyReport(id: string): Promise<void> {
  const res = await fetch(`${ENV.API_URL}/tasks/admin_weekly_report.php?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ id }),
  });
  const data = await readApiJson<{ success?: boolean; message?: string }>(res);
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Failed to delete weekly report');
  }
}
