import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Loader2, PlaneTakeoff, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { listLeaveRequests, type LeaveRequest } from '@/services/leaveService';
import { getEffectiveRole } from '@/lib/utils';

type UserGroup = {
  userId: string;
  username: string;
  role: string;
  list: LeaveRequest[];
  pending: number;
};

function groupByUser(rows: LeaveRequest[]): UserGroup[] {
  const map = new Map<string, UserGroup>();
  for (const r of rows) {
    const id = String(r.user_id);
    if (!map.has(id)) {
      map.set(id, {
        userId: id,
        username: r.username || 'Unknown',
        role: r.role || '',
        list: [],
        pending: 0,
      });
    }
    const g = map.get(id)!;
    g.list.push(r);
    if (r.status === 'pending') g.pending += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.pending !== a.pending) return b.pending - a.pending;
    return a.username.localeCompare(b.username);
  });
}

export default function AdminLeaveRequests() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === 'admin';
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(true);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await listLeaveRequests({ pending_only: pendingOnly });
      setRows(data);
    } catch (e) {
      toast({
        title: 'Failed to load leave requests',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, pendingOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const all = groupByUser(rows);
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (g) =>
        g.username.toLowerCase().includes(q) ||
        g.userId.toLowerCase().includes(q) ||
        g.role.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        Only administrators can review leave requests.
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
            <PlaneTakeoff className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leave requests</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Approve or reject employee leave applications.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={pendingOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPendingOnly(true)}
          >
            Pending
          </Button>
          <Button
            variant={!pendingOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPendingOnly(false)}
          >
            All
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, role, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {pendingOnly ? 'No pending leave requests.' : 'No leave requests found.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <button
              key={g.userId}
              type="button"
              onClick={() => navigate(`/${role}/leave-requests/${g.userId}`)}
              className="group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {g.pending > 0 && (
                <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-amber-500" />
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold truncate group-hover:text-teal-700 dark:group-hover:text-teal-300">
                    {g.username}
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mt-1">
                    {g.role}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg border px-2.5 py-1 bg-muted/40">
                  {g.list.length} request{g.list.length === 1 ? '' : 's'}
                </span>
                {g.pending > 0 && (
                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800">
                    {g.pending} pending
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
