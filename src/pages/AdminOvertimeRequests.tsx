import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  listAllRequestSubmissions,
  normalizeAllRequestSubmissionsResponse,
  reviewOvertimeRequest,
} from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import { toLocalCalendarDateString } from '@/lib/dateUtils';
import { ENV } from '@/lib/env';
import { ArrowLeft, Clock, User, Check, X, Pencil, FileText, Timer } from 'lucide-react';

type Row = Record<string, unknown> & {
  id?: number;
  /** Int or UUID string depending on schema */
  user_id?: number | string;
  username?: string;
  role?: string;
  submission_date?: string;
  hours_today?: number;
  overtime_hours?: number;
  requested_extra_hours?: number;
  approval_reason?: string;
  extra_hours_approval_status?: string;
  extra_hours_approved_amount?: number;
  extra_hours_reviewed_at?: string;
  extra_hours_admin_note?: string;
  start_time?: string;
};

function getSubmissionWindow() {
  const base = new Date();
  const windowEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  const windowStart = new Date(base.getFullYear(), base.getMonth() - 11, 1);
  return {
    from: toLocalCalendarDateString(windowStart),
    to: toLocalCalendarDateString(windowEnd),
  };
}

function codoMonthKey(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  if (day <= 5) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getCodoPeriodForMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const startDate = `${y}-${String(m).padStart(2, '0')}-06`;
  let nextYear = y;
  let nextMonth = m + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = y + 1;
  }
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
  return { from: startDate, to: endDate };
}

function computeTotalsInRange(list: Row[], from: string, to: string) {
  const dateSet = new Set<string>();
  let hours = 0;
  for (const s of list) {
    const d = String(s.submission_date || '');
    if (!d) continue;
    if (d >= from && d <= to) {
      dateSet.add(d);
      hours += Number(s.hours_today || 0);
    }
  }
  return { days: dateSet.size, hours };
}

function formatDateForDisplay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const monthName = d.toLocaleDateString('en-IN', { month: 'long', timeZone: 'Asia/Kolkata' });
  const day = d.getDate();
  return `${monthName} ${day}`;
}

function monthTabLinesForList(key: string, list: Row[]) {
  const { from, to } = getCodoPeriodForMonth(key);
  const { days, hours } = computeTotalsInRange(list, from, to);
  const startDisplay = formatDateForDisplay(from);
  const endDisplay = formatDateForDisplay(to);
  return {
    full: `${startDisplay} to ${endDisplay} (${hours} hours) (${days} ${days === 1 ? 'day' : 'days'})`,
    compactTitle: `${startDisplay} → ${endDisplay}`,
    compactMeta: `${hours} h · ${days} ${days === 1 ? 'day' : 'days'}`,
  };
}

function statusPill(status: string | undefined) {
  const s = (status || 'none').toLowerCase();
  const base =
    'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize shrink-0';
  if (s === 'pending')
    return (
      <span className={`${base} bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200`}>
        Pending
      </span>
    );
  if (s === 'approved')
    return (
      <span className={`${base} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200`}>
        Approved
      </span>
    );
  if (s === 'rejected')
    return (
      <span className={`${base} bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200`}>
        Rejected
      </span>
    );
  if (s === 'changed')
    return (
      <span className={`${base} bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200`}>
        Changed
      </span>
    );
  return (
    <span className={`${base} bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200`}>{s}</span>
  );
}

