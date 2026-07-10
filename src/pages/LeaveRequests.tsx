import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, PlaneTakeoff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  leaveStatusPillClass,
  requestLeave,
  type LeaveBalance,
  type LeaveRequest,
} from '@/services/leaveService';
import { cn } from '@/lib/utils';

export default function LeaveRequests() {
  const { currentUser } = useAuth();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const month = useMemo(
    () => new Date().toISOString().slice(0, 7),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, mine] = await Promise.all([
        getLeaveTypes(month),
        getMyLeaveRequests(),
      ]);
      setBalances(typesRes.types || []);
      setRequests(mine);
      if (!leaveTypeId && typesRes.types?.length) {
        setLeaveTypeId(String(typesRes.types[0].id));
      }
    } catch (e) {
      toast({
        title: 'Failed to load leave',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [month, leaveTypeId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId || !startDate) {
      toast({ title: 'Missing fields', description: 'Select leave type and start date.', variant: 'destructive' });
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
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
          <PlaneTakeoff className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Leave</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apply for leave and track approvals{currentUser?.username ? ` for ${currentUser.username}` : ''}.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading leave data…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {balances.map((b) => (
              <Card key={b.id} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{b.name}</CardTitle>
                  <CardDescription>
                    {month} · quota {b.monthly_quota} day{b.monthly_quota === 1 ? '' : 's'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{b.remaining}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    remaining · {b.used} used
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Request leave
              </CardTitle>
              <CardDescription>
                Pending requests do not block check-in. Approved leave days block attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Leave type</Label>
                    <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                      <SelectTrigger>
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
                  <div className="space-y-2 sm:col-span-1" />
                  <div className="space-y-2">
                    <Label htmlFor="leave-start">Start date</Label>
                    <Input
                      id="leave-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leave-end">End date</Label>
                    <Input
                      id="leave-end"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-reason">Reason (optional)</Label>
                  <Textarea
                    id="leave-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief reason for leave…"
                    rows={3}
                  />
                </div>
                <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave requests yet.</p>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 p-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{r.leave_type_name || 'Leave'}</span>
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                            leaveStatusPillClass(r.status)
                          )}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.start_date === r.end_date
                          ? r.start_date
                          : `${r.start_date} → ${r.end_date}`}
                        {' · '}
                        {r.days_count} day{r.days_count === 1 ? '' : 's'}
                      </p>
                      {r.reason ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.reason}</p>
                      ) : null}
                      {r.admin_note ? (
                        <p className="text-xs text-amber-700 dark:text-amber-300">Admin: {r.admin_note}</p>
                      ) : null}
                    </div>
                    {r.status === 'pending' ? (
                      <Button variant="outline" size="sm" onClick={() => onCancel(r.id)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
