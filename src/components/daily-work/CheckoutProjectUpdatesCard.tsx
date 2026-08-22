import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusDropdown } from '@/components/ui/StatusDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  allocationTotal,
  formatHoursShort,
  hoursTallyMatches,
  isGrowthGlimpseDay,
  type TimeAllocation,
} from '@/lib/checkoutTimeAllocation';
import type { ProjectWorkUpdate } from '@/lib/projectWorkUpdates';
import { projectWorkStatusLabel } from '@/lib/projectWorkUpdates';
import type { Project } from '@/services/projectService';
import { cn } from '@/lib/utils';
import { FolderKanban, Plus, X } from 'lucide-react';

type Props = {
  projects: Project[];
  plannedProjectIds: string[];
  assignableProjects: Project[];
  onAddProject: (projectId: string) => void;
  onRemoveProject?: (projectId: string) => void;
  projectUpdates: Record<string, ProjectWorkUpdate>;
  onChange: (projectId: string, patch: Partial<ProjectWorkUpdate>) => void;
  hoursToday: number;
  submissionDate: string;
  timeAllocation: TimeAllocation;
  onOtherHoursChange: (hours: number) => void;
  loading?: boolean;
};

function emptyUpdate(projectId: string): ProjectWorkUpdate {
  return {
    project_id: projectId,
    status: 'in_progress',
    progress_percentage: 0,
    notes: '',
    hours: 0,
  };
}

/**
 * Why: Checkout lists planned projects first, then lets the user add other
 * assigned (unplanned) projects they actually worked on.
 */
