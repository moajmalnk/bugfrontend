import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_PANEL } from "@/components/dashboard/DashboardPageShell";
import {
  formatProjectDate,
  getProjectStatusLabel,
  type Project,
  type ProjectStatus,
} from "@/lib/utils/projectUtils";
import { cn } from "@/lib/utils";
import type { Bug } from "@/types";
import { CalendarClock } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type DeadlineBucket = "overdue" | "today" | "week" | "later" | "none";

export type ProjectHealthRow = {
  project: Project;
  openBugs: number;
  fixedBugs: number;
  totalBugs: number;
  deadline: Date | null;
  bucket: DeadlineBucket;
  daysUntil: number | null;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000
  );
}

export function classifyDeadline(
  deadline: Date | null,
  today: Date
): { bucket: DeadlineBucket; daysUntil: number | null } {
  if (!deadline) return { bucket: "none", daysUntil: null };
  const days = daysBetween(today, deadline);
  if (days < 0) return { bucket: "overdue", daysUntil: days };
  if (days === 0) return { bucket: "today", daysUntil: 0 };
  if (days <= 7) return { bucket: "week", daysUntil: days };
  return { bucket: "later", daysUntil: days };
}

function deadlineLabel(bucket: DeadlineBucket, daysUntil: number | null): string {
  if (bucket === "none" || daysUntil === null) return "No deadline";
  if (bucket === "overdue") return `${Math.abs(daysUntil)}d overdue`;
  if (bucket === "today") return "Due today";
  if (daysUntil === 1) return "1 day left";
  return `${daysUntil} days left`;
}

function deadlineTone(bucket: DeadlineBucket): string {
  if (bucket === "overdue") return "text-red-600 dark:text-red-400";
  if (bucket === "today") return "text-orange-600 dark:text-orange-400";
  if (bucket === "week") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function statusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "release_ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
    case "archived":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    default:
      return "";
  }
}

/**
 * Why: Dev/tester getAll returns every project for browse; dashboards must show
 * only projects where the user is an explicit member.
 */
export function filterAssignedProjects(
  projects: Project[],
  userId: string | number | undefined | null
): Project[] {
  const uid = String(userId ?? "").trim();
  if (!uid) return [];
  return projects.filter((project) => {
    if ((project.members || []).some((memberId) => String(memberId) === uid)) {
      return true;
    }
    return (project.members_detail || []).some(
      (m) => String(m.user_id) === uid
    );
  });
}

export function buildProjectHealth(projects: Project[]): {
  rows: ProjectHealthRow[];
  overdue: ProjectHealthRow[];
  upcoming: ProjectHealthRow[];
  trackableCount: number;
} {
  const today = startOfDay(new Date());
  const trackable = projects.filter(
    (p) => p.status === "active" || p.status === "release_ready"
  );
  const rows: ProjectHealthRow[] = trackable.map((project) => {
    const stats = project.bug_stats;
    const deadline = parseDateOnly(project.deadline_date);
    const { bucket, daysUntil } = classifyDeadline(deadline, today);
    return {
      project,
      openBugs: stats?.open ?? 0,
      fixedBugs: stats?.fixed ?? 0,
      totalBugs: stats?.total ?? 0,
      deadline,
      bucket,
      daysUntil,
    };
  });

  const bucketRank = { overdue: 0, today: 1, week: 2, later: 3, none: 4 } as const;
  const sorted = [...rows].sort((a, b) => {
    if (bucketRank[a.bucket] !== bucketRank[b.bucket]) {
      return bucketRank[a.bucket] - bucketRank[b.bucket];
    }
    return b.openBugs - a.openBugs;
  });

  return {
    rows: sorted,
    overdue: rows
      .filter((h) => h.bucket === "overdue")
      .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0)),
    upcoming: rows
      .filter((h) => h.bucket === "today" || h.bucket === "week")
      .sort((a, b) => (a.daysUntil ?? 99) - (b.daysUntil ?? 99)),
    trackableCount: trackable.length,
  };
}

