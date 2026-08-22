import type { QueryClient } from '@tanstack/react-query';
import type { Bug } from '@/types';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';

type BugListCache = {
  bugs?: Bug[];
  pagination?: {
    totalBugs?: number;
    totalPages?: number;
    limit?: number;
    pendingBugsCount?: number;
    counts?: {
      open?: number;
      myOpen?: number;
      fixed?: number;
      declined?: number;
      rejected?: number;
    };
  };
};

function isOpenBugStatus(status?: string): boolean {
  return status === 'pending' || status === 'in_progress';
}

/**
 * Why: After delete, the bugs list must drop the row immediately instead of
 * waiting for a manual refresh while React Query serves cached list data.
 */
export function removeBugFromListCaches(
  queryClient: QueryClient,
  bugId: string,
  bug?: Pick<Bug, 'status' | 'reported_by'>
): void {
  queryClient.setQueriesData<BugListCache>({ queryKey: ['bugs'] }, (old) => {
    if (!old?.bugs?.length) return old;
    if (!old.bugs.some((item) => item.id === bugId)) return old;

    const bugs = old.bugs.filter((item) => item.id !== bugId);
    if (!old.pagination) {
      return { ...old, bugs };
    }

    const totalBugs = Math.max(0, (old.pagination.totalBugs ?? bugs.length) - 1);
    const limit = old.pagination.limit ?? 10;
    const pagination = {
      ...old.pagination,
      totalBugs,
      totalPages: Math.max(1, Math.ceil(totalBugs / limit)),
    };

    if (bug?.status && pagination.counts) {
      const counts = { ...pagination.counts };
      if (isOpenBugStatus(bug.status)) {
        counts.open = Math.max(0, (counts.open ?? 0) - 1);
      }
      if (bug.status === 'fixed' || bug.status === 'rejected') {
        counts.fixed = Math.max(0, (counts.fixed ?? 0) - 1);
      }
      pagination.counts = counts;
      if (typeof pagination.pendingBugsCount === 'number' && isOpenBugStatus(bug.status)) {
        pagination.pendingBugsCount = Math.max(0, pagination.pendingBugsCount - 1);
      }
    }

    return { ...old, bugs, pagination };
  });
}

export async function syncBugListAfterDelete(
  queryClient: QueryClient,
  bugId: string,
  bug?: Pick<Bug, 'status' | 'reported_by'>
): Promise<void> {
  removeBugFromListCaches(queryClient, bugId, bug);
  queryClient.removeQueries({ queryKey: ['bug', bugId] });
  queryClient.removeQueries({ queryKey: ['bugLifecycle', bugId] });
  notifyAdminNavCountsChanged();

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['bugs'] }),
    queryClient.invalidateQueries({ queryKey: ['fixes'] }),
    queryClient.invalidateQueries({ queryKey: ['commonBugs'] }),
    queryClient.invalidateQueries({ queryKey: ['userProfilePortfolio'] }),
  ]);
}
