import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusDropdown, type StatusOption } from '@/components/ui/StatusDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProjectWorkUpdate } from '@/lib/projectWorkUpdates';
import { projectWorkStatusLabel } from '@/lib/projectWorkUpdates';
import type { Project } from '@/services/projectService';
import { FolderKanban } from 'lucide-react';

type Props = {
  projects: Project[];
  projectUpdates: Record<string, ProjectWorkUpdate>;
  onChange: (projectId: string, patch: Partial<ProjectWorkUpdate>) => void;
  loading?: boolean;
};

export function CheckoutProjectUpdatesCard({
  projects,
  projectUpdates,
  onChange,
  loading = false,
}: Props) {
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

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-gray-800">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <FolderKanban className="h-5 w-5 shrink-0" />
          No projects available. Check in with projects selected to update progress here.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-indigo-100 p-1.5 dark:bg-indigo-900/30">
          <FolderKanban className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Project Progress</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Update status, progress, and notes for each project you worked on today
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {projects.map((project) => {
          const update = projectUpdates[project.id] || {
            project_id: project.id,
            status: 'in_progress' as StatusOption,
            progress_percentage: 0,
            notes: '',
          };
          const progress = Math.max(0, Math.min(100, Number(update.progress_percentage) || 0));

          return (
            <div
              key={project.id}
              className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{project.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {projectWorkStatusLabel(update.status)} · {progress}%
                  </p>
                </div>
                <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 sm:w-[140px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch">
                <div className="flex flex-col gap-2">
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
                <div className="flex flex-col gap-2">
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
                      onChange(project.id, { progress_percentage: next });
                    }}
                    className="h-11 border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div className="flex flex-col gap-2">
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
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
