import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { projectWorkStatusLabel } from '@/lib/projectWorkUpdates';
import { projectService } from '@/services/projectService';
import { FolderKanban, UserRound } from 'lucide-react';

type Props = {
  projectId: string;
};

export function ProjectWorkActivityOverview({ projectId }: Props) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<
    Array<{
      submission_date: string;
      username: string;
      status: string;
      progress_percentage: number;
      notes: string;
      hours_today: number;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await projectService.getProjectWorkActivity(projectId);
        if (!cancelled) {
          setEntries((res.entries || []).slice(0, 8));
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-blue-50/20 dark:from-indigo-950/20 dark:to-blue-950/10" />
      <div className="relative p-4 sm:p-5 lg:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md sm:h-10 sm:w-10">
            <FolderKanban className="h-4 w-4 text-white sm:h-5 sm:w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
              Team Work Updates
            </h3>
            <p className="text-xs text-muted-foreground">Recent checkout progress reported on this project</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-muted-foreground dark:border-gray-700">
            No project progress updates yet. Updates appear here after team members complete checkout.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div
                key={`${entry.submission_date}-${entry.username}-${idx}`}
                className="rounded-xl border border-gray-200/70 bg-white/70 p-4 dark:border-gray-700/70 dark:bg-gray-800/40"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    {entry.username}
                  </div>
                  <span className="text-xs text-muted-foreground">{entry.submission_date}</span>
                </div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">
                    {projectWorkStatusLabel(entry.status)}
                  </Badge>
                  <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {entry.progress_percentage}%
                  </Badge>
                  {entry.hours_today > 0 ? (
                    <span className="text-xs text-muted-foreground">{entry.hours_today}h that day</span>
                  ) : null}
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-600"
                    style={{ width: `${Math.max(0, Math.min(100, entry.progress_percentage))}%` }}
                  />
                </div>
                {entry.notes ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">{entry.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
