import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PlaneTakeoff,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  cancelLeaveRequest,
  getLeaveTypes,
  getMyLeaveRequests,
  requestLeave,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveStatus,
} from '@/services/leaveService';
import { format, parseISO } from 'date-fns';

function LeaveStatusPill({ status }: { status: LeaveStatus | string }) {
  const s = String(status).toLowerCase();
  const shell =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize shrink-0 border-2 bg-white/95 text-gray-900 shadow-sm dark:bg-gray-950/75 dark:text-white';
  if (s === 'pending') {
    return (
      <span className={`${shell} border-amber-500 dark:border-amber-400`}>
        <Clock className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Pending
      </span>
    );
  }
  if (s === 'approved') {
    return (
      <span className={`${shell} border-emerald-500 dark:border-emerald-400`}>
        <CheckCircle2 className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Approved
      </span>
    );
  }
  if (s === 'rejected') {
    return (
      <span className={`${shell} border-rose-500 dark:border-rose-400`}>
        <XCircle className="h-3.5 w-3.5 opacity-90 shrink-0" aria-hidden />
        Rejected
      </span>
    );
  }
  if (s === 'cancelled') {
    return (
      <span className={`${shell} border-slate-400 dark:border-slate-500`}>
        Cancelled
      </span>
    );
  }
  return (
    <span className={`${shell} border-slate-400 dark:border-slate-500`}>
      {s || '—'}
    </span>
  );
}

const BALANCE_ACCENTS = [
  {
    wash: 'from-teal-50/50 to-cyan-50/50 dark:from-teal-950/20 dark:to-cyan-950/20',
    icon: 'from-teal-500 to-cyan-600',
    number: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200/60 dark:border-teal-800/50',
  },
  {
    wash: 'from-sky-50/50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/20',
    icon: 'from-sky-500 to-blue-600',
    number: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200/60 dark:border-sky-800/50',
  },
  {
    wash: 'from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20',
    icon: 'from-violet-500 to-indigo-600',
    number: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200/60 dark:border-violet-800/50',
  },
  {
    wash: 'from-slate-50/50 to-gray-50/50 dark:from-slate-950/20 dark:to-gray-950/20',
    icon: 'from-slate-500 to-gray-600',
    number: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200/60 dark:border-slate-700/50',
  },
];

function formatMonthLabel(ym: string) {
  try {
    return format(parseISO(`${ym}-01`), 'MMMM yyyy');
  } catch {
    return ym;
  }
}

function formatRange(start: string, end: string) {
  try {
    const s = format(parseISO(start), 'MMM d, yyyy');
    if (start === end) return s;
    return `${s} → ${format(parseISO(end), 'MMM d, yyyy')}`;
  } catch {
    return start === end ? start : `${start} → ${end}`;
  }
}

