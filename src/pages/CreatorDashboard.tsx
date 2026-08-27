import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import {
  DashboardPageShell,
  DASHBOARD_PANEL,
  type DashboardTabItem,
} from "@/components/dashboard/DashboardPageShell";
import { filterAssignedProjects } from "@/components/dashboard/roleDashboardShared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  resolveWorkPeriod,
  type WorkPeriodPreset,
} from "@/lib/dashboardPeriod";
import { getEffectiveRole } from "@/lib/utils";
import { projectService } from "@/services/projectService";
import {
  CREATIVE_STATUSES,
  getCreativeStats,
  listCreativeAssets,
  type CreativeAsset,
  type CreativeStats,
} from "@/services/creativeService";
import {
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

type CreatorTab = "overview" | "pipeline" | "projects";

const TABS: DashboardTabItem[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "pipeline", label: "Pipeline", icon: Palette },
  { value: "projects", label: "Projects", icon: FolderKanban },
];

function parseTab(value: string | null): CreatorTab {
  if (value === "pipeline" || value === "projects") return value;
  return "overview";
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
    queryKey: ["creator-dashboard", userId, period.from, period.to],
    queryFn: async () => {
      const [stats, pipeline, projects] = await Promise.all([
        getCreativeStats({ from: period.from, to: period.to }),
        listCreativeAssets({ page: 1, limit: 20 }),
        projectService.getProjects(),
      ]);
      return {
        stats,
        assets: pipeline.items as CreativeAsset[],
        projects: filterAssignedProjects(projects, userId),
      };
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  const stats: CreativeStats | undefined = data?.stats;
  const kpiCards = stats
    ? [
        {
          title: "Drafts",
          value: stats.by_status.Draft ?? 0,
          hint: "Ready to submit",
          icon: Palette,
          gradient: "from-fuchsia-500 to-violet-600",
          chip: "from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/30 dark:to-violet-950/30 border-fuchsia-200 dark:border-fuchsia-800",
          valueClass: "text-fuchsia-700 dark:text-fuchsia-300",
          tab: "pipeline" as CreatorTab,
        },
        {
          title: "In review",
          value: stats.in_review,
          hint: "Waiting on admin",
          icon: Send,
          gradient: "from-amber-500 to-orange-600",
          chip: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800",
          valueClass: "text-amber-700 dark:text-amber-300",
          tab: "pipeline" as CreatorTab,
        },
        {
          title: "Due this week",
          value: stats.due_this_week,
          hint: "Scheduled dates",
          icon: CalendarClock,
          gradient: "from-sky-500 to-cyan-600",
          chip: "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 border-sky-200 dark:border-sky-800",
          valueClass: "text-sky-700 dark:text-sky-300",
          tab: "overview" as CreatorTab,
        },
        {
          title: "Published",
          value: stats.published_in_period,
          hint: "In selected period",
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
          valueClass: "text-emerald-700 dark:text-emerald-300",
          tab: "pipeline" as CreatorTab,
        },
        {
          title: "Projects",
          value: data?.projects.length ?? 0,
          hint: "Assigned to you",
          icon: FolderKanban,
          gradient: "from-blue-500 to-indigo-600",
          chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
          valueClass: "text-blue-700 dark:text-blue-300",
          tab: "projects" as CreatorTab,
        },
        {
          title: "Total assets",
          value: stats.total,
          hint: "All time",
          icon: LayoutDashboard,
          gradient: "from-slate-500 to-zinc-600",
          chip: "from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30 border-slate-200 dark:border-slate-800",
          valueClass: "text-slate-700 dark:text-slate-300",
          tab: "overview" as CreatorTab,
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
      isError={isError}
      onRetry={() => refetch()}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpiSlot={
        isLoading ? (
          <div className="grid grid-cols-12 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="col-span-6 h-28 rounded-2xl xl:col-span-2" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            {kpiCards.map((card) => (
              <DashboardKpiCard
                key={card.title}
                {...card}
                onClick={() => setActiveTab(card.tab)}
              />
            ))}
          </div>
        )
      }
    >
      <TabsContent value="overview" className="mt-0 space-y-6">
        <div className={DASHBOARD_PANEL + " p-5"}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Recent assets</h2>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to={`/${role}/bugcreative`}>
                Open BugCreative
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {(data?.assets || []).slice(0, 8).map((asset) => (
              <Link
                key={asset.id}
                to={`/${role}/bugcreative?asset=${asset.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm hover:bg-accent/50"
              >
                <span className="truncate font-medium">{asset.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{asset.status}</span>
              </Link>
            ))}
            {!isLoading && (data?.assets || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No assets yet.</p>
            ) : null}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="pipeline" className="mt-0 space-y-6">
        <div className="grid grid-cols-12 gap-3">
          {CREATIVE_STATUSES.map((status) => (
            <div key={status} className={"col-span-12 sm:col-span-6 xl:col-span-4 " + DASHBOARD_PANEL + " p-4"}>
              <p className="text-sm text-muted-foreground">{status}</p>
              <p className="text-2xl font-bold">{stats?.by_status[status] ?? 0}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="projects" className="mt-0 space-y-6">
        <div className="flex flex-col gap-2">
          {(data?.projects || []).map((project) => (
            <Link
              key={project.id}
              to={`/${role}/projects/${project.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 hover:bg-accent/50"
            >
              <span className="font-medium">{project.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {!isLoading && (data?.projects || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No assigned projects yet.</p>
          ) : null}
        </div>
      </TabsContent>
    </DashboardPageShell>
  );
}
