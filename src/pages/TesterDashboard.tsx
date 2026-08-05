import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard";
import {
  DashboardPageShell,
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
import { getEffectiveRole } from "@/lib/utils";
import { bugService } from "@/services/bugService";
import { projectService } from "@/services/projectService";
import type { Bug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bug as BugIcon,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  TestTube2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

type TesterTab = "overview" | "projects" | "my-bugs" | "verify";

const TABS: DashboardTabItem[] = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "my-bugs", label: "My bugs", icon: BugIcon },
  { value: "verify", label: "Fixes to verify", icon: ClipboardCheck },
];

function parseTab(value: string | null): TesterTab {
  if (value === "projects" || value === "my-bugs" || value === "verify") return value;
  return "overview";
}

function countByStatus(bugs: Bug[]) {
  const counts = {
    pending: 0,
    in_progress: 0,
    fixed: 0,
    declined: 0,
    rejected: 0,
    total: bugs.length,
    open: 0,
    highOpen: 0,
  };
  bugs.forEach((b) => {
    const s = b.status as keyof typeof counts;
    if (s in counts && typeof counts[s] === "number") {
      (counts as Record<string, number>)[s] += 1;
    }
    if (b.status === "pending" || b.status === "in_progress") {
      counts.open += 1;
      if (b.priority === "high") counts.highOpen += 1;
    }
  });
  return counts;
}

async function loadTesterDashboard(userId: string) {
  const [allProjects, myBugsResult, fixedInProjects] = await Promise.all([
    projectService.getProjects(),
    bugService.getBugs({ page: 1, limit: 100, userId }),
    bugService.getBugs({ page: 1, limit: 40, status: "fixed" }),
  ]);

  const projects = filterAssignedProjects(allProjects, userId);
  const health = buildProjectHealth(projects);
  const myBugs = myBugsResult.bugs || [];
  const myCounts = countByStatus(myBugs);
  const myOpen = sortBugsByPriority(
    myBugs.filter((b) => b.status === "pending" || b.status === "in_progress")
  );

  // Why: Prefer bugs this tester reported that are now fixed; fall back to project fixed list.
  const myReportedFixed = sortBugsByPriority(
    myBugs.filter((b) => b.status === "fixed")
  );
  const projectFixed = sortBugsByPriority(fixedInProjects.bugs || []);
  const toVerify =
    myReportedFixed.length > 0
      ? myReportedFixed
      : projectFixed.filter((b) => String(b.reported_by) === String(userId));

  return {
    projects,
    health,
    myBugs,
    myCounts,
    myOpen,
    toVerify: (toVerify.length > 0 ? toVerify : projectFixed).slice(0, 40),
    myOpenFacet: myBugsResult.pagination?.counts?.myOpen ?? myCounts.open,
  };
}

