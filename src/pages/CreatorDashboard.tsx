import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import {
  DashboardPageShell,
  DASHBOARD_PANEL,
  type DashboardTabItem,
} from "@/components/dashboard/DashboardPageShell";
import { filterAssignedProjects } from "@/components/dashboard/roleDashboardShared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  resolveWorkPeriod,
  type WorkPeriodPreset,
} from "@/lib/dashboardPeriod";
import { cn, getEffectiveRole } from "@/lib/utils";
import { projectService } from "@/services/projectService";
import {
  CREATIVE_STATUSES,
  getCreatorDashboardSummary,
  type CreativeStatus,
} from "@/services/creativeService";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  LayoutDashboard,
  Palette,
  Send,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type CreatorTab = "overview" | "pipeline" | "projects";

const TABS: DashboardTabItem[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "pipeline", label: "Pipeline", icon: Palette },
  { value: "projects", label: "Projects", icon: FolderKanban },
];

const STATUS_STYLE: Record<CreativeStatus, { badge: string; bar: string; hint: string }> = {
  Draft: {
    badge: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
    bar: "bg-fuchsia-500",
    hint: "Being designed",
  },
  "In Review": {
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    hint: "Waiting on admin",
  },
  Completed: {
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    hint: "Approved, ready to publish",
  },
  Published: {
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    hint: "Live",
  },
  Rejected: {
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
    hint: "Needs rework",
  },
};

function parseTab(value: string | null): CreatorTab {
  if (value === "pipeline" || value === "projects") return value;
  return "overview";
}

