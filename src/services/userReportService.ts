import {
  listAttendanceExceptions,
  type AttendanceDayException,
  type LateDayRow,
} from "@/services/attendanceExceptionService";
import {
  getLeaveTypes,
  listLeaveRequests,
  type LeaveBalance,
  type LeaveRequest,
} from "@/services/leaveService";
import {
  fetchPayVerifyUserMonth,
  type PayVerifyUserMonthResponse,
} from "@/services/payVerifyService";
import { userService } from "@/services/userService";

export type UserReportWorkSummary = {
  hours: number;
  days: number;
  work_hours: number;
  work_days: number;
  leave_hours: number;
  leave_days: number;
  official_leave_hours: number;
  official_leave_days: number;
  other_leave_hours: number;
  other_leave_days: number;
  overtime_hours: number;
  requested_extra_hours: number;
  approval_requests: number;
  break_minutes: number;
  net_hours: number;
  tasks: { completed: number; pending: number; ongoing: number; upcoming: number };
};

export type UserReportAttendance = {
  officeDays: number;
  wfhDays: number;
  lateDays: LateDayRow[];
  exceptions: AttendanceDayException[];
};

export type UserReportLeave = {
  balances: LeaveBalance[];
  requests: LeaveRequest[];
};

/** Sections whose API call failed; the slip prints "Not available" for them. */
export type UserReportFailure = "pay" | "work" | "attendance" | "leave";

export type UserReportData = {
  month: string;
  periodStart: string;
  periodEnd: string;
  pay: PayVerifyUserMonthResponse | null;
  work: UserReportWorkSummary | null;
  attendance: UserReportAttendance | null;
  leave: UserReportLeave | null;
  failed: UserReportFailure[];
};

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const count = (v: unknown) => (Array.isArray(v) ? v.length : 0);

function toWorkSummary(raw: unknown): UserReportWorkSummary {
  const data = (raw ?? {}) as { summary?: Record<string, unknown>; tasks?: Record<string, unknown> };
  const s = data.summary ?? {};
  return {
    hours: num(s.hours),
    days: num(s.days),
    work_hours: num(s.work_hours),
    work_days: num(s.work_days),
    leave_hours: num(s.leave_hours),
    leave_days: num(s.leave_days),
    official_leave_hours: num(s.official_leave_hours),
    official_leave_days: num(s.official_leave_days),
    other_leave_hours: num(s.other_leave_hours),
    other_leave_days: num(s.other_leave_days),
    overtime_hours: num(s.overtime_hours),
    requested_extra_hours: num(s.requested_extra_hours),
    approval_requests: num(s.approval_requests),
    break_minutes: num(s.break_minutes),
    net_hours: num(s.net_hours),
    tasks: {
      completed: count(data.tasks?.completed),
      pending: count(data.tasks?.pending),
      ongoing: count(data.tasks?.ongoing),
      upcoming: count(data.tasks?.upcoming),
    },
  };
}

/**
 * Loads every data source for the monthly employee report in parallel.
 *
 * Why allSettled: the report is assembled from four independent endpoints; one
 * failing (e.g. leave module disabled) must not block printing the others. The
 * failed sections are reported so the slip never shows guessed zeros as facts.
 */
export async function fetchUserReportData(userId: string, month: string): Promise<UserReportData> {
  const { start, end } = monthRange(month);
  const inMonth = (date?: string | null) => !!date && date.slice(0, 7) === month;

  const [pay, work, attendance, balances, requests] = await Promise.allSettled([
    fetchPayVerifyUserMonth(userId, month),
    userService.getPeriodDetails(userId, start, end),
    listAttendanceExceptions(userId),
    getLeaveTypes(month, userId),
    listLeaveRequests({ user_id: userId, month }),
  ]);

  const failed: UserReportFailure[] = [];
  const payData = pay.status === "fulfilled" ? pay.value : null;
  if (!payData) failed.push("pay");

  const workData = work.status === "fulfilled" ? toWorkSummary(work.value) : null;
  if (!workData) failed.push("work");

  let attendanceData: UserReportAttendance | null = null;
  if (attendance.status === "fulfilled") {
    const a = attendance.value;
    const days = (a.attendance_days ?? []).filter((d) => inMonth(d.date));
    const weeks = payData?.weeks ?? [];
    attendanceData = {
      officeDays: weeks.length
        ? weeks.reduce((sum, w) => sum + num(w.office_days), 0)
        : days.filter((d) => d.work_mode === "office").length,
      wfhDays: weeks.length
        ? weeks.reduce((sum, w) => sum + num(w.wfh_days), 0)
        : days.filter((d) => d.work_mode === "wfh").length,
      lateDays: (a.late_days ?? [])
        .filter((d) => inMonth(d.submission_date))
        .sort((x, y) => x.submission_date.localeCompare(y.submission_date)),
      exceptions: (a.exceptions ?? [])
        .filter((e) => inMonth(e.exception_date))
        .sort((x, y) => x.exception_date.localeCompare(y.exception_date)),
    };
  } else {
    failed.push("attendance");
  }

  let leaveData: UserReportLeave | null = null;
  if (balances.status === "fulfilled" || requests.status === "fulfilled") {
    leaveData = {
      balances: balances.status === "fulfilled" ? balances.value.types ?? [] : [],
      requests:
        requests.status === "fulfilled"
          ? [...requests.value].sort((x, y) => x.start_date.localeCompare(y.start_date))
          : [],
    };
  } else {
    failed.push("leave");
  }

  return {
    month,
    periodStart: start,
    periodEnd: end,
    pay: payData,
    work: workData,
    attendance: attendanceData,
    leave: leaveData,
    failed,
  };
}
