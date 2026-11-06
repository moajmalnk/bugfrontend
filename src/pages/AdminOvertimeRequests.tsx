import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { listAllRequestSubmissions, normalizeAllRequestSubmissionsResponse } from '@/services/todoService';
import { userService } from '@/services/userService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { BottomSheetTabs } from '@/components/ui/BottomSheetTabs';
import { toast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';
import {
  type UserRequestGroup,
  codoMonthKey,
  getSubmissionWindow,
  groupRowsByUser,
  groupAdminHoursByUser,
  type OvertimeRow,
} from '@/pages/adminOvertimeShared';
import { MonthFilterChips } from '@/components/ui/MonthFilterChips';
import {
  dateMatchesMonthFilter,
  type MonthFilterValue,
} from '@/lib/monthFilter';
import { Bug, ChevronRight, Code2, FileText, Palette, Search, Timer, User, UserCheck, UserX, Users } from 'lucide-react';

type OtRoleFilter = 'all' | 'developer' | 'codo_tester' | 'creator';
type TeamStatus = 'active' | 'inactive';

const OT_ROLE_TABS: {
  value: OtRoleFilter;
  label: string;
  shortLabel: string;
  icon: typeof Users;
  countClass: string;
}[] = [
  {
    value: 'all',
    label: 'All roles',
    shortLabel: 'All',
    icon: Users,
    countClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  {
    value: 'developer',
    label: 'Developers',
    shortLabel: 'Devs',
    icon: Code2,
    countClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  {
    value: 'codo_tester',
    label: 'CODO Testers',
    shortLabel: 'CODO',
    icon: Bug,
    countClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  {
    value: 'creator',
    label: 'Creators',
    shortLabel: 'Creators',
    icon: Palette,
    countClass: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  },
];

function workforceRoleLabel(role: string, testerType?: string | null): string {
  const value = role.toLowerCase();
  if (value === 'developer') return 'Developer';
  if (value === 'creator') return 'Creator';
  if (value === 'tester') {
    if (testerType === 'codo') return 'CODO Tester';
    if (testerType === 'client') return 'Client Tester';
    return 'Tester';
  }
  if (value === 'admin') return 'Admin';
  return role || 'User';
}

function matchesOtRole(
  role: string,
  testerType: string | null | undefined,
  filter: OtRoleFilter
): boolean {
  if (filter === 'all') return true;
  const value = role.toLowerCase();
  if (filter === 'developer') return value === 'developer';
  if (filter === 'creator') return value === 'creator';
  return value === 'tester' && testerType === 'codo';
}

function userSubmissionDateRange(g: UserRequestGroup): { min: string; max: string } | null {
  const dates = g.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
}

function UserRequestCard({
  group,
  adminHoursCount = 0,
  testerType,
  onOpen,
}: {
  group: UserRequestGroup;
  adminHoursCount?: number;
  testerType?: string | null;
  onOpen: () => void;
}) {
  const range = userSubmissionDateRange(group);
  const codoMonths = new Set(
    group.list.map((r) => String(r.submission_date || '').trim()).filter(Boolean).map(codoMonthKey)
  );
  const monthCount = codoMonths.size;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative w-full overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-5 sm:p-6 text-left shadow-lg transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:border-blue-300/50 dark:hover:border-blue-700/50"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

      {group.pending > 0 && (
        <div className="absolute top-4 right-4 h-3 w-3 rounded-full bg-amber-500 shadow-lg" aria-hidden />
      )}

      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {group.username}
            </h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {workforceRoleLabel(group.role, testerType)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 transition-colors group-hover:text-blue-500" />
        </div>

        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
          ID: {group.userId}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
            {group.list.length} submission{group.list.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {monthCount} month{monthCount === 1 ? '' : 's'}
          </span>
          {group.pending > 0 && (
            <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
              {group.pending} pending
            </span>
          )}
          {adminHoursCount > 0 && (
            <span className="inline-flex items-center rounded-lg bg-indigo-100 dark:bg-indigo-950/50 px-2.5 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 border border-indigo-200/80 dark:border-indigo-800/50">
              {adminHoursCount} admin h
            </span>
          )}
        </div>

        {range && (
          <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 p-3">
            <div className="rounded-lg bg-blue-500 p-1.5 shrink-0">
              <Timer className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.min}</span>
              {' → '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{range.max}</span>
            </div>
          </div>
        )}

        <span className="inline-flex text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
          Open requests →
        </span>
      </div>
    </button>
  );
}

export default function AdminOvertimeRequests() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [adminHoursRows, setAdminHoursRows] = useState<OvertimeRow[]>([]);
  const [allUsers, setAllUsers] = useState<
    Array<{ id: string; username: string; role: string; testerType?: string | null; accountActive?: number }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<OtRoleFilter>('all');
  const [teamStatus, setTeamStatus] = useState<TeamStatus>('active');
  const [activityFilter, setActivityFilter] = useState<
    'all' | 'pending' | 'with_submissions' | 'without_submissions' | 'admin_entries'
  >('all');
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>('all');
  const [queryWindow, setQueryWindow] = useState<{ from: string; to: string }>(() => getSubmissionWindow());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fallback = getSubmissionWindow();
      const [res, users] = await Promise.all([
        listAllRequestSubmissions({}),
        userService.getUsers().catch(() => []),
      ]);
      const { submissions, adminHoursSubmissions, window } = normalizeAllRequestSubmissionsResponse(res, fallback);
      setRows(submissions as OvertimeRow[]);
      setAdminHoursRows(adminHoursSubmissions as OvertimeRow[]);
      setAllUsers(
        (Array.isArray(users) ? users : []).map((u) => ({
          id: String(u.id ?? '').trim(),
          username: String(u.username || u.name || '').trim(),
          role: String(u.role || '').trim(),
          testerType: u.tester_type ?? null,
          accountActive:
            u.account_active !== undefined && u.account_active !== null
              ? Number(u.account_active)
              : undefined,
        }))
      );
      setQueryWindow(window);
    } catch (e) {
      toast({
        title: 'Failed to load requests',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
      setRows([]);
      setAdminHoursRows([]);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const isAdmin = hasPermissionOrAdmin(role, hasPermission, 'OVERTIME_MANAGE');

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  const monthScopedRows = useMemo(
    () =>
      rows.filter((r) =>
        dateMatchesMonthFilter(String(r.submission_date || ''), monthFilter)
      ),
    [rows, monthFilter]
  );
  const monthScopedAdminRows = useMemo(
    () =>
      adminHoursRows.filter((r) =>
        dateMatchesMonthFilter(String(r.submission_date || ''), monthFilter)
      ),
    [adminHoursRows, monthFilter]
  );

  const byUser = useMemo(() => groupRowsByUser(monthScopedRows), [monthScopedRows]);
  const adminByUser = useMemo(
    () => groupAdminHoursByUser(monthScopedAdminRows),
    [monthScopedAdminRows]
  );

  const displayUsers = useMemo(() => {
    const map = new Map<string, UserRequestGroup & { adminHoursCount: number }>();
    // When a specific month is selected, only seed users who have activity that month
    // (plus anyone matching "no submissions" later). For All, keep the full roster.
    const seedAllUsers = monthFilter === 'all';
    if (seedAllUsers) {
      for (const u of allUsers) {
        if (!u.id || !u.username) continue;
        map.set(u.id, {
          userId: u.id,
          username: u.username,
          role: u.role,
          list: [],
          pending: 0,
          adminHoursCount: 0,
        });
      }
    }
    for (const g of byUser) {
      const existing = map.get(g.userId);
      map.set(g.userId, existing ? { ...existing, ...g } : { ...g, adminHoursCount: 0 });
    }
    for (const g of adminByUser) {
      const existing = map.get(g.userId);
      if (existing) {
        existing.adminHoursCount = g.list.length;
      } else {
        map.set(g.userId, {
          userId: g.userId,
          username: g.username,
          role: g.role,
          list: [],
          pending: 0,
          adminHoursCount: g.list.length,
        });
      }
    }
    // Month + "no submissions": include roster users with zero OT in that month
    if (monthFilter !== 'all' && activityFilter === 'without_submissions') {
      for (const u of allUsers) {
        if (!u.id || !u.username) continue;
        if (map.has(u.id)) continue;
        map.set(u.id, {
          userId: u.id,
          username: u.username,
          role: u.role,
          list: [],
          pending: 0,
          adminHoursCount: 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.username.localeCompare(b.username, undefined, { sensitivity: 'base' })
    );
  }, [allUsers, byUser, adminByUser, monthFilter, activityFilter]);

  const pendingTotal = useMemo(
    () =>
      monthScopedRows.filter(
        (r) => String(r.extra_hours_approval_status || '').toLowerCase() === 'pending'
      ).length,
    [monthScopedRows]
  );

  const testerTypeById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const row of allUsers) map.set(row.id, row.testerType ?? null);
    return map;
  }, [allUsers]);

  const accountActiveById = useMemo(() => {
    const map = new Map<string, number | undefined>();
    for (const row of allUsers) map.set(row.id, row.accountActive);
    return map;
  }, [allUsers]);

  const isInactiveUser = useCallback(
    (userId: string) => accountActiveById.get(userId) === 0,
    [accountActiveById]
  );

  const roleTabCounts = useMemo(() => {
    const counts: Record<OtRoleFilter, number> = {
      all: 0,
      developer: 0,
      codo_tester: 0,
      creator: 0,
    };
    for (const user of displayUsers) {
      const inactive = isInactiveUser(user.userId);
      if (teamStatus === 'inactive' ? !inactive : inactive) continue;
      counts.all += 1;
      const role = String(user.role || '').toLowerCase();
      const testerType = testerTypeById.get(user.userId);
      if (role === 'developer') counts.developer += 1;
      else if (role === 'creator') counts.creator += 1;
      else if (role === 'tester' && testerType === 'codo') counts.codo_tester += 1;
    }
    return counts;
  }, [displayUsers, testerTypeById, teamStatus, isInactiveUser]);

  const teamStatusCounts = useMemo(() => {
    const counts = { active: 0, inactive: 0 };
    for (const user of displayUsers) {
      if (!matchesOtRole(String(user.role || ''), testerTypeById.get(user.userId), roleFilter)) continue;
      if (isInactiveUser(user.userId)) counts.inactive += 1;
      else counts.active += 1;
    }
    return counts;
  }, [displayUsers, testerTypeById, roleFilter, isInactiveUser]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return displayUsers.filter((u) => {
      const userRole = String(u.role || '').toLowerCase();
      const testerType = testerTypeById.get(u.userId);
      const matchesRole = matchesOtRole(userRole, testerType, roleFilter);
      if (!matchesRole) return false;
      const inactive = isInactiveUser(u.userId);
      if (teamStatus === 'inactive' ? !inactive : inactive) return false;

      const hasPending = u.pending > 0;
      const hasSubmissions = u.list.length > 0;
      const hasAdminEntries = (u as { adminHoursCount?: number }).adminHoursCount
        ? (u as { adminHoursCount?: number }).adminHoursCount! > 0
        : false;

      const matchesActivity =
        activityFilter === 'all'
          ? true
          : activityFilter === 'pending'
            ? hasPending
            : activityFilter === 'with_submissions'
              ? hasSubmissions
              : activityFilter === 'without_submissions'
                ? !hasSubmissions
                : hasAdminEntries;
      if (!matchesActivity) return false;

      if (!query) return true;
      return (
        String(u.username || '').toLowerCase().includes(query) ||
        String(u.userId || '').toLowerCase().includes(query) ||
        userRole.includes(query)
      );
    });
  }, [displayUsers, testerTypeById, searchQuery, roleFilter, activityFilter, teamStatus, isInactiveUser]);

  const openUser = (userId: string) => {
    const enc = encodeURIComponent(userId);
    const monthQs =
      monthFilter !== 'all' ? `?month=${encodeURIComponent(monthFilter)}` : '';
    navigate(`/${currentUser?.role}/overtime-requests/${enc}${monthQs}`);
  };

  if (!isAdmin) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <div className="max-w-lg mx-auto rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Admin access required.</p>
          <Button className="mt-4 rounded-lg w-full sm:w-auto" variant="outline" onClick={() => navigate(`/${currentUser?.role}/projects`)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      OT
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Pick a user to open their requests on a dedicated page.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                      <Timer className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-emerald-800/80 dark:text-emerald-200/80">
                        Pending
                      </div>
                      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                        {pendingTotal}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
                        Users
                      </div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 tabular-nums leading-none">
                        {filteredUsers.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1 max-w-3xl">
                  Each card summarizes extra-hour activity. Click a user to review and act on submissions by month.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username, role, or user ID..."
                  className="pl-9 h-11 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
                />
              </div>
              <Tabs
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as OtRoleFilter)}
                className="w-full"
              >
                <BottomSheetTabs
                  items={OT_ROLE_TABS.map((tab) => ({
                    value: tab.value,
                    label: tab.label,
                    shortLabel: tab.shortLabel,
                    icon: tab.icon,
                    count: roleTabCounts[tab.value],
                    countClassName: tab.countClass,
                  }))}
                  value={roleFilter}
                  onValueChange={(value) => setRoleFilter(value as OtRoleFilter)}
                  title="Select role"
                  description="Developers, CODO Testers, and Creators"
                  desktopBreakpoint="xl"
                />
              </Tabs>
              <Tabs
                value={teamStatus}
                onValueChange={(value) => setTeamStatus(value as TeamStatus)}
                className="w-full"
              >
                <BottomSheetTabs
                  items={[
                    {
                      value: 'active',
                      label: 'Active team',
                      shortLabel: 'Active',
                      icon: UserCheck,
                      count: teamStatusCounts.active,
                      countClassName: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                    },
                    {
                      value: 'inactive',
                      label: 'Inactive team',
                      shortLabel: 'Inactive',
                      icon: UserX,
                      count: teamStatusCounts.inactive,
                      countClassName: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    },
                  ]}
                  value={teamStatus}
                  onValueChange={(value) => setTeamStatus(value as TeamStatus)}
                  title="Team status"
                  description="Current team and inactive accounts"
                  desktopBreakpoint="lg"
                  desktopGridClassName="grid-cols-2"
                />
              </Tabs>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', 'All activity'],
                    ['pending', 'Pending'],
                    ['with_submissions', 'With submissions'],
                    ['without_submissions', 'No submissions'],
                    ['admin_entries', 'Admin entries'],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    variant={activityFilter === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full"
                    onClick={() => setActivityFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <MonthFilterChips
                value={monthFilter}
                onChange={setMonthFilter}
                compact
              />
              {(searchQuery ||
                roleFilter !== 'all' ||
                teamStatus !== 'active' ||
                activityFilter !== 'all' ||
                monthFilter !== 'all') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setSearchQuery('');
                    setRoleFilter('all');
                    setTeamStatus('active');
                    setActivityFilter('all');
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
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 sm:py-16 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 px-4">
                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {teamStatus === 'inactive'
                    ? 'No inactive accounts match this filter.'
                    : 'No active team members match this filter.'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto leading-relaxed break-words">
                  API range: {queryWindow.from} → {queryWindow.to}. Endpoint{' '}
                  <span className="font-mono">{ENV.API_URL}/tasks/all_request_submissions.php</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {filteredUsers.map((g) => (
                  <UserRequestCard
                    key={g.userId}
                    group={g}
                    testerType={testerTypeById.get(g.userId)}
                    adminHoursCount={g.adminHoursCount}
                    onOpen={() => openUser(g.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
