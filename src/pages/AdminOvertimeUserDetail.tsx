import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  deleteSubmission,
  listAllRequestSubmissions,
  normalizeAllRequestSubmissionsResponse,
  reviewOvertimeRequest,
} from '@/services/todoService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  type OvertimeRow,
  codoMonthKey,
  getCodoPeriodForMonth,
  getSubmissionWindow,
  groupRowsByUser,
  monthTabLinesForList,
  formatSubmissionRequestedAt,
  statusPill,
} from '@/pages/adminOvertimeShared';
import { ArrowLeft, Check, Clock, FileText, Pencil, Timer, Trash2, X } from 'lucide-react';

export default function AdminOvertimeUserDetail() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month') || '';

  const routeUserId = (userIdParam || '').trim();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [changeRow, setChangeRow] = useState<OvertimeRow | null>(null);
  const [changeHours, setChangeHours] = useState('1');
  const [rejectRow, setRejectRow] = useState<OvertimeRow | null>(null);
  const [approveRow, setApproveRow] = useState<OvertimeRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewAdminNote, setReviewAdminNote] = useState('');
  const [deleteRow, setDeleteRow] = useState<OvertimeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fallback = getSubmissionWindow();
      const res = await listAllRequestSubmissions({});
      const { submissions } = normalizeAllRequestSubmissionsResponse(res, fallback);
      setRows(submissions as OvertimeRow[]);
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
  const selectedGroup = byUser.find((g) => g.userId === routeUserId);

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

  const setMonth = (mk: string) => {
    const p = new URLSearchParams(searchParams);
    p.set('month', mk);
    setSearchParams(p);
  };

  const backToList = () => navigate(`/${currentUser?.role}/overtime-requests`);

  const onConfirmDelete = async () => {
    if (!deleteRow?.id) return;
    setDeleting(true);
    try {
      await deleteSubmission({ id: deleteRow.id as number });
      toast({ title: 'Submission deleted', description: String(deleteRow.submission_date) });
      setDeleteRow(null);
      await load();
    } catch (e) {
      toast({
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const onReview = async (
    row: OvertimeRow,
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

  if (!routeUserId) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <div className="max-w-2xl mx-auto text-center py-12 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 p-6">
          <p className="text-gray-600 dark:text-gray-400">Missing user.</p>
          <Button className="mt-4 rounded-xl" onClick={backToList}>
            All users
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                  <Timer className="h-6 w-6 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                    {loading ? 'Loading…' : selectedGroup ? selectedGroup.username : 'User not found'}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  {selectedGroup ? (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{selectedGroup.role.toUpperCase()}</span>
                      <span className="mx-2 text-gray-400">·</span>
                      <span className="font-mono text-xs [overflow-wrap:anywhere] break-all">{selectedGroup.userId}</span>
                    </p>
                  ) : !loading ? (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">No extra-hour rows for this user in the current API window.</p>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                onClick={backToList}
                className="h-11 w-full sm:w-auto shrink-0 px-5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                All users
              </Button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40 min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 pointer-events-none" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10 min-w-0">
            {loading ? (
              <div className="space-y-3">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              </div>
            ) : !selectedGroup ? (
              <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-3">
                <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">This user has no extra-hour requests in the loaded window.</p>
                <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={backToList}>
                  Back to users
                </Button>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl shadow-lg ring-4 ring-blue-600/20 shrink-0 self-start">
                    <Clock className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Requests by CODO month</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 leading-relaxed">
                      Choose a period, then approve, reject, or set approved overtime hours.
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
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white tabular-nums shrink-0 [overflow-wrap:anywhere] break-words">
                                  {formatSubmissionRequestedAt(String(r.submission_date || ''), r.created_at, r.check_in_time)}
                                </span>
                                {reqH > 0 ? (
                                  <>
                                    <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                                      ·
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
                                      Req. +{reqH}h
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 break-words mt-1.5 leading-relaxed">
                                {r.start_time ? `Started at ${r.start_time}` : 'No start time'} • {Number(r.hours_today || 0)} h
                                {ot > 0 && (
                                  <span className="ml-1.5 inline-flex items-center px-2 py-0.5 bg-orange-500/10 text-orange-700 dark:text-orange-300 rounded-md text-[11px] font-medium border border-orange-500/20">
                                    +{ot}h OT
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 order-1 sm:order-2 self-start sm:self-auto flex flex-col items-stretch sm:items-end gap-1">
                              <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold sm:text-right">
                                Status
                              </span>
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
                          <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
                              Actions
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                disabled={busyId === id || deleting}
                                onClick={() => setApproveRow(r)}
                                className="flex-1 min-w-[7.5rem] h-10 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-md border-0"
                              >
                                <Check className="h-4 w-4 mr-2 shrink-0" />
                                Approve
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={busyId === id || deleting}
                                onClick={() => {
                                  setReviewAdminNote(String(r.extra_hours_admin_note ?? ''));
                                  setRejectRow(r);
                                }}
                                className="flex-1 min-w-[7.5rem] h-10 rounded-xl font-medium"
                              >
                                <X className="h-4 w-4 mr-2 shrink-0" />
                                Reject
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={busyId === id || deleting}
                                onClick={() => {
                                  const changeDefault = appr > 0 ? appr : reqH > 0 ? reqH : ot > 0 ? ot : 1;
                                  setChangeRow(r);
                                  setChangeHours(String(changeDefault));
                                  setReviewAdminNote(String(r.extra_hours_admin_note ?? ''));
                                }}
                                className="flex-1 min-w-[7.5rem] h-10 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <Pencil className="h-4 w-4 mr-2 shrink-0" />
                                Set hours
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                disabled={busyId === id || deleting || !id}
                                onClick={() => setDeleteRow(r)}
                                className="flex-1 min-w-[7.5rem] h-10 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/20 font-medium hover:bg-rose-100/80 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
              <Label htmlFor="chg-h-d" className="text-foreground text-sm font-medium">
                Approved OT hours
              </Label>
              <Input
                id="chg-h-d"
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
              <Label htmlFor="chg-note-d" className="text-foreground text-sm font-medium">
                Admin note (optional)
              </Label>
              <Textarea
                id="chg-note-d"
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
            <Label htmlFor="rej-note-d" className="text-foreground text-sm font-medium">
              Admin note (optional)
            </Label>
            <Textarea
              id="rej-note-d"
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

      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(o) => {
          if (!o) setDeleteRow(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-xl md:max-w-2xl max-h-[min(92dvh,44rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-card p-5 sm:p-6 gap-4 shadow-xl">
          <AlertDialogHeader className="text-left space-y-1.5 sm:space-y-2">
            <AlertDialogTitle className="text-foreground text-lg font-semibold tracking-tight pr-6">
              Delete this submission?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm leading-relaxed text-left">
              Permanently remove the work submission for{' '}
              <span className="font-semibold text-foreground">
                {deleteRow ? String(deleteRow.submission_date) : ''}
              </span>
              . This cannot be undone and removes hours / overtime / approval data for that day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 mt-2 border-t border-border/60">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] mt-0 h-10 border border-border/80 bg-background font-medium text-foreground shadow-none hover:bg-muted hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="rounded-lg w-full sm:w-auto sm:min-w-[6.5rem] h-10 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 border-0 font-medium"
              onClick={(e) => {
                e.preventDefault();
                void onConfirmDelete();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
