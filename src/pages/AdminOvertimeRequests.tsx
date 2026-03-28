import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  listAllRequestSubmissions,
  reviewOvertimeRequest,
} from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Clock, User, Check, X, Pencil, FileText } from 'lucide-react';

type Row = Record<string, unknown> & {
  id?: number;
  user_id?: number;
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
    from: windowStart.toISOString().slice(0, 10),
    to: windowEnd.toISOString().slice(0, 10),
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

function parseRows(res: unknown): Row[] {
  if (!res || typeof res !== 'object') return [];
  const o = res as { data?: unknown };
  const d = o.data;
  if (Array.isArray(d)) return d as Row[];
  if (Array.isArray(res)) return res as Row[];
  return [];
}

function statusPill(status: string | undefined) {
  const s = (status || 'none').toLowerCase();
  const base =
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize';
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
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getSubmissionWindow();
      const res = await listAllRequestSubmissions({ from, to });
      setRows(parseRows(res));
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

  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    load();
  }, [currentUser?.role, load]);

  const byUser = useMemo(() => {
    const m = new Map<
      number,
      { userId: number; username: string; role: string; list: Row[]; pending: number }
    >();
    for (const r of rows) {
      const uid = Number(r.user_id);
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

  const selectedUserId = userIdParam ? Number(userIdParam) : 0;
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

  const setUser = (uid: number) => {
    const p = new URLSearchParams(searchParams);
    p.set('userId', String(uid));
    const list = rows.filter((r) => Number(r.user_id) === uid);
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

  const onReview = async (
    row: Row,
    action: 'approve' | 'reject' | 'change',
    approvedHours?: number
  ) => {
    const id = row.id as number;
    if (!id) return;
    setBusyId(id);
    try {
      await reviewOvertimeRequest({
        id,
        action,
        ...(action === 'change' && approvedHours != null ? { approved_hours: approvedHours } : {}),
      });
      toast({
        title: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Updated',
        description: `Submission ${row.submission_date}`,
      });
      await load();
      setChangeRow(null);
      setRejectRow(null);
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

  if (currentUser?.role !== 'admin') {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-6">
          <p className="text-gray-600 dark:text-gray-400">Admin access required.</p>
          <Button
            className="mt-4 rounded-xl"
            variant="outline"
            onClick={() => navigate(`/${currentUser?.role}/projects`)}
          >
            Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        {/* Header — same back control + title layout as Daily Work Update */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6 shadow-sm min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate(`/${currentUser.role}/daily-update`)}
                className="p-1.5 shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Back to BugUpdate"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white min-w-0 break-words">
                Extra-hour requests
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 pl-9 sm:ml-11 sm:pl-0">
              All roles — review pending overtime by user and CODO month. Rejected requests store 0 overtime hours.
            </p>
          </div>
        </div>

        {/* Main panel — matches Saved Submissions card */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10 min-w-0">
              {/* Users column */}
              <div className="min-w-0 lg:border-r lg:border-gray-200/60 dark:lg:border-gray-700/60 lg:pr-8">
                <div className="flex gap-3 min-w-0 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      Users
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">
                      Anyone with an extra-hour request in the last 12 months
                    </p>
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                    <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                  </div>
                ) : byUser.length === 0 ? (
                  <div className="text-center py-10 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-60" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 px-4">
                      No extra-hour requests in this window.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[min(420px,52vh)] pr-3">
                    <div className="space-y-2">
                      {byUser.map((g) => (
                        <button
                          key={g.userId}
                          type="button"
                          onClick={() => setUser(g.userId)}
                          className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                            selectedUserId === g.userId
                              ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-blue-600 shadow-lg'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="font-semibold text-sm truncate">{g.username}</div>
                          <div className="flex items-center justify-between gap-2 mt-1 text-xs opacity-90">
                            <span className={selectedUserId === g.userId ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}>
                              {g.role.toUpperCase()}
                            </span>
                            {g.pending > 0 ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  selectedUserId === g.userId
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
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

              {/* Detail column */}
              <div className="lg:col-span-2 min-w-0 space-y-6">
                <div className="flex gap-3 min-w-0">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 pt-0.5 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white break-words">
                      {selectedGroup ? selectedGroup.username : 'Select a user'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">
                      {selectedGroup
                        ? 'Pick a CODO period, then approve, reject, or change approved overtime.'
                        : 'Choose a user on the left to see their requests by month.'}
                    </p>
                  </div>
                </div>

                {!selectedGroup ? (
                  <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <Clock className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-60" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose a user to see requests by CODO month.</p>
                  </div>
                ) : (
                  <>
                    {monthKeys.length > 0 && (
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3">
                        {monthKeys.map((mk) => {
                          const lines = monthTabLinesForList(mk, selectedGroup.list);
                          return (
                            <button
                              key={mk}
                              type="button"
                              onClick={() => setMonth(mk)}
                              className={`min-h-[4.25rem] flex-1 min-w-[calc(100%-0.5rem)] xs:min-w-[12rem] sm:min-w-[14rem] max-w-full sm:max-w-[20rem] px-4 py-3 text-left sm:text-center rounded-xl border-2 transition-all duration-200 ${
                                activeMonth === mk
                                  ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-blue-600 shadow-lg'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <span className="hidden sm:block text-sm font-medium leading-snug whitespace-normal">
                                {lines.full}
                              </span>
                              <span className="sm:hidden flex flex-col gap-1 w-full min-w-0">
                                <span className="text-sm font-semibold leading-snug break-words">
                                  {lines.compactTitle}
                                </span>
                                <span className="text-xs font-normal opacity-90 leading-snug">{lines.compactMeta}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {visibleRows.length === 0 ? (
                      <div className="text-center py-10 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30">
                        <FileText className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-60" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No submissions for this month.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        {visibleRows.map((r) => {
                          const id = r.id as number;
                          const pending =
                            String(r.extra_hours_approval_status || '').toLowerCase() === 'pending';
                          const reqH = Number(r.requested_extra_hours || 0);
                          const ot = Number(r.overtime_hours || 0);
                          return (
                            <div
                              key={id || String(r.submission_date)}
                              className="bg-white/60 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 min-w-0"
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 mb-3 min-w-0">
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-sm text-gray-900 dark:text-white break-words">
                                    {String(r.submission_date)}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 break-words mt-1">
                                    {r.start_time ? `Started at ${r.start_time}` : 'No start time'} •{' '}
                                    {Number(r.hours_today || 0)} hours
                                    {ot > 0 && (
                                      <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
                                        +{ot}h OT
                                      </span>
                                    )}
                                    {reqH > 0 && (
                                      <span className="ml-2 text-gray-600 dark:text-gray-300">
                                        Requested +{reqH}h
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0">{statusPill(r.extra_hours_approval_status)}</div>
                              </div>
                              {(r.approval_reason || '').toString().trim() ? (
                                <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-3 border border-gray-200/60 dark:border-gray-700/60 mb-3">
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Approval reason</span>
                                  <p className="mt-1 text-xs sm:text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                                    {String(r.approval_reason)}
                                  </p>
                                </div>
                              ) : null}
                              {r.extra_hours_reviewed_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  Reviewed: {String(r.extra_hours_reviewed_at)}
                                  {r.extra_hours_admin_note ? ` — ${String(r.extra_hours_admin_note)}` : ''}
                                </p>
                              ) : null}
                              {pending ? (
                                <div className="flex flex-col xs:flex-row flex-wrap gap-2 pt-1">
                                  <Button
                                    type="button"
                                    disabled={busyId === id}
                                    onClick={() => onReview(r, 'approve')}
                                    className="w-full xs:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold shadow-md"
                                  >
                                    <Check className="h-4 w-4 mr-2 shrink-0" />
                                    Approve
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    disabled={busyId === id}
                                    onClick={() => setRejectRow(r)}
                                    className="w-full xs:w-auto rounded-xl"
                                  >
                                    <X className="h-4 w-4 mr-2 shrink-0" />
                                    Reject
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={busyId === id}
                                    onClick={() => {
                                      setChangeRow(r);
                                      setChangeHours(String(reqH > 0 ? reqH : ot > 0 ? ot : 1));
                                    }}
                                    className="w-full xs:w-auto rounded-xl border-2"
                                  >
                                    <Pencil className="h-4 w-4 mr-2 shrink-0" />
                                    Change
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <AlertDialog open={!!changeRow} onOpenChange={(o) => !o && setChangeRow(null)}>
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Set approved overtime hours</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This updates stored overtime for {changeRow ? String(changeRow.submission_date) : ''}. Range 0.25–16 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="chg-h" className="text-gray-700 dark:text-gray-300">
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
              className="mt-1 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
            />
          </div>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
              onClick={(e) => {
                e.preventDefault();
                if (!changeRow) return;
                const n = parseFloat(changeHours);
                if (Number.isNaN(n) || n < 0.25 || n > 16) {
                  toast({ title: 'Invalid hours', variant: 'destructive' });
                  return;
                }
                onReview(changeRow, 'change', n);
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!rejectRow} onOpenChange={(o) => !o && setRejectRow(null)}>
        <AlertDialogContent className="rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Reject extra hours?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Overtime for this date will be set to 0 and will not count in totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (rejectRow) onReview(rejectRow, 'reject');
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
