import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, CalendarDays, Loader2, Save, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { grantOfficialLeave } from '@/services/leaveService';
import { userService } from '@/services/userService';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import type { User } from '@/types';

type Scope = 'all' | 'users';
type RoleFilter = 'all' | 'developer' | 'tester' | 'admin' | 'creator';

const ROLE_FILTERS: Array<{ key: RoleFilter; label: string }> = [
  { key: 'all', label: 'All roles' },
  { key: 'developer', label: 'Developers' },
  { key: 'tester', label: 'Testers' },
  { key: 'admin', label: 'Admins' },
  { key: 'creator', label: 'Creators' },
];

const ROLE_SORT_ORDER: Record<string, number> = {
  developer: 0,
  tester: 1,
  admin: 2,
  creator: 3,
};

function roleKey(u: User): string {
  return String(u.role || 'user').toLowerCase();
}

export default function AdminOfficialLeave() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'LEAVE_MANAGE');
  const isAdmin = role === 'admin';

  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [saving, setSaving] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [replaceAdminHours, setReplaceAdminHours] = useState(true);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      setLoadingUsers(true);
      try {
        const list = await userService.getUsers();
        if (!cancelled) {
          setUsers(
            list.filter((u) => {
              const active =
                u.account_active === undefined || u.account_active === null
                  ? true
                  : Number(u.account_active) === 1;
              return active;
            })
          );
        }
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: users.length,
      developer: 0,
      tester: 0,
      admin: 0,
      creator: 0,
    };
    users.forEach((u) => {
      const r = roleKey(u);
      if (r in counts) counts[r] += 1;
    });
    return counts;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const list = users.filter((u) => {
      const r = roleKey(u);
      if (roleFilter !== 'all' && r !== roleFilter) return false;
      if (!q) return true;
      const hay = `${u.username || ''} ${u.name || ''} ${u.role || ''}`.toLowerCase();
      return hay.includes(q);
    });
    return [...list].sort((a, b) => {
      const ra = ROLE_SORT_ORDER[roleKey(a)] ?? 99;
      const rb = ROLE_SORT_ORDER[roleKey(b)] ?? 99;
      if (ra !== rb) return ra - rb;
      return String(a.username || a.name || '').localeCompare(String(b.username || b.name || ''));
    });
  }, [users, userQuery, roleFilter]);

  const groupedUsers = useMemo(() => {
    const groups: Array<{ role: string; label: string; users: User[] }> = [];
    const order = ['developer', 'tester', 'admin', 'creator'];
    const labels: Record<string, string> = {
      developer: 'Developers',
      tester: 'Testers',
      admin: 'Admins',
      creator: 'Creators',
    };
    for (const r of order) {
      const chunk = filteredUsers.filter((u) => roleKey(u) === r);
      if (chunk.length) groups.push({ role: r, label: labels[r], users: chunk });
    }
    const other = filteredUsers.filter((u) => !order.includes(roleKey(u)));
    if (other.length) groups.push({ role: 'other', label: 'Other', users: other });
    return groups;
  }, [filteredUsers]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredUsers.forEach((u) => next.add(String(u.id)));
      return next;
    });
  };

  const selectRole = (r: RoleFilter) => {
    if (r === 'all') {
      setSelectedIds(new Set(users.map((u) => String(u.id))));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      users.filter((u) => roleKey(u) === r).forEach((u) => next.add(String(u.id)));
      return next;
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  const isValid =
    !!startDate &&
    !!endDate &&
    endDate >= startDate &&
    title.trim().length > 0 &&
    (scope === 'all' || selectedIds.size > 0);

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    if (scope === 'users' && selectedIds.size === 0) {
      toast({
        title: 'Select users',
        description: 'Pick at least one user, or choose All users.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const result = await grantOfficialLeave({
        start_date: startDate,
        end_date: endDate,
        title: title.trim(),
        scope,
        user_ids: scope === 'users' ? Array.from(selectedIds) : undefined,
        notify: notifyUsers,
        replace_admin_hours: replaceAdminHours,
      });
      const skipN = Array.isArray(result.skipped) ? result.skipped.length : 0;
      const removed = Number(result.admin_hours_removed || 0);
      toast({
        title: 'Official Leave granted',
        description: `${result.created} user${result.created === 1 ? '' : 's'} · 8h/day${
          removed ? ` · ${removed} admin-hour entr${removed === 1 ? 'y' : 'ies'} removed` : ''
        }${notifyUsers ? ' · push + WhatsApp + email queued' : ''}${
          skipN ? ` · ${skipN} skipped` : ''
        }.`,
      });
      setTitle('');
      if (scope === 'users') clearSelected();
    } catch (e) {
      toast({
        title: 'Failed to grant Official Leave',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;
  if (!isAdmin && !canManage) {
    return <Navigate to={`/${role}/dashboard`} replace />;
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
      <div className="relative min-w-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-amber-50/50 via-transparent to-orange-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-orange-950/20" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shrink-0">
                  <Building2 className="h-6 w-6 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                    Official Leave
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mt-2" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base font-medium max-w-2xl">
                Grant company official leave (8 work hours per day) to all staff or selected users —
                for holidays like Meelad Nabi. Separate from forgot-checkout hours.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-xl shrink-0">
              <Link to={`/${role}/leave-requests`}>Leave requests</Link>
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-2xl border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Grant Official Leave
          </CardTitle>
          <CardDescription>
            Credits 8h per day on Daily Update and work stats. Does not use personal leave balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label className="text-sm font-semibold">Start date</Label>
              <DatePicker
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  if (endDate && v && endDate < v) setEndDate(v);
                }}
                placeholder="Start date"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-2">
              <Label className="text-sm font-semibold">End date</Label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End date"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 space-y-2">
              <Label htmlFor="official-leave-title" className="text-sm font-semibold">
                Title / reason
              </Label>
              <Input
                id="official-leave-title"
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 255))}
                placeholder="e.g. Meelad Nabi"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="col-span-12 rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200">
              Hours credited: <strong>8.0h</strong> per day for each granted user.
            </div>
            <label className="col-span-12 flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 px-3 py-3">
              <Checkbox
                checked={replaceAdminHours}
                onCheckedChange={(v) => setReplaceAdminHours(v === true)}
                className="mt-0.5 rounded-md"
              />
              <span className="text-sm">
                <span className="font-semibold">Remove forgot-checkout admin hours</span> for these dates
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Soft-deletes red “Admin entry” rows (e.g. Aug 25–26) so Official Leave replaces them cleanly.
                </span>
              </span>
            </label>
            <label className="col-span-12 flex items-start gap-3 cursor-pointer rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 px-3 py-3">
              <Checkbox
                checked={notifyUsers}
                onCheckedChange={(v) => setNotifyUsers(v === true)}
                className="mt-0.5 rounded-md"
              />
              <span className="text-sm">
                <span className="font-semibold">Notify all granted users</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Push notification + WhatsApp + email (professional Official Leave message).
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audience
            </Label>
            <div className="grid grid-cols-12 gap-3">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`col-span-12 sm:col-span-6 rounded-xl border px-4 py-3 text-left transition-colors ${
                  scope === 'all'
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
                    : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40'
                }`}
              >
                <div className="font-semibold text-sm">All users</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Every active employee ({users.length})
                </div>
              </button>
              <button
                type="button"
                onClick={() => setScope('users')}
                className={`col-span-12 sm:col-span-6 rounded-xl border px-4 py-3 text-left transition-colors ${
                  scope === 'users'
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40'
                    : 'border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40'
                }`}
              >
                <div className="font-semibold text-sm">Selected users</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedIds.size} selected
                </div>
              </button>
            </div>
          </div>

          {scope === 'users' ? (
            <div className="space-y-3 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4">
              <div className="flex flex-wrap gap-2">
                {ROLE_FILTERS.map((f) => {
                  const count = roleCounts[f.key] ?? 0;
                  if (f.key !== 'all' && count === 0) return null;
                  const active = roleFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setRoleFilter(f.key)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100'
                          : 'border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {f.label}
                      <span className="ml-1 tabular-nums opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => selectRole('developer')}
                  disabled={!roleCounts.developer}
                >
                  Select developers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => selectRole('tester')}
                  disabled={!roleCounts.tester}
                >
                  Select testers
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl h-8 text-xs"
                  onClick={() => selectRole('admin')}
                  disabled={!roleCounts.admin}
                >
                  Select admins
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search users…"
                    className="pl-9 h-10 rounded-xl"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={selectVisible}>
                    Select visible
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={clearSelected}>
                    Clear
                  </Button>
                </div>
              </div>
              {loadingUsers ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users…
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  {groupedUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center">No users found</p>
                  ) : (
                    <div className="flex flex-col gap-0">
                      {groupedUsers.map((g) => (
                        <div key={g.role}>
                          <div className="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-muted/80 text-muted-foreground border-b border-gray-200/40 dark:border-gray-700/40 backdrop-blur-sm">
                            {g.label}
                            <span className="ml-1 tabular-nums font-normal">({g.users.length})</span>
                          </div>
                          <div className="divide-y divide-gray-200/40 dark:divide-gray-700/40">
                            {g.users.map((u) => {
                              const id = String(u.id);
                              const checked = selectedIds.has(id);
                              return (
                                <label
                                  key={id}
                                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => toggleUser(id)}
                                    className="rounded-md"
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium truncate">
                                      {u.username || u.name || id}
                                    </span>
                                    <span className="block text-xs text-muted-foreground uppercase">
                                      {u.role || 'user'}
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={!isValid || saving}
              onClick={handleSubmit}
              className="rounded-xl h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Grant Official Leave
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
