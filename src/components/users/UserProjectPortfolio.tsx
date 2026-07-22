import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getEffectiveRole } from "@/lib/utils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { getProjectStatusLabel, type ProjectStatus } from "@/lib/utils/projectUtils";
import {
  userService,
  type UserPortfolioProject,
  type UserPortfolioStatusStep,
  type UserPortfolioWorkItem,
} from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import {
  Bug,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Hourglass,
  Percent,
  RefreshCw,
  Scale,
  Search,
  Timer,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";

type UserProjectPortfolioProps = {
  userId: string;
  className?: string;
};

/** Wraps ratio cards naturally instead of forcing 5 into one cramped row. */
const RATIO_GRID_CLASS =
  "grid gap-2 sm:gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13.5rem),1fr))]";

const SUMMARY_GRID_CLASS = "grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3";

const CLOSED_STATUSES = new Set([
  "fixed",
  "approved",
  "completed",
  "declined",
  "rejected",
]);

function statusTone(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (["fixed", "approved", "completed", "active"].includes(value)) {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25";
  }
  if (["in_progress", "pending", "release_ready"].includes(value)) {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25";
  }
  if (["declined", "rejected", "archived", "inactive"].includes(value)) {
    return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25";
  }
  return "bg-muted text-muted-foreground border-border/60";
}

function statusBarColor(status?: string | null) {
  const value = (status || "").toLowerCase();
  if (["fixed", "approved", "completed"].includes(value)) return "bg-emerald-500";
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

function ratioText(numerator: number, denominator: number) {
  if (denominator <= 0) return { label: "—", percent: null as number | null };
  const percent = (numerator / denominator) * 100;
  return {
    label: `${numerator}/${denominator}`,
    percent,
  };
}

/** Lifecycle steps only (exclude post-resolve "so far" time on closed status). */
function getLifecycleSteps(steps: UserPortfolioStatusStep[]) {
  if (!steps?.length) return [];
  const closedIndex = steps.findIndex((step) =>
    CLOSED_STATUSES.has((step.status || "").toLowerCase())
  );
  if (closedIndex === -1) return steps;
  return steps.slice(0, closedIndex + 1).map((step, index, arr) => {
    if (index === arr.length - 1 && CLOSED_STATUSES.has((step.status || "").toLowerCase())) {
      return { ...step, duration_seconds: 0 };
    }
    return step;
  });
}

function getStatusShare(
  steps: UserPortfolioStatusStep[],
  riseSeconds?: number | null
) {
  const lifecycle = getLifecycleSteps(steps);
  const summed = lifecycle.reduce(
    (sum, step) => sum + Math.max(0, step.duration_seconds || 0),
    0
  );
  const base =
    riseSeconds && riseSeconds > 0
      ? riseSeconds
      : summed > 0
        ? summed
        : 0;

  return lifecycle.map((step) => {
    const seconds = Math.max(0, step.duration_seconds || 0);
    const percent = base > 0 ? (seconds / base) * 100 : null;
    return { ...step, share_percent: percent, share_seconds: seconds };
  });
}

function computeItemRatios(item: UserPortfolioWorkItem) {
  const rise = item.rise_duration_seconds ?? null;
  const fix = item.fix_duration_seconds ?? null;
  const shares = getStatusShare(item.status_timeline || [], rise);
  const pendingShare = shares.find(
    (s) => (s.status || "").toLowerCase() === "pending"
  )?.share_percent;
  const inProgressShare = shares.find(
    (s) => (s.status || "").toLowerCase() === "in_progress"
  )?.share_percent;
  const fixToCycle =
    rise && rise > 0 && fix !== null && fix !== undefined
      ? (fix / rise) * 100
      : null;

  return {
    shares,
    pendingShare: pendingShare ?? null,
    inProgressShare: inProgressShare ?? null,
    fixToCycle,
    waitRatio:
      rise && rise > 0 && pendingShare !== undefined && pendingShare !== null
        ? pendingShare
        : null,
  };
}

function computeProjectInsights(project: UserPortfolioProject) {
  const bugs = project.bugs || [];
  const raised = bugs.length;
  const open = bugs.filter((b) => b.is_open).length;
  const resolved = bugs.filter((b) => !b.is_open).length;
  const fixed = bugs.filter((b) => (b.status || "").toLowerCase() === "fixed").length;
  const fixes = project.counts.fixes || 0;

  const resolvedRatio = ratioText(resolved, raised);
  const openRatio = ratioText(open, raised);
  const fixRate = ratioText(fixed, raised);

  const riseValues = bugs
    .map((b) => b.rise_duration_seconds)
    .filter((v): v is number => typeof v === "number" && v >= 0);
  const fixValues = (project.fixes || [])
    .map((b) => b.fix_duration_seconds)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  const avgRise =
    riseValues.length > 0
      ? Math.round(riseValues.reduce((a, b) => a + b, 0) / riseValues.length)
      : null;
  const avgFix =
    fixValues.length > 0
      ? Math.round(fixValues.reduce((a, b) => a + b, 0) / fixValues.length)
      : null;

  return {
    raised,
    open,
    resolved,
    fixed,
    fixes,
    resolvedRatio,
    openRatio,
    fixRate,
    avgRise,
    avgFix,
    bugsToFixes:
      raised > 0
        ? { label: `${fixes}:${raised}`, percent: (fixes / raised) * 100 }
        : { label: fixes > 0 ? `${fixes}:0` : "—", percent: null as number | null },
  };
}

function formatDurationSeconds(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || seconds < 0) return "—";
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

type RatioTone = "success" | "warning" | "urgent" | "default";

const ratioToneStyles: Record<
  RatioTone,
  { card: string; label: string; value: string; detail: string; badge: string }
> = {
  success: {
    card: "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60",
    label: "text-emerald-700/80 dark:text-emerald-300/80",
    value: "text-emerald-900 dark:text-emerald-100",
    detail: "text-emerald-700/70 dark:text-emerald-300/70",
    badge:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700",
  },
  warning: {
    card: "bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60",
    label: "text-amber-800/80 dark:text-amber-300/80",
    value: "text-amber-950 dark:text-amber-100",
    detail: "text-amber-800/70 dark:text-amber-300/70",
    badge:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700",
  },
  urgent: {
    card: "bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60",
    label: "text-rose-700/80 dark:text-rose-300/80",
    value: "text-rose-950 dark:text-rose-100",
    detail: "text-rose-700/70 dark:text-rose-300/70",
    badge:
      "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700",
  },
  default: {
    card: "bg-muted/20 border-border/50",
    label: "text-muted-foreground",
    value: "text-foreground",
    detail: "text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border/60",
  },
};

/** Higher percent is better (resolved / fix rate). */
function toneFromGoodRate(percent: number | null | undefined): RatioTone {
  if (percent === null || percent === undefined) return "default";
  if (percent >= 80) return "success";
  if (percent >= 50) return "warning";
  return "urgent";
}

/** Higher percent is worse (open rate / wait share). */
function toneFromBadRate(percent: number | null | undefined): RatioTone {
  if (percent === null || percent === undefined) return "default";
  if (percent <= 0) return "success";
  if (percent <= 25) return "warning";
  return "urgent";
}

/** Longer duration is worse. */
function toneFromDuration(seconds: number | null | undefined): RatioTone {
  if (seconds === null || seconds === undefined) return "default";
  const days = seconds / 86400;
  if (days <= 7) return "success";
  if (days <= 30) return "warning";
  return "urgent";
}

function toneFromCoverage(percent: number | null | undefined): RatioTone {
  if (percent === null || percent === undefined) return "default";
  if (percent >= 100) return "success";
  if (percent >= 50) return "warning";
  return "urgent";
}

function toneBadgeClass(tone: RatioTone) {
  return ratioToneStyles[tone].badge;
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

function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string | null;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3.5 sm:p-4", tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">
              {hint}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg bg-background/60 p-2 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function RatioChip({
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
  const styles = ratioToneStyles[tone];
  return (
    <div
      className={cn(
        "h-full min-w-0 rounded-lg border px-2.5 py-2.5 sm:px-3",
        styles.card,
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p
          className={cn(
            "min-w-0 flex-1 text-[10px] font-semibold uppercase leading-tight tracking-wide",
            styles.label
          )}
        >
          {label}
        </p>
        {tone !== "default" ? (
          <span
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide sm:text-[9px]",
              styles.badge
            )}
          >
            {tone}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1.5 text-sm font-semibold tabular-nums break-words sm:text-base",
          styles.value
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className={cn("mt-0.5 text-[11px] leading-snug break-words", styles.detail)}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function StatusShareBar({
  shares,
}: {
  shares: Array<UserPortfolioStatusStep & { share_percent: number | null }>;
}) {
  const visible = shares.filter(
    (s) => (s.share_percent ?? 0) > 0 || !CLOSED_STATUSES.has((s.status || "").toLowerCase())
  );
  const hasWidth = visible.some((s) => (s.share_percent ?? 0) > 0);
  if (!hasWidth) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/40">
        {visible.map((step, index) => {
          const width = Math.max(0, step.share_percent || 0);
          if (width <= 0) return null;
          return (
            <div
              key={`${step.status}-${index}`}
              className={cn("h-full transition-all", statusBarColor(step.status))}
              style={{ width: `${width}%` }}
              title={`${formatStatusLabel(step.status)}: ${formatPercent(width, 1)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {visible.map((step, index) =>
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
  steps: UserPortfolioStatusStep[];
  riseSeconds?: number | null;
}) {
  if (!steps?.length) {
    return (
      <p className="text-xs text-muted-foreground">No status history recorded yet.</p>
    );
  }

  const shares = getStatusShare(steps, riseSeconds);
  const shareByIndex = new Map(shares.map((s, i) => [i, s.share_percent]));

  return (
    <ol className="relative space-y-0 border-l border-border/70 ml-2 pl-4">
      {steps.map((step, index) => {
        const isClosedCurrent =
          step.is_current && CLOSED_STATUSES.has((step.status || "").toLowerCase());
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function getWorkItemHref(item: UserPortfolioWorkItem, rolePath: string) {
  return item.kind === "update"
    ? `/${rolePath}/updates/${item.id}`
    : `/${rolePath}/bugs/${item.id}`;
}

function WorkItemDetailsBody({
  item,
  rolePath,
  onOpen,
  showTitleLink = true,
}: {
  item: UserPortfolioWorkItem;
  rolePath: string;
  onOpen: (href: string) => void;
  showTitleLink?: boolean;
}) {
  const href = getWorkItemHref(item, rolePath);
  const ratios = computeItemRatios(item);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showTitleLink ? (
            <button
              type="button"
              onClick={() => onOpen(href)}
              className="group flex items-center gap-1.5 text-left"
            >
              <p className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                {item.title}
              </p>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <p className="text-sm font-medium text-foreground">{item.title}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.priority ? (
              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] capitalize">
                {item.priority}
              </Badge>
            ) : null}
            {item.type ? (
              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] capitalize">
                {item.type}
              </Badge>
            ) : null}
            {item.is_open ? (
              <Badge
                variant="outline"
                className="h-5 rounded-full px-2 text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300"
              >
                Open
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 rounded-full px-2 text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              >
                Closed
              </Badge>
            )}
          </div>
          {item.reported_by_name || item.fixed_by_name || item.created_by_name ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {item.kind === "update"
                ? item.created_by_name
                  ? `By ${item.created_by_name}`
                  : null
                : [
                    item.reported_by_name ? `Raised by ${item.reported_by_name}` : null,
                    item.fixed_by_name ? `Fixed by ${item.fixed_by_name}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-muted/30 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Raised</p>
          <p className="mt-0.5 text-foreground">{formatDateTime(item.raised_at)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.kind === "update" ? "Cycle time" : "Rise → resolve"}
          </p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {item.rise_duration_label || "—"}
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.kind === "update" ? "Resolved" : "Fix duration"}
          </p>
          <p className="mt-0.5 font-medium tabular-nums text-foreground">
            {item.kind === "update"
              ? formatDateTime(item.resolved_at)
              : item.fix_duration_label || "—"}
          </p>
        </div>
      </div>

      <div className={RATIO_GRID_CLASS}>
        {ratios.waitRatio !== null ? (
          <RatioChip
            tone={toneFromBadRate(ratios.waitRatio)}
            label="Wait share"
            value={formatPercent(ratios.waitRatio, 0)}
            detail="Time in pending"
          />
        ) : null}
        {ratios.inProgressShare !== null ? (
          <RatioChip
            tone={toneFromGoodRate(ratios.inProgressShare)}
            label="Active share"
            value={formatPercent(ratios.inProgressShare, 0)}
            detail="Time in progress"
          />
        ) : null}
        {ratios.fixToCycle !== null ? (
          <RatioChip
            tone={
              ratios.fixToCycle >= 40
                ? "success"
                : ratios.fixToCycle >= 15
                  ? "warning"
                  : "urgent"
            }
            label="Fix / cycle"
            value={formatPercent(ratios.fixToCycle, 0)}
            detail="Fixing vs total cycle"
          />
        ) : null}
        {item.resolved_at ? (
          <RatioChip
            tone={item.is_open ? "warning" : "success"}
            label="Resolved"
            value={formatDateTime(item.resolved_at)}
            detail={item.is_open ? "Still open" : "Closed"}
          />
        ) : (
          <RatioChip
            tone="urgent"
            label="Resolved"
            value="Not yet"
            detail="Still open"
          />
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Cycle time mix
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Percent className="h-3 w-3" />
            % of rise → resolve
          </span>
        </div>
        <StatusShareBar shares={ratios.shares} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Status timeline
        </p>
        <StatusTimeline
          steps={item.status_timeline || []}
          riseSeconds={item.rise_duration_seconds}
        />
      </div>
    </div>
  );
}

function WorkItemCard({
  item,
  rolePath,
  onOpen,
}: {
  item: UserPortfolioWorkItem;
  rolePath: string;
  onOpen: (href: string) => void;
}) {
  return (
    <div className="hidden rounded-xl border border-border/60 bg-card/50 p-3.5 lg:block">
      <WorkItemDetailsBody item={item} rolePath={rolePath} onOpen={onOpen} />
    </div>
  );
}

function WorkItemSummaryRow({
  item,
  onSelect,
}: {
  item: UserPortfolioWorkItem;
  onSelect: () => void;
}) {
  const ratios = computeItemRatios(item);
  const waitTone = toneFromBadRate(ratios.waitRatio);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card/50 p-3.5 text-left transition-colors hover:border-border hover:bg-muted/20 lg:hidden"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          {item.priority ? (
            <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] capitalize">
              {item.priority}
            </Badge>
          ) : null}
          {item.is_open ? (
            <Badge
              variant="outline"
              className="h-5 rounded-full px-2 text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-300"
            >
              Open
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {item.kind === "update" ? "Cycle" : "Rise → resolve"}:{" "}
            <span className="font-medium text-foreground">
              {item.rise_duration_label || "—"}
            </span>
          </span>
          {ratios.waitRatio !== null ? (
            <span className="tabular-nums">
              Wait:{" "}
              <span
                className={cn(
                  "font-medium",
                  waitTone === "urgent"
                    ? "text-rose-700 dark:text-rose-300"
                    : waitTone === "warning"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-foreground"
                )}
              >
                {formatPercent(ratios.waitRatio, 0)}
              </span>
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function WorkItemDetailSheet({
  item,
  rolePath,
  open,
  onOpenChange,
  onOpen,
}: {
  item: UserPortfolioWorkItem | null;
  rolePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (href: string) => void;
}) {
  if (!item) return null;
  const href = getWorkItemHref(item, rolePath);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="lg:hidden flex max-h-[min(92vh,900px)] flex-col rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95">
        <DrawerHeader className="shrink-0 border-b border-border/50 pb-3 text-left">
          <DrawerTitle className="line-clamp-2 pr-2 text-base">{item.title}</DrawerTitle>
          <DrawerDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            {item.priority ? (
              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] capitalize">
                {item.priority}
              </Badge>
            ) : null}
            <span className="text-xs capitalize text-muted-foreground">{item.kind}</span>
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <WorkItemDetailsBody
            item={item}
            rolePath={rolePath}
            onOpen={onOpen}
            showTitleLink={false}
          />
        </div>
        <DrawerFooter className="shrink-0 border-t border-border/50 pt-3">
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onOpen(href);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open full page
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function WorkList({
  items,
  empty,
  rolePath,
  onOpen,
}: {
  items: UserPortfolioWorkItem[];
  empty: string;
  rolePath: string;
  onOpen: (href: string) => void;
}) {
  const [selectedItem, setSelectedItem] = useState<UserPortfolioWorkItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  const openItem = (item: UserPortfolioWorkItem) => {
    setSelectedItem(item);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id}>
            <WorkItemSummaryRow item={item} onSelect={() => openItem(item)} />
            <WorkItemCard item={item} rolePath={rolePath} onOpen={onOpen} />
          </div>
        ))}
      </div>
      <WorkItemDetailSheet
        item={selectedItem}
        rolePath={rolePath}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onOpen={onOpen}
      />
    </>
  );
}

function ProjectPortfolioSummary({ project }: { project: UserPortfolioProject }) {
  const insights = computeProjectInsights(project);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 break-words font-semibold text-foreground">{project.name}</span>
        <StatusBadge
          status={
            project.status ||
            (project.is_active === 1
              ? "active"
              : project.is_active === 0
                ? "inactive"
                : null)
          }
        />
        {project.member_role ? (
          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] capitalize">
            {project.member_role}
          </Badge>
        ) : null}
        {insights.raised > 0 ? (
          <Badge
            variant="outline"
            className={cn(
              "h-5 rounded-full border px-2 text-[10px] tabular-nums",
              toneBadgeClass(toneFromGoodRate(insights.fixRate.percent))
            )}
          >
            {formatPercent(insights.fixRate.percent, 0)} fixed
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:gap-x-4">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          Assigned {formatDateTime(project.assigned_at)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bug className="h-3.5 w-3.5" />
          {project.counts.bugs} bugs
          {insights.raised > 0
            ? ` · ${insights.open} open · ${insights.resolved} closed`
            : ""}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wrench className="h-3.5 w-3.5" />
          {project.counts.fixes} fixes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          {project.counts.updates} updates
        </span>
      </div>
    </>
  );
}

function ProjectDetailBody({
  project,
  rolePath,
  onOpen,
}: {
  project: UserPortfolioProject;
  rolePath: string;
  onOpen: (href: string) => void;
}) {
  return (
    <PortfolioProjectAnalytics
      project={project}
      rolePath={rolePath}
      onOpen={onOpen}
      showProjectLink
    />
  );
}

export type PortfolioProjectAnalyticsProps = {
  project: UserPortfolioProject;
  rolePath: string;
  onOpen: (href: string) => void;
  showProjectLink?: boolean;
  enableSearch?: boolean;
  summaryExtras?: {
    avgRiseLabel?: string | null;
    avgFixLabel?: string | null;
    memberCount?: number | null;
  };
  className?: string;
};

export function PortfolioProjectAnalytics({
  project,
  rolePath,
  onOpen,
  showProjectLink = false,
  enableSearch = false,
  summaryExtras,
  className,
}: PortfolioProjectAnalyticsProps) {
  const [search, setSearch] = useState("");
  const insights = computeProjectInsights(project);

  const filteredBugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return project.bugs;
    return project.bugs.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.reported_by_name || "").toLowerCase().includes(q)
    );
  }, [project.bugs, search]);

  const filteredFixes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return project.fixes;
    return project.fixes.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.fixed_by_name || "").toLowerCase().includes(q)
    );
  }, [project.fixes, search]);

  const filteredUpdates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return project.updates;
    return project.updates.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.created_by_name || "").toLowerCase().includes(q)
    );
  }, [project.updates, search]);

  const filteredProject: UserPortfolioProject = {
    ...project,
    bugs: filteredBugs,
    fixes: filteredFixes,
    updates: filteredUpdates,
  };

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      {showProjectLink ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Project status:{" "}
            <span className="font-medium capitalize text-foreground">
              {project.status
                ? getProjectStatusLabel(project.status as ProjectStatus)
                : "—"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => onOpen(`/${rolePath}/projects/${project.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            Open project
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className={SUMMARY_GRID_CLASS}>
        <SummaryTile
          label="Bugs raised"
          value={project.counts.bugs}
          hint={
            [
              insights.open > 0 ? `${insights.open} open` : null,
              summaryExtras?.avgRiseLabel
                ? `Avg cycle ${summaryExtras.avgRiseLabel}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          icon={Bug}
          tone="bg-orange-500/10 border-orange-500/20"
        />
        <SummaryTile
          label="Fixes"
          value={project.counts.fixes}
          hint={
            [
              insights.raised > 0
                ? `${insights.fixRate.label} fix rate (${formatPercent(insights.fixRate.percent, 0)})`
                : null,
              summaryExtras?.avgFixLabel ? `Avg fix ${summaryExtras.avgFixLabel}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          }
          icon={CheckCircle2}
          tone="bg-emerald-500/10 border-emerald-500/20"
        />
        <SummaryTile
          label="Updates"
          value={project.counts.updates}
          hint={
            insights.bugsToFixes.percent !== null
              ? `Fixes:bugs ${insights.bugsToFixes.label}`
              : null
          }
          icon={RefreshCw}
          tone="bg-sky-500/10 border-sky-500/20"
        />
        <SummaryTile
          label={summaryExtras?.memberCount != null ? "Team members" : "Resolved"}
          value={
            summaryExtras?.memberCount != null
              ? summaryExtras.memberCount
              : insights.raised > 0
                ? `${insights.resolvedRatio.label} (${formatPercent(insights.resolvedRatio.percent, 0)})`
                : "—"
          }
          hint={
            summaryExtras?.memberCount != null
              ? "Assigned to this project"
              : "Closed bugs / raised"
          }
          icon={summaryExtras?.memberCount != null ? FolderKanban : Scale}
          tone="bg-violet-500/10 border-violet-500/20"
        />
      </div>

      <div className="min-w-0 rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-3.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Scale className="h-3.5 w-3.5" />
          Lifecycle ratios
        </div>
        <div className={RATIO_GRID_CLASS}>
          <RatioChip
            tone={toneFromGoodRate(insights.resolvedRatio.percent)}
            label="Resolved rate"
            value={
              insights.raised > 0
                ? `${insights.resolvedRatio.label} (${formatPercent(insights.resolvedRatio.percent, 0)})`
                : "—"
            }
            detail="Closed bugs / raised"
          />
          <RatioChip
            tone={toneFromBadRate(insights.openRatio.percent)}
            label="Open rate"
            value={
              insights.raised > 0
                ? `${insights.openRatio.label} (${formatPercent(insights.openRatio.percent, 0)})`
                : "—"
            }
            detail="Still open / raised"
          />
          <RatioChip
            tone={toneFromGoodRate(insights.fixRate.percent)}
            label="Fix rate"
            value={
              insights.raised > 0
                ? `${insights.fixRate.label} (${formatPercent(insights.fixRate.percent, 0)})`
                : "—"
            }
            detail="Fixed status / raised"
          />
          <RatioChip
            tone={toneFromCoverage(insights.bugsToFixes.percent)}
            label="Fixes : bugs"
            value={insights.bugsToFixes.label}
            detail="Attributed fixes vs bugs raised"
          />
          <RatioChip
            tone={toneFromDuration(insights.avgRise)}
            label="Avg cycle"
            value={formatDurationSeconds(insights.avgRise)}
            detail="Raised → resolve"
          />
          <RatioChip
            tone={toneFromDuration(insights.avgFix)}
            label="Avg fix"
            value={formatDurationSeconds(insights.avgFix)}
            detail="In progress → fixed"
          />
        </div>
      </div>

      {enableSearch ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bugs, fixes, updates, or people…"
            className="h-10 rounded-xl pl-9"
          />
        </div>
      ) : null}

      <Tabs defaultValue="bugs" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger value="bugs" className="px-1.5 py-2 text-[10px] sm:px-3 sm:text-sm">
            <span className="truncate">Bugs ({filteredProject.bugs.length})</span>
          </TabsTrigger>
          <TabsTrigger value="fixes" className="px-1.5 py-2 text-[10px] sm:px-3 sm:text-sm">
            <span className="truncate">Fixes ({filteredProject.fixes.length})</span>
          </TabsTrigger>
          <TabsTrigger value="updates" className="px-1.5 py-2 text-[10px] sm:px-3 sm:text-sm">
            <span className="truncate">Updates ({filteredProject.updates.length})</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bugs" className="mt-4">
          <WorkList
            items={filteredProject.bugs}
            empty={
              search.trim()
                ? "No bugs match your search."
                : "No bugs raised on this project yet."
            }
            rolePath={rolePath}
            onOpen={onOpen}
          />
        </TabsContent>
        <TabsContent value="fixes" className="mt-4">
          <WorkList
            items={filteredProject.fixes}
            empty={
              search.trim()
                ? "No fixes match your search."
                : "No fixes recorded on this project yet."
            }
            rolePath={rolePath}
            onOpen={onOpen}
          />
        </TabsContent>
        <TabsContent value="updates" className="mt-4">
          <WorkList
            items={filteredProject.updates}
            empty={
              search.trim()
                ? "No updates match your search."
                : "No updates on this project yet."
            }
            rolePath={rolePath}
            onOpen={onOpen}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProjectPortfolioMobileRow({
  project,
  onSelect,
}: {
  project: UserPortfolioProject;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-border hover:bg-muted/20 lg:hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <ProjectPortfolioSummary project={project} />
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </button>
  );
}

function ProjectDetailSheet({
  project,
  rolePath,
  open,
  onOpenChange,
  onOpen,
}: {
  project: UserPortfolioProject | null;
  rolePath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen: (href: string) => void;
}) {
  if (!project) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="lg:hidden flex max-h-[min(92vh,900px)] flex-col rounded-t-3xl border-gray-200/70 bg-white/95 backdrop-blur-sm dark:border-gray-800/70 dark:bg-gray-900/95">
        <DrawerHeader className="shrink-0 border-b border-border/50 pb-3 text-left">
          <DrawerTitle className="line-clamp-2 pr-2 text-base">{project.name}</DrawerTitle>
          <DrawerDescription className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={
                project.status ||
                (project.is_active === 1
                  ? "active"
                  : project.is_active === 0
                    ? "inactive"
                    : null)
              }
            />
            {project.member_role ? (
              <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px] capitalize">
                {project.member_role}
              </Badge>
            ) : null}
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          <ProjectDetailBody project={project} rolePath={rolePath} onOpen={onOpen} />
        </div>
        <DrawerFooter className="shrink-0 border-t border-border/50 pt-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              onOpen(`/${rolePath}/projects/${project.id}`);
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open project page
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProjectPortfolioCard({
  project,
  rolePath,
  onOpen,
}: {
  project: UserPortfolioProject;
  rolePath: string;
  onOpen: (href: string) => void;
}) {
  return (
    <AccordionItem
      value={project.id}
      className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card/40 px-0 data-[state=open]:shadow-sm lg:block"
    >
      <AccordionTrigger className="px-4 py-4 hover:bg-muted/20 hover:no-underline sm:px-5 [&[data-state=open]]:bg-muted/15">
        <div className="flex flex-1 flex-col gap-3 pr-3 text-left">
          <ProjectPortfolioSummary project={project} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-5 sm:px-5">
        <ProjectDetailBody project={project} rolePath={rolePath} onOpen={onOpen} />
      </AccordionContent>
    </AccordionItem>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className={SUMMARY_GRID_CLASS}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export function UserProjectPortfolio({ userId, className }: UserProjectPortfolioProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState<UserPortfolioProject | null>(null);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const rolePath = getEffectiveRole(currentUser) || "admin";

  const handleNavigate = (href: string) => navigate(href);

  const openProjectSheet = (project: UserPortfolioProject) => {
    setSelectedProject(project);
    setProjectSheetOpen(true);
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["userProfilePortfolio", userId],
    queryFn: () => userService.getProfilePortfolio(userId),
    enabled: !!userId,
  });

  const filteredProjects = useMemo(() => {
    const projects = [...(data?.projects || [])];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? projects
      : projects.filter((project) => {
          if (project.name.toLowerCase().includes(q)) return true;
          if ((project.status || "").toLowerCase().includes(q)) return true;
          if ((project.member_role || "").toLowerCase().includes(q)) return true;
          const inItems = [...project.bugs, ...project.fixes, ...project.updates].some((item) =>
            item.title.toLowerCase().includes(q)
          );
          return inItems;
        });

    return filtered.sort((a, b) => {
      const bugsDiff = (b.counts.bugs || 0) - (a.counts.bugs || 0);
      if (bugsDiff !== 0) return bugsDiff;

      const activityA = (a.counts.bugs || 0) + (a.counts.fixes || 0) + (a.counts.updates || 0);
      const activityB = (b.counts.bugs || 0) + (b.counts.fixes || 0) + (b.counts.updates || 0);
      if (activityB !== activityA) return activityB - activityA;

      const timeA = a.assigned_at ? new Date(a.assigned_at).getTime() : 0;
      const timeB = b.assigned_at ? new Date(b.assigned_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [data?.projects, search]);

  const summary = data?.summary;

  const portfolioRatios = useMemo(() => {
    const projects = data?.projects || [];
    let raised = 0;
    let open = 0;
    let fixed = 0;
    let withBugs = 0;

    for (const project of projects) {
      const bugs = project.bugs || [];
      if (bugs.length > 0) withBugs += 1;
      for (const bug of bugs) {
        raised += 1;
        if (bug.is_open) open += 1;
        if ((bug.status || "").toLowerCase() === "fixed") fixed += 1;
      }
    }

    const fixes = summary?.fixes ?? 0;
    const resolved = raised - open;

    return {
      withBugs,
      projectBugCoverage: ratioText(withBugs, projects.length),
      resolvedRate: ratioText(resolved, raised),
      openRate: ratioText(open, raised),
      fixRate: ratioText(fixed, raised),
      fixesToBugs:
        raised > 0
          ? { label: `${fixes}:${raised}`, percent: (fixes / raised) * 100 }
          : { label: fixes > 0 ? `${fixes}:0` : "—", percent: null as number | null },
    };
  }, [data?.projects, summary?.fixes]);

  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="p-4 sm:p-5 lg:p-6 pb-3 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-700 dark:bg-slate-600 rounded-lg">
              <FolderKanban className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg sm:text-xl">Project portfolio</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Assignments, ratios, status history, and time spent in each stage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs text-muted-foreground hover:text-foreground"
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-4 pt-0 sm:p-5 lg:p-6">
        {isLoading ? (
          <PortfolioSkeleton />
        ) : isError ? (
          <div className="rounded-xl border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-8 text-center">
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {(error as Error)?.message || "Failed to load project portfolio."}
            </p>
          </div>
        ) : (
          <>
            <div className={SUMMARY_GRID_CLASS}>
              <SummaryTile
                label="Projects"
                value={summary?.projects ?? 0}
                hint={
                  portfolioRatios.projectBugCoverage.percent !== null
                    ? `${portfolioRatios.projectBugCoverage.label} with bugs (${formatPercent(portfolioRatios.projectBugCoverage.percent, 0)})`
                    : null
                }
                icon={FolderKanban}
                tone="bg-violet-500/10 border-violet-500/20"
              />
              <SummaryTile
                label="Bugs raised"
                value={summary?.bugs_raised ?? 0}
                hint={
                  [
                    portfolioRatios.openRate.percent !== null
                      ? `${formatPercent(portfolioRatios.openRate.percent, 0)} open`
                      : null,
                    summary?.avg_rise_duration_label
                      ? `Avg cycle ${summary.avg_rise_duration_label}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
                icon={Bug}
                tone="bg-orange-500/10 border-orange-500/20"
              />
              <SummaryTile
                label="Fixes"
                value={summary?.fixes ?? 0}
                hint={
                  [
                    portfolioRatios.fixRate.percent !== null
                      ? `${portfolioRatios.fixRate.label} fix rate (${formatPercent(portfolioRatios.fixRate.percent, 0)})`
                      : null,
                    summary?.avg_fix_duration_label
                      ? `Avg fix ${summary.avg_fix_duration_label}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || null
                }
                icon={CheckCircle2}
                tone="bg-emerald-500/10 border-emerald-500/20"
              />
              <SummaryTile
                label="Updates"
                value={summary?.updates ?? 0}
                hint={
                  portfolioRatios.fixesToBugs.percent !== null
                    ? `Fixes:bugs ${portfolioRatios.fixesToBugs.label}`
                    : null
                }
                icon={RefreshCw}
                tone="bg-sky-500/10 border-sky-500/20"
              />
            </div>

            <div className="min-w-0 rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-3.5">
              <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                Portfolio ratios
              </div>
              <div className={RATIO_GRID_CLASS}>
                <RatioChip
                  tone={toneFromGoodRate(portfolioRatios.resolvedRate.percent)}
                  label="Resolved rate"
                  value={
                    portfolioRatios.resolvedRate.percent !== null
                      ? `${portfolioRatios.resolvedRate.label} (${formatPercent(portfolioRatios.resolvedRate.percent, 0)})`
                      : "—"
                  }
                  detail="Closed bugs / raised"
                />
                <RatioChip
                  tone={toneFromBadRate(portfolioRatios.openRate.percent)}
                  label="Open rate"
                  value={
                    portfolioRatios.openRate.percent !== null
                      ? `${portfolioRatios.openRate.label} (${formatPercent(portfolioRatios.openRate.percent, 0)})`
                      : "—"
                  }
                  detail="Still open / raised"
                />
                <RatioChip
                  tone={toneFromGoodRate(portfolioRatios.fixRate.percent)}
                  label="Fix rate"
                  value={
                    portfolioRatios.fixRate.percent !== null
                      ? `${portfolioRatios.fixRate.label} (${formatPercent(portfolioRatios.fixRate.percent, 0)})`
                      : "—"
                  }
                  detail="Fixed status / raised"
                />
                <RatioChip
                  tone={toneFromCoverage(portfolioRatios.fixesToBugs.percent)}
                  label="Fixes : bugs"
                  value={portfolioRatios.fixesToBugs.label}
                  detail="Attributed fixes vs bugs raised"
                />
                <RatioChip
                  tone="default"
                  label="Projects w/ bugs"
                  value={
                    portfolioRatios.projectBugCoverage.percent !== null
                      ? `${portfolioRatios.projectBugCoverage.label} (${formatPercent(portfolioRatios.projectBugCoverage.percent, 0)})`
                      : "—"
                  }
                  detail="Projects that have raised bugs"
                />
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, bugs, fixes, or updates…"
                className="pl-9 h-10 rounded-xl"
              />
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center">
                <Timer className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {search.trim()
                    ? "No projects match your search."
                    : "No project assignments found for this user."}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {filteredProjects.map((project) => (
                    <ProjectPortfolioMobileRow
                      key={project.id}
                      project={project}
                      onSelect={() => openProjectSheet(project)}
                    />
                  ))}
                </div>
                <Accordion type="multiple" className="hidden space-y-3 lg:block">
                  {filteredProjects.map((project) => (
                    <ProjectPortfolioCard
                      key={project.id}
                      project={project}
                      rolePath={rolePath}
                      onOpen={handleNavigate}
                    />
                  ))}
                </Accordion>
                <ProjectDetailSheet
                  project={selectedProject}
                  rolePath={rolePath}
                  open={projectSheetOpen}
                  onOpenChange={setProjectSheetOpen}
                  onOpen={handleNavigate}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default UserProjectPortfolio;
