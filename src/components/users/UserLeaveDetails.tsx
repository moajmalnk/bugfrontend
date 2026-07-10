import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronRight, PlaneTakeoff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getLeaveTypes,
  getMyLeaveRequests,
  leaveStatusPillClass,
  listLeaveRequests,
  type LeaveBalance,
  type LeaveRequest,
} from '@/services/leaveService';
import { getEffectiveRole } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

type Props = {
  userId: string;
  username?: string;
};

function formatRange(start: string, end: string) {
  try {
    const s = format(parseISO(start), 'MMM d, yyyy');
    const e = format(parseISO(end), 'MMM d, yyyy');
    return start === end ? s : `${s} → ${e}`;
  } catch {
    return `${start} → ${end}`;
  }
}

export function UserLeaveDetails({ userId, username }: Props) {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === 'admin';
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const bal = await getLeaveTypes(undefined, isAdmin ? userId : undefined);
      setBalances(Array.isArray(bal?.types) ? bal.types : []);
      setMonth(bal?.month || '');

      if (isAdmin) {
        const rows = await listLeaveRequests({ user_id: userId });
        setRequests(rows.slice(0, 8));
      } else if (currentUser?.id === userId) {
        const rows = await getMyLeaveRequests();
        setRequests(rows.slice(0, 8));
      } else {
        setRequests([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leave details');
      setBalances([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAdmin, currentUser?.id]);

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

  const monthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return 'This month';
    try {
      return format(parseISO(`${month}-01`), 'MMMM yyyy');
    } catch {
      return month;
    }
  }, [month]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        {error}
        <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlaneTakeoff className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <h3 className="text-lg font-semibold">Leave details</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Balances for {monthLabel}
            {username ? ` · ${username}` : ''}
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </p>
        </div>
        {isAdmin ? (
          <Button asChild variant="outline" size="sm" className="rounded-xl shrink-0">
            <Link to={`/${role}/leave-requests/${userId}`}>
              Open leave requests
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        ) : currentUser?.id === userId ? (
          <Button asChild variant="outline" size="sm" className="rounded-xl shrink-0">
            <Link to={`/${role}/leave`}>
              My leave
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        ) : null}
      </div>

      {balances.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {balances.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-border/50 bg-background/50 p-3 space-y-1"
            >
              <div className="text-xs font-medium text-muted-foreground truncate">{b.name}</div>
              <div className="text-xl font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {Number(b.remaining)}
                <span className="text-sm font-medium text-muted-foreground"> left</span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular-nums">
                {Number(b.used)} used · quota {Number(b.monthly_quota)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No leave types configured.</p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Recent requests
          </h4>
          <div className="flex gap-1.5 text-[11px]">
            {approvedCount > 0 ? (
              <Badge variant="outline" className="rounded-full">
                {approvedCount} approved
              </Badge>
            ) : null}
            {pendingCount > 0 ? (
              <Badge variant="outline" className="rounded-full border-amber-400/60 text-amber-700 dark:text-amber-300">
                {pendingCount} pending
              </Badge>
            ) : null}
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            No leave requests yet.
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">
                      {r.leave_type_name || 'Leave'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${leaveStatusPillClass(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatRange(r.start_date, r.end_date)}
                    <span className="mx-1.5">·</span>
                    <span className="tabular-nums">{Number(r.days_count)} day{Number(r.days_count) === 1 ? '' : 's'}</span>
                    {r.reason ? (
                      <>
                        <span className="mx-1.5">·</span>
                        <span className="truncate">{r.reason}</span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
