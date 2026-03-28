import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { listAllRequestSubmissions, normalizeAllRequestSubmissionsResponse } from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';
import {
  type UserRequestGroup,
  codoMonthKey,
  getSubmissionWindow,
  groupRowsByUser,
  type OvertimeRow,
} from '@/pages/adminOvertimeShared';
import { ArrowLeft, ChevronRight, FileText, Timer, User } from 'lucide-react';

function userSubmissionDateRange(g: UserRequestGroup): { min: string; max: string } | null {
  const dates = g.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
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
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 lg:gap-6 min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/${currentUser.role}/daily-update`)}
                    className="p-2 shrink-0 rounded-xl border border-gray-200/80 dark:border-gray-700/80 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors"
                    aria-label="Back to Work Update"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <Timer className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      Extra-hour requests
                    </h1>
                    <div className="h-1 w-24 sm:w-28 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl leading-relaxed">
                  Pick a user to open their requests on a dedicated page. Pending, approved, rejected, and changed
                  flow; uses the API server clock and a wide date range.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 w-full min-w-0 lg:w-auto lg:shrink-0">
                <Button
                  type="button"
                  onClick={() => navigate(`/${currentUser.role}/daily-update`)}
                  className="h-12 w-full min-w-0 px-4 sm:w-auto sm:px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 sm:hover:scale-105 rounded-xl"
                >
                  <ArrowLeft className="mr-2 h-5 w-5 shrink-0" />
                  Back to Work Update
                </Button>
                <div className="flex items-center justify-center sm:justify-start gap-3 px-4 py-3 w-full sm:w-auto min-w-0 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                    <Timer className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div className="text-center sm:text-left min-w-0">
                    <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">Pending reviews</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{pendingTotal}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {byUser.length} {byUser.length === 1 ? 'user' : 'users'} with requests
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40 min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 pointer-events-none" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10 min-w-0">
            <div className="flex items-start gap-3 min-w-0 mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                <User className="h-6 w-6 text-white" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-snug max-w-3xl">
                  Each card summarizes extra-hour activity. Click a user to review and act on submissions by CODO month.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : byUser.length === 0 ? (
              <div className="text-center py-10 sm:py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-3">
                <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No extra-hour requests in this window.</p>
                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 px-1 mt-3 max-w-md mx-auto leading-relaxed text-left sm:text-center break-words">
                  API range: {queryWindow.from} → {queryWindow.to}. Endpoint{' '}
                  <span className="font-mono [overflow-wrap:anywhere]">{ENV.API_URL}/tasks/all_request_submissions.php</span>
                  . If your DB client points elsewhere, set <span className="font-mono">VITE_API_URL</span>.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {byUser.map((g) => {
                  const range = userSubmissionDateRange(g);
                  const codoMonths = new Set(
                    g.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).map(codoMonthKey)
                  );
                  const monthCount = codoMonths.size;
                  return (
                    <button
                      key={g.userId}
                      type="button"
                      onClick={() => openUser(g.userId)}
                      className="group text-left rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/40 transition-all duration-200 min-w-0 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-base sm:text-lg text-gray-900 dark:text-white [overflow-wrap:anywhere] break-words">
                            {g.username}
                          </p>
                          <p className="text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400 mt-1">
                            {g.role.toUpperCase()}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors mt-0.5" aria-hidden />
                      </div>
                      <p className="text-[11px] sm:text-xs font-mono text-gray-500 dark:text-gray-400 [overflow-wrap:anywhere] break-all leading-snug">
                        ID: {g.userId}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-900/80 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                          {g.list.length} submission{g.list.length === 1 ? '' : 's'}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-900/80 px-2.5 py-1 font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                          {monthCount} CODO month{monthCount === 1 ? '' : 's'}
                        </span>
                        {g.pending > 0 ? (
                          <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 font-semibold text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
                            {g.pending} pending
                          </span>
                        ) : null}
                      </div>
                      {range ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          Dates in window: <span className="font-medium text-gray-700 dark:text-gray-300">{range.min}</span>
                          {' → '}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{range.max}</span>
                        </p>
                      ) : null}
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline pt-1">
                        Open requests →
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
