import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
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

export type ProjectPickerOption = {
  id: string;
  name: string;
  stats?: ProjectPickerStats | null;
};

/**
 * Why: Mobile project pickers must not auto-focus a search field — that opens
 * the OS keyboard and blocks the tap-to-select list (tester Report Bug flow).
 */
export function ProjectPickerSelectPanel({
  projects,
  selectedId,
  onSelect,
  searchPlaceholder = "Search projects...",
  emptyMessage = "No project found.",
}: {
  projects: ProjectPickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        className="max-h-[min(60vh,22rem)] overflow-y-auto flex flex-col gap-1 p-1"
        role="listbox"
        aria-label="Projects"
      >
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          projects.map((project) => {
            const stats = project.stats ?? {};
            return (
              <button
                key={project.id}
                type="button"
                role="option"
                aria-selected={selectedId === project.id}
                onClick={() => onSelect(project.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl px-2 py-2.5 text-left transition-colors",
                  "active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedId === project.id && "bg-accent"
                )}
              >
                <ProjectPickerListItemContent
                  name={project.name}
                  selected={selectedId === project.id}
                  stats={stats}
                />
              </button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        <CommandGroup>
          {projects.map((project) => {
            const stats = {
              status: project.stats?.status,
              bug_stats: project.stats?.bug_stats,
              update_stats: project.stats?.update_stats,
            };
            return (
              <CommandItem
                key={project.id}
                value={projectPickerSearchValue(project.name, project.id, stats)}
                onSelect={() => onSelect(project.id)}
                className="items-start gap-2 rounded-xl py-2.5"
              >
                <ProjectPickerListItemContent
                  name={project.name}
                  selected={selectedId === project.id}
                  stats={stats}
                />
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