export function CheckoutProjectUpdatesCard({
  projects,
  plannedProjectIds,
  assignableProjects,
  onAddProject,
  onRemoveProject,
  projectUpdates,
  onChange,
  hoursToday,
  submissionDate,
  timeAllocation,
  onOtherHoursChange,
  loading = false,
}: Props) {
  const plannedSet = new Set(plannedProjectIds);
  const projectHours = projects.map((p) => projectUpdates[p.id]?.hours ?? 0);
  const allocated = allocationTotal(timeAllocation, projectHours);
  const target = Math.max(0, Number(hoursToday) || 0);
  const matched = hoursTallyMatches(target, timeAllocation, projectHours);
  const remaining = Math.round((target - allocated) * 10) / 10;
  const showGlimpse = isGrowthGlimpseDay(submissionDate);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-5 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-indigo-100 p-1.5 dark:bg-indigo-900/30">
            <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Hours &amp; Project Progress
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Planned projects first. Add any other assigned project you worked on. Totals must match{' '}
              {formatHoursShort(target)}h.
            </p>
          </div>
        </div>
        <div
          className={cn(
            'rounded-xl border px-3 py-2 text-right tabular-nums',
            matched
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200'
          )}
        >
          <p className="text-xs font-medium opacity-80">Allocated</p>
          <p className="text-sm font-semibold">
            {formatHoursShort(allocated)} / {formatHoursShort(target)}h
            {!matched ? (
              <span className="ms-1 font-normal">
                ({remaining > 0 ? `${formatHoursShort(remaining)}h left` : `${formatHoursShort(Math.abs(remaining))}h over`})
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FixedSlot label="Lunch" hours={timeAllocation.lunch_hours} />
        <FixedSlot label="Breaks" hours={timeAllocation.break_hours} />
        {showGlimpse ? (
          <FixedSlot label="Growth Glimpse" hours={timeAllocation.growth_glimpse_hours} />
        ) : (
          <FixedSlot label="Growth Glimpse" hours={0} muted="Not today" />
        )}
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/50">
          <Label
            htmlFor="checkout-other-hours"
            className="text-[11px] font-medium text-muted-foreground"
          >
            Other
          </Label>
          <div className="mt-1 flex items-center gap-1.5">
            <Input
              id="checkout-other-hours"
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={timeAllocation.other_hours}
              onChange={(e) => {
                const next = Math.max(0, Math.min(24, Number(e.target.value || 0)));
                onOtherHoursChange(Math.round(next * 10) / 10);
              }}
              className="h-9 border-gray-200 bg-white tabular-nums dark:border-gray-700 dark:bg-gray-900"
            />
            <span className="text-xs text-muted-foreground shrink-0">h</span>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mb-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          No projects on this checkout yet. Add an assigned project below, or check in with planned
          projects next time.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {projects.map((project) => {
            const update = projectUpdates[project.id] || emptyUpdate(project.id);
            const progress = Math.max(0, Math.min(100, Number(update.progress_percentage) || 0));
            const hours = Math.max(0, Math.min(24, Number(update.hours) || 0));
            const isPlanned = plannedSet.has(project.id);

            return (
              <div
                key={project.id}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {project.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px] font-semibold uppercase tracking-wide',
                          isPlanned
                            ? 'border-indigo-300/80 bg-indigo-50 text-indigo-800 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-200'
                            : 'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
                        )}
                      >
                        {isPlanned ? 'Planned' : 'Unplanned'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {projectWorkStatusLabel(update.status)} · {progress}%
                      {hours > 0 ? ` · ${formatHoursShort(hours)}h` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 sm:w-[140px]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {!isPlanned && onRemoveProject ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-xl text-muted-foreground hover:text-red-600"
                        onClick={() => onRemoveProject(project.id)}
                        aria-label={`Remove ${project.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 md:items-stretch">
                  <div className="col-span-12 flex flex-col gap-2 md:col-span-3">
                    <Label className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300">
                      Current Status
                    </Label>
                    <StatusDropdown
                      value={update.status}
                      onChange={(value) => onChange(project.id, { status: value })}
                      placeholder="Select status"
                      className="h-11 w-full"
                    />
                  </div>
                  <div className="col-span-6 flex flex-col gap-2 md:col-span-2">
                    <Label
                      htmlFor={`project-hours-${project.id}`}
                      className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300"
                    >
                      Hours
                    </Label>
                    <Input
                      id={`project-hours-${project.id}`}
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={hours}
                      onChange={(e) => {
                        const next = Math.max(0, Math.min(24, Number(e.target.value || 0)));
                        onChange(project.id, { hours: Math.round(next * 10) / 10 });
                      }}
                      className="h-11 border-2 border-gray-200 bg-white tabular-nums dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                  <div className="col-span-6 flex flex-col gap-2 md:col-span-2">
                    <Label
                      htmlFor={`project-progress-${project.id}`}
                      className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300"
                    >
                      Progress %
                    </Label>
                    <Input
                      id={`project-progress-${project.id}`}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={progress}
                      onChange={(e) => {
                        const next = Math.max(0, Math.min(100, Number(e.target.value || 0)));
                        onChange(project.id, { progress_percentage: Math.round(next) });
                      }}
                      className="h-11 border-2 border-gray-200 bg-white tabular-nums dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                  <div className="col-span-12 flex flex-col gap-2 md:col-span-5">
                    <Label
                      htmlFor={`project-notes-${project.id}`}
                      className="text-sm font-medium leading-5 text-gray-700 dark:text-gray-300"
                    >
                      Project Notes
                    </Label>
                    <Input
                      id={`project-notes-${project.id}`}
                      value={update.notes || ''}
                      onChange={(e) => onChange(project.id, { notes: e.target.value })}
                      placeholder="What did you accomplish on this project?"
                      className="h-11 border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assignableProjects.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label
              htmlFor="checkout-add-unplanned"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Add unplanned project (assigned to you)
            </Label>
            <Select
              key={assignableProjects.map((p) => p.id).join('|')}
              onValueChange={(value) => {
                if (value) onAddProject(value);
              }}
            >
              <SelectTrigger
                id="checkout-add-unplanned"
                className="h-11 rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
              >
                <SelectValue placeholder="Select an assigned project…" />
              </SelectTrigger>
              <SelectContent className="rounded-xl z-[80]">
                {assignableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id} className="rounded-lg">
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden h-11 items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 text-xs text-muted-foreground sm:flex dark:border-gray-600">
            <Plus className="h-3.5 w-3.5" />
            {assignableProjects.length} available
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FixedSlot({
  label,
  hours,
  muted,
}: {
  label: string;
  hours: number;
  muted?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900/50">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
        {muted && hours <= 0 ? (
          <span className="font-normal text-muted-foreground">{muted}</span>
        ) : (
          <>{formatHoursShort(hours)}h</>
        )}
      </p>
    </div>
  );
}

/** Exported for DailyWorkUpdate submit gating */
export function checkoutHoursAllocationOk(
  hoursToday: number,
  timeAllocation: TimeAllocation,
  projectUpdates: Record<string, ProjectWorkUpdate>,
  projectIds: string[]
): boolean {
  const projectHours = projectIds.map((id) => projectUpdates[id]?.hours ?? 0);
  return hoursTallyMatches(hoursToday, timeAllocation, projectHours);
}
