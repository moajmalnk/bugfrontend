import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PlaneTakeoff,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
  listLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
  type LeaveStatus,
} from '@/services/leaveService';
import { getEffectiveRole } from '@/lib/utils';
import { ENV } from '@/lib/env';

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

export default function AdminLeaveUserDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === 'admin';
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusTab, setStatusTab] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  >('all');

  const load = useCallback(async () => {
    if (!isAdmin || !userId) return;
    setLoading(true);
    try {
      const data = await listLeaveRequests({ user_id: userId });
      setRows(data);
      if (data[0]) {
        setUsername(data[0].username || '');
        setUserRole(data[0].role || '');
      } else {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`${ENV.API_URL}/users/get.php?id=${encodeURIComponent(userId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json().catch(() => ({}));
        const user = json.data ?? json;
        setUsername(user.username || '');
        setUserRole(user.role || '');
      }
    } catch (e) {
      toast({
        title: 'Failed to load',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === 'pending').length,
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (statusTab === 'all') return rows;
    return rows.filter((r) => r.status === statusTab);
  }, [rows, statusTab]);

  const onReview = async (id: number, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      await reviewLeaveRequest({
        id,
        action,
        admin_note: notes[id]?.trim() || undefined,
      });
      toast({ title: action === 'approve' ? 'Leave approved' : 'Leave rejected' });
      await load();
    } catch (e) {
      toast({
        title: 'Review failed',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  const backToList = () => navigate(`/${role}/leave-requests`);

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-6 sm:px-6">
        <div className="max-w-lg mx-auto rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button className="mt-4 rounded-lg" variant="outline" onClick={() => navigate(`/${role}/projects`)}>
            Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        {/* Hero */}
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 via-transparent to-cyan-50/50 dark:from-teal-950/20 dark:via-transparent dark:to-cyan-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl shadow-lg shrink-0">
                  <PlaneTakeoff className="h-6 w-6 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                    {loading ? 'Loading…' : username || 'User'}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full mt-2" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {(userRole || '—').toUpperCase()}
                    </span>
                    <span className="mx-2 text-gray-400">·</span>
                    <span className="font-mono text-xs [overflow-wrap:anywhere] break-all">{userId}</span>
                    {!loading && pendingCount > 0 ? (
                      <>
                        <span className="mx-2 text-gray-400">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          {pendingCount} pending
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto rounded-xl border-teal-200 dark:border-teal-800"
                  asChild
                >
                  <Link to={`/${role}/users/${userId}`}>
                    <UserRound className="mr-2 h-4 w-4 shrink-0" />
                    Profile
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto rounded-xl border-teal-200 dark:border-teal-800"
                  asChild
                >
                  <Link to={`/${role}/users/${userId}/add-hours`}>
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                    Add / fix hours
                  </Link>
                </Button>
                <Button
                  type="button"
                  onClick={backToList}
                  className="h-11 w-full sm:w-auto shrink-0 px-5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg rounded-xl"
                >
                  <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                  All users
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40 min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-teal-50/20 dark:from-gray-800/20 dark:to-teal-900/20 pointer-events-none" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-4 sm:p-6 md:p-8 lg:p-10 min-w-0 space-y-6">
            {!loading && rows.length > 0 ? (
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
                    variant={statusTab === key ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setStatusTab(key)}
                  >
                    {label}
                    {key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                  </Button>
                ))}
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-40 w-full rounded-2xl" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-12 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-3">
                <FileText className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  {rows.length === 0
                    ? 'This user has no leave requests yet.'
                    : 'No requests match this filter.'}
                </p>
                <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={backToList}>
                  Back to users
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRows.map((r) => (
                  <div
                    key={r.id}
                    className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/90 dark:bg-gray-900/90 p-5 sm:p-6 shadow-md space-y-4"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50/40 via-transparent to-cyan-50/40 dark:from-teal-950/10 dark:to-cyan-950/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {r.leave_type_name || 'Leave'}
                          </p>
                          <LeaveStatusPill status={r.status} />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {r.start_date === r.end_date
                            ? r.start_date
                            : `${r.start_date} → ${r.end_date}`}
                          {' · '}
                          <span className="font-semibold tabular-nums">
                            {r.days_count} day{r.days_count === 1 ? '' : 's'}
                          </span>
                        </p>
                        {r.created_at ? (
                          <p className="text-xs text-muted-foreground">
                            Requested {r.created_at}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {r.reason ? (
                      <div className="relative rounded-xl bg-gray-50/90 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                          Reason
                        </p>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {r.reason}
                        </p>
                      </div>
                    ) : null}

                    {r.admin_note ? (
                      <div className="relative rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80 mb-1">
                          Admin note
                        </p>
                        <p className="text-sm text-amber-900 dark:text-amber-100">{r.admin_note}</p>
                      </div>
                    ) : null}

                    {r.status === 'pending' ? (
                      <div className="relative space-y-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                        <div className="space-y-1.5">
                          <Label htmlFor={`note-${r.id}`} className="text-sm font-semibold">
                            Admin note <span className="font-normal text-muted-foreground">(optional)</span>
                          </Label>
                          <Textarea
                            id={`note-${r.id}`}
                            rows={2}
                            value={notes[r.id] || ''}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            placeholder="Optional note for the employee…"
                            className="rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70 resize-none"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold shadow-md"
                            disabled={busyId === r.id}
                            onClick={() => onReview(r.id, 'approve')}
                          >
                            {busyId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="mr-1.5 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-10 px-5 rounded-xl font-semibold"
                            disabled={busyId === r.id}
                            onClick={() => onReview(r.id, 'reject')}
                          >
                            <X className="mr-1.5 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