function relativeTime(value: string): string {
  const d = new Date(value.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? "" : formatDistanceToNow(d, { addSuffix: true });
}

export default function CreatorDashboard() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {}) || "creator";
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
  const creativeBase = `/${role}/bugcreative`;

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

  const summaryQuery = useQuery({
    queryKey: ["creator-dashboard-summary", userId, period.from, period.to],
    queryFn: ({ signal }) =>
      getCreatorDashboardSummary({ from: period.from, to: period.to }, signal),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  // Why: Assigned projects don't depend on the period — keep them out of the period key.
  const projectsQuery = useQuery({
    queryKey: ["creator-dashboard-projects", userId],
    queryFn: async () => filterAssignedProjects(await projectService.getProjects(), userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const summary = summaryQuery.data;
  const projects = projectsQuery.data ?? [];
  const isLoading = summaryQuery.isLoading;
  const periodTitle = period.title.toLowerCase();

  const kpiCards = summary
    ? [
        {
          title: "Drafts",
          value: summary.drafts,
          hint:
            summary.rejected > 0
              ? `+ ${summary.rejected} rejected to rework`
              : "In progress now",
          icon: Palette,
          gradient: "from-fuchsia-500 to-violet-600",
          chip: "from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/30 dark:to-violet-950/30 border-fuchsia-200 dark:border-fuchsia-800",
          valueClass: "text-fuchsia-700 dark:text-fuchsia-300",
          onClick: () => setActiveTab("pipeline"),
        },
        {
          title: "In review",
          value: summary.in_review,
          hint: "Waiting on admin now",
          icon: Send,
          gradient: "from-amber-500 to-orange-600",
          chip: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800",
          valueClass: "text-amber-700 dark:text-amber-300",
          onClick: () => setActiveTab("pipeline"),
        },
        {
          title: "Due next 7 days",
          value: summary.due_next_7_days,
          hint: summary.overdue > 0 ? `${summary.overdue} overdue` : "Scheduled, not live",
          icon: summary.overdue > 0 ? AlertTriangle : CalendarClock,
          gradient:
            summary.overdue > 0 ? "from-rose-500 to-red-600" : "from-sky-500 to-cyan-600",
          chip:
            summary.overdue > 0
              ? "from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-200 dark:border-rose-800"
              : "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 border-sky-200 dark:border-sky-800",
          valueClass:
            summary.overdue > 0
              ? "text-rose-700 dark:text-rose-300"
              : "text-sky-700 dark:text-sky-300",
          onClick: () => setActiveTab("pipeline"),
        },
        {
          title: "Published",
          value: summary.published_in_period,
          hint: `Went live ${periodTitle}`,
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
          valueClass: "text-emerald-700 dark:text-emerald-300",
          onClick: () => setActiveTab("pipeline"),
        },
        {
          title: "Projects",
          value: projectsQuery.isLoading ? "—" : projects.length,
          hint: "Assigned to you",
          icon: FolderKanban,
          gradient: "from-blue-500 to-indigo-600",
          chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
          valueClass: "text-blue-700 dark:text-blue-300",
          onClick: () => setActiveTab("projects"),
        },
        {
          title: "Total assets",
          value: summary.total,
          hint: `${summary.created_in_period} created ${periodTitle}`,
          icon: LayoutDashboard,
          gradient: "from-slate-500 to-zinc-600",
          chip: "from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30 border-slate-200 dark:border-slate-800",
          valueClass: "text-slate-700 dark:text-slate-300",
          onClick: () => setActiveTab("pipeline"),
        },
      ]
    : [];

  return (
    <DashboardPageShell
      title="Creator Dashboard"
      description="Your creative pipeline, scheduled work, and assigned projects"
      headerIcon={Palette}
      periodPreset={periodPreset}
      customFrom={customFrom}
      customTo={customTo}
      period={period}
      onPresetChange={setPeriodPreset}
      onCustomFromChange={setCustomFrom}
      onCustomToChange={setCustomTo}
      isLoading={isLoading}
      isError={summaryQuery.isError}
      onRetry={() => summaryQuery.refetch()}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpiSlot={
        isLoading ? (
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="col-span-6 sm:col-span-4 h-28 rounded-2xl xl:col-span-2" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            {kpiCards.map((card) => (
              <DashboardKpiCard key={card.title} {...card} />
            ))}
          </div>
        )
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <div className={DASHBOARD_PANEL + " p-5"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <p className="text-xs text-muted-foreground">Latest updated assets</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to={creativeBase}>
                Open BugCreative
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : (summary?.recent ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">No assets yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first asset in BugCreative to see it here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(summary?.recent ?? []).map((asset) => (
                <Link
                  key={asset.id}
                  to={`${creativeBase}?asset=${asset.id}`}
                  className="grid grid-cols-12 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
                >
                  <div className="col-span-12 min-w-0 sm:col-span-7">
                    <p className="truncate font-medium" title={asset.title}>
                      {asset.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {asset.material_type} · {asset.platform}
                    </p>
                  </div>
                  <span className="col-span-6 text-xs text-muted-foreground sm:col-span-3 sm:text-right">
                    {relativeTime(asset.updated_at)}
                  </span>
                  <div className="col-span-6 flex justify-end sm:col-span-2">
                    <Badge
                      variant="outline"
                      className={cn("rounded-xl whitespace-nowrap", STATUS_STYLE[asset.status]?.badge)}
                    >
                      {asset.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="pipeline" className="mt-0 space-y-6">
        <div className={DASHBOARD_PANEL + " p-5"}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Pipeline snapshot</h2>
              <p className="text-xs text-muted-foreground">
                Current status of all {summary?.total ?? 0} assets
              </p>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4">
            {CREATIVE_STATUSES.map((status) => {
              const count = summary?.by_status[status] ?? 0;
              const pct = summary && summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
              const style = STATUS_STYLE[status];
              return (
                <Link
                  key={status}
                  to={`${creativeBase}?tab=${encodeURIComponent(status)}`}
                  className="col-span-12 flex flex-col gap-3 rounded-xl border p-4 transition-colors hover:bg-accent/50 sm:col-span-6 xl:col-span-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={cn("rounded-xl", style.badge)}>
                      {status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{count}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{style.hint}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="projects" className="mt-0 space-y-6">
        {projectsQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : projectsQuery.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <p className="text-sm text-muted-foreground">Could not load projects.</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => projectsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assigned projects yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/${role}/projects/${project.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 hover:bg-accent/50"
              >
                <span className="truncate font-medium">{project.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </TabsContent>
    </DashboardPageShell>
  );
}
