import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  FileText,
  PlaneTakeoff,
  Search,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { listLeaveRequests, type LeaveRequest } from '@/services/leaveService';
import { getEffectiveRole } from '@/lib/utils';
import { MonthFilterChips } from '@/components/ui/MonthFilterChips';
import {
  rangeOverlapsMonthFilter,
  type MonthFilterValue,
} from '@/lib/monthFilter';

type UserGroup = {
  userId: string;
  username: string;
  role: string;
  list: LeaveRequest[];
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
};

type StatusFilter = 'pending' | 'all' | 'approved' | 'rejected' | 'cancelled';
type RoleFilter = 'all' | 'admin' | 'developer' | 'tester' | 'user';

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
        approved: 0,
        rejected: 0,
        cancelled: 0,
      });
    }
    const g = map.get(id)!;
    g.list.push(r);
    if (r.status === 'pending') g.pending += 1;
    if (r.status === 'approved') g.approved += 1;
    if (r.status === 'rejected') g.rejected += 1;
    if (r.status === 'cancelled') g.cancelled += 1;
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.pending !== a.pending) return b.pending - a.pending;
    return a.username.localeCompare(b.username);
  });
}

function dateRangeForGroup(g: UserGroup): { min: string; max: string } | null {
  const dates = g.list
    .flatMap((r) => [String(r.start_date || ''), String(r.end_date || '')])
    .filter(Boolean)
    .sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
}

function LeaveUserCard({
  group,
  onOpen,
}: {
  group: UserGroup;
  onOpen: () => void;
}) {
  const range = dateRangeForGroup(group);
  const totalDays = group.list.reduce((sum, r) => sum + Number(r.days_count || 0), 0);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6 text-left shadow-lg transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:border-teal-300/50 dark:hover:border-teal-700/50"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 via-transparent to-cyan-50/50 dark:from-teal-950/20 dark:via-transparent dark:to-cyan-950/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      {group.pending > 0 && (
        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-amber-500 shadow-lg" aria-hidden />
      )}

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
              {group.username}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {group.role || '—'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-teal-500" />
        </div>

        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
          ID: {group.userId}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            {group.list.length} request{group.list.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-lg bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {totalDays} day{totalDays === 1 ? '' : 's'}
          </span>
          {group.pending > 0 && (
            <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
              {group.pending} pending
            </span>
          )}
          {group.approved > 0 && (
            <span className="inline-flex items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/50">
              {group.approved} approved
            </span>
          )}
          {group.rejected > 0 && (
            <span className="inline-flex items-center rounded-lg bg-rose-100 dark:bg-rose-950/50 px-2.5 py-1 text-xs font-semibold text-rose-900 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800/50">
              {group.rejected} rejected
            </span>
          )}
          {group.cancelled > 0 && (
            <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/50">
              {group.cancelled} cancelled
            </span>
          )}
        </div>

        {range && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 p-3">
            <div className="rounded-lg bg-teal-500 p-1.5 shrink-0">
              <CalendarDays className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.min}</span>
              {' → '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.max}</span>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-teal-700 dark:text-teal-300 group-hover:underline">
          Open requests →
        </p>
      </div>
    </button>
  );
}

export default function AdminLeaveRequests() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = role === 'admin';
  const navigate = useNavigate();
  const [rows, setRows] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>('all');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await listLeaveRequests({
        ...(statusFilter === 'pending'
          ? { pending_only: true }
          : statusFilter === 'all'
            ? {}
            : { status: statusFilter }),
        ...(monthFilter !== 'all' ? { month: monthFilter } : {}),
      });
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
  }, [isAdmin, statusFilter, monthFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    // Extra client guard: keep requests that overlap the selected month
    const scoped =
      monthFilter === 'all'
        ? rows
        : rows.filter((r) =>
            rangeOverlapsMonthFilter(r.start_date, r.end_date, monthFilter)
          );
    return groupByUser(scoped);
  }, [rows, monthFilter]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (roleFilter !== 'all' && g.role.toLowerCase() !== roleFilter) return false;
      if (!q) return true;
      return (
        g.username.toLowerCase().includes(q) ||
        g.userId.toLowerCase().includes(q) ||
        g.role.toLowerCase().includes(q)
      );
    });
  }, [groups, search, roleFilter]);

  const pendingTotal = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.pending, 0),
    [filteredGroups]
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    roleFilter !== 'all' ||
    statusFilter !== 'pending' ||
    monthFilter !== 'all';

  if (!isAdmin) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-6 sm:px-6">
        <div className="max-w-lg mx-auto rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button
            className="mt-4 rounded-lg w-full sm:w-auto"
            variant="outline"
            onClick={() => navigate(`/${role}/projects`)}
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
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 via-transparent to-cyan-50/50 dark:from-teal-950/20 dark:via-transparent dark:to-cyan-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl shadow-lg shrink-0">
                    <PlaneTakeoff className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Leave
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Review employee leave applications.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-amber-500 rounded-lg shrink-0">
                      <CalendarDays className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-amber-800/80 dark:text-amber-200/80">
                        Pending
                      </div>
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
                        {pendingTotal}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border border-teal-200 dark:border-teal-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-teal-600 rounded-lg shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-teal-800/80 dark:text-teal-200/80">
                        Users
                      </div>
                      <div className="text-2xl font-bold text-teal-700 dark:text-teal-300 tabular-nums leading-none">
                        {filteredGroups.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters + list */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-teal-50/30 dark:from-gray-800/30 dark:to-teal-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1 max-w-3xl">
                  Each card summarizes leave activity. Click a user to review and act on their requests.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by username, role, or user ID..."
                  className="pl-9 h-11 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['pending', 'Pending'],
                    ['all', 'All activity'],
                    ['approved', 'Approved'],
                    ['rejected', 'Rejected'],
                    ['cancelled', 'Cancelled'],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={statusFilter === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {(['all', 'admin', 'developer', 'tester', 'user'] as const).map((rf) => (
                  <Button
                    key={rf}
                    type="button"
                    variant={roleFilter === rf ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setRoleFilter(rf)}
                  >
                    {rf === 'all' ? 'All roles' : rf}
                  </Button>
                ))}
              </div>

              <MonthFilterChips
                value={monthFilter}
                onChange={setMonthFilter}
                compact
              />

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                    setStatusFilter('pending');
                    setMonthFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-12 sm:py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-xl">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statusFilter === 'pending'
                    ? 'No pending leave requests'
                    : 'No leave requests match'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto">
                  {statusFilter === 'pending'
                    ? 'When employees submit leave, they will appear here for approval.'
                    : 'Try clearing filters or switching status to see more results.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-5 rounded-xl"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                    }}
                  >
                    Show all requests
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredGroups.map((g) => (
                  <LeaveUserCard
                    key={g.userId}
                    group={g}
                    onOpen={() => navigate(`/${role}/leave-requests/${encodeURIComponent(g.userId)}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
