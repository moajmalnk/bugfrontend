import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listAllRequestSubmissions, normalizeAllRequestSubmissionsResponse } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';
import {
  type UserRequestGroup,
  codoMonthKey,
  getSubmissionWindow,
  groupRowsByUser,
  type OvertimeRow,
} from '@/pages/adminOvertimeShared';
import { ArrowLeft, ChevronRight, FileText, Timer, User, Users } from 'lucide-react';

function userSubmissionDateRange(g: UserRequestGroup): { min: string; max: string } | null {
  const dates = g.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
}

function UserRequestCard({
  group,
  onOpen,
}: {
  group: UserRequestGroup;
  onOpen: () => void;
}) {
  const range = userSubmissionDateRange(group);
  const codoMonths = new Set(
    group.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).map(codoMonthKey)
  );
  const monthCount = codoMonths.size;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6 text-left shadow-lg transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-300/50 dark:hover:border-blue-700/50"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      {group.pending > 0 && (
        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-amber-500 shadow-lg" aria-hidden />
      )}

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {group.username}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {group.role}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-blue-500" />
        </div>

        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
          ID: {group.userId}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            {group.list.length} submission{group.list.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {monthCount} month{monthCount === 1 ? '' : 's'}
          </span>
          {group.pending > 0 && (
            <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
              {group.pending} pending
            </span>
          )}
        </div>

        {range && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 p-3">
            <div className="rounded-lg bg-blue-500 p-1.5 shrink-0">
              <Timer className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.min}</span>
              {' → '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.max}</span>
            </div>
          </div>
        )}

        <span className="inline-flex text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
          Open requests →
        </span>
      </div>
    </button>
  );
}

export default function AdminOvertimeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [queryWindow, setQueryWindow] = useState<{ from: string; to: string }>(() => getSubmissionWindow());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fallback = getSubmissionWindow();
      const res = await listAllRequestSubmissions({});
      const { submissions, window } = normalizeAllRequestSubmissionsResponse(res, fallback);
      setRows(submissions as OvertimeRow[]);
      setQueryWindow(window);
    } catch (e) {
      toast({
        title: 'Failed to load requests',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const isAdmin = (currentUser?.role || '').toLowerCase() === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  const byUser = useMemo(() => groupRowsByUser(rows), [rows]);

  const pendingTotal = useMemo(
    () => rows.filter((r) => String(r.extra_hours_approval_status || '').toLowerCase() === 'pending').length,
    [rows]
  );

  const openUser = (userId: string) => {
    const enc = encodeURIComponent(userId);
    navigate(`/${currentUser?.role}/overtime-requests/${enc}`);
  };

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-6 sm:px-6">
        <div className="max-w-lg mx-auto rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button className="mt-4 rounded-lg w-full sm:w-auto" variant="outline" onClick={() => navigate(`/${currentUser?.role}/projects`)}>
            Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/${currentUser.role}/daily-update`)}
                    className="shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                    aria-label="Back to Work Update"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      OT Requests
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Pick a user to open their requests on a dedicated page.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                      <Timer className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                        Pending
                      </div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                        {pendingTotal}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
                        Users
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums leading-none">
                        {byUser.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1 max-w-3xl">
                  Each card summarizes extra-hour activity. Click a user to review and act on submissions by month.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-2xl" />
                ))}
              </div>
            ) : byUser.length === 0 ? (
              <div className="text-center py-12 sm:py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-4">
                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">No extra-hour requests in this window.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto leading-relaxed break-words">
                  API range: {queryWindow.from} → {queryWindow.to}. Endpoint{' '}
                  <span className="font-mono">{ENV.API_URL}/tasks/all_request_submissions.php</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {byUser.map((g) => (
                  <UserRequestCard key={g.userId} group={g} onOpen={() => openUser(g.userId)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
