import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import { PendingsTab } from "@/components/dashboard/PendingsTab";
import type { ProjectHealth } from "@/components/dashboard/DeadlineTable";
import {
  DashboardPageShell,
  DASHBOARD_PANEL,
  type DashboardTabItem,
} from "@/components/dashboard/DashboardPageShell";
import {
  BugListTable,
  BugPipelineCard,
  buildProjectHealth,
  filterAssignedProjects,
  ProjectHealthTable,
  sortBugsByPriority,
} from "@/components/dashboard/roleDashboardShared";
import { useAuth } from "@/context/AuthContext";
import {
  dateInPeriod,
  resolveWorkPeriod,
  type WorkPeriodPreset,
} from "@/lib/dashboardPeriod";
import { cn, getEffectiveRole } from "@/lib/utils";
import { bugService } from "@/services/bugService";
import { projectService } from "@/services/projectService";
import { sharedTaskService } from "@/services/sharedTaskService";
import { updateService } from "@/services/updateService";
import type { Bug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bug as BugIcon,
  CalendarClock,
  CheckCircle2,
  Code2,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  ListTodo,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type DevTab = "overview" | "pendings" | "projects" | "fixes" | "tasks";

const TABS: DashboardTabItem[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "pendings", label: "Pendings", icon: ListChecks },
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "fixes", label: "My fixes", icon: CheckCircle2 },
  { value: "tasks", label: "Tasks", icon: ListTodo },
];

function parseTab(value: string | null): DevTab {
  if (value === "pendings" || value === "projects" || value === "fixes" || value === "tasks") return value;
  return "overview";
}

/** Why: PendingsTab DeadlineTable expects highBugs/updatesCount; role health rows omit them. */
function toDeadlineHealth(
  rows: {
    project: ProjectHealth["project"];
    openBugs: number;
    fixedBugs: number;
    totalBugs: number;
    deadline: Date | null;
    bucket: ProjectHealth["bucket"];
    daysUntil: number | null;
  }[]
): ProjectHealth[] {
  return rows.map((row) => ({
    ...row,
    highBugs: 0,
    updatesCount: 0,
  }));
}


async function loadDeveloperDashboard(userId: string) {
  const [allProjects, lifetimeStats, openBugsResult, myFixesResult, tasks, updates] =
    await Promise.all([
      projectService.getProjects(),
      bugService.getDashboardStats(),
      bugService.getBugs({ page: 1, limit: 40, status: "pending,in_progress" }),
      bugService.getBugs({
        page: 1,
        limit: 40,
        status: "fixed,rejected",
        fixedBy: userId,
      }),
      sharedTaskService.getSharedTasks().catch(() => []),
      updateService.getUpdates().catch(() => []),
    ]);

  const projects = filterAssignedProjects(allProjects, userId);
  const health = buildProjectHealth(projects);
  const projectIds = new Set(projects.map((p) => String(p.id)));
  const pendingBugs = sortBugsByPriority(
    (openBugsResult.bugs || []).filter((b) => b.status === "pending")
  );
  const pendingUpdates = (updates || []).filter(
    (u) =>
      String(u.status || "").toLowerCase() === "pending" &&
      projectIds.has(String(u.project_id))
  );
  const myOpenTasks = tasks.filter(
    (t) =>
      (t.status === "pending" || t.status === "in_progress") &&
      (String(t.assigned_to) === String(userId) ||
        (t.assigned_to_ids || []).map(String).includes(String(userId)))
  );

  return {
    projects,
    health,
    lifetimeStats,
    openBugs: sortBugsByPriority(openBugsResult.bugs || []),
    pendingBugs,
    pendingUpdates,
    myFixes: myFixesResult.bugs || [],
    myOpenTasks,
    myFixesTotal:
      myFixesResult.pagination?.counts?.myResolved ??
      myFixesResult.pagination?.totalBugs ??
      (myFixesResult.bugs || []).length,
  };
}

