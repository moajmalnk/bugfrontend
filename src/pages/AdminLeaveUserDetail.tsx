import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, PlaneTakeoff, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import {
  leaveStatusPillClass,
  listLeaveRequests,
  reviewLeaveRequest,
  type LeaveRequest,
} from '@/services/leaveService';
import { cn, getEffectiveRole } from '@/lib/utils';
import { ENV } from '@/lib/env';

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

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Only administrators can review leave requests.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/${role}/leave-requests`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shrink-0">
            <PlaneTakeoff className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{username || 'User'} — leave</h1>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{userRole}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 text-sm">
        <Link to={`/${role}/users/${userId}`} className="text-teal-700 dark:text-teal-300 hover:underline">
          View profile
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link
          to={`/${role}/users/${userId}/add-hours`}
          className="text-teal-700 dark:text-teal-300 hover:underline"
        >
          Add / fix hours
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No leave requests for this user.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.leave_type_name || 'Leave'}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.start_date === r.end_date
                      ? r.start_date
                      : `${r.start_date} → ${r.end_date}`}
                    {' · '}
                    {r.days_count} day{r.days_count === 1 ? '' : 's'}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
                    leaveStatusPillClass(r.status)
                  )}
                >
                  {r.status}
                </span>
              </div>
              {r.reason ? <p className="text-sm text-muted-foreground">{r.reason}</p> : null}
              {r.admin_note ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">Note: {r.admin_note}</p>
              ) : null}

              {r.status === 'pending' ? (
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="space-y-1.5">
                    <Label htmlFor={`note-${r.id}`}>Admin note (optional)</Label>
                    <Textarea
                      id={`note-${r.id}`}
                      rows={2}
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="Optional note for the employee…"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
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
  );
}
