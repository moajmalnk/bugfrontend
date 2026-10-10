import {
  DEFAULT_RECEIPT_STYLE,
  ReceiptWriter,
  formatPrintedAt,
  receiptReference,
  referenceBarcode,
  type ReceiptCopy,
  type ReceiptResult,
  type ReceiptStyle,
} from "@/lib/escposReceipt";
import {
  adjustmentTypeLabel,
  adminMonthVerifyLabel,
  employeeMonthVerifyLabel,
  formatHours,
  formatInr,
  monthStatusLabel,
  weekStatusLabel,
} from "@/services/payVerifyService";
import type { UserReportData } from "@/services/userReportService";

export const USER_REPORT_SECTIONS = [
  { id: "profile", label: "Profile", hint: "Employee ID, title, department" },
  { id: "pay", label: "Salary & pay", hint: "Rate, gross, adjustments, net" },
  { id: "weekly", label: "Weekly hours", hint: "Work, leave and OT per week" },
  { id: "attendance", label: "Attendance", hint: "Office, WFH, late days" },
  { id: "work", label: "Work summary", hint: "Credited hours, OT, tasks" },
  { id: "leave", label: "Leave", hint: "Balances and requests" },
  { id: "bank", label: "Bank details", hint: "Account number is masked" },
  { id: "signatures", label: "Sign-off lines", hint: "Employee and admin signature" },
] as const;

export type UserReportSectionId = (typeof USER_REPORT_SECTIONS)[number]["id"];

/** Bank details are opt-in so a forgotten slip on a desk never exposes them by default. */
export const DEFAULT_USER_REPORT_SECTIONS: UserReportSectionId[] = USER_REPORT_SECTIONS.map(
  (s) => s.id
).filter((id) => id !== "bank");

export type UserReportProfile = {
  id: string;
  name?: string | null;
  username: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  employee_code?: string | null;
  job_title?: string | null;
  job_level?: string | null;
  department?: string | null;
  reports_to_username?: string | null;
  contract_type?: string | null;
  joining_date?: string | null;
  probation_end_date?: string | null;
  employment_status?: string | null;
};

export type UserReportBank = {
  account_holder_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  account_type?: string | null;
  upi_id?: string | null;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(date?: string | null): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function fmtDate(date?: string | null): string | null {
  const p = parts(date);
  return p ? `${pad2(p[2])} ${MONTHS[p[1] - 1]} ${p[0]}` : null;
}

function fmtShort(date?: string | null): string {
  const p = parts(date);
  return p ? `${pad2(p[2])} ${MONTHS[p[1] - 1]}` : "";
}

function fmtClock(value?: string | null): string {
  const m = /(\d{1,2}):(\d{2})/.exec(value ?? "");
  return m ? `${pad2(Number(m[1]))}:${m[2]}` : "";
}

const titleCase = (value?: string | null) =>
  value
    ? value
        .replace(/[_-]+/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

const days = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)} ${n === 1 ? "day" : "days"}`;

function fmtMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** Keeps only the last 4 digits so the slip can confirm the account without exposing it. */
export function maskAccountNumber(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\s/g, "");
  if (!digits) return null;
  if (digits.length <= 4) return digits;
  return `${"X".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}

