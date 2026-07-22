import { PortfolioProjectAnalytics } from "@/components/users/UserProjectPortfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getEffectiveRole } from "@/lib/utils";
import { projectService } from "@/services/projectService";
import type { UserPortfolioProject } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ProjectAnalyticsProps = {
  projectId: string;
  className?: string;
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function ProjectAnalytics({ projectId, className }: ProjectAnalyticsProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const rolePath = getEffectiveRole(currentUser?.role);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["projectAnalytics", projectId],
    queryFn: () => projectService.getProjectAnalytics(projectId),
    enabled: Boolean(projectId),
    staleTime: 60_000,
  });

  const portfolioProject: UserPortfolioProject | null = data
    ? {
        id: data.project.id,
        name: data.project.name,
        status: data.project.status,
        is_active: data.project.is_active,
        counts: {
          bugs: data.project.counts.bugs,
          fixes: data.project.counts.fixes,
          updates: data.project.counts.updates,
        },
        bugs: data.bugs,
        fixes: data.fixes,
        updates: data.updates,
      }
    : null;

  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-4 lg:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-600 p-1.5 dark:bg-indigo-500">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl">Analytics</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Lifecycle ratios, status timelines, and cycle durations for this project
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground sm:self-auto"
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-4 pt-0 sm:p-5 lg:p-6">
        {isLoading ? (
          <AnalyticsSkeleton />
        ) : isError || !portfolioProject ? (
          <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-8 text-center">
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {(error as Error)?.message || "Failed to load project analytics."}
            </p>
          </div>
        ) : (
          <PortfolioProjectAnalytics
            project={portfolioProject}
            rolePath={rolePath}
            onOpen={(href) => navigate(href)}
            enableSearch
            summaryExtras={{
              avgRiseLabel: data.summary.avg_rise_duration_label,
              avgFixLabel: data.summary.avg_fix_duration_label,
              memberCount: data.summary.members ?? data.project.member_count ?? null,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectAnalytics;
