import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { toLocalCalendarDateString } from "@/lib/dateUtils";
import { cn, getEffectiveRole } from "@/lib/utils";
import {
  formatProjectDate,
  getProjectStatusLabel,
  Project,
  ProjectStatus,
} from "@/lib/utils/projectUtils";
import {
  formatCalendarMonthRange,
  formatCalendarMonthTitle,
  getCalendarMonthPeriod,
  getCalendarMonthStart,
} from "@/lib/workPeriodUtils";
import { bugService } from "@/services/bugService";
import { projectService } from "@/services/projectService";
import { updateService } from "@/services/updateService";
import { userService } from "@/services/userService";
import { Bug, User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug as BugIcon,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FolderKanban,
  Hourglass,
  LayoutDashboard,
  Lock,
  RefreshCw,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

type DeadlineBucket = "overdue" | "today" | "week" | "later" | "none";

type DashboardTab = "overview" | "analytics" | "bugs-fixes" | "team" | "work";

const DASHBOARD_TABS: DashboardTab[] = [
  "overview",
  "analytics",
  "bugs-fixes",
  "team",
  "work",
];

const DASHBOARD_TAB_ITEMS: {
  value: DashboardTab;
  label: string;
  icon: LucideIcon;
  /** Tailwind col-span on the 12-col desktop grid */
  colSpan: string;
}[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard, colSpan: "col-span-2" },
  { value: "analytics", label: "Analytics", icon: BarChart3, colSpan: "col-span-2" },
  { value: "bugs-fixes", label: "Bugs & Fixes", icon: BugIcon, colSpan: "col-span-3" },
  { value: "team", label: "Team", icon: Users, colSpan: "col-span-2" },
  { value: "work", label: "Work retention", icon: Hourglass, colSpan: "col-span-3" },
];

function parseDashboardTab(value: string | null): DashboardTab {
  if (value && DASHBOARD_TABS.includes(value as DashboardTab)) {
    return value as DashboardTab;
  }
  return "overview";
}

type ProjectHealth = {
  project: Project;
  openBugs: number;
  highBugs: number;
  fixedBugs: number;
  updatesCount: number;
  totalBugs: number;
  deadline: Date | null;
  bucket: DeadlineBucket;
  daysUntil: number | null;
};

type BugStatusCounts = {
  pending: number;
  in_progress: number;
  fixed: number;
  declined: number;
  rejected: number;
  total: number;
  open: number;
};