function maskUpi(value?: string | null): string | null {
  const [handle, bank] = (value ?? "").trim().split("@");
  if (!handle || !bank) return null;
  return `${handle.slice(0, 2)}***@${bank}`;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Builds the monthly employee report (profile, pay, weekly hours, attendance,
 * work, leave) as ESC/POS bytes for a 58mm printer plus a text preview.
 *
 * Why sections can say "Not available": data comes from independent endpoints;
 * a failed source is called out on paper instead of printing misleading zeros.
 */
export function buildUserReportReceipt(
  data: UserReportData,
  options: {
    profile: UserReportProfile;
    bank?: UserReportBank | null;
    sections: UserReportSectionId[];
    printedBy?: string | null;
    printedAt?: Date;
    copy?: ReceiptCopy;
    reportUrl?: string;
    style?: ReceiptStyle;
  }
): ReceiptResult {
  const { profile, bank } = options;
  const printedAt = options.printedAt ?? new Date();
  const show = (id: UserReportSectionId) => options.sections.includes(id);
  const pay = data.pay;
  const month = pay?.month_verification;
  const reference = receiptReference("USR", profile.id, printedAt);
  const w = new ReceiptWriter(options.style ?? DEFAULT_RECEIPT_STYLE);

  const unavailable = () => w.line("Not available - could not load.");

  w.header("BugRicer");
  w.centered("Employee Monthly Report", { bold: true });
  w.rule();
  w.title(profile.name?.trim() || profile.username);
  const subtitle = [titleCase(profile.role), profile.employee_code].filter(Boolean).join(" | ");
  if (subtitle) w.centered(subtitle);
  w.rule();
  w.kv("Ref", reference);
  const [year, monthNo] = data.month.split("-").map(Number);
  w.kv("Period", `${MONTHS[monthNo - 1] ?? ""} ${year}`);
  w.kv("Range", `${fmtShort(data.periodStart)} - ${fmtDate(data.periodEnd)}`);
  if (month) w.kv("Pay status", monthStatusLabel(month));

  if (show("profile")) {
    w.section("Profile");
    w.kv("Name", profile.name);
    w.kv("Username", `@${profile.username}`);
    w.kv("Role", titleCase(profile.role));
    w.kv("Emp ID", profile.employee_code);
    w.kv("Title", profile.job_title);
    w.kv("Level", profile.job_level);
    w.kv("Department", profile.department);
    w.kv("Reports to", profile.reports_to_username ? `@${profile.reports_to_username}` : null);
    w.kv("Contract", titleCase(profile.contract_type));
    w.kv("Joined", fmtDate(profile.joining_date));
    w.kv("Probation", fmtDate(profile.probation_end_date) ? `Until ${fmtDate(profile.probation_end_date)}` : null);
    w.kv("Status", titleCase(profile.employment_status));
    w.kv("Phone", profile.phone);
    w.kv("Email", profile.email);
  }

  if (show("pay")) {
    w.section("Salary & pay");
    if (!pay || !month) unavailable();
    else {
      const rate = num(month.hourly_rate_used ?? pay.rate_info?.current_rate);
      w.kv("Rate", rate > 0 ? `${formatInr(rate)}/hr` : "Not set");
      w.kv("Rate from", fmtDate(pay.rate_info?.effective_from));
      w.kv("Days", month.worked_days != null ? days(num(month.worked_days)) : null);
      w.kv(
        "Pay hours",
        `${formatHours(month.total_hours)} (OT ${month.include_ot ? "included" : "excluded"})`
      );
      if (num(month.ot_hours) > 0) w.kv("OT hours", formatHours(month.ot_hours));
      w.kv("Gross", formatInr(month.gross_estimate), { boldValue: true });
      const adjustments = month.adjustments ?? [];
      if (adjustments.length) {
        w.line("Adjustments:");
        adjustments.forEach((adj) => {
          const title =
            adj.type === "project_incentive"
              ? `Incentive${adj.project_name ? ` (${adj.project_name})` : ""}`
              : adjustmentTypeLabel(adj.type);
          const reason = adj.type === "project_incentive" ? "" : adj.reason?.trim();
          w.kv(` ${title}`.slice(0, 10), `${formatInr(adj.amount)}${reason ? ` - ${reason}` : ""}`);
        });
        w.kv("Adj. total", formatInr(month.adjustments_total));
      }
      w.rule();
      w.kv("NET PAY", formatInr(month.net_estimate), { boldValue: true });
      w.rule();
      w.kv("Employee", employeeMonthVerifyLabel(month));
      w.kv(
        "Admin",
        `${adminMonthVerifyLabel(month)}${
          month.admin_verified_at ? ` (${fmtDate(month.admin_verified_at)})` : ""
        }`
      );
      if (month.admin_note?.trim()) w.kv("Admin note", month.admin_note);
    }
  }

  if (show("weekly")) {
    w.section("Weekly hours");
    const weeks = pay?.weeks ?? [];
    if (!pay) unavailable();
    else if (!weeks.length) w.line("No weeks in this period.");
    else {
      const totals = weeks.reduce(
        (t, wk) => ({
          work: t.work + num(wk.worked_hours),
          leave: t.leave + num(wk.leave_hours),
          ot: t.ot + num(wk.ot_hours),
        }),
        { work: 0, leave: 0, ot: 0 }
      );
      const statusCode: Record<string, string> = {
        Done: "Done",
        Correction: "Fix",
        Reviewed: "Rvwd",
        Pending: "Pend",
      };
      w.grid(
        [5, 6, 6, 5, 4],
        [
          ["Week", "Work", "Leave", "OT", "St"],
          ...weeks.map((wk) => {
            const from = parts(wk.clip_start ?? wk.week_start);
            const to = parts(wk.clip_end ?? wk.week_end);
            return [
              from && to ? `${pad2(from[2])}-${pad2(to[2])}` : "-",
              formatHours(wk.worked_hours),
              formatHours(wk.leave_hours),
              formatHours(wk.ot_hours),
              statusCode[weekStatusLabel(wk)] ?? "-",
            ];
          }),
          ["Total", formatHours(totals.work), formatHours(totals.leave), formatHours(totals.ot), ""],
        ],
        { boldRows: [weeks.length + 1], footer: true }
      );
      const empVerified = weeks.filter((wk) => wk.employee_status === "verified").length;
      const adminApproved = weeks.filter((wk) => wk.admin_status === "approved").length;
      w.kv("Emp. check", `${empVerified}/${weeks.length} weeks verified`);
      w.kv("Admin", `${adminApproved}/${weeks.length} weeks approved`);
      w.paragraph("St: Done=admin approved, Rvwd=employee verified, Fix=correction, Pend=open");
    }
  }

  if (show("attendance")) {
    w.section("Attendance");
    const a = data.attendance;
    if (!a) unavailable();
    else {
      const leaveDays = num(month?.leave_days ?? data.work?.leave_days);
      w.grid(
        [7, 7, 7, 6],
        [
          ["Office", "WFH", "Late", "Leave"],
          [String(a.officeDays), String(a.wfhDays), String(a.lateDays.length), String(leaveDays)],
        ],
        { boldRows: [1], centered: true }
      );
      const checkIns = month?.check_in_days ?? (pay?.weeks ?? []).reduce((s, wk) => s + num(wk.check_in_days), 0);
      if (checkIns) w.kv("Check-ins", days(num(checkIns)));
      if (a.lateDays.length) {
        w.kv(
          "Late on",
          a.lateDays
            .map((d) => [fmtShort(d.submission_date), fmtClock(d.check_in_time)].filter(Boolean).join(" "))
            .join(", ")
        );
      } else {
        w.kv("Late on", "None - on time all month");
      }
      if (a.exceptions.length) {
        w.line("Admin exceptions:");
        a.exceptions.forEach((e) => {
          const what = [e.allow_wfh ? "WFH allowed" : "", e.forgive_late ? "late forgiven" : ""]
            .filter(Boolean)
            .join(", ");
          w.kv(` ${fmtShort(e.exception_date)}`, `${what || "Exception"}${e.admin_note ? ` - ${e.admin_note}` : ""}`);
        });
      }
    }
  }

  if (show("work")) {
    w.section("Work summary");
    const s = data.work;
    if (!s) unavailable();
    else {
      w.kv("Credited", `${formatHours(s.hours)} (${days(s.days)})`);
      w.kv("Work", `${formatHours(s.work_hours)} (${days(s.work_days)})`);
      if (s.work_days > 0) w.kv("Avg / day", formatHours(Math.round((s.work_hours / s.work_days) * 10) / 10));
      if (s.official_leave_days > 0)
        w.kv("Official", `${formatHours(s.official_leave_hours)} (${days(s.official_leave_days)})`);
      if (s.other_leave_days > 0)
        w.kv("Leave", `${formatHours(s.other_leave_hours)} (${days(s.other_leave_days)})`);
      w.kv("Appr. OT", formatHours(s.overtime_hours));
      if (s.requested_extra_hours > 0)
        w.kv("OT asked", `${formatHours(s.requested_extra_hours)} (${s.approval_requests} req.)`);
      if (s.break_minutes > 0) w.kv("Breaks", fmtMinutes(s.break_minutes));
      w.kv("Net hours", formatHours(s.net_hours), { boldValue: true });
      w.line("Tasks:");
      w.grid(
        [7, 7, 7, 6],
        [
          ["Done", "Pend", "Ongo", "Next"],
          [
            String(s.tasks.completed),
            String(s.tasks.pending),
            String(s.tasks.ongoing),
            String(s.tasks.upcoming),
          ],
        ],
        { boldRows: [1], centered: true }
      );
    }
  }

  if (show("leave")) {
    w.section("Leave");
    const l = data.leave;
    if (!l) unavailable();
    else {
      if (l.balances.length) {
        w.grid(
          [12, 5, 5, 5],
          [
            ["Type", "Used", "Quota", "Left"],
            ...l.balances.map((b) => [
              b.name || b.code,
              String(num(b.used)),
              String(num(b.monthly_quota)),
              String(num(b.remaining)),
            ]),
          ]
        );
      }
      if (l.requests.length) {
        w.line("Requests:");
        l.requests.forEach((r) => {
          const range = r.end_date && r.end_date !== r.start_date ? ` to ${fmtShort(r.end_date)}` : "";
          w.kv(
            ` ${fmtShort(r.start_date)}`,
            `${r.leave_type_name || r.leave_type_code || "Leave"} ${num(r.days_count)}d${
              r.is_half_day ? " (half)" : ""
            }${range} - ${titleCase(r.status)}`
          );
        });
      } else {
        w.line("No leave requests this month.");
      }
    }
  }

  if (show("bank")) {
    w.section("Bank details");
    const account = maskAccountNumber(bank?.account_number);
    if (!bank || (!account && !bank.bank_name)) w.line("No bank details on file.");
    else {
      w.kv("Holder", bank.account_holder_name);
      w.kv("Bank", bank.bank_name);
      w.kv("A/c no.", account);
      w.kv("IFSC", bank.ifsc_code);
      w.kv("Branch", bank.branch_name);
      w.kv("Type", titleCase(bank.account_type));
      w.kv("UPI", maskUpi(bank.upi_id));
    }
  }

  w.section("Tracking");
  w.kv("Printed by", options.printedBy?.trim() || "Admin");
  w.kv("Printed at", formatPrintedAt(printedAt));
  if (options.copy) w.kv("Copy", `${options.copy.index} of ${options.copy.total}`);
  if (data.failed.length) w.kv("Missing", data.failed.join(", "));
  w.line();
  w.barcode(referenceBarcode(reference));
  if (options.reportUrl) {
    w.line();
    w.qr(options.reportUrl, "Scan to open employee record");
  }

  if (show("signatures")) {
    w.rule();
    w.signature("Employee signature:");
    w.signature("Admin signature:");
  }

  w.rule();
  w.centered("CONFIDENTIAL", { bold: true });
  w.centered("For HR / admin use only");
  w.cut();

  return w.result();
}
