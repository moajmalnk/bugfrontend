import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { bugService, type BugLifecycle, type BugLifecycleStep } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Hourglass,
  Percent,
  Timer,
  UserRound,
  Wrench,
} from "lucide-react";

type BugLifecycleCardProps = {
  bugId: string;
  className?: string;
};

type RatioTone = "success" | "warning" | "urgent" | "default";

const CLOSED = new Set(["fixed", "declined", "rejected"]);

const toneStyles: Record<RatioTone, string> = {
  success:
    "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100",
  warning:
    "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-100",
  urgent:
    "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-100",
  default: "bg-muted/30 border-border/60 text-foreground",
};

const toneLabelStyles: Record<RatioTone, string> = {
  success: "text-emerald-700/80 dark:text-emerald-300/80",
  warning: "text-amber-800/80 dark:text-amber-300/80",
  urgent: "text-rose-700/80 dark:text-rose-300/80",
  default: "text-muted-foreground",
};

const toneBadgeStyles: Record<RatioTone, string> = {
  success:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700",
  warning:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  urgent:
    "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700",
  default: "bg-muted text-muted-foreground border-border/60",
};

function statusTone(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (["fixed", "approved", "completed"].includes(value)) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
  }
  if (["in_progress", "pending"].includes(value)) {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25";
  }
  if (["declined", "rejected"].includes(value)) {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

function statusBarColor(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (value === "fixed") return "bg-emerald-500";
  if (value === "in_progress") return "bg-sky-500";
  if (value === "pending") return "bg-amber-500";
  if (["declined", "rejected"].includes(value)) return "bg-rose-500";
  return "bg-muted-foreground/50";
}

function formatStatusLabel(status?: string | null) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return formatLocalDate(value, "datetime");
}

function formatPercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

function toneFromGoodRate(percent: number | null | undefined): RatioTone {
  if (percent === null || percent === undefined) return "default";
  if (percent >= 80) return "success";
  if (percent >= 50) return "warning";
  return "urgent";
}

function toneFromBadRate(percent: number | null | undefined): RatioTone {
  if (percent === null || percent === undefined) return "default";
  if (percent <= 0) return "success";
  if (percent <= 25) return "warning";
  return "urgent";
}

function toneFromDuration(seconds: number | null | undefined): RatioTone {
  if (seconds === null || seconds === undefined) return "default";
  const days = seconds / 86400;
  if (days <= 7) return "success";
  if (days <= 30) return "warning";
  return "urgent";
}

function getLifecycleShares(steps: BugLifecycleStep[], riseSeconds?: number | null) {
  if (!steps?.length) return [];
  const closedIndex = steps.findIndex((step) =>
    CLOSED.has((step.status || "").toLowerCase())
  );
  const lifecycle =
    closedIndex === -1
      ? steps
      : steps.slice(0, closedIndex + 1).map((step, index, arr) =>
          index === arr.length - 1 && CLOSED.has((step.status || "").toLowerCase())
            ? { ...step, duration_seconds: 0 }
            : step
        );

  const summed = lifecycle.reduce(
    (sum, step) => sum + Math.max(0, step.duration_seconds || 0),
    0
  );
  const base = riseSeconds && riseSeconds > 0 ? riseSeconds : summed;

  return lifecycle.map((step) => {
    const seconds = Math.max(0, step.duration_seconds || 0);
    return {
      ...step,
      share_percent: base > 0 ? (seconds / base) * 100 : null,
    };
  });
}