type PriorityCounts = { high: number; medium: number; low: number };

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const raw = value.slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function classifyDeadline(
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

function priorityBadgeClass(priority: Bug["priority"]): string {
  if (priority === "high") return "bg-red-600 text-white dark:bg-red-600 dark:text-white";
  if (priority === "medium") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200";
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  const workers = new Array(Math.min(concurrency, items.length)).fill(null).map(async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await mapper(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type BugStatusKey = "pending" | "in_progress" | "fixed" | "declined" | "rejected";

function sortByPriorityThenDate(bugs: Bug[]): Bug[] {
  const priorityRank = { high: 0, medium: 1, low: 2 };
  return bugs.slice().sort((a, b) => {
    if (priorityRank[a.priority] !== priorityRank[b.priority]) {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

async function loadDashboardData() {
  const today = startOfDay(new Date());

  const [
    projects,
    users,
    pendingResult,
    progressResult,
    fixedResult,
    declinedResult,
    rejectedResult,
    allUpdates,
  ] = await Promise.all([
    projectService.getProjects(),
    userService.getUsers(),
    bugService.getBugs({ page: 1, limit: 500, status: "pending" }),
    bugService.getBugs({ page: 1, limit: 500, status: "in_progress" }),
    bugService.getBugs({ page: 1, limit: 500, status: "fixed" }),
    bugService.getBugs({ page: 1, limit: 300, status: "declined" }),
    bugService.getBugs({ page: 1, limit: 300, status: "rejected" }),
    updateService.getUpdates().catch(() => [] as Awaited<ReturnType<typeof updateService.getUpdates>>),
  ]);

  const updatesByProject = new Map<string, number>();
  allUpdates.forEach((u) => {
    const pid = String(u.project_id || "");
    if (!pid) return;
    updatesByProject.set(pid, (updatesByProject.get(pid) || 0) + 1);
  });

  const bugCounts: BugStatusCounts = {
    pending: pendingResult.pagination?.totalBugs ?? pendingResult.bugs.length,
    in_progress: progressResult.pagination?.totalBugs ?? progressResult.bugs.length,
    fixed: fixedResult.pagination?.totalBugs ?? fixedResult.bugs.length,
    declined: declinedResult.pagination?.totalBugs ?? declinedResult.bugs.length,
    rejected: rejectedResult.pagination?.totalBugs ?? rejectedResult.bugs.length,
    total: 0,
    open: 0,
  };
  bugCounts.open = bugCounts.pending + bugCounts.in_progress;
  bugCounts.total =
    bugCounts.pending +
    bugCounts.in_progress +
    bugCounts.fixed +
    bugCounts.declined +
    bugCounts.rejected;

  const bugsByStatus: Record<BugStatusKey, Bug[]> = {
    pending: sortByPriorityThenDate(pendingResult.bugs || []),
    in_progress: sortByPriorityThenDate(progressResult.bugs || []),
    fixed: (fixedResult.bugs || [])
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    declined: sortByPriorityThenDate(declinedResult.bugs || []),
    rejected: sortByPriorityThenDate(rejectedResult.bugs || []),
  };

  const openBugs = sortByPriorityThenDate([
    ...bugsByStatus.pending,
    ...bugsByStatus.in_progress,
  ]);

  const openPriority: PriorityCounts = { high: 0, medium: 0, low: 0 };
  openBugs.forEach((b) => {
    openPriority[b.priority] = (openPriority[b.priority] || 0) + 1;
  });

  const sampleOpen = openBugs.length || 1;
  const scaledPriority: PriorityCounts = {
    high: Math.round((openPriority.high / sampleOpen) * bugCounts.open),
    medium: Math.round((openPriority.medium / sampleOpen) * bugCounts.open),
    low: Math.round((openPriority.low / sampleOpen) * bugCounts.open),
  };

  const trackableProjects = projects.filter(
    (p) => p.status === "active" || p.status === "release_ready"
  );

  const perProject = await mapWithConcurrency(trackableProjects, 4, async (project) => {
    try {
      const { bugs: projectBugs } = await bugService.getBugs({
        projectId: project.id,
        page: 1,
        limit: 1000,
      });
      const openBugs = projectBugs.filter(
        (b) => b.status === "pending" || b.status === "in_progress"
      );
      const highBugs = openBugs.filter((b) => b.priority === "high").length;
      const fixedBugs = projectBugs.filter((b) => b.status === "fixed").length;
      const updatesCount = updatesByProject.get(String(project.id)) || 0;
      const deadline = parseDateOnly(project.deadline_date);
      const { bucket, daysUntil } = classifyDeadline(deadline, today);
      return {
        project,
        openBugs: openBugs.length,
        highBugs,
        fixedBugs,
        updatesCount,
        totalBugs: projectBugs.length,
        deadline,
        bucket,
        daysUntil,
      } satisfies ProjectHealth;
    } catch {
      const deadline = parseDateOnly(project.deadline_date);
      const { bucket, daysUntil } = classifyDeadline(deadline, today);
      return {
        project,
        openBugs: 0,
        highBugs: 0,
        fixedBugs: 0,
        updatesCount: updatesByProject.get(String(project.id)) || 0,
        totalBugs: 0,
        deadline,
        bucket,
        daysUntil,
      } satisfies ProjectHealth;
    }
  });

  const overdue = perProject
    .filter((h) => h.bucket === "overdue")
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));

  const upcoming = perProject
    .filter((h) => h.bucket === "today" || h.bucket === "week")
    .sort((a, b) => (a.daysUntil ?? 99) - (b.daysUntil ?? 99));

  const projectHealthRows = perProject.slice().sort((a, b) => {
    const bucketRank = { overdue: 0, today: 1, week: 2, later: 3, none: 4 };
    if (bucketRank[a.bucket] !== bucketRank[b.bucket]) {
      return bucketRank[a.bucket] - bucketRank[b.bucket];
    }
    return b.openBugs - a.openBugs;
  });

  const highOpenFromProjects = perProject.reduce((sum, row) => sum + row.highBugs, 0);

  const deadlineBuckets = {
    overdue: perProject.filter((h) => h.bucket === "overdue").length,
    today: perProject.filter((h) => h.bucket === "today").length,
    week: perProject.filter((h) => h.bucket === "week").length,
    later: perProject.filter((h) => h.bucket === "later").length,
    none: perProject.filter((h) => h.bucket === "none").length,
  };

  const projectStatusCounts = {
    active: projects.filter((p) => p.status === "active").length,
    release_ready: projects.filter((p) => p.status === "release_ready").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  const activeUsers = users.filter((u) => u.account_active !== 0);
  const trackableUsers = activeUsers.filter(
    (u) => u.role === "developer" || u.role === "tester"
  );
  const checkedIn = activeUsers.filter((u) => u.checked_in_today);
  const onlineNow = activeUsers.filter((u) => u.status === "active" || u.status === "idle");
  const notCheckedIn = trackableUsers.filter((u) => !u.checked_in_today);

  return {
    projects,
    overdue,
    upcoming,
    projectHealthRows,
    bugCounts,
    bugsByStatus,
    openBugs,
    scaledPriority,
    highOpenFromProjects,
    deadlineBuckets,
    projectStatusCounts,
    trackableUsers,
    checkedIn,
    onlineNow,
    notCheckedIn,
    trackableCount: trackableProjects.length,
  };
}

const statusChartConfig = {
  pending: { label: "Pending", color: "#f59e0b" },
  in_progress: { label: "In progress", color: "#3b82f6" },
  fixed: { label: "Fixed", color: "#10b981" },
  declined: { label: "Declined", color: "#94a3b8" },
  rejected: { label: "Rejected", color: "#f43f5e" },
} satisfies ChartConfig;

const priorityChartConfig = {
  high: { label: "High", color: "#ef4444" },
  medium: { label: "Medium", color: "#f59e0b" },
  low: { label: "Low", color: "#64748b" },
} satisfies ChartConfig;

const deadlineChartConfig = {
  overdue: { label: "Overdue", color: "#ef4444" },
  today: { label: "Due today", color: "#f97316" },
  week: { label: "This week", color: "#eab308" },
  later: { label: "Later", color: "#3b82f6" },
  none: { label: "No deadline", color: "#94a3b8" },
} satisfies ChartConfig;

const projectStatusChartConfig = {
  active: { label: "Ongoing", color: "#3b82f6" },
  release_ready: { label: "Release ready", color: "#10b981" },
  completed: { label: "Completed", color: "#64748b" },
  archived: { label: "Archived", color: "#a855f7" },
} satisfies ChartConfig;

const attendanceChartConfig = {
  checkedIn: { label: "Checked in", color: "#10b981" },
  notCheckedIn: { label: "Not checked in", color: "#f59e0b" },
} satisfies ChartConfig;

const topProjectsChartConfig = {
  open: { label: "Open bugs", color: "#f59e0b" },
  fixed: { label: "Fixed", color: "#10b981" },
} satisfies ChartConfig;

const PANEL =
  "relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg";

function SectionTitle({
  icon: Icon,
  title,
  description,
  gradient = "from-blue-500 to-indigo-600",
  action,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  description?: string;
  gradient?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn("p-2.5 rounded-xl shadow-lg text-white shrink-0 bg-gradient-to-br", gradient)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
  className,
  icon: Icon = BarChart3,
  gradient = "from-blue-500 to-indigo-600",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  icon?: typeof BarChart3;
  gradient?: string;
}) {
  return (
    <div className={cn(PANEL, "group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/25 via-transparent to-emerald-50/15 dark:from-blue-950/10 dark:via-transparent dark:to-emerald-950/10 pointer-events-none" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className={cn("p-2 rounded-xl shadow text-white shrink-0 bg-gradient-to-br", gradient)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function DeadlineTable({
  rows,
  role,
  emptyLabel,
}: {
  rows: ProjectHealth[];
  role: string;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className={cn(PANEL, "border-dashed px-4 py-14 text-center")}>
        <CalendarClock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={cn(PANEL, "overflow-hidden")}>
      <div className="overflow-x-auto">
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
                  <p className="text-xs text-muted-foreground mt-0.5">{row.project.client_name}</p>
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
                    row.openBugs > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""
                  }
                >
                  {row.openBugs}
                </span>
                {row.highBugs > 0 ? (
                  <span className="ml-2 text-xs text-red-600 dark:text-red-400">
                    {row.highBugs} high
                  </span>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

function BugPipelineCard({
  bugCounts,
  role,
}: {
  bugCounts: BugStatusCounts;
  role: string;
}) {
  const rows = [
    {
      label: "Pending",
      value: bugCounts.pending,
      className: "bg-amber-500",
      // 12-grid: 3+2+3+2+2 = 12 on lg; md 4+4+4 / 6+6
      span: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3",
    },
    {
      label: "In progress",
      value: bugCounts.in_progress,
      className: "bg-blue-500",
      span: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
    },
    {
      label: "Fixed",
      value: bugCounts.fixed,
      className: "bg-emerald-500",
      span: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3",
    },
    {
      label: "Declined",
      value: bugCounts.declined,
      className: "bg-slate-400",
      span: "col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-2",
    },
    {
      label: "Rejected",
      value: bugCounts.rejected,
      className: "bg-rose-400",
      span: "col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-2",
    },
  ];

  return (
    <div className={cn(PANEL, "transition-all duration-300 hover:shadow-xl")}>
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/25 via-transparent to-blue-50/15 dark:from-orange-950/10 dark:via-transparent dark:to-blue-950/10 pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 via-blue-500 to-emerald-500" />
      <div className="relative p-5 sm:p-6 pl-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shrink-0">
              <BugIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Bug pipeline
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Organization-wide status breakdown
                {bugCounts.total > 0 ? (
                  <span className="text-gray-400 dark:text-gray-500">
                    {" "}
                    · {bugCounts.total.toLocaleString()} total
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-10 shrink-0 font-semibold border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-300"
          >
            <Link to={`/${role}/bugs`}>
              Open bugs list
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {rows.map((item) => {
            const pct =
              bugCounts.total > 0 ? Math.round((item.value / bugCounts.total) * 100) : 0;
            return (
              <div
                key={item.label}
                className={cn(
                  "space-y-1.5 rounded-xl border border-gray-100/80 dark:border-gray-800/80 bg-white/50 dark:bg-gray-900/30 p-3 sm:p-3.5",
                  item.span
                )}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{item.label}</span>
                  <span className="tabular-nums font-semibold text-gray-900 dark:text-white shrink-0">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", item.className)}
                    style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusBugsTable({
  bugs,
  role,
  mode,
  emptyLabel,
  pageSize = 12,
}: {
  bugs: Bug[];
  role: string;
  mode: "open" | "fixed";
  emptyLabel: string;
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(bugs.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageBugs = bugs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (bugs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-12 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  const bugHref = (bug: Bug) =>
    `/${role}/bugs/${bug.id}${mode === "fixed" ? "?from=fixes" : ""}`;

  const metaLabel = (bug: Bug) =>
    mode === "fixed"
      ? bug.fixed_by_name || bug.updated_by_name || "—"
      : bug.status.replace("_", " ");

  const pagination = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-muted-foreground">
      <span className="font-medium">
        Showing {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, bugs.length)} of {bugs.length.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </Button>
        <span className="tabular-nums px-1">
          {currentPage}/{totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mobile / tablet: card grid */}
      <div className="grid grid-cols-12 gap-3 lg:hidden">
        {pageBugs.map((bug) => (
          <Link
            key={bug.id}
            to={bugHref(bug)}
            className={cn(
              PANEL,
              "col-span-12 sm:col-span-6 p-4 space-y-3 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-red-50/20 dark:from-orange-950/10 dark:via-transparent dark:to-red-950/10 pointer-events-none" />
            <div className="relative space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white line-clamp-3 text-[15px] leading-snug">
                {bug.title}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn("border-0 capitalize", priorityBadgeClass(bug.priority))}>
                  {bug.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className="capitalize font-semibold border-gray-200 dark:border-gray-700"
                >
                  {metaLabel(bug)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate min-w-0">
                  {bug.project_name || "No project"}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
                  View
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className={cn(PANEL, "overflow-hidden hidden lg:block")}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                <TableHead className="font-semibold">Bug</TableHead>
                <TableHead className="font-semibold">Project</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">
                  {mode === "fixed" ? "Fixed by" : "Status"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageBugs.map((bug) => (
                <TableRow key={bug.id}>
                  <TableCell className="max-w-[280px]">
                    <Link
                      to={bugHref(bug)}
                      className="font-semibold hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                    >
                      {bug.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">
                    {bug.project_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border-0 capitalize", priorityBadgeClass(bug.priority))}>
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {metaLabel(bug)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination}
    </div>
  );
}

function BugsFixesStatusPanel({
  data,
  role,
  defaultStatus = "pending",
}: {
  data: NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>;
  role: string;
  defaultStatus?: BugStatusKey | "open";
}) {
  const [statusFilter, setStatusFilter] = useState<BugStatusKey | "open">(defaultStatus);
  const [tabSheetOpen, setTabSheetOpen] = useState(false);

  const statusTabs: { key: BugStatusKey | "open"; label: string; count: number }[] = [
    { key: "open", label: "Open", count: data.bugCounts.open },
    { key: "pending", label: "Pending", count: data.bugCounts.pending },
    { key: "in_progress", label: "In progress", count: data.bugCounts.in_progress },
    { key: "fixed", label: "Fixed", count: data.bugCounts.fixed },
    { key: "declined", label: "Declined", count: data.bugCounts.declined },
    { key: "rejected", label: "Rejected", count: data.bugCounts.rejected },
  ];

  const activeTab = statusTabs.find((t) => t.key === statusFilter) ?? statusTabs[0];

  const listBugs =
    statusFilter === "open" ? data.openBugs : data.bugsByStatus[statusFilter];

  const isFixed = statusFilter === "fixed";
  const shownCount = listBugs.length;
  const totalForFilter =
    statusFilter === "open" ? data.bugCounts.open : data.bugCounts[statusFilter];

  const selectStatus = (key: BugStatusKey | "open") => {
    setStatusFilter(key);
    setTabSheetOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-50/40 via-transparent to-red-50/30 dark:from-orange-950/15 dark:via-transparent dark:to-red-950/10 pointer-events-none" />
        <div className="relative rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-2">
          {/* Mobile / tablet: bottom sheet trigger */}
          <div className="p-1 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
              onClick={() => setTabSheetOpen(true)}
            >
              <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                <BugIcon className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                <span className="truncate">{activeTab.label}</span>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold tabular-nums text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  {activeTab.count.toLocaleString()}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </Button>
          </div>

          {/* Desktop: 12-col grid (6 tabs × 2 cols) */}
          <div className="hidden lg:grid grid-cols-12 gap-1.5 p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => selectStatus(tab.key)}
                className={cn(
                  "col-span-2 flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold transition-all duration-200",
                  statusFilter === tab.key
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-gray-800/60"
                )}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    statusFilter === tab.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  )}
                >
                  {tab.count.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Drawer open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
        <DrawerContent className="rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95 lg:hidden">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Bug status
            </DrawerTitle>
            <DrawerDescription>
              Filter by open, pending, in progress, fixed, declined, or rejected
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto hide-scrollbar px-4 pb-6">
            {statusTabs.map((tab) => {
              const isActive = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectStatus(tab.key)}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between rounded-3xl px-4 py-4 transition-colors",
                    isActive
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100/80 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100"
                  )}
                >
                  <span className="text-lg font-semibold">{tab.label}</span>
                  <span
                    className={cn(
                      "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2",
                      isActive ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    {isActive ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold tabular-nums">
                        {tab.count.toLocaleString()}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      {shownCount < totalForFilter ? (
        <p className="text-xs text-muted-foreground">
          Showing {shownCount.toLocaleString()} of {totalForFilter.toLocaleString()}{" "}
          {statusFilter === "open" ? "open bugs" : statusFilter.replace("_", " ")} — open the
          full Bugs/Fixes pages for the complete archive.
        </p>
      ) : null}

      <StatusBugsTable
        key={statusFilter}
        bugs={listBugs}
        role={role}
        mode={isFixed ? "fixed" : "open"}
        emptyLabel={`No ${statusFilter === "open" ? "open" : statusFilter.replace("_", " ")} bugs.`}
        pageSize={15}
      />
    </div>
  );
}

const workStatusChartConfig = {
  checkedIn: { label: "Checked in", color: "#10b981" },
  notCheckedIn: { label: "Not checked in", color: "#f59e0b" },
  noHours: { label: "No hours yet", color: "#94a3b8" },
} satisfies ChartConfig;

const monthlyHoursChartConfig = {
  hours: { label: "Monthly hours", color: "#6366f1" },
} satisfies ChartConfig;

type WorkRetentionRow = {
  user: User;
  days: number;
  hours: number;
  overtime: number;
  leaveDays: number;
  status: "checked_in" | "not_checked_in" | "no_hours";
  statusLabel: string;
};

function buildWorkRetentionRows(
  trackableUsers: User[],
  submissions: Array<Record<string, unknown>> | undefined
): WorkRetentionRow[] {
  const byUser = new Map<
    string,
    { days: Set<string>; hours: number; overtime: number; leaveDays: number }
  >();

  for (const sub of submissions || []) {
    const uid = String(sub.user_id ?? "");
    if (!uid) continue;
    const date = String(sub.date ?? sub.submission_date ?? "").slice(0, 10);
    const hours = Number(sub.hours ?? sub.hours_today ?? 0) || 0;
    const overtime = Number(sub.overtime_hours ?? 0) || 0;
    const dayStatus = String(sub.day_status ?? "worked").toLowerCase();
    const entry = byUser.get(uid) || {
      days: new Set<string>(),
      hours: 0,
      overtime: 0,
      leaveDays: 0,
    };
    if (date) entry.days.add(date);
    entry.hours += hours;
    entry.overtime += overtime;
    if (dayStatus.includes("leave") || dayStatus === "half_day") {
      entry.leaveDays += 1;
    }
    byUser.set(uid, entry);
  }

  return trackableUsers
    .map((user) => {
      const stats = byUser.get(String(user.id));
      const hours = stats?.hours ?? 0;
      const days = stats?.days.size ?? 0;
      const overtime = stats?.overtime ?? 0;
      const leaveDays = stats?.leaveDays ?? 0;
      let status: WorkRetentionRow["status"] = "no_hours";
      let statusLabel = "No hours yet";
      if (user.checked_in_today) {
        status = "checked_in";
        statusLabel = "Checked in";
      } else if (hours > 0 || days > 0) {
        status = "not_checked_in";
        statusLabel = "Not checked in";
      }
      return {
        user,
        days,
        hours,
        overtime,
        leaveDays,
        status,
        statusLabel,
      };
    })
    .sort((a, b) => b.hours - a.hours || a.user.username.localeCompare(b.user.username));
}

function workStatusBadgeClass(status: WorkRetentionRow["status"]): string {
  if (status === "checked_in") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (status === "not_checked_in") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300";
}

type WorkPeriodPreset = "today" | "yesterday" | "week" | "month" | "year" | "custom";

const WORK_PERIOD_PRESETS: {
  value: WorkPeriodPreset;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "today", label: "Today", icon: Clock },
  { value: "yesterday", label: "Yesterday", icon: CalendarDays },
  { value: "week", label: "This week", icon: CalendarDays },
  { value: "month", label: "This month", icon: Calendar },
  { value: "year", label: "This year", icon: BarChart3 },
  { value: "custom", label: "Custom", icon: CalendarClock },
];

function shiftCalendarDate(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalCalendarDateString(d);
}

function getWeekPeriod(todayYmd: string): { from: string; to: string } {
  const d = new Date(`${todayYmd}T00:00:00`);
  const day = d.getDay(); // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const from = shiftCalendarDate(todayYmd, mondayOffset);
  return { from, to: todayYmd };
}

function getYearPeriod(todayYmd: string): { from: string; to: string } {
  const year = todayYmd.slice(0, 4);
  return { from: `${year}-01-01`, to: todayYmd };
}

function formatShortYmd(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function resolveWorkPeriod(
  preset: WorkPeriodPreset,
  customFrom: string,
  customTo: string
): { from: string; to: string; title: string; rangeLabel: string; hoursLabel: string } {
  const today = toLocalCalendarDateString(new Date());
  const yesterday = shiftCalendarDate(today, -1);

  if (preset === "today") {
    return {
      from: today,
      to: today,
      title: "Today",
      rangeLabel: formatShortYmd(today),
      hoursLabel: "Hours today",
    };
  }
  if (preset === "yesterday") {
    return {
      from: yesterday,
      to: yesterday,
      title: "Yesterday",
      rangeLabel: formatShortYmd(yesterday),
      hoursLabel: "Hours yesterday",
    };
  }
  if (preset === "week") {
    const { from, to } = getWeekPeriod(today);
    return {
      from,
      to,
      title: "This week",
      rangeLabel: `${formatShortYmd(from)} – ${formatShortYmd(to)}`,
      hoursLabel: "Weekly hours",
    };
  }
  if (preset === "year") {
    const { from, to } = getYearPeriod(today);
    return {
      from,
      to,
      title: "This year",
      rangeLabel: `${from.slice(0, 4)} · YTD`,
      hoursLabel: "Yearly hours",
    };
  }
  if (preset === "custom") {
    const from = customFrom || today;
    const to = customTo || customFrom || today;
    const [a, b] = from <= to ? [from, to] : [to, from];
    return {
      from: a,
      to: b,
      title: "Custom range",
      rangeLabel: `${formatShortYmd(a)} – ${formatShortYmd(b)}`,
      hoursLabel: "Period hours",
    };
  }

  // month (default)
  const monthKey = today.slice(0, 7);
  const { from, to } = getCalendarMonthPeriod(monthKey);
  return {
    from,
    to,
    title: formatCalendarMonthTitle(monthKey),
    rangeLabel: formatCalendarMonthRange(monthKey),
    hoursLabel: "Monthly hours",
  };
}

function WorkRetentionTab({
  trackableUsers,
  role,
  enabled,
}: {
  trackableUsers: User[];
  role: string;
  enabled: boolean;
}) {
  const [preset, setPreset] = useState<WorkPeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const period = useMemo(
    () => resolveWorkPeriod(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const activePreset =
    WORK_PERIOD_PRESETS.find((p) => p.value === preset) ?? WORK_PERIOD_PRESETS[3];
  const ActivePresetIcon = activePreset.icon;

  const {
    data: teamStats,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-ops-work-retention", period.from, period.to],
    queryFn: () => userService.getTeamPeriodDetails(period.from, period.to),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(
    () => buildWorkRetentionRows(trackableUsers, teamStats?.submissions),
    [trackableUsers, teamStats]
  );

  const totals = useMemo(() => {
    const hours = rows.reduce((sum, r) => sum + r.hours, 0);
    const overtime = rows.reduce((sum, r) => sum + r.overtime, 0);
    const withHours = rows.filter((r) => r.hours > 0 || r.days > 0).length;
    const checkedIn = rows.filter((r) => r.status === "checked_in").length;
    const notCheckedIn = rows.filter((r) => r.status === "not_checked_in").length;
    const noHours = rows.filter((r) => r.status === "no_hours").length;
    return { hours, overtime, withHours, checkedIn, notCheckedIn, noHours };
  }, [rows]);

  const statusPieData = useMemo(
    () =>
      [
        {
          key: "checkedIn",
          name: "Checked in",
          value: totals.checkedIn,
          fill: "var(--color-checkedIn)",
        },
        {
          key: "notCheckedIn",
          name: "Not checked in",
          value: totals.notCheckedIn,
          fill: "var(--color-notCheckedIn)",
        },
        {
          key: "noHours",
          name: "No hours yet",
          value: totals.noHours,
          fill: "var(--color-noHours)",
        },
      ].filter((d) => d.value > 0),
    [totals]
  );

  const topHoursBarData = useMemo(
    () =>
      rows
        .filter((r) => r.hours > 0)
        .slice(0, 10)
        .map((r) => ({
          name:
            (r.user.username || r.user.name || "User").length > 12
              ? `${(r.user.username || r.user.name || "User").slice(0, 12)}…`
              : r.user.username || r.user.name || "User",
          hours: Math.round(r.hours * 10) / 10,
        })),
    [rows]
  );

  const selectPreset = (value: WorkPeriodPreset) => {
    setPreset(value);
    setFilterSheetOpen(false);
    if (value === "custom" && !customFrom) {
      const today = toLocalCalendarDateString(new Date());
      setCustomFrom(shiftCalendarDate(today, -6));
      setCustomTo(today);
    }
  };

  const periodStartForLink = getCalendarMonthStart(period.from);

  const filterBar = (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-50/40 via-transparent to-violet-50/30 dark:from-indigo-950/15 dark:via-transparent dark:to-violet-950/10 pointer-events-none" />
      <div className="relative rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/60 backdrop-blur-sm p-2 space-y-2">
        {/* Mobile / tablet */}
        <div className="p-1 lg:hidden">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
            onClick={() => setFilterSheetOpen(true)}
          >
            <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
              <ActivePresetIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" />
              <span className="truncate">{activePreset.label}</span>
              <span className="truncate text-xs font-medium text-muted-foreground">
                · {period.rangeLabel}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </div>

        {/* Desktop: 12-col presets */}
        <div className="hidden lg:grid grid-cols-12 gap-1.5 p-1">
          {WORK_PERIOD_PRESETS.map((item) => {
            const Icon = item.icon;
            const isActive = preset === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => selectPreset(item.value)}
                className={cn(
                  "col-span-2 flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/70 dark:hover:bg-gray-800/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {preset === "custom" ? (
          <div className="grid grid-cols-12 gap-2 px-1 pb-1">
            <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                From
              </p>
              <DatePicker
                value={customFrom}
                onChange={setCustomFrom}
                placeholder="Start date"
                disableFuture
              />
            </div>
            <div className="col-span-12 sm:col-span-6 lg:col-span-3 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
                To
              </p>
              <DatePicker
                value={customTo}
                onChange={setCustomTo}
                placeholder="End date"
                disableFuture
              />
            </div>
            <div className="col-span-12 lg:col-span-6 flex items-end">
              <p className="text-sm text-muted-foreground pb-2">
                Showing <span className="font-semibold text-foreground">{period.rangeLabel}</span>
                {isFetching ? " · updating…" : null}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {filterBar}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {filterBar}
        <div className={cn(PANEL, "p-10 text-center space-y-3")}>
          <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
          <p className="font-semibold text-gray-900 dark:text-white">Couldn’t load work retention</p>
          <p className="text-sm text-muted-foreground">
            Team hours for this period could not be fetched.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {filterBar}

      <Drawer open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <DrawerContent className="rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95 lg:hidden">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Period filter
            </DrawerTitle>
            <DrawerDescription>
              Today, yesterday, week, month, year, or a custom range
            </DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[65vh] space-y-3 overflow-y-auto hide-scrollbar px-4 pb-6">
            {WORK_PERIOD_PRESETS.map((item) => {
              const isActive = preset === item.value;
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectPreset(item.value)}
                  className={cn(
                    "flex min-h-16 w-full items-center justify-between rounded-3xl px-4 py-4 transition-colors",
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100/80 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100"
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        isActive ? "bg-indigo-500/80" : "bg-gray-200 dark:bg-gray-700"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-semibold truncate">{item.label}</span>
                  </span>
                  {isActive ? <Check className="h-5 w-5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {[
          {
            title: period.hoursLabel,
            value: `${totals.hours.toFixed(1)}h`,
            hint: period.title,
            icon: Hourglass,
            gradient: "from-indigo-500 to-violet-600",
            chip: "from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border-indigo-200 dark:border-indigo-800",
            valueClass: "text-indigo-700 dark:text-indigo-300",
            span: "col-span-6 lg:col-span-3",
          },
          {
            title: "Overtime",
            value: `${totals.overtime.toFixed(1)}h`,
            hint: "Approved OT in period",
            icon: Timer,
            gradient: "from-rose-500 to-orange-600",
            chip: "from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 border-rose-200 dark:border-rose-800",
            valueClass: "text-rose-700 dark:text-rose-300",
            span: "col-span-6 lg:col-span-3",
          },
          {
            title: "Worked in period",
            value: totals.withHours,
            hint: `of ${trackableUsers.length} devs & testers`,
            icon: CheckCircle2,
            gradient: "from-emerald-500 to-teal-600",
            chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
            valueClass: "text-emerald-700 dark:text-emerald-300",
            span: "col-span-6 lg:col-span-3",
          },
          {
            title: "No hours yet",
            value: totals.noHours,
            hint: period.rangeLabel,
            icon: Clock,
            gradient: "from-slate-500 to-gray-600",
            chip: "from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/30 border-slate-200 dark:border-slate-700",
            valueClass: "text-slate-700 dark:text-slate-300",
            span: "col-span-6 lg:col-span-3",
          },
        ].map((card) => (
          <div
            key={card.title}
            className={cn(
              "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
              card.chip,
              card.span
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                {card.title}
              </span>
              <div
                className={cn(
                  "p-2 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0",
                  card.gradient
                )}
              >
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums tracking-tight", card.valueClass)}>
              {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5 truncate font-medium">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <ChartCard
          title="Work status"
          description="Entire team — check-in and period activity"
          icon={Users}
          gradient="from-cyan-500 to-blue-600"
        >
          <ChartContainer config={workStatusChartConfig} className="aspect-[4/3] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie
                data={statusPieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                strokeWidth={2}
              >
                {statusPieData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard
          title="Top hours"
          description={`${period.title} · highest logged hours`}
          icon={BarChart3}
          gradient="from-indigo-500 to-violet-600"
        >
          {topHoursBarData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">
              No hours logged in this period yet.
            </p>
          ) : (
            <ChartContainer config={monthlyHoursChartConfig} className="aspect-[4/3] w-full">
              <BarChart data={topHoursBarData} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={88}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="hours" fill="var(--color-hours)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </ChartCard>
      </div>

      <div className={cn(PANEL, "p-5 sm:p-6 space-y-5")}>
        <SectionTitle
          icon={Hourglass}
          title="Users work retention"
          description={`${period.hoursLabel} and work status · ${period.title} (${period.rangeLabel})`}
          gradient="from-indigo-500 to-violet-600"
          action={
            <Button asChild variant="outline" size="sm" className="font-semibold">
              <Link to={`/${role}/users`}>
                Users & work stats
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          }
        />

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No developers or testers to show.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="text-right font-semibold">Days</TableHead>
                  <TableHead className="text-right font-semibold">Period hours</TableHead>
                  <TableHead className="text-right font-semibold">OT</TableHead>
                  <TableHead className="text-right font-semibold">Today</TableHead>
                  <TableHead className="font-semibold">Work status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const name = row.user.username || row.user.name || "User";
                  const avatar =
                    row.user.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
                  const todayH =
                    typeof row.user.today_hours_worked === "number"
                      ? row.user.today_hours_worked
                      : null;
                  return (
                    <TableRow key={row.user.id}>
                      <TableCell>
                        <Link
                          to={`/${role}/users/${row.user.id}/work-stats/${encodeURIComponent(periodStartForLink)}`}
                          className="flex items-center gap-2.5 min-w-0 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <img src={avatar} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                          <span className="font-semibold truncate">{name}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{row.user.role}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{row.days}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {row.hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.overtime > 0 ? `${row.overtime.toFixed(1)}h` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {todayH != null ? `${todayH.toFixed(1)}h` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border-0 font-semibold", workStatusBadgeClass(row.status))}>
                          {row.statusLabel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackingUserRow({
  user,
  role,
  showHours,
  accent = "emerald",
}: {
  user: User;
  role: string;
  showHours?: boolean;
  accent?: "emerald" | "amber";
}) {
  const name = user.username || user.name || "User";
  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";
  const avatarBg = accent === "emerald" ? "10b981" : "f59e0b";
  const avatar =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${avatarBg}&color=fff&bold=true`;
  const hours =
    typeof user.today_hours_worked === "number" ? user.today_hours_worked.toFixed(1) : null;
  const presence =
    user.status === "active"
      ? { label: "Active", dot: "bg-emerald-500", ring: "ring-emerald-400/50" }
      : user.status === "idle"
        ? { label: "Idle", dot: "bg-amber-400", ring: "ring-amber-400/40" }
        : { label: "Offline", dot: "bg-slate-400", ring: "ring-slate-400/30" };

  return (
    <li>
      <Link
        to={`/${role}/users/${user.id}`}
        className="group flex items-center gap-3 rounded-2xl px-2.5 py-2.5 -mx-0.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-white/[0.04]"
      >
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt=""
            className={cn(
              "h-10 w-10 rounded-2xl object-cover ring-2 ring-offset-2 ring-offset-transparent dark:ring-offset-gray-900/80 shadow-sm",
              presence.ring
            )}
          />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900",
              presence.dot
            )}
            title={presence.label}
          />
          <span className="sr-only">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            {name}
          </p>
          <p className="text-[11px] text-muted-foreground capitalize truncate mt-0.5">
            <span className="font-medium">{user.role}</span>
            <span className="mx-1 opacity-40">·</span>
            <span>{presence.label}</span>
          </p>
        </div>
        {showHours ? (
          <span
            className={cn(
              "shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
              accent === "emerald"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
          >
            {hours ?? "0.0"}h
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function AttendancePeoplePanel({
  title,
  description,
  count,
  icon: Icon,
  gradient,
  accent,
  emptyLabel,
  children,
  footer,
}: {
  title: string;
  description: string;
  count: number;
  icon: LucideIcon;
  gradient: string;
  accent: "emerald" | "amber";
  emptyLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const accentBar =
    accent === "emerald"
      ? "from-emerald-500 via-teal-500 to-cyan-500"
      : "from-amber-500 via-orange-500 to-rose-400";
  const countTone =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-300"
      : "text-amber-600 dark:text-amber-300";
  const wash =
    accent === "emerald"
      ? "from-emerald-50/50 via-transparent to-teal-50/20 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/10"
      : "from-amber-50/50 via-transparent to-orange-50/20 dark:from-amber-950/20 dark:via-transparent dark:to-orange-950/10";

  return (
    <div className={cn(PANEL, "flex flex-col")}>
      <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none", wash)} />
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b", accentBar)} />
      <div className="relative flex flex-col flex-1 p-5 sm:p-6 pl-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "p-2.5 rounded-2xl shadow-lg text-white shrink-0 bg-gradient-to-br",
                gradient
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
          </div>
          <div className="shrink-0 text-right pt-0.5">
            <p className={cn("text-3xl sm:text-4xl font-bold tabular-nums tracking-tight leading-none", countTone)}>
              {count}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mt-1.5">
              {count === 1 ? "person" : "people"}
            </p>
          </div>
        </div>

        {count === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-gray-200/80 dark:border-gray-700/80 py-12 px-4">
            <p className="text-sm text-muted-foreground text-center">{emptyLabel}</p>
          </div>
        ) : (
          <ul className="flex-1 space-y-0.5 max-h-80 overflow-y-auto hide-scrollbar divide-y divide-gray-100/80 dark:divide-gray-800/60">
            {children}
          </ul>
        )}

        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseDashboardTab(searchParams.get("tab"));
  const [dashTabSheetOpen, setDashTabSheetOpen] = useState(false);
  const activeDashTabItem =
    DASHBOARD_TAB_ITEMS.find((t) => t.value === activeTab) ?? DASHBOARD_TAB_ITEMS[0];
  const ActiveDashTabIcon = activeDashTabItem.icon;

  const setActiveTab = (tab: string) => {
    const next = parseDashboardTab(tab);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "overview") {
          params.delete("tab");
        } else {
          params.set("tab", next);
        }
        return params;
      },
      { replace: true }
    );
    setDashTabSheetOpen(false);
  };

  const { data, isLoading, refetch, isError } = useQuery({
    queryKey: ["admin-ops-dashboard"],
    queryFn: loadDashboardData,
    enabled: isAdmin,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const statusPieData = useMemo(() => {
    if (!data) return [];
    return [
      { key: "pending", name: "Pending", value: data.bugCounts.pending, fill: "var(--color-pending)" },
      {
        key: "in_progress",
        name: "In progress",
        value: data.bugCounts.in_progress,
        fill: "var(--color-in_progress)",
      },
      { key: "fixed", name: "Fixed", value: data.bugCounts.fixed, fill: "var(--color-fixed)" },
      { key: "declined", name: "Declined", value: data.bugCounts.declined, fill: "var(--color-declined)" },
      { key: "rejected", name: "Rejected", value: data.bugCounts.rejected, fill: "var(--color-rejected)" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const priorityPieData = useMemo(() => {
    if (!data) return [];
    return [
      { key: "high", name: "High", value: data.scaledPriority.high, fill: "var(--color-high)" },
      { key: "medium", name: "Medium", value: data.scaledPriority.medium, fill: "var(--color-medium)" },
      { key: "low", name: "Low", value: data.scaledPriority.low, fill: "var(--color-low)" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const deadlinePieData = useMemo(() => {
    if (!data) return [];
    return [
      { key: "overdue", name: "Overdue", value: data.deadlineBuckets.overdue, fill: "var(--color-overdue)" },
      { key: "today", name: "Due today", value: data.deadlineBuckets.today, fill: "var(--color-today)" },
      { key: "week", name: "This week", value: data.deadlineBuckets.week, fill: "var(--color-week)" },
      { key: "later", name: "Later", value: data.deadlineBuckets.later, fill: "var(--color-later)" },
      { key: "none", name: "No deadline", value: data.deadlineBuckets.none, fill: "var(--color-none)" },
    ].filter((d) => d.value > 0);
  }, [data]);

  const projectStatusBarData = useMemo(() => {
    if (!data) return [];
    return [
      { key: "active", label: "Ongoing", value: data.projectStatusCounts.active },
      { key: "release_ready", label: "Release ready", value: data.projectStatusCounts.release_ready },
      { key: "completed", label: "Completed", value: data.projectStatusCounts.completed },
      { key: "archived", label: "Archived", value: data.projectStatusCounts.archived },
    ];
  }, [data]);

  const topProjectsBarData = useMemo(() => {
    if (!data) return [];
    return data.projectHealthRows
      .slice()
      .sort((a, b) => b.openBugs - a.openBugs)
      .slice(0, 8)
      .map((row) => ({
        name:
          row.project.name.length > 14
            ? `${row.project.name.slice(0, 14)}…`
            : row.project.name,
        open: row.openBugs,
        fixed: row.fixedBugs,
      }));
  }, [data]);

  const attendancePieData = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "checkedIn",
        name: "Checked in",
        value: data.checkedIn.length,
        fill: "var(--color-checkedIn)",
      },
      {
        key: "notCheckedIn",
        name: "Not checked in",
        value: data.notCheckedIn.length,
        fill: "var(--color-notCheckedIn)",
      },
    ].filter((d) => d.value > 0);
  }, [data]);

  const bugVsFixBarData = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Open", value: data.bugCounts.open, fill: "#f59e0b" },
      { label: "Fixed", value: data.bugCounts.fixed, fill: "#10b981" },
      { label: "Pending", value: data.bugCounts.pending, fill: "#fb923c" },
      { label: "In progress", value: data.bugCounts.in_progress, fill: "#3b82f6" },
    ];
  }, [data]);

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Access Denied</h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                This tracking dashboard is available to administrators only.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const kpiCards = data
    ? [
        {
          title: "Active projects",
          value: data.trackableCount,
          hint: `${data.projects.length} total`,
          icon: FolderKanban,
          gradient: "from-blue-500 to-indigo-600",
          chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
          valueClass: "text-blue-700 dark:text-blue-300",
        },
        {
          title: "Overdue",
          value: data.overdue.length,
          hint: "Past deadline",
          icon: AlertTriangle,
          gradient: "from-red-500 to-orange-600",
          chip: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800",
          valueClass: "text-red-700 dark:text-red-300",
        },
        {
          title: "Due in 7 days",
          value: data.upcoming.length,
          hint: "Upcoming",
          icon: CalendarClock,
          gradient: "from-amber-500 to-yellow-600",
          chip: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800",
          valueClass: "text-amber-700 dark:text-amber-300",
        },
        {
          title: "Open bugs",
          value: data.bugCounts.open,
          hint: `${data.highOpenFromProjects} high priority`,
          icon: BugIcon,
          gradient: "from-orange-500 to-red-600",
          chip: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800",
          valueClass: "text-orange-700 dark:text-orange-300",
        },
        {
          title: "Fixed",
          value: data.bugCounts.fixed,
          hint: "Resolved bugs",
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
          valueClass: "text-emerald-700 dark:text-emerald-300",
        },
        {
          title: "Checked in",
          value: data.checkedIn.length,
          hint: `${data.notCheckedIn.length} not in`,
          icon: Users,
          gradient: "from-cyan-500 to-blue-600",
          chip: "from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800",
          valueClass: "text-cyan-700 dark:text-cyan-300",
        },
      ]
    : [];

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0 w-full">
        {/* Professional Header — matches Bugs / Fixes */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                    <LayoutDashboard className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Ops Dashboard
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl break-words">
                  Deadlines, project health, bugs & fixes analytics
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Link to={`/${role}/projects`}>
                    <FolderKanban className="mr-2 h-5 w-5" />
                    Projects
                  </Link>
                </Button>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                      {data?.bugCounts.open ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-4 space-y-3"
                >
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-14" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        ) : isError || !data ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500" />
              <h3 className="text-xl font-bold">Could not load dashboard</h3>
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              {kpiCards.map((card) => (
                <div
                  key={card.title}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 sm:p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
                    card.chip
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
                      {card.title}
                    </span>
                    <div className={cn("p-2 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0", card.gradient)}>
                      <card.icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums tracking-tight", card.valueClass)}>
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5 truncate font-medium">{card.hint}</p>
                </div>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 sm:space-y-8">
              <div className={PANEL}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/40 via-transparent to-emerald-50/30 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/10 pointer-events-none" />
                <div className="relative p-2 sm:p-2.5">
                  {/* Mobile / tablet: bottom sheet trigger */}
                  <div className="p-1 lg:hidden">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-between rounded-2xl border-gray-200/70 bg-white/70 dark:border-gray-700/70 dark:bg-gray-800/70"
                      onClick={() => setDashTabSheetOpen(true)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold min-w-0">
                        <ActiveDashTabIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" />
                        <span className="truncate">{activeDashTabItem.label}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                    </Button>
                  </div>

                  {/* Desktop: 12-col grid (2+2+3+2+3) */}
                  <TabsList className="hidden lg:grid h-14 w-full grid-cols-12 gap-1.5 bg-transparent p-1">
                    {DASHBOARD_TAB_ITEMS.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={cn(
                            "flex h-full min-w-0 items-center justify-center gap-1.5 rounded-xl px-1 text-sm font-semibold transition-all duration-300 data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800",
                            tab.colSpan
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-80" />
                          <span className="truncate">{tab.label}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              <Drawer open={dashTabSheetOpen} onOpenChange={setDashTabSheetOpen}>
                <DrawerContent className="rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95 lg:hidden">
                  <DrawerHeader className="pb-2 text-left">
                    <DrawerTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                      Dashboard section
                    </DrawerTitle>
                    <DrawerDescription>
                      Jump to overview, analytics, bugs, team, or work retention
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="max-h-[65vh] space-y-3 overflow-y-auto hide-scrollbar px-4 pb-6">
                    {DASHBOARD_TAB_ITEMS.map((tab) => {
                      const isActive = activeTab === tab.value;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setActiveTab(tab.value)}
                          className={cn(
                            "flex min-h-16 w-full items-center justify-between rounded-3xl px-4 py-4 transition-colors",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100/80 text-gray-900 dark:bg-gray-800/80 dark:text-gray-100"
                          )}
                        >
                          <span className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                isActive ? "bg-blue-500/80" : "bg-gray-200 dark:bg-gray-700"
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="text-lg font-semibold truncate">{tab.label}</span>
                          </span>
                          {isActive ? <Check className="h-5 w-5 shrink-0" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </DrawerContent>
              </Drawer>

              <TabsContent value="overview" className="space-y-6 sm:space-y-8 mt-0">
                <BugPipelineCard bugCounts={data.bugCounts} role={role} />

                <div className={cn(PANEL, "p-5 sm:p-6 space-y-4")}>
                  <SectionTitle
                    icon={BugIcon}
                    title="Priority open bugs"
                    description="Highest-priority unresolved issues across projects"
                    gradient="from-orange-500 to-red-600"
                    action={
                      <Button asChild variant="ghost" size="sm" className="font-semibold">
                        <Link to={`/${role}/bugs`}>
                          All bugs
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    }
                  />
                  <StatusBugsTable
                    bugs={data.openBugs}
                    role={role}
                    mode="open"
                    emptyLabel="No open bugs right now."
                    pageSize={12}
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
                  <div className="space-y-4">
                    <SectionTitle
                      icon={AlertTriangle}
                      title="Overdue deadlines"
                      description="Active projects past their deadline"
                      gradient="from-red-500 to-orange-600"
                      action={
                        <Badge variant="outline" className="tabular-nums font-bold px-2.5 py-1">
                          {data.overdue.length}
                        </Badge>
                      }
                    />
                    <DeadlineTable
                      rows={data.overdue}
                      role={role}
                      emptyLabel="No overdue project deadlines."
                    />
                  </div>
                  <div className="space-y-4">
                    <SectionTitle
                      icon={CalendarClock}
                      title="Upcoming deadlines"
                      description="Due today or within 7 days"
                      gradient="from-amber-500 to-yellow-600"
                      action={
                        <Badge variant="outline" className="tabular-nums font-bold px-2.5 py-1">
                          {data.upcoming.length}
                        </Badge>
                      }
                    />
                    <DeadlineTable
                      rows={data.upcoming}
                      role={role}
                      emptyLabel="No deadlines in the next week."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ChartCard title="Bug status" description="Organization-wide pipeline" icon={BugIcon} gradient="from-orange-500 to-red-600">
                    <ChartContainer config={statusChartConfig} className="aspect-[4/3] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          strokeWidth={2}
                        >
                          {statusPieData.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Open vs fixed" description="Bugs and resolution volume" icon={CheckCircle2} gradient="from-emerald-500 to-teal-600">
                    <ChartContainer
                      config={{
                        value: { label: "Count", color: "#3b82f6" },
                      }}
                      className="aspect-[4/3] w-full"
                    >
                      <BarChart data={bugVsFixBarData} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {bugVsFixBarData.map((entry) => (
                            <Cell key={entry.label} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                </div>

              </TabsContent>

              <TabsContent value="analytics" className="space-y-6 sm:space-y-8 mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ChartCard
                    title="Open bug priority"
                    description="Estimated mix across open bugs"
                    icon={AlertTriangle}
                    gradient="from-red-500 to-orange-600"
                  >
                    <ChartContainer config={priorityChartConfig} className="aspect-[4/3] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie
                          data={priorityPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={88}
                          paddingAngle={2}
                          strokeWidth={2}
                        >
                          {priorityPieData.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Deadline pressure" description="Active project deadline buckets" icon={CalendarClock} gradient="from-amber-500 to-orange-600">
                    <ChartContainer config={deadlineChartConfig} className="aspect-[4/3] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie
                          data={deadlinePieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={88}
                          paddingAngle={2}
                          strokeWidth={2}
                        >
                          {deadlinePieData.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Project status" description="Portfolio by status" icon={FolderKanban} gradient="from-blue-500 to-indigo-600">
                    <ChartContainer config={projectStatusChartConfig} className="aspect-[4/3] w-full">
                      <BarChart data={projectStatusBarData} margin={{ left: 8, right: 8, top: 8 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} width={36} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {projectStatusBarData.map((entry) => (
                            <Cell
                              key={entry.key}
                              fill={`var(--color-${entry.key})`}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard
                    title="Top projects by open bugs"
                    description="Highest open-bug load (active)"
                    icon={FolderKanban}
                    gradient="from-orange-500 to-amber-600"
                  >
                    <ChartContainer config={topProjectsChartConfig} className="aspect-[4/3] w-full">
                      <BarChart
                        data={topProjectsBarData}
                        layout="vertical"
                        margin={{ left: 8, right: 12, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          width={90}
                          tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="open" fill="var(--color-open)" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="fixed" fill="var(--color-fixed)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Team attendance" description="Check-in status today" icon={Users} gradient="from-cyan-500 to-blue-600">
                    <ChartContainer config={attendanceChartConfig} className="aspect-[4/3] w-full">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                        <Pie
                          data={attendancePieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={90}
                          strokeWidth={2}
                        >
                          {attendancePieData.map((entry) => (
                            <Cell key={entry.key} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
                  </ChartCard>

                  <ChartCard title="Bug pipeline bars" description="Status volume comparison" icon={BarChart3} gradient="from-blue-500 to-indigo-600">
                    <ChartContainer config={statusChartConfig} className="aspect-[4/3] w-full">
                      <BarChart
                        data={[
                          { label: "Pending", value: data.bugCounts.pending, key: "pending" },
                          {
                            label: "In progress",
                            value: data.bugCounts.in_progress,
                            key: "in_progress",
                          },
                          { label: "Fixed", value: data.bugCounts.fixed, key: "fixed" },
                          { label: "Declined", value: data.bugCounts.declined, key: "declined" },
                          { label: "Rejected", value: data.bugCounts.rejected, key: "rejected" },
                        ]}
                        margin={{ left: 8, right: 8, top: 8 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {["pending", "in_progress", "fixed", "declined", "rejected"].map((key) => (
                            <Cell key={key} fill={`var(--color-${key})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </ChartCard>
                </div>
              </TabsContent>

              <TabsContent value="bugs-fixes" className="space-y-6 sm:space-y-8 mt-0">
                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="h-11 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg"
                  >
                    <Link to={`/${role}/bugs`}>
                      <BugIcon className="mr-2 h-4 w-4" />
                      Open Bugs page
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="h-11 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-semibold shadow-lg"
                  >
                    <Link to={`/${role}/fixes`}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Open Fixes page
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <BugPipelineCard bugCounts={data.bugCounts} role={role} />

                <div className={cn(PANEL, "p-5 sm:p-6 space-y-5")}>
                  <SectionTitle
                    icon={BugIcon}
                    title="Bugs & fixes by status"
                    description="Full lists — pending, in progress, fixed, declined, rejected"
                    gradient="from-orange-500 to-red-600"
                  />
                  <BugsFixesStatusPanel data={data} role={role} defaultStatus="open" />
                </div>

                <div className={cn(PANEL, "p-5 sm:p-6 space-y-5")}>
                  <SectionTitle
                    icon={CheckCircle2}
                    title="Fixes"
                    description={`Resolved bugs (${data.bugCounts.fixed.toLocaleString()} total)`}
                    gradient="from-emerald-500 to-teal-600"
                    action={
                      <Button asChild variant="ghost" size="sm" className="font-semibold">
                        <Link to={`/${role}/fixes`}>
                          All fixes
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    }
                  />
                  <StatusBugsTable
                    bugs={data.bugsByStatus.fixed}
                    role={role}
                    mode="fixed"
                    emptyLabel="No fixed bugs yet."
                    pageSize={15}
                  />
                </div>

                <div className="space-y-4">
                  <SectionTitle
                    icon={FolderKanban}
                    title="Project health"
                    description="Active projects sorted by deadline pressure, bugs, and updates"
                    gradient="from-blue-500 to-indigo-600"
                  />
                  <div className={cn(PANEL, "overflow-hidden")}>
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                          <TableHead className="font-semibold">Project</TableHead>
                          <TableHead className="font-semibold">Deadline</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="text-right font-semibold">Open</TableHead>
                          <TableHead className="text-right font-semibold">High</TableHead>
                          <TableHead className="text-right font-semibold">Fixed</TableHead>
                          <TableHead className="text-right font-semibold">Updates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.projectHealthRows.slice(0, 15).map((row) => (
                          <TableRow key={row.project.id}>
                            <TableCell>
                              <Link
                                to={`/${role}/projects/${row.project.id}`}
                                className="font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {row.project.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div className={cn("text-sm", deadlineTone(row.bucket))}>
                                {row.deadline
                                  ? formatProjectDate(row.project.deadline_date)
                                  : "—"}
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
                            <TableCell className="text-right tabular-nums font-semibold">
                              {row.openBugs}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                              {row.highBugs}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                              {row.fixedBugs}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sky-600 dark:text-sky-400">
                              {row.updatesCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="team" className="space-y-6 mt-0">
                <div className="grid grid-cols-12 gap-4 sm:gap-5">
                  <div className="col-span-12 lg:col-span-5">
                    <ChartCard title="Attendance today" description="Checked in vs still out" icon={Users} gradient="from-cyan-500 to-blue-600">
                      <ChartContainer config={attendanceChartConfig} className="aspect-[4/3] w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                          <Pie
                            data={attendancePieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={55}
                            outerRadius={90}
                            strokeWidth={2}
                          >
                            {attendancePieData.map((entry) => (
                              <Cell key={entry.key} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                      </ChartContainer>
                    </ChartCard>
                  </div>

                  <div className="col-span-12 lg:col-span-7 grid grid-cols-12 gap-3 sm:gap-4">
                    <div className="col-span-12 sm:col-span-6 relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 dark:from-emerald-950/40 dark:via-gray-900/80 dark:to-teal-950/20 p-5 sm:p-6 flex flex-col justify-center shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-300/80">
                          Checked in
                        </span>
                        <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-emerald-700 dark:text-emerald-300">
                        {data.checkedIn.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {data.onlineNow.length} online or idle right now
                      </p>
                    </div>
                    <div className="col-span-12 sm:col-span-6 relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 dark:from-amber-950/40 dark:via-gray-900/80 dark:to-orange-950/20 p-5 sm:p-6 flex flex-col justify-center shadow-sm">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700/80 dark:text-amber-300/80">
                          Not checked in
                        </span>
                        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
                          <Timer className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight text-amber-700 dark:text-amber-300">
                        {data.notCheckedIn.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        Devs & testers still out
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-5 sm:gap-6">
                  <div className="col-span-12 lg:col-span-6">
                    <AttendancePeoplePanel
                      title="Checked in today"
                      description="Team members who started work"
                      count={data.checkedIn.length}
                      icon={CheckCircle2}
                      gradient="from-emerald-500 to-teal-600"
                      accent="emerald"
                      emptyLabel="Nobody checked in yet."
                    >
                      {data.checkedIn
                        .slice()
                        .sort((a, b) => (b.today_hours_worked || 0) - (a.today_hours_worked || 0))
                        .map((user) => (
                          <TrackingUserRow
                            key={user.id}
                            user={user}
                            role={role}
                            showHours
                            accent="emerald"
                          />
                        ))}
                    </AttendancePeoplePanel>
                  </div>

                  <div className="col-span-12 lg:col-span-6">
                    <AttendancePeoplePanel
                      title="Not checked in"
                      description="Developers and testers still offline"
                      count={data.notCheckedIn.length}
                      icon={Clock}
                      gradient="from-amber-500 to-orange-600"
                      accent="amber"
                      emptyLabel="Everyone who should be in is checked in."
                      footer={
                        <div className="grid grid-cols-12 gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="col-span-12 sm:col-span-4 h-10 rounded-xl font-semibold"
                          >
                            <Link to={`/${role}/users`}>Users & work stats</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="col-span-12 sm:col-span-4 h-10 rounded-xl font-semibold"
                          >
                            <Link to={`/${role}/activity`}>Activity feed</Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="col-span-12 sm:col-span-4 h-10 rounded-xl font-semibold"
                          >
                            <Link to={`/${role}/leave-requests`}>Leave requests</Link>
                          </Button>
                        </div>
                      }
                    >
                      {data.notCheckedIn.map((user) => (
                        <TrackingUserRow
                          key={user.id}
                          user={user}
                          role={role}
                          accent="amber"
                        />
                      ))}
                    </AttendancePeoplePanel>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="work" className="space-y-6 sm:space-y-8 mt-0">
                <WorkRetentionTab
                  trackableUsers={data.trackableUsers}
                  role={role}
                  enabled={isAdmin && activeTab === "work"}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </section>
    </main>
  );
}