export default function LeaveRequests() {
  const { currentUser } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | LeaveStatus>('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, mine] = await Promise.all([
        getLeaveTypes(month),
        getMyLeaveRequests(),
      ]);
      setBalances(typesRes.types || []);
      setRequests(mine);
      setLeaveTypeId((prev) => {
        if (prev && typesRes.types?.some((t) => String(t.id) === prev)) return prev;
        return typesRes.types?.length ? String(typesRes.types[0].id) : '';
      });
    } catch (e) {
      toast({
        title: 'Failed to load leave',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );
  const approvedCount = useMemo(
    () => requests.filter((r) => r.status === 'approved').length,
    [requests]
  );
  const remainingTotal = useMemo(
    () => balances.reduce((sum, b) => sum + Number(b.remaining || 0), 0),
    [balances]
  );

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return requests;
    return requests.filter((r) => r.status === historyFilter);
  }, [requests, historyFilter]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate) {
      toast({
        title: 'Missing fields',
        description: 'Select leave type and start date.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      await requestLeave({
        leave_type_id: Number(leaveTypeId),
        start_date: startDate,
        end_date: endDate || startDate,
        reason: reason.trim() || undefined,
      });
      toast({ title: 'Leave requested', description: 'Waiting for admin approval.' });
      setReason('');
      setStartDate('');
      setEndDate('');
      await load();
    } catch (err) {
      toast({
        title: 'Request failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await cancelLeaveRequest(id);
      toast({ title: 'Request cancelled' });
      await load();
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        {/* Hero — Bugs/OT style */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 via-transparent to-cyan-50/50 dark:from-teal-950/20 dark:via-transparent dark:to-cyan-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl shadow-lg shrink-0">
                    <PlaneTakeoff className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      My Leave
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl break-words">
                  Apply for leave and track approvals
                  {currentUser?.username ? ` for ${currentUser.username}` : ''}.
                  Pending requests do not block check-in; approved leave does.
                </p>
              </div>

              <div className="flex flex-wrap items-stretch gap-3 shrink-0">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-amber-500 rounded-lg shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-amber-800/80 dark:text-amber-200/80">
                      Pending
                    </div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                      {pendingCount}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                      Approved
                    </div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                      {approvedCount}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-200 dark:border-teal-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-teal-600 rounded-lg shrink-0">
                    <CalendarDays className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-teal-800/80 dark:text-teal-200/80">
                      Remaining
                    </div>
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-300 tabular-nums leading-none">
                      {remainingTotal}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Month balances */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-teal-50/30 dark:from-gray-800/30 dark:to-teal-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shrink-0">
                  <CalendarDays className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Monthly balance
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Quota resets each calendar month · {formatMonthLabel(month)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => shiftMonth(-1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setMonth(new Date().toISOString().slice(0, 7))}
                >
                  This month
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => shiftMonth(1)}
                >
                  Next
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-36 rounded-2xl" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {balances.map((b, idx) => {
                  const accent = BALANCE_ACCENTS[idx % BALANCE_ACCENTS.length];
                  return (
                    <div
                      key={b.id}
                      className={`group relative overflow-hidden rounded-2xl border ${accent.border} bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${accent.wash} opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none`}
                      />
                      <div className="relative space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-base font-bold text-gray-900 dark:text-white">
                              {b.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Quota {b.monthly_quota} day{b.monthly_quota === 1 ? '' : 's'}
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded-lg bg-gradient-to-br ${accent.icon} shadow-md shrink-0`}
                          >
                            <CalendarDays className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <p className={`text-4xl font-bold tabular-nums ${accent.number}`}>
                          {b.remaining}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>remaining</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {b.used} used
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-200/80 dark:bg-gray-700/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${accent.icon}`}
                            style={{
                              width: `${Math.min(
                                100,
                                b.monthly_quota > 0
                                  ? (Number(b.used) / Number(b.monthly_quota)) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Request + History */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Form */}
          <div className="lg:col-span-2 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-teal-50/30 dark:from-gray-800/30 dark:to-teal-900/30 rounded-2xl pointer-events-none" />
            <div className="relative h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shrink-0">
                  <PlaneTakeoff className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Request leave
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Submit for admin approval
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Leave type</Label>
                  <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {balances.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name} ({b.remaining} left)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Start date</Label>
                  <DatePicker
                    value={startDate}
                    onChange={(v) => {
                      setStartDate(v);
                      if (!endDate || (v && endDate < v)) setEndDate(v);
                    }}
                    placeholder="Pick start date"
                    disableFuture={false}
                    className="h-11 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">End date</Label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Pick end date"
                    disableFuture={false}
                    className="h-11 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Reason{' '}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for leave…"
                    rows={4}
                    className="rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit request'
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-3 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-cyan-50/30 dark:from-gray-800/30 dark:to-cyan-900/30 rounded-2xl pointer-events-none" />
            <div className="relative h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg shrink-0">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Request history
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {requests.length} total · {pendingCount} awaiting review
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['approved', 'Approved'],
                    ['rejected', 'Rejected'],
                    ['cancelled', 'Cancelled'],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={historyFilter === key ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setHistoryFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 rounded-2xl" />
                  <Skeleton className="h-24 rounded-2xl" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="text-center py-12 sm:py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {requests.length === 0
                      ? 'No leave requests yet'
                      : 'No requests match this filter'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                    {requests.length === 0
                      ? 'Use the form to submit your first leave request for admin approval.'
                      : 'Try another status filter to see more history.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredHistory.map((r) => (
                    <div
                      key={r.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/90 p-4 sm:p-5 shadow-md transition-all hover:shadow-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/30 via-transparent to-cyan-50/30 dark:from-teal-950/10 dark:to-cyan-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {r.leave_type_name || 'Leave'}
                            </span>
                            <LeaveStatusPill status={r.status} />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatRange(r.start_date, r.end_date)}
                            {' · '}
                            <span className="font-semibold tabular-nums">
                              {r.days_count} day{r.days_count === 1 ? '' : 's'}
                            </span>
                          </p>
                          {r.reason ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {r.reason}
                            </p>
                          ) : null}
                          {r.admin_note ? (
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Admin: {r.admin_note}
                            </p>
                          ) : null}
                        </div>
                        {r.status === 'pending' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl shrink-0"
                            disabled={cancellingId === r.id}
                            onClick={() => onCancel(r.id)}
                          >
                            {cancellingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Cancel'
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
