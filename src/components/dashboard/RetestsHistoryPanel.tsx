import { formatRetestSummary } from "@/components/bugs/details/TesterVerificationPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { bugService } from "@/services/bugService";
import type { Bug } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

type RetestStats = {
  pending: number;
  verified_fixed: number;
  still_broken: number;
  not_retested: number;
  retested: number;
  total: number;
};

function formatVerifiedAt(value?: string | null): string {
  if (!value) return "—";
  return formatLocalDate(value, "datetime");
}

function RetestHistoryRow({ bug, role }: { bug: Bug; role: string }) {
  const summary = formatRetestSummary(bug);
  const verifiedAt = bug.tester_verified_at || bug.updated_at;

  return (
    <Link
      to={`/${role}/bugs/${bug.id}`}
      className="grid grid-cols-12 gap-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors hover:bg-muted/40"
    >
      <div className="col-span-12 sm:col-span-5 min-w-0">
        <p className="text-sm font-medium truncate">{bug.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {bug.project_name || "Unknown project"}
        </p>
      </div>
      <div className="col-span-6 sm:col-span-3 flex items-center">
        <Badge variant="outline" className={cn("rounded-xl text-[10px] font-semibold", summary.className)}>
          {summary.label}
        </Badge>
      </div>
      <div className="col-span-6 sm:col-span-4 flex flex-col items-start sm:items-end gap-0.5 min-w-0">
        <span className="text-[11px] text-muted-foreground truncate max-w-full">
          {bug.tester_verified_by_name ? `By ${bug.tester_verified_by_name}` : "Tester verification"}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {formatVerifiedAt(verifiedAt)}
        </span>
      </div>
    </Link>
  );
}

function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-background/60 px-3 py-2 flex flex-col gap-0.5 min-w-0",
        className
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
        {label}
      </span>
      <span className="text-lg font-bold tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

type RetestsHistoryPanelProps = {
  role: string;
  from: string;
  to: string;
  stats?: RetestStats;
  limit?: number;
  className?: string;
};

export function RetestsHistoryPanel({
  role,
  from,
  to,
  stats,
  limit = 8,
  className,
}: RetestsHistoryPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-retest-history", from, to, limit],
    queryFn: () => bugService.getRetestHistory({ from, to, limit }),
    staleTime: 30_000,
    enabled: Boolean(from && to),
  });

  const bugs = data?.bugs ?? [];
  const totalHistory = stats?.total ?? data?.pagination.totalBugs ?? bugs.length;

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg p-5 sm:p-6 space-y-4",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Retests history
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tester verification outcomes in the selected period
              {totalHistory > 0 ? (
                <span className="text-muted-foreground/80"> · {totalHistory.toLocaleString()} total</span>
              ) : null}
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-xl font-semibold"
        >
          <Link to={`/${role}/retests`}>
            Open retests
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {stats ? (
        <div className="grid grid-cols-12 gap-2 sm:gap-3">
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="Pending" value={stats.pending} />
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="Verified fixed" value={stats.verified_fixed} />
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="Still broken" value={stats.still_broken} />
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="Not retested" value={stats.not_retested} />
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="Retested" value={stats.retested} />
          </div>
          <div className="col-span-6 sm:col-span-4 lg:col-span-2">
            <StatChip label="In period" value={stats.total} />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Unable to load retest history.</p>
      ) : bugs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No tester verifications in this period yet. Fixed bugs awaiting retest appear on the Retests page.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {bugs.map((bug) => (
            <RetestHistoryRow key={bug.id} bug={bug} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
