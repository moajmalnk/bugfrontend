import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { bugService, type BugConversionEvent, type BugLifecycleStep } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Bug,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flag,
  Hourglass,
  Percent,
  RotateCcw,
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

type StepVisual = {
  key: string;
  label: string;
  Icon: LucideIcon;
  accent: string;
  soft: string;
  ring: string;
  glow: string;
  path: string;
};

const STEP_VISUALS: Record<string, StepVisual> = {
  raised: {
    key: "raised",
    label: "Raised",
    Icon: Flag,
    accent: "text-sky-600 dark:text-sky-300",
    soft: "bg-sky-500/15 text-sky-700 dark:text-sky-200",
    ring: "ring-sky-400/50",
    glow: "shadow-sky-500/30",
    path: "bg-sky-500",
  },
  fixed: {
    key: "fixed",
    label: "Fixed",
    Icon: CheckCircle2,
    accent: "text-emerald-600 dark:text-emerald-300",
    soft: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    ring: "ring-emerald-400/50",
    glow: "shadow-emerald-500/30",
    path: "bg-emerald-500",
  },
  reopened: {
    key: "reopened",
    label: "Reopened",
    Icon: RotateCcw,
    accent: "text-orange-600 dark:text-orange-300",
    soft: "bg-orange-500/15 text-orange-800 dark:text-orange-200",
    ring: "ring-orange-400/50",
    glow: "shadow-orange-500/30",
    path: "bg-orange-500",
  },
  in_progress: {
    key: "in_progress",
    label: "In progress",
    Icon: Wrench,
    accent: "text-violet-600 dark:text-violet-300",
    soft: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
    ring: "ring-violet-400/50",
    glow: "shadow-violet-500/30",
    path: "bg-violet-500",
  },
  declined: {
    key: "declined",
    label: "Declined",
    Icon: Bug,
    accent: "text-rose-600 dark:text-rose-300",
    soft: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
    ring: "ring-rose-400/50",
    glow: "shadow-rose-500/30",
    path: "bg-rose-500",
  },
  rejected: {
    key: "rejected",
    label: "Rejected",
    Icon: Bug,
    accent: "text-rose-600 dark:text-rose-300",
    soft: "bg-rose-500/15 text-rose-800 dark:text-rose-200",
    ring: "ring-rose-400/50",
    glow: "shadow-rose-500/30",
    path: "bg-rose-500",
  },
  pending: {
    key: "pending",
    label: "Pending",
    Icon: Hourglass,
    accent: "text-amber-600 dark:text-amber-300",
    soft: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    ring: "ring-amber-400/50",
    glow: "shadow-amber-500/30",
    path: "bg-amber-500",
  },
  default: {
    key: "default",
    label: "Status",
    Icon: Timer,
    accent: "text-muted-foreground",
    soft: "bg-muted text-foreground",
    ring: "ring-border",
    glow: "shadow-black/10",
    path: "bg-muted-foreground",
  },
};

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
  // Keep full reopen cycles (fixed → pending → fixed); only zero duration on
  // the current closed step so the bar stays readable.
  const lifecycle = steps.map((step) =>
    step.is_current && CLOSED.has((step.status || "").toLowerCase())
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

function eventLabelForStep(step: BugLifecycleStep): string | null {
  const label = String(step.event_label || "").toLowerCase();
  if (label === "reopened") return "Reopened";
  if (label === "fixed") return "Fixed";
  if (label === "raised") return "Raised";
  const from = String(step.from_status || "").toLowerCase();
  const to = String(step.status || "").toLowerCase();
  if (CLOSED.has(from) && (to === "pending" || to === "in_progress")) {
    return "Reopened";
  }
  if (to === "fixed" && from) return "Fixed";
  if (!from) return "Raised";
  return null;
}

function visualForStep(step: BugLifecycleStep): StepVisual {
  const eventLabel = eventLabelForStep(step)?.toLowerCase();
  if (eventLabel === "reopened") return STEP_VISUALS.reopened;
  if (eventLabel === "fixed") return STEP_VISUALS.fixed;
  if (eventLabel === "raised") return STEP_VISUALS.raised;
  const status = String(step.status || "").toLowerCase();
  return STEP_VISUALS[status] || STEP_VISUALS.default;
}

function stepHeadline(step: BugLifecycleStep, eventLabel: string | null): string {
  if (eventLabel === "Reopened") return "Bug reopened";
  if (eventLabel === "Fixed") return "Marked fixed";
  if (eventLabel === "Raised") return "Bug raised";
  if (step.from_status) {
    return `${formatStatusLabel(step.from_status)} → ${formatStatusLabel(step.status)}`;
  }
  return formatStatusLabel(step.status);
}

function JourneyStepCard({
  step,
  index,
  share,
  align,
}: {
  step: BugLifecycleStep;
  index: number;
  share: number | null | undefined;
  align: "left" | "right" | "stack";
}) {
  const eventLabel = eventLabelForStep(step);
  const visual = visualForStep(step);
  const Icon = visual.Icon;
  const stepNo = String(index + 1).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, x: align === "left" ? -14 : align === "right" ? 14 : 0, y: align === "stack" ? 10 : 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.3) }}
      className={cn(
        "w-full rounded-2xl border border-border/60 bg-background/90 p-3.5 shadow-sm backdrop-blur-sm",
        "dark:bg-gray-950/70",
        step.is_current && "ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            visual.soft
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("text-[11px] font-bold tracking-[0.14em] uppercase", visual.accent)}>
              Step {stepNo}
            </span>
            {eventLabel ? (
              <Badge
                variant="outline"
                className={cn("h-5 rounded-full px-2 text-[10px] font-semibold border-0", visual.soft)}
              >
                {eventLabel}
              </Badge>
            ) : null}
            {step.is_current ? (
              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                Current
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {stepHeadline(step, eventLabel)}
          </p>
          {step.from_status ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={step.from_status} />
              <span className="text-[11px] text-muted-foreground">→</span>
              <StatusBadge status={step.status} />
            </div>
          ) : (
            <StatusBadge status={step.status} />
          )}
          {step.reason === "tester_verification_failed" ? (
            <p className="text-[11px] text-orange-700 dark:text-orange-300">
              Tester marked the fix as still broken
            </p>
          ) : null}
          <div className="flex flex-col gap-1 pt-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span className="truncate">{formatDateTime(step.entered_at)}</span>
            </span>
            {step.duration_label ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Hourglass className="h-3 w-3 shrink-0" />
                {step.duration_label}
                {step.is_current ? " so far" : " in this status"}
                {share !== null && share !== undefined ? ` · ${formatPercent(share, 0)} of cycle` : ""}
              </span>
            ) : share !== null && share !== undefined ? (
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Percent className="h-3 w-3 shrink-0" />
                {formatPercent(share, 0)} of cycle
              </span>
            ) : null}
            {step.actor_name ? (
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <UserRound className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium text-foreground/80">{step.actor_name}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function JourneyNode({
  visual,
  isCurrent,
  isReopen,
}: {
  visual: StepVisual;
  isCurrent?: boolean;
  isReopen?: boolean;
}) {
  const Icon = visual.Icon;
  return (
    <div className="relative z-[1] flex h-10 w-10 items-center justify-center">
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-foreground shadow-lg",
          visual.glow,
          isCurrent && "ring-4",
          isCurrent && visual.ring
        )}
      />
      <span
        className={cn(
          "relative inline-flex h-6 w-6 items-center justify-center rounded-full text-white",
          visual.path,
          isReopen && "animate-pulse"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
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
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
        No status history recorded yet.
      </div>
    );
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
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-b from-muted/20 via-background/40 to-muted/10 p-4 sm:p-5">
      {/* Vertical glowing path rail (desktop center / mobile left) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-9 top-6 bottom-6 w-4 -translate-x-1/2 rounded-full bg-muted-foreground/15 blur-[1px] md:left-1/2"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-9 top-8 bottom-8 w-2.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-sky-400/45 via-amber-400/35 to-emerald-400/45 dark:from-sky-500/35 dark:via-amber-500/30 dark:to-emerald-500/35 shadow-[0_0_24px_rgba(148,163,184,0.22)] md:left-1/2"
      />

      <ol className="relative flex flex-col gap-6 md:gap-8">
        {steps.map((step, index) => {
          const isClosedCurrent =
            !!step.is_current && CLOSED.has((step.status || "").toLowerCase());
          const share = isClosedCurrent ? null : shareByIndex.get(index);
          const eventLabel = eventLabelForStep(step);
          const visual = visualForStep(step);
          const onLeft = index % 2 === 0;

          return (
            <li
              key={`${step.status}-${step.entered_at}-${index}`}
              className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-center gap-3 md:gap-4"
            >
              {/* Left column (desktop) */}
              <div className={cn("hidden md:block min-w-0", onLeft ? "order-1" : "order-1")}>
                {onLeft ? (
                  <JourneyStepCard step={step} index={index} share={share} align="left" />
                ) : (
                  <div className="h-full" />
                )}
              </div>

              {/* Center node */}
              <div className="absolute left-9 top-3 -translate-x-1/2 md:static md:order-2 md:translate-x-0 md:flex md:justify-center">
                <JourneyNode
                  visual={visual}
                  isCurrent={!!step.is_current}
                  isReopen={eventLabel === "Reopened"}
                />
              </div>

              {/* Right column (desktop) */}
              <div className={cn("hidden md:block min-w-0", onLeft ? "order-3" : "order-3")}>
                {!onLeft ? (
                  <JourneyStepCard step={step} index={index} share={share} align="right" />
                ) : (
                  <div className="h-full" />
                )}
              </div>

              {/* Mobile / narrow: single stacked card */}
              <div className="md:hidden min-w-0 pl-12">
                <JourneyStepCard step={step} index={index} share={share} align="stack" />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
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

function ConversionHistory({ events }: { events: BugConversionEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-5 text-center text-sm text-muted-foreground">
        No project conversions yet.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {[...events].reverse().map((event, index) => {
        const fromName = event.from_project_name || "Unknown project";
        const toName = event.to_project_name || "Unknown project";
        return (
          <li
            key={`${event.created_at || "conv"}-${index}`}
            className="relative rounded-xl border border-sky-200/50 bg-sky-50/40 p-3.5 dark:border-sky-800/40 dark:bg-sky-950/20"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </span>
                Converted to another project
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {event.created_at ? formatLocalDate(event.created_at, "datetime") : "—"}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
              <Badge
                variant="outline"
                className="max-w-full truncate border-border/70 bg-background/80 font-medium"
              >
                {fromName}
              </Badge>
              <ArrowRightLeft className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
              <Badge
                variant="outline"
                className="max-w-full truncate border-sky-300/70 bg-sky-100/60 font-medium text-sky-900 dark:border-sky-700 dark:bg-sky-900/40 dark:text-sky-100"
              >
                {toName}
              </Badge>
            </div>
            {event.actor_name ? (
              <p className="mt-2 text-xs text-muted-foreground">
                by <span className="font-medium text-foreground">{event.actor_name}</span>
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
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
          Full history: raised → fixed → reopened → fixed again, with time in each status
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
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Status journey
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Follow raised → fixed → reopened → fixed again along the path
                  </p>
                </div>
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] tabular-nums">
                  {(data.status_timeline || []).length} step
                  {(data.status_timeline || []).length === 1 ? "" : "s"}
                </Badge>
              </div>
              <StatusTimeline
                steps={data.status_timeline || []}
                riseSeconds={data.rise_duration_seconds}
              />
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Conversion history
                </p>
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
                  {(data.conversion_history || []).length} move
                  {(data.conversion_history || []).length === 1 ? "" : "s"}
                </Badge>
              </div>
              <ConversionHistory events={data.conversion_history || []} />
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default BugLifecycleCard;