export function sortBugsByPriority(bugs: Bug[]): Bug[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...bugs].sort((a, b) => {
    const pr = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
    if (pr !== 0) return pr;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function priorityBadgeClass(priority: Bug["priority"]): string {
  if (priority === "high") return "bg-red-600 text-white dark:bg-red-600 dark:text-white";
  if (priority === "medium")
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
}

type PipelineCounts = {
  pending: number;
  in_progress: number;
  fixed: number;
  declined: number;
  rejected: number;
  total: number;
};

const PIPELINE_ROWS: {
  key: keyof Omit<PipelineCounts, "total">;
  label: string;
  bar: string;
}[] = [
  { key: "pending", label: "Pending", bar: "bg-orange-500" },
  { key: "in_progress", label: "In progress", bar: "bg-blue-500" },
  { key: "fixed", label: "Fixed", bar: "bg-emerald-500" },
  { key: "declined", label: "Declined", bar: "bg-pink-500" },
  { key: "rejected", label: "Rejected", bar: "bg-red-500" },
];

export function BugPipelineCard({
  title,
  description,
  counts,
  action,
}: {
  title: string;
  description: string;
  counts: PipelineCounts;
  action?: ReactNode;
}) {
  const total = counts.total || 1;
  return (
    <div className={cn(DASHBOARD_PANEL, "p-5 sm:p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4">
        {PIPELINE_ROWS.map((row) => {
          const value = counts[row.key];
          const pct = Math.round((value / total) * 100);
          return (
            <div key={row.key} className="min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-medium">{row.label}</span>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {value.toLocaleString()} ({pct}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", row.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectHealthTable({
  rows,
  role,
  emptyLabel,
}: {
  rows: ProjectHealthRow[];
  role: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={cn(DASHBOARD_PANEL, "border-dashed px-4 py-14 text-center")}>
        <CalendarClock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_PANEL, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {rows.map((row) => (
          <Link
            key={row.project.id}
            to={`/${role}/projects/${row.project.id}`}
            className="block min-w-0 rounded-xl border border-border/60 bg-background/70 p-4 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {row.project.name}
                </p>
                {row.project.client_name ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.project.client_name}
                  </p>
                ) : null}
              </div>
              <Badge className={cn("shrink-0 rounded-xl border-0", statusBadgeClass(row.project.status))}>
                {getProjectStatusLabel(row.project.status)}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-12 gap-3">
              <div className="col-span-7 min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Deadline
                </p>
                <p className={cn("mt-0.5 text-sm font-medium", deadlineTone(row.bucket))}>
                  {formatProjectDate(row.project.deadline_date)}
                </p>
                <p className={cn("text-xs", deadlineTone(row.bucket))}>
                  {deadlineLabel(row.bucket, row.daysUntil)}
                </p>
              </div>
              <div className="col-span-5 min-w-0 text-right">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Open bugs
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-sm tabular-nums font-semibold",
                    row.openBugs > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  )}
                >
                  {row.openBugs}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
              <TableHead className="font-semibold">Project</TableHead>
              <TableHead className="font-semibold">Deadline</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="text-right font-semibold">Open bugs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.project.id}>
                <TableCell>
                  <Link
                    to={`/${role}/projects/${row.project.id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {row.project.name}
                  </Link>
                  {row.project.client_name ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.project.client_name}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className={cn("font-medium", deadlineTone(row.bucket))}>
                    {formatProjectDate(row.project.deadline_date)}
                  </div>
                  <div className={cn("text-xs", deadlineTone(row.bucket))}>
                    {deadlineLabel(row.bucket, row.daysUntil)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-0", statusBadgeClass(row.project.status))}>
                    {getProjectStatusLabel(row.project.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <span
                    className={
                      row.openBugs > 0
                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                        : ""
                    }
                  >
                    {row.openBugs}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function BugListTable({
  bugs,
  role,
  emptyLabel,
}: {
  bugs: Bug[];
  role: string;
  emptyLabel: string;
}) {
  if (bugs.length === 0) {
    return (
      <div className={cn(DASHBOARD_PANEL, "border-dashed px-4 py-14 text-center")}>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_PANEL, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-3 md:hidden">
        {bugs.map((bug) => (
          <Link
            key={bug.id}
            to={`/${role}/bugs/${bug.id}`}
            className="block min-w-0 rounded-xl border border-border/60 bg-background/70 p-4 hover:bg-muted/40"
          >
            <p className="font-semibold leading-snug text-foreground break-words">
              {bug.title}
            </p>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              <Badge className={cn("rounded-xl border-0 capitalize", priorityBadgeClass(bug.priority))}>
                {bug.priority}
              </Badge>
              <span className="text-sm capitalize text-muted-foreground">
                {String(bug.status).replace(/_/g, " ")}
              </span>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {bug.project_name || "—"}
            </p>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 dark:bg-gray-800/50">
              <TableHead className="font-semibold">Bug</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Project</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => (
              <TableRow key={bug.id}>
                <TableCell>
                  <Link
                    to={`/${role}/bugs/${bug.id}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                  >
                    {bug.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-0 capitalize", priorityBadgeClass(bug.priority))}>
                    {bug.priority}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize text-sm">
                  {String(bug.status).replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-[10rem]">
                  {bug.project_name || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