export default function TesterDashboard() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {}) || "tester";
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
    queryKey: ["tester-dashboard", userId],
    queryFn: () => loadTesterDashboard(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const periodMyBugs = useMemo(() => {
    if (!data) return [];
    return data.myBugs.filter(
      (b) =>
        dateInPeriod(b.created_at, period.from, period.to) ||
        dateInPeriod(b.updated_at, period.from, period.to)
    );
  }, [data, period.from, period.to]);

  const periodCounts = useMemo(() => countByStatus(periodMyBugs), [periodMyBugs]);

  const kpiCards = data
    ? [
        {
          title: "My projects",
          value: data.health.trackableCount,
          hint: `${data.projects.length} assigned`,
          icon: FolderKanban,
          gradient: "from-blue-500 to-indigo-600",
          chip: "from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800",
          valueClass: "text-blue-700 dark:text-blue-300",
          tab: "projects" as TesterTab,
        },
        {
          title: "Overdue",
          value: data.health.overdue.length,
          hint: "Past deadline",
          icon: AlertTriangle,
          gradient: "from-red-500 to-orange-600",
          chip: "from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800",
          valueClass: "text-red-700 dark:text-red-300",
          tab: "projects" as TesterTab,
        },
        {
          title: "Due in 7 days",
          value: data.health.upcoming.length,
          hint: "Upcoming",
          icon: CalendarClock,
          gradient: "from-amber-500 to-yellow-600",
          chip: "from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800",
          valueClass: "text-amber-700 dark:text-amber-300",
          tab: "projects" as TesterTab,
        },
        {
          title: "My open bugs",
          value: data.myOpenFacet,
          hint: `${data.myCounts.highOpen} high priority`,
          icon: BugIcon,
          gradient: "from-orange-500 to-red-600",
          chip: "from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800",
          valueClass: "text-orange-700 dark:text-orange-300",
          tab: "my-bugs" as TesterTab,
        },
        {
          title: "Reported fixed",
          value: periodCounts.fixed,
          hint: `In ${period.title.toLowerCase()}`,
          icon: CheckCircle2,
          gradient: "from-emerald-500 to-teal-600",
          chip: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800",
          valueClass: "text-emerald-700 dark:text-emerald-300",
          tab: "verify" as TesterTab,
        },
        {
          title: "To verify",
          value: data.toVerify.length,
          hint: "Fixed bugs awaiting check",
          icon: ClipboardCheck,
          gradient: "from-violet-500 to-purple-600",
          chip: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800",
          valueClass: "text-violet-700 dark:text-violet-300",
          tab: "verify" as TesterTab,
        },
      ]
    : [];

  const pipelineCounts = data
    ? {
        pending: data.myCounts.pending,
        in_progress: data.myCounts.in_progress,
        fixed: data.myCounts.fixed,
        declined: data.myCounts.declined,
        rejected: data.myCounts.rejected,
        total: data.myCounts.total,
      }
    : null;

  return (
    <DashboardPageShell
      title="Tester Dashboard"
      description="Your reported bugs, projects & fixes to verify"
      headerIcon={TestTube2}
      periodPreset={periodPreset}
      customFrom={customFrom}
      customTo={customTo}
      period={period}
      onPresetChange={setPeriodPreset}
      onCustomFromChange={setCustomFrom}
      onCustomToChange={setCustomTo}
      isLoading={isLoading}
      isError={isError || !data}
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
      {data && pipelineCounts ? (
        <>
          <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <BugPipelineCard
                title="My bug pipeline"
                description={`Bugs you reported — ${pipelineCounts.total.toLocaleString()} total`}
                counts={pipelineCounts}
                action={
                  <Button asChild variant="outline" size="sm" className="rounded-xl shrink-0">
                    <Link to={`/${role}/bugs?tab=my-bugs`}>
                      My bugs list
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                }
              />
              <div>
                <h2 className="text-lg font-bold mb-1">Open reports</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Highest priority bugs you still have open
                </p>
                <BugListTable
                  bugs={data.myOpen.slice(0, 8)}
                  role={role}
                  emptyLabel="No open bugs reported by you"
                />
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

          <TabsContent value="my-bugs" className="space-y-4 mt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">My bugs</h2>
                <p className="text-sm text-muted-foreground">
                  Bugs you reported touching {period.title.toLowerCase()}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to={`/${role}/bugs?tab=my-bugs`}>Full my bugs list</Link>
              </Button>
            </div>
            <BugListTable
              bugs={sortBugsByPriority(periodMyBugs).slice(0, 40)}
              role={role}
              emptyLabel={`No bugs reported in ${period.title.toLowerCase()}`}
            />
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Fixes to verify</h2>
                <p className="text-sm text-muted-foreground">
                  Fixed bugs ready for tester verification
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link to={`/${role}/fixes`}>Open fixes</Link>
              </Button>
            </div>
            <BugListTable
              bugs={data.toVerify}
              role={role}
              emptyLabel="No fixed bugs waiting for verification"
            />
          </TabsContent>
        </>
      ) : null}
    </DashboardPageShell>
  );
}