function MetricTile({
  label,
  value,
  detail,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  detail?: string | null;
  tone?: RatioTone;
  className?: string;
}) {
  return (
    <div className={cn("h-full rounded-xl border px-3 py-2.5", toneStyles[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-[10px] font-semibold uppercase tracking-wide", toneLabelStyles[tone])}>
          {label}
        </p>
        {tone !== "default" ? (
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
              toneBadgeStyles[tone]
            )}
          >
            {tone}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums break-words">{value}</p>
      {detail ? (
        <p className={cn("mt-0.5 text-[11px]", toneLabelStyles[tone])}>{detail}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-full px-2 text-[10px] font-medium capitalize border",
        statusTone(status)
      )}
    >
      {formatStatusLabel(status)}
    </Badge>
  );
}

function CycleShareBar({
  shares,
}: {
  shares: Array<BugLifecycleStep & { share_percent: number | null }>;
}) {
  const hasWidth = shares.some((s) => (s.share_percent ?? 0) > 0);
  if (!hasWidth) {
    return <p className="text-xs text-muted-foreground">Not enough history to compute cycle mix.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/40">
        {shares.map((step, index) => {
          const width = Math.max(0, step.share_percent || 0);
          if (width <= 0) return null;
          return (
            <div
              key={`${step.status}-${index}`}
              className={cn("h-full", statusBarColor(step.status))}
              style={{ width: `${width}%` }}
              title={`${formatStatusLabel(step.status)}: ${formatPercent(width, 1)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {shares.map((step, index) =>
          (step.share_percent ?? 0) > 0 ? (
            <span
              key={`legend-${step.status}-${index}`}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className={cn("h-2 w-2 rounded-full", statusBarColor(step.status))} />
              <span className="capitalize">{formatStatusLabel(step.status)}</span>
              <span className="tabular-nums font-medium text-foreground">
                {formatPercent(step.share_percent, 0)}
              </span>
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}

function StatusTimeline({
  steps,
  riseSeconds,
}: {
  steps: BugLifecycleStep[];
  riseSeconds?: number | null;
}) {
  if (!steps?.length) {
    return <p className="text-xs text-muted-foreground">No status history recorded yet.</p>;
  }

  const shares = getLifecycleShares(steps, riseSeconds);
  const shareByIndex = new Map(
    shares.map((step, index) => {
      const originalIndex = steps.findIndex(
        (s, i) =>
          i >= index &&
          s.status === step.status &&
          s.entered_at === step.entered_at
      );
      return [originalIndex === -1 ? index : originalIndex, step.share_percent];
    })
  );

  return (
    <ol className="relative ml-2 space-y-0 border-l border-border/70 pl-4">
      {steps.map((step, index) => {
        const isClosedCurrent =
          !!step.is_current && CLOSED.has((step.status || "").toLowerCase());
        const share = isClosedCurrent ? null : shareByIndex.get(index);

        return (
          <li key={`${step.status}-${step.entered_at}-${index}`} className="relative pb-4 last:pb-0">
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                step.is_current ? "bg-primary" : "bg-muted-foreground/50"
              )}
            />
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={step.status} />
              {step.from_status ? (
                <span className="text-[11px] text-muted-foreground">
                  from {formatStatusLabel(step.from_status)}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">raised</span>
              )}
              {step.is_current ? (
                <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                  Current
                </Badge>
              ) : null}
              {share !== null && share !== undefined ? (
                <Badge
                  variant="outline"
                  className="h-5 rounded-full px-2 text-[10px] tabular-nums border-border/60"
                >
                  {formatPercent(share, 0)} of cycle
                </Badge>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {formatDateTime(step.entered_at)}
              </span>
              {step.duration_label ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Hourglass className="h-3 w-3" />
                  {step.duration_label}
                  {step.is_current ? " so far" : " in this status"}
                </span>
              ) : null}
              {step.actor_name ? (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3 w-3" />
                  {step.actor_name}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LifecycleSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="col-span-12 h-20 rounded-xl sm:col-span-6 lg:col-span-4" />
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

export function BugLifecycleCard({ bugId, className }: BugLifecycleCardProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["bugLifecycle", bugId],
    queryFn: () => bugService.getBugLifecycle(bugId),
    enabled: !!bugId,
  });

  const shares = data
    ? getLifecycleShares(data.status_timeline || [], data.rise_duration_seconds)
    : [];

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-50/30 via-transparent to-emerald-50/30 dark:from-sky-950/10 dark:via-transparent dark:to-emerald-950/10" />
      <CardHeader className="relative pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg">Lifecycle & timeline</CardTitle>
          {data ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] capitalize border",
                statusTone(data.status)
              )}
            >
              {formatStatusLabel(data.status)}
              {data.is_open ? " · open" : " · closed"}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Time spent in each status, cycle mix, and who moved the bug
        </p>
      </CardHeader>
      <CardContent className="relative space-y-5">
        {isLoading ? (
          <LifecycleSkeleton />
        ) : isError ? (
          <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-6 text-center text-sm text-rose-700 dark:text-rose-300">
            {(error as Error)?.message || "Failed to load lifecycle details."}
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-12 gap-2 sm:gap-3">
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                label="Raised"
                value={formatDateTime(data.raised_at)}
                detail={data.actors?.reporter_name ? `by ${data.actors.reporter_name}` : null}
              />
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                tone={toneFromDuration(data.rise_duration_seconds)}
                label="Rise → resolve"
                value={data.rise_duration_label || "—"}
                detail={data.is_open ? "Open cycle so far" : "Full cycle time"}
              />
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                tone={toneFromDuration(data.fix_duration_seconds)}
                label="Fix duration"
                value={data.fix_duration_label || "—"}
                detail={
                  data.actors?.fixed_by_name
                    ? `Fixed by ${data.actors.fixed_by_name}`
                    : "In progress → fixed"
                }
              />
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                tone={toneFromBadRate(data.wait_share_percent)}
                label="Wait share"
                value={formatPercent(data.wait_share_percent, 0)}
                detail="Time in pending"
              />
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                tone={toneFromGoodRate(data.active_share_percent)}
                label="Active share"
                value={formatPercent(data.active_share_percent, 0)}
                detail="Time in progress"
              />
              <MetricTile
                className="col-span-12 sm:col-span-6 lg:col-span-4"
                tone={toneFromDuration(data.age_seconds)}
                label="Age"
                value={data.age_label || "—"}
                detail={
                  data.resolved_at
                    ? `Resolved ${formatDateTime(data.resolved_at)}`
                    : "Since first raised"
                }
              />
            </div>

            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 rounded-xl border border-border/50 bg-muted/15 p-3.5 lg:col-span-7">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Cycle time mix
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Percent className="h-3 w-3" />
                    % of rise → resolve
                  </span>
                </div>
                <CycleShareBar shares={shares} />
              </div>

              <div className="col-span-12 rounded-xl border border-border/50 bg-muted/15 p-3.5 lg:col-span-5">
                <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  People & context
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <UserRound className="h-3.5 w-3.5" />
                      Reporter
                    </span>
                    <span className="font-medium text-right">
                      {data.actors?.reporter_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Wrench className="h-3.5 w-3.5" />
                      Last updater
                    </span>
                    <span className="font-medium text-right">
                      {data.actors?.updated_by_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fixed by
                    </span>
                    <span className="font-medium text-right">
                      {data.actors?.fixed_by_name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      Fix / cycle
                    </span>
                    <span className="font-medium tabular-nums text-right">
                      {formatPercent(data.fix_to_cycle_percent, 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Timer className="h-3.5 w-3.5" />
                      Status events
                    </span>
                    <span className="font-medium tabular-nums text-right">
                      {data.activity_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Status timeline
              </p>
              <StatusTimeline
                steps={data.status_timeline || []}
                riseSeconds={data.rise_duration_seconds}
              />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default BugLifecycleCard;
