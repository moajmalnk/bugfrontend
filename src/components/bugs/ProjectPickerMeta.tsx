import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getProjectStatusLabel,
  projectStatusBadgeClass,
  type ProjectBugStatsLite,
  type ProjectStatus,
  type ProjectUpdateStatsLite,
} from "@/lib/utils/projectUtils";
import { Check } from "lucide-react";

const EMPTY_BUGS: ProjectBugStatsLite = { total: 0, open: 0, fixed: 0 };
const EMPTY_UPDATES: ProjectUpdateStatsLite = {
  total: 0,
  open: 0,
  completed: 0,
};

/** Wider than the form field on desktop; nearly full viewport on small screens. */
export const PROJECT_PICKER_POPOVER_CLASS =
  "z-[70] p-0 w-[min(calc(100vw-1.25rem),36rem)] sm:w-[min(calc(100vw-2rem),40rem)] md:w-[min(calc(100vw-2.5rem),44rem)] max-w-[calc(100vw-1.25rem)]";

export type ProjectPickerStats = {
  status?: ProjectStatus | string | null;
  bug_stats?: ProjectBugStatsLite | null;
  update_stats?: ProjectUpdateStatsLite | null;
};

function StatChip({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: number;
  tone: "bugs" | "updates" | "fixes";
  emphasize?: boolean;
}) {
  const toneClass =
    tone === "bugs"
      ? emphasize
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground"
      : tone === "updates"
        ? emphasize
          ? "text-sky-700 dark:text-sky-300"
          : "text-muted-foreground"
        : emphasize
          ? "text-emerald-700 dark:text-emerald-300"
          : "text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 tabular-nums",
        toneClass
      )}
      title={`${value} ${label}`}
    >
      <span className="font-semibold text-[11px] leading-none">{value}</span>
      <span className="text-[10px] font-medium leading-none opacity-80">
        {label}
      </span>
    </span>
  );
}

export function projectPickerSearchValue(
  name: string,
  id: string,
  stats?: ProjectPickerStats
): string {
  const status = (stats?.status as ProjectStatus) || "active";
  const statusLabel = getProjectStatusLabel(status);
  const bugs = stats?.bug_stats ?? EMPTY_BUGS;
  const updates = stats?.update_stats ?? EMPTY_UPDATES;
  return `${name} ${statusLabel} bugs ${bugs.open} updates ${updates.total} fixes ${bugs.fixed} ${id}`;
}

/** Compact counts for the closed combobox trigger */
export function ProjectPickerTriggerMeta({
  stats,
  className,
}: {
  stats?: ProjectPickerStats | null;
  className?: string;
}) {
  const status = (stats?.status as ProjectStatus) || "active";
  const bugs = stats?.bug_stats ?? EMPTY_BUGS;
  const updates = stats?.update_stats ?? EMPTY_UPDATES;

  return (
    <span className={cn("flex items-center gap-2 shrink-0", className)}>
      <span className="hidden sm:inline-flex items-center gap-2.5 text-muted-foreground">
        <StatChip label="Bugs" value={bugs.open} tone="bugs" emphasize={bugs.open > 0} />
        <StatChip
          label="Updates"
          value={updates.total}
          tone="updates"
          emphasize={updates.open > 0}
        />
        <StatChip
          label="Fixes"
          value={bugs.fixed}
          tone="fixes"
          emphasize={bugs.fixed > 0}
        />
      </span>
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px] px-1.5 py-0 font-semibold border",
          projectStatusBadgeClass(status)
        )}
      >
        {getProjectStatusLabel(status)}
      </Badge>
    </span>
  );
}

/** Status + counts row under the full project name */
export function ProjectPickerListMeta({
  stats,
  className,
}: {
  stats?: ProjectPickerStats | null;
  className?: string;
}) {
  const status = (stats?.status as ProjectStatus) || "active";
  const bugs = stats?.bug_stats ?? EMPTY_BUGS;
  const updates = stats?.update_stats ?? EMPTY_UPDATES;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1.5",
        className
      )}
    >
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px] px-1.5 py-0 font-semibold border",
          projectStatusBadgeClass(status)
        )}
      >
        {getProjectStatusLabel(status)}
      </Badge>
      <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <StatChip label="Bugs" value={bugs.open} tone="bugs" emphasize={bugs.open > 0} />
        <StatChip
          label="Updates"
          value={updates.total}
          tone="updates"
          emphasize={updates.open > 0}
        />
        <StatChip
          label="Fixes"
          value={bugs.fixed}
          tone="fixes"
          emphasize={bugs.fixed > 0}
        />
      </span>
    </div>
  );
}

/** Shared list row: full wrapping name + status/counts underneath */
export function ProjectPickerListItemContent({
  name,
  selected,
  stats,
}: {
  name: string;
  selected: boolean;
  stats?: ProjectPickerStats | null;
}) {
  return (
    <>
      <Check
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="min-w-0 flex-1 space-y-1.5">
        <span className="block whitespace-normal break-words text-sm font-medium leading-snug">
          {name}
        </span>
        <ProjectPickerListMeta stats={stats} />
      </div>
    </>
  );
}