export default function DeveloperDashboard() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {}) || "developer";
  const userId = String(currentUser?.id || "");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const [periodPreset, setPeriodPreset] = useState<WorkPeriodPreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const period = useMemo(
    () => resolveWorkPeriod(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo]
  );

  const setActiveTab = (tab: string) => {
    const next = parseTab(tab);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "overview") params.delete("tab");
        else params.set("tab", next);
        return params;
      },
      { replace: true }
    );
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["developer-dashboard", userId],
    queryFn: () => loadDeveloperDashboard(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const {
    data: periodStats,
    isFetching: periodFetching,
  } = useQuery({
    queryKey: ["developer-dashboard-stats", period.from, period.to],
    queryFn: () => bugService.getDashboardStats({ from: period.from, to: period.to }),
    enabled: Boolean(userId && period.from && period.to),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const {
    data: periodFixes,
    isFetching: periodFixesFetching,
  } = useQuery({
    queryKey: ["developer-dashboard-my-fixes", userId, period.from, period.to],
    queryFn: async () => {
      const result = await bugService.getBugs({
        page: 1,
        limit: 50,
        status: "fixed,rejected",
        fixedBy: userId,
      });
      const filtered = (result.bugs || []).filter(
        (b: Bug) =>
          dateInPeriod(b.updated_at, period.from, period.to) ||
          dateInPeriod(b.created_at, period.from, period.to)
      );
      return filtered;
    },
    enabled: Boolean(userId && period.from && period.to),
    staleTime: 30_000,
  });

  const view = useMemo(() => {
    if (!data) return null;
    const stats = periodStats || data.lifetimeStats;
    return {
      open: stats.open,
      fixed: stats.fixed,
      high: stats.open_priority?.high ?? 0,
      pipeline: {
        pending: stats.pending,
        in_progress: stats.in_progress,
        fixed: stats.fixed,
        declined: stats.declined,
        rejected: stats.rejected,
        total: stats.total,
      },
    };
  }, [data, periodStats]);

  const kpiCards = data && view
    ? [
        {
          title: "My projects",
          value: data.health.trackableCount,
          hint: `${data.projects.length} assigned`,
          icon: FolderKanban,
          gradient: "from-blue-500 to-indigo-600",
          chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
          valueClass: "text-blue-700 dark:text-blue-300",
          tab: "projects" as DevTab,
        },
        {
          title: "Overdue",
          value: data.health.overdue.length,
          hint: "Past deadline",
          icon: AlertTriangle,
          gradient: "from-red-500 to-orange-600",
          chip: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800",
          valueClass: "text-red-700 dark:text-red-300",
          tab: "pendings" as DevTab,
        },
        {
          title: "Due in 7 days",
          value: data.health.upcoming.length,
          hint: "Upcoming",
          icon: CalendarClock,
          gradient: "from-amber-500 to-yellow-600",
          chip: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800",
          valueClass: "text-amber-700 dark:text-amber-300",
          tab: "pendings" as DevTab,
        },
        {
          title: "Open bugs",
          value: view.open,
          hint: `${view.high} high priority`,
          icon: BugIcon,
          gradient: "from-orange-500 to-red-600",
          chip: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800",
          valueClass: "text-orange-700 dark:text-orange-300",
          tab: "overview" as DevTab,
        },
        {
          title: "My fixes",
          value: (periodFixes || []).length,
          hint: `In ${period.title.toLowerCase()}`,
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
          valueClass: "text-emerald-700 dark:text-emerald-300",
          tab: "fixes" as DevTab,
        },
        {
          title: "Open tasks",
          value: data.myOpenTasks.length,
          hint: "Assigned to me",
          icon: ListTodo,
          gradient: "from-sky-500 to-cyan-600",
          chip: "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 border-sky-200 dark:border-sky-800",
          valueClass: "text-sky-700 dark:text-sky-300",
          tab: "tasks" as DevTab,
        },
      ]
    : [];

  return (
    <DashboardPageShell
      title="Developer Dashboard"
      description="Your projects, open bugs, fixes & assigned tasks"
      headerIcon={Code2}
      periodPreset={periodPreset}
      customFrom={customFrom}
      customTo={customTo}
      period={period}
      onPresetChange={setPeriodPreset}
      onCustomFromChange={setCustomFrom}
      onCustomToChange={setCustomTo}
      periodFetching={periodFetching || periodFixesFetching}
      isLoading={isLoading}
      isError={isError || !data || !view}
      onRetry={() => refetch()}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpiSlot={
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {kpiCards.map((card) => (
            <DashboardKpiCard
              key={card.title}
              {...card}
              onClick={() => setActiveTab(card.tab)}
            />
          ))}
        </div>
      }
    >
      {data && view ? (
        <>
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <BugPipelineCard
                title="Bug pipeline"
                description={`In your projects — ${view.pipeline.total.toLocaleString()} total`}
                counts={view.pipeline}
                action={
                  <Button asChild variant="outline" size="sm" className="rounded-xl shrink-0">
                    <Link to={`/${role}/bugs`}>
                      Open bugs list
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                }
              />
              <div className="space-y-4">
                <div className={cn(DASHBOARD_PANEL, "p-5")}>
                  <h2 className="text-lg font-bold mb-1">Priority open bugs</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Highest priority open items in your projects
                  </p>
                  <BugListTable
                    bugs={data.openBugs.slice(0, 8)}
                    role={role}
                    emptyLabel="No open bugs in your projects"
                  />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-3">Overdue projects</h2>
              <ProjectHealthTable
                rows={data.health.overdue}
                role={role}
                emptyLabel="No overdue projects"
              />
            </div>
          </TabsContent>


          <TabsContent value="pendings" className="space-y-6 mt-0">
            <PendingsTab
              role={role}
              overdue={toDeadlineHealth(data.health.overdue)}
              upcoming={toDeadlineHealth(data.health.upcoming)}
              pendingBugs={data.pendingBugs}
              pendingBugCount={
                periodStats?.pending ??
                data.lifetimeStats.pending ??
                data.pendingBugs.length
              }
              pendingUpdates={data.pendingUpdates}
              retestsPendingCount={
                periodStats?.retests?.pending ??
                data.lifetimeStats.retests?.pending ??
                0
              }
              enabled={activeTab === "pendings"}
            />
          </TabsContent>

          <TabsContent value="projects" className="space-y-4 mt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Project health</h2>
                <p className="text-sm text-muted-foreground">
                  Active & release-ready projects you belong to
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to={`/${role}/projects`}>All projects</Link>
              </Button>
            </div>
            <ProjectHealthTable
              rows={data.health.rows}
              role={role}
              emptyLabel="No projects assigned yet — ask an admin to add you"
            />
          </TabsContent>

          <TabsContent value="fixes" className="space-y-4 mt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">My fixes</h2>
                <p className="text-sm text-muted-foreground">
                  Fixed or rejected by you in {period.title.toLowerCase()}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to={`/${role}/fixes?tab=my-fixes`}>My fixes list</Link>
              </Button>
            </div>
            <BugListTable
              bugs={periodFixes || []}
              role={role}
              emptyLabel={`No fixes in ${period.title.toLowerCase()}`}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 mt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Assigned tasks</h2>
                <p className="text-sm text-muted-foreground">Open tasks assigned to you</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to={`/${role}/my-tasks`}>Open BugToDo</Link>
              </Button>
            </div>
            {data.myOpenTasks.length === 0 ? (
              <div className={cn(DASHBOARD_PANEL, "border-dashed px-4 py-14 text-center")}>
                <p className="text-sm font-medium text-muted-foreground">
                  No open tasks assigned to you
                </p>
              </div>
            ) : (
              <div className={cn(DASHBOARD_PANEL, "overflow-hidden")}>
                <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-gray-800">
                  {data.myOpenTasks.slice(0, 12).map((task) => (
                    <Link
                      key={task.id}
                      to={`/${role}/my-tasks`}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {task.status.replace(/_/g, " ")} · {task.priority} priority
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </>
      ) : null}
    </DashboardPageShell>
  );
}