export default function AdminOvertimeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId') || '';
  const monthParam = searchParams.get('month') || '';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [changeRow, setChangeRow] = useState<Row | null>(null);
  const [changeHours, setChangeHours] = useState('1');
  const [rejectRow, setRejectRow] = useState<Row | null>(null);
  const [approveRow, setApproveRow] = useState<Row | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewAdminNote, setReviewAdminNote] = useState('');
  const [queryWindow, setQueryWindow] = useState<{ from: string; to: string }>(() => getSubmissionWindow());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fallback = getSubmissionWindow();
      const res = await listAllRequestSubmissions({});
      const { submissions, window } = normalizeAllRequestSubmissionsResponse(res, fallback);
      setRows(submissions as Row[]);
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

  const byUser = useMemo(() => {
    const m = new Map<string, { userId: string; username: string; role: string; list: Row[]; pending: number }>();
    for (const r of rows) {
      const uid = String(r.user_id ?? '').trim();
      if (!uid) continue;
      const un = String(r.username || `User ${uid}`);
      const role = String(r.role || '');
      if (!m.has(uid)) {
        m.set(uid, { userId: uid, username: un, role, list: [], pending: 0 });
      }
      const g = m.get(uid)!;
      g.list.push(r);
      const st = String(r.extra_hours_approval_status || '').toLowerCase();
      if (st === 'pending') g.pending += 1;
    }
    return Array.from(m.values()).sort((a, b) =>
      a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
    );
  }, [rows]);

  const pendingTotal = useMemo(
    () =>
      rows.filter((r) => String(r.extra_hours_approval_status || '').toLowerCase() === 'pending').length,
    [rows]
  );

  const selectedUserId = userIdParam.trim();
  const selectedGroup = byUser.find((g) => g.userId === selectedUserId);

  const monthKeys = useMemo(() => {
    if (!selectedGroup) return [];
    const keys = new Set<string>();
    for (const r of selectedGroup.list) {
      const d = String(r.submission_date || '');
      if (d) keys.add(codoMonthKey(d));
    }
    return Array.from(keys).sort((a, b) => (a < b ? 1 : -1));
  }, [selectedGroup]);

  const activeMonth = monthParam && monthKeys.includes(monthParam) ? monthParam : monthKeys[0] || '';

  const visibleRows = useMemo(() => {
    if (!selectedGroup || !activeMonth) return [];
    const { from, to } = getCodoPeriodForMonth(activeMonth);
    return selectedGroup.list
      .filter((r) => {
        const d = String(r.submission_date || '');
        return d >= from && d <= to;
      })
      .sort((a, b) => String(b.submission_date).localeCompare(String(a.submission_date)));
  }, [selectedGroup, activeMonth]);

  const setUser = (uid: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('userId', uid);
    const list = rows.filter((r) => String(r.user_id ?? '').trim() === uid);
    const ks = new Set<string>();
    for (const r of list) {
      const d = String(r.submission_date || '');
      if (d) ks.add(codoMonthKey(d));
    }
    const sorted = Array.from(ks).sort((a, b) => (a < b ? 1 : -1));
    if (sorted[0]) p.set('month', sorted[0]);
    else p.delete('month');
    setSearchParams(p);
  };

  const setMonth = (mk: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('month', mk);
    setSearchParams(p);
  };

  const clearUser = () => {
    const p = new URLSearchParams(searchParams);
    p.delete('userId');
    p.delete('month');
    setSearchParams(p);
  };

  const onReview = async (
    row: Row,
    action: 'approve' | 'reject' | 'change',
    options?: { approvedHours?: number; adminNote?: string }
  ) => {
    const id = row.id as number;
    if (!id) return;
    setBusyId(id);
    try {
      const body: {
        id: number;
        action: 'approve' | 'reject' | 'change';
        approved_hours?: number;
        admin_note?: string;
      } = { id, action };
      if (action === 'change' && options?.approvedHours != null) {
        body.approved_hours = options.approvedHours;
      }
      if (action === 'reject' || action === 'change') {
        body.admin_note = (options?.adminNote ?? '').trim();
      }
      await reviewOvertimeRequest(body);
      toast({
        title: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Updated',
        description: `Submission ${row.submission_date}`,
      });
      await load();
      setChangeRow(null);
      setRejectRow(null);
      setApproveRow(null);
      setReviewAdminNote('');
    } catch (e) {
      toast({
        title: 'Action failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
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
        {/* Match DailyUpdate / Work Update professional header */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 lg:gap-6 min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
                  Pending, approved, rejected, and changed requests.
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
                    <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80"></div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {pendingTotal}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 min-w-0 gap-0">
              {/* Detail first in DOM so mobile (user selected) shows requests without an empty users row */}
              {selectedGroup ? (
                <div className="order-1 lg:order-2 lg:col-span-2 min-w-0 space-y-4 sm:space-y-5 lg:pl-6">
                  <button
                    type="button"
                    onClick={clearUser}
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl px-2 py-1.5 -ml-2 -mt-1 mb-2 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    All users
                  </button>
                  <div className="flex items-start gap-3 min-w-0 mb-1">
                    <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                      <Clock className="h-6 w-6 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                        {selectedGroup.username}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">
                        Choose a CODO period, then approve, reject, or set hours.
                      </p>
                    </div>
                  </div>

                  {monthKeys.length > 0 && (
                      <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2">
                        {monthKeys.map((mk) => {
                          const lines = monthTabLinesForList(mk, selectedGroup.list);
                          return (
                            <button
                              key={mk}
                              type="button"
                              onClick={() => setMonth(mk)}
                              className={`min-h-[3.5rem] w-full xs:flex-1 xs:min-w-[min(100%,14rem)] xs:max-w-full sm:max-w-[20rem] px-3.5 py-3 text-left rounded-xl border-2 transition-all duration-200 ${
                                activeMonth === mk
                                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-blue-600 shadow-lg'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <span
                                className={`hidden sm:block text-sm font-medium leading-snug ${activeMonth === mk ? 'text-white' : ''}`}
                              >
                                {lines.full}
                              </span>
                              <span className="sm:hidden flex flex-col gap-0.5 w-full min-w-0 text-left">
                                <span
                                  className={`text-sm font-semibold leading-snug break-words ${activeMonth === mk ? 'text-white' : ''}`}
                                >
                                  {lines.compactTitle}
                                </span>
                                <span
                                  className={`text-xs font-normal leading-snug ${activeMonth === mk ? 'text-white/90' : 'opacity-90'}`}
                                >
                                  {lines.compactMeta}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                  )}

                  {visibleRows.length === 0 ? (
                      <div className="text-center py-8 sm:py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-3">
                        <FileText className="h-9 w-9 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">No submissions for this month.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        {visibleRows.map((r) => {
                          const id = r.id as number;
                          const reqH = Number(r.requested_extra_hours || 0);
                          const ot = Number(r.overtime_hours || 0);
                          const appr = Number(r.extra_hours_approved_amount ?? 0);
                          return (
                            <div
                              key={id || String(r.submission_date)}
                              className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/90 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow min-w-0"
                            >
                              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-3 min-w-0">
                                <div className="min-w-0 flex-1 order-2 sm:order-1">
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white break-words tabular-nums">
                                    {String(r.submission_date)}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400 break-words mt-1 leading-relaxed">
                                    {r.start_time ? `Started at ${r.start_time}` : 'No start time'} •{' '}
                                    {Number(r.hours_today || 0)} h
                                    {ot > 0 && (
                                      <span className="ml-1.5 inline-flex items-center px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 rounded-md text-[11px] font-medium border border-orange-500/20">
                                        +{ot}h OT
                                      </span>
                                    )}
                                    {reqH > 0 && (
                                      <span className="ml-1.5 text-foreground/80">Req. +{reqH}h</span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 order-1 sm:order-2 self-start sm:self-auto">
                                  {statusPill(r.extra_hours_approval_status)}
                                </div>
                              </div>
                              {(r.approval_reason || '').toString().trim() ? (
                                <div className="max-h-36 sm:max-h-40 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3 border border-gray-200 dark:border-gray-700 mb-3">
                                  <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Approval reason
                                  </span>
                                  <p className="mt-1.5 text-xs sm:text-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-gray-800 dark:text-gray-200 leading-relaxed">
                                    {String(r.approval_reason)}
                                  </p>
                                </div>
                              ) : null}
                              {r.extra_hours_reviewed_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 [overflow-wrap:anywhere] break-words">
                                  Reviewed: {String(r.extra_hours_reviewed_at)}
                                  {r.extra_hours_admin_note ? ` — ${String(r.extra_hours_admin_note)}` : ''}
                                </p>
                              ) : null}
                              <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="xs:col-span-3 text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                                  Actions
                                </p>
                                <Button
                                  type="button"
                                  disabled={busyId === id}
                                  onClick={() => setApproveRow(r)}
                                  className="w-full h-10 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-md border-0"
                                >
                                  <Check className="h-4 w-4 mr-2 shrink-0" />
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  disabled={busyId === id}
                                  onClick={() => {
                                    setReviewAdminNote(String(r.extra_hours_admin_note ?? ''));
                                    setRejectRow(r);
                                  }}
                                  className="w-full h-10 rounded-xl font-medium"
                                >
                                  <X className="h-4 w-4 mr-2 shrink-0" />
                                  Reject
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={busyId === id}
                                  onClick={() => {
                                    const changeDefault =
                                      appr > 0 ? appr : reqH > 0 ? reqH : ot > 0 ? ot : 1;
                                    setChangeRow(r);
                                    setChangeHours(String(changeDefault));
                                    setReviewAdminNote(String(r.extra_hours_admin_note ?? ''));
                                  }}
                                  className="w-full h-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                  <Pencil className="h-4 w-4 mr-2 shrink-0" />
                                  Set hours
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  )}
                </div>
              ) : null}

              {/* Users: full width when none selected; sidebar on lg when reviewing a user */}
              <div
                className={`order-2 lg:order-1 min-w-0 ${
                  selectedGroup
                    ? 'hidden lg:block pb-0 lg:pr-6 lg:border-r border-gray-200/60 dark:border-gray-700/60'
                    : 'pb-2 w-full max-w-2xl mx-auto'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                    <User className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-snug">
                      With a stored extra-hour request — tap one to review by CODO month
                    </p>
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    <div className="h-[3.25rem] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    <div className="h-[3.25rem] bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                  </div>
                ) : byUser.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-3">
                    <FileText className="h-9 w-9 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No extra-hour requests in this window.</p>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 px-1 mt-3 max-w-md mx-auto leading-relaxed text-left sm:text-center break-words">
                      API range: {queryWindow.from} → {queryWindow.to}. Endpoint{' '}
                      <span className="font-mono [overflow-wrap:anywhere]">{ENV.API_URL}/tasks/all_request_submissions.php</span>
                      . If your DB client points elsewhere, set <span className="font-mono">VITE_API_URL</span>.
                    </p>
                  </div>
                ) : (
                  <ScrollArea
                    className={
                      selectedGroup
                        ? 'h-[min(240px,42dvh)] xs:h-[min(300px,46dvh)] sm:h-[min(360px,50vh)] lg:max-h-[min(420px,55vh)] pr-2 sm:pr-3'
                        : 'h-[min(320px,52dvh)] sm:h-[min(400px,58dvh)] lg:h-[min(520px,72vh)] pr-2 sm:pr-3'
                    }
                  >
                    <div className="space-y-2 pb-1">
                      {byUser.map((g) => (
                        <button
                          key={g.userId}
                          type="button"
                          onClick={() => setUser(g.userId)}
                          className={`w-full text-left rounded-xl border-2 px-3 py-3 min-h-[3.25rem] active:scale-[0.99] transition-all duration-200 ${
                            selectedUserId === g.userId
                              ? 'border-blue-600 bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div
                            className={`font-semibold text-sm [overflow-wrap:anywhere] break-words ${selectedUserId === g.userId ? 'text-white' : ''}`}
                          >
                            {g.username}
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
                            <span
                              className={`font-medium tracking-wide ${selectedUserId === g.userId ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              {g.role.toUpperCase()}
                            </span>
                            {g.pending > 0 ? (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                  selectedUserId === g.userId
                                    ? 'bg-white/15 text-white border-white/30'
                                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-200/80 dark:border-amber-800/50'
                                }`}
                              >
                                {g.pending} pending
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog
        open={!!approveRow}
        onOpenChange={(o) => {
          if (!o) setApproveRow(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-xl md:max-w-2xl max-h-[min(92dvh,44rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-5 sm:p-6 gap-4 shadow-xl">
          <AlertDialogHeader className="text-left space-y-1.5 sm:space-y-2">
            <AlertDialogTitle className="text-foreground text-lg font-semibold tracking-tight pr-6">
              Approve extra hours?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed text-left">
              Confirm approval for{' '}
              <span className="font-semibold text-foreground">
                {approveRow ? String(approveRow.submission_date) : ''}
              </span>
              . Overtime will follow the requested amount when set (otherwise current stored OT), and will count in
              period totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {approveRow ? (
            <ul className="list-disc pl-5 text-xs sm:text-sm text-muted-foreground space-y-0.5 -mt-1">
              <li>
                Requested extra:{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {Number(approveRow.requested_extra_hours || 0) > 0
                    ? `${Number(approveRow.requested_extra_hours)}h`
                    : '—'}
                </span>
              </li>
              <li>
                Current OT on record:{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {Number(approveRow.overtime_hours || 0)}h
                </span>
              </li>
            </ul>
          ) : null}
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 mt-2 border-t border-border/60">
            <AlertDialogCancel className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] mt-0 h-10 border border-border/80 bg-background font-medium text-foreground shadow-none hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={approveRow != null && busyId === (approveRow.id as number)}
              className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] h-10 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600 disabled:opacity-60 border-0 font-medium"
              onClick={(e) => {
                e.preventDefault();
                if (approveRow) onReview(approveRow, 'approve');
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!changeRow}
        onOpenChange={(o) => {
          if (!o) {
            setChangeRow(null);
            setReviewAdminNote('');
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-xl md:max-w-2xl max-h-[min(92dvh,44rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-5 sm:p-6 gap-4 shadow-xl">
          <AlertDialogHeader className="text-left space-y-1.5 sm:space-y-2">
            <AlertDialogTitle className="text-foreground text-lg font-semibold tracking-tight pr-6">
              Set approved overtime hours
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed text-left">
              Updates status to &quot;changed&quot; and sets overtime for{' '}
              {changeRow ? String(changeRow.submission_date) : ''}. Range 0.25–16 hours. You can run this again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="chg-h" className="text-foreground text-sm font-medium">
                Approved OT hours
              </Label>
              <Input
                id="chg-h"
                type="number"
                step="0.25"
                min={0.25}
                max={16}
                value={changeHours}
                onChange={(e) => setChangeHours(e.target.value)}
                className="mt-1.5 rounded-lg border-border bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="chg-note" className="text-foreground text-sm font-medium">
                Admin note (optional)
              </Label>
              <Textarea
                id="chg-note"
                value={reviewAdminNote}
                onChange={(e) => setReviewAdminNote(e.target.value)}
                rows={3}
                placeholder="Visible on the submission record…"
                className="mt-1.5 rounded-lg border-border bg-background resize-y min-h-[72px]"
              />
            </div>
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2 border-t border-border/60 mt-1">
            <AlertDialogCancel className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] mt-0 h-10 border border-border/80 bg-background font-medium text-foreground shadow-none hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] h-10 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600 border-0 font-medium"
              onClick={(e) => {
                e.preventDefault();
                if (!changeRow) return;
                const n = parseFloat(changeHours);
                if (Number.isNaN(n) || n < 0.25 || n > 16) {
                  toast({ title: 'Invalid hours', variant: 'destructive' });
                  return;
                }
                onReview(changeRow, 'change', { approvedHours: n, adminNote: reviewAdminNote });
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!rejectRow}
        onOpenChange={(o) => {
          if (!o) {
            setRejectRow(null);
            setReviewAdminNote('');
          }
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-xl md:max-w-2xl max-h-[min(92dvh,44rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-5 sm:p-6 gap-4 shadow-xl">
          <AlertDialogHeader className="text-left space-y-1.5 sm:space-y-2">
            <AlertDialogTitle className="text-foreground text-lg font-semibold tracking-tight pr-6">Reject extra hours?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed text-left">
              Overtime for this date will be set to 0 and will not count in totals. You can approve again later if
              needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5 py-1">
            <Label htmlFor="rej-note" className="text-foreground text-sm font-medium">
              Admin note (optional)
            </Label>
            <Textarea
              id="rej-note"
              value={reviewAdminNote}
              onChange={(e) => setReviewAdminNote(e.target.value)}
              rows={3}
              className="mt-1.5 rounded-lg border-border bg-background resize-y min-h-[72px]"
            />
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-2 border-t border-border/60 mt-1">
            <AlertDialogCancel className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] mt-0 h-10 border border-border/80 bg-background font-medium text-foreground shadow-none hover:bg-muted hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] h-10 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive border-0 font-medium"
              onClick={(e) => {
                e.preventDefault();
                if (rejectRow) onReview(rejectRow, 'reject', { adminNote: reviewAdminNote });
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
