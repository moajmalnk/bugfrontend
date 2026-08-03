import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  Home,
  Loader2,
  MapPin,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { cn, getEffectiveRole } from '@/lib/utils';
import {
  clearAttendanceExceptionsForUsers,
  listAllAttendanceExceptions,
  listAttendanceExceptions,
  saveAttendanceException,
  type AttendanceDayException,
  type AttendanceExceptionsAllPayload,
  type LateDayRow,
} from '@/services/attendanceExceptionService';
import { userService } from '@/services/userService';
import type { User } from '@/types';

function todayYMD() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function formatDay(date: string) {
  try {
    return format(parseISO(date), 'EEE, MMM d, yyyy');
  } catch {
    return date;
  }
}

function formatCheckIn(value?: string | null) {
  if (!value) return 'Late';
  try {
    return new Date(
      value.includes('T') ? value : value.replace(' ', 'T')
    ).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return value;
  }
}

function exceptionKey(row: Pick<AttendanceDayException, 'user_id' | 'exception_date'>) {
  return `${row.user_id ?? ''}|${row.exception_date}`;
}

function summarizeDates(dates: string[], max = 3): string {
  const sorted = [...dates].sort();
  if (sorted.length <= max) return sorted.map(formatDay).join('; ');
  return `${sorted.slice(0, max).map(formatDay).join('; ')}; +${sorted.length - max} more`;
}

function isAccountActive(user: User): boolean {
  return user.account_active == null || Number(user.account_active) !== 0;
}

function presenceRank(status?: User['status']): number {
  if (status === 'active') return 0;
  if (status === 'idle') return 1;
  return 2;
}

/** Why: Roster prefers online people, then highest hours today, then checked-in. */
function compareUsersByActivityThenHours(a: User, b: User): number {
  const presence = presenceRank(a.status) - presenceRank(b.status);
  if (presence !== 0) return presence;

  const aHours = Number(a.today_hours_worked ?? 0) || 0;
  const bHours = Number(b.today_hours_worked ?? 0) || 0;
  if (aHours !== bHours) return bHours - aHours;

  const aChecked = a.checked_in_today ? 0 : 1;
  const bChecked = b.checked_in_today ? 0 : 1;
  if (aChecked !== bChecked) return aChecked - bChecked;

  return String(a.username || '').localeCompare(String(b.username || ''), undefined, {
    sensitivity: 'base',
  });
}

function formatHoursShort(hours: number | undefined): string | null {
  const n = Number(hours ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}h`;
}

type UserRosterRow = {
  user: User;
  exceptionCount: number;
  lateCount: number;
  latestExceptionDate: string | null;
  latestLateDate: string | null;
};

/**
 * Admin attendance exceptions — user-first roster, then full day details on enter.
 */
export default function AdminAttendanceExceptions() {
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});

  const [data, setData] = useState<AttendanceExceptionsAllPayload | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  /** Currently opened user detail (null = roster view). */
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailExceptions, setDetailExceptions] = useState<AttendanceDayException[]>([]);
  const [detailLates, setDetailLates] = useState<LateDayRow[]>([]);

  const [grantUserId, setGrantUserId] = useState('');
  const [exceptionDates, setExceptionDates] = useState<string[]>([todayYMD()]);
  const [allowWfh, setAllowWfh] = useState(true);
  const [forgiveLate, setForgiveLate] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<AttendanceDayException[] | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [payload, userList] = await Promise.all([
        listAllAttendanceExceptions(),
        userService.getUsers().catch(() => [] as User[]),
      ]);
      setData(payload);
      const staff = (userList || [])
        .filter((u) => {
          const r = String(u.role || '').toLowerCase();
          const isStaff = r === 'admin' || r === 'developer' || r === 'user';
          return isStaff && isAccountActive(u);
        })
        .sort(compareUsersByActivityThenHours);
      setUsers(staff);
      setGrantUserId((prev) => {
        if (prev && staff.some((u) => String(u.id) === prev)) return prev;
        return staff[0] ? String(staff[0].id) : '';
      });
    } catch (e) {
      toast({
        title: 'Could not load attendance exceptions',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserDetail = useCallback(
    async (userId: string, opts?: { silent?: boolean }) => {
      if (!userId) return;
      if (!opts?.silent) setDetailLoading(true);
      try {
        const payload = await listAttendanceExceptions(userId);
        const username =
          users.find((u) => String(u.id) === userId)?.username ||
          data?.exceptions?.find((e) => String(e.user_id) === userId)?.username ||
          undefined;
        setDetailExceptions(
          (payload.exceptions ?? []).map((row) => ({
            ...row,
            user_id: userId,
            username: username ?? row.username,
          }))
        );
        setDetailLates(
          (payload.late_days ?? []).map((row) => ({
            ...row,
            user_id: userId,
            username: username ?? row.username,
          }))
        );
        setSelectedKeys((prev) => {
          const alive = new Set(
            (payload.exceptions ?? []).map((r) => exceptionKey({ ...r, user_id: userId }))
          );
          return prev.filter((k) => alive.has(k));
        });
      } catch (e) {
        // Fallback: group from overview payload if per-user endpoint fails.
        const fromAllExc = (data?.exceptions ?? []).filter((r) => String(r.user_id) === userId);
        const fromAllLate = (data?.late_days ?? []).filter((r) => String(r.user_id) === userId);
        setDetailExceptions(fromAllExc);
        setDetailLates(fromAllLate);
        if (fromAllExc.length === 0 && fromAllLate.length === 0) {
          toast({
            title: 'Could not load user exceptions',
            description: e instanceof Error ? e.message : 'Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!opts?.silent) setDetailLoading(false);
      }
    },
    [data?.exceptions, data?.late_days, users]
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (detailUserId) {
      void loadUserDetail(detailUserId);
    } else {
      setDetailExceptions([]);
      setDetailLates([]);
      setSelectedKeys([]);
    }
  }, [detailUserId]); // eslint-disable-line react-hooks/exhaustive-deps -- reload when entering a user

  const exceptionsByUser = useMemo(() => {
    const map = new Map<
      string,
      { exceptionCount: number; lateCount: number; latestExceptionDate: string | null; latestLateDate: string | null }
    >();
    for (const row of data?.exceptions ?? []) {
      const uid = String(row.user_id ?? '');
      if (!uid) continue;
      const cur = map.get(uid) ?? {
        exceptionCount: 0,
        lateCount: 0,
        latestExceptionDate: null as string | null,
        latestLateDate: null as string | null,
      };
      cur.exceptionCount += 1;
      if (
        !cur.latestExceptionDate ||
        row.exception_date > cur.latestExceptionDate
      ) {
        cur.latestExceptionDate = row.exception_date;
      }
      map.set(uid, cur);
    }
    for (const row of data?.late_days ?? []) {
      const uid = String(row.user_id ?? '');
      if (!uid) continue;
      const cur = map.get(uid) ?? {
        exceptionCount: 0,
        lateCount: 0,
        latestExceptionDate: null as string | null,
        latestLateDate: null as string | null,
      };
      cur.lateCount += 1;
      if (!cur.latestLateDate || row.submission_date > cur.latestLateDate) {
        cur.latestLateDate = row.submission_date;
      }
      map.set(uid, cur);
    }
    for (const summary of data?.users ?? []) {
      const uid = String(summary.user_id ?? '');
      if (!uid || map.has(uid)) continue;
      map.set(uid, {
        exceptionCount: summary.exception_count ?? 0,
        lateCount: summary.late_count ?? 0,
        latestExceptionDate: summary.latest_exception_date ?? null,
        latestLateDate: summary.latest_late_date ?? null,
      });
    }
    return map;
  }, [data]);

  const roster: UserRosterRow[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: UserRosterRow[] = users.map((user) => {
      const stats = exceptionsByUser.get(String(user.id));
      return {
        user,
        exceptionCount: stats?.exceptionCount ?? 0,
        lateCount: stats?.lateCount ?? 0,
        latestExceptionDate: stats?.latestExceptionDate ?? null,
        latestLateDate: stats?.latestLateDate ?? null,
      };
    });

    const filtered = q
      ? rows.filter((row) => {
          const hay = [
            row.user.username,
            row.user.name,
            row.user.role,
            row.user.status,
            row.exceptionCount ? 'exception' : '',
            row.lateCount ? 'late' : '',
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        })
      : rows;

    return [...filtered].sort((a, b) => compareUsersByActivityThenHours(a.user, b.user));
  }, [users, exceptionsByUser, query]);

  const detailUser = users.find((u) => String(u.id) === detailUserId) ?? null;
  const grantUser = users.find((u) => String(u.id) === grantUserId);

  const allSelected =
    detailExceptions.length > 0 &&
    selectedKeys.length > 0 &&
    detailExceptions.every((row) =>
      selectedKeys.includes(exceptionKey({ ...row, user_id: detailUserId ?? row.user_id }))
    );
  const someSelected = selectedKeys.length > 0 && !allSelected;

  function openUser(userId: string) {
    setDetailUserId(userId);
    setGrantUserId(userId);
    setSelectedKeys([]);
  }

  function closeDetail() {
    setDetailUserId(null);
    setSelectedKeys([]);
  }

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((k) => k !== key);
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked || !detailUserId) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys(
      detailExceptions.map((row) => exceptionKey({ ...row, user_id: detailUserId }))
    );
  }

  async function handleSave() {
    if (!grantUserId) {
      toast({
        title: 'Select a user',
        description: 'Choose who this exception applies to.',
        variant: 'destructive',
      });
      return;
    }
    const dates = [...new Set(exceptionDates)].filter(Boolean).sort();
    if (dates.length === 0) return;
    if (!allowWfh && !forgiveLate) {
      toast({
        title: 'Select at least one option',
        description: 'Allow WFH and/or forgive late for the selected dates.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const result = await saveAttendanceException({
        user_id: grantUserId,
        dates,
        allow_wfh: allowWfh,
        forgive_late: forgiveLate,
        admin_note: adminNote.trim() || undefined,
        action: forgiveLate ? 'forgive_late' : 'save',
      });
      toast({
        title: dates.length === 1 ? 'Exception saved' : 'Exceptions saved',
        description: `${grantUser?.username || 'User'}: ${
          result.saved_count ?? dates.length
        } day(s) updated.`,
      });
      setAdminNote('');
      setExceptionDates([todayYMD()]);
      openUser(grantUserId);
      await loadOverview();
      await loadUserDetail(grantUserId, { silent: true });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Could not save exception.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleForgiveLate(row: LateDayRow) {
    const uid = String(row.user_id || detailUserId || '');
    if (!uid) return;
    setSaving(true);
    try {
      await saveAttendanceException({
        user_id: uid,
        date: row.submission_date,
        action: 'forgive_late',
        forgive_late: true,
        admin_note: adminNote.trim() || 'Unmarked from late check-in list',
      });
      toast({
        title: 'Late unmarked',
        description: `${row.username || detailUser?.username || 'User'} · ${formatDay(
          row.submission_date
        )}`,
      });
      await loadOverview();
      await loadUserDetail(uid, { silent: true });
    } catch (e) {
      toast({
        title: 'Could not unmark late',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmRemove() {
    const rows = pendingRemove ?? [];
    if (rows.length === 0) {
      setPendingRemove(null);
      return;
    }
    setSaving(true);
    try {
      const cleared = await clearAttendanceExceptionsForUsers(
        rows.map((r) => ({
          user_id: String(r.user_id || detailUserId || ''),
          date: r.exception_date,
        }))
      );
      toast({
        title: rows.length === 1 ? 'Exception cleared' : 'Exceptions cleared',
        description: `${cleared} day(s) removed.`,
      });
      setPendingRemove(null);
      setSelectedKeys([]);
      await loadOverview();
      if (detailUserId) {
        await loadUserDetail(detailUserId, { silent: true });
      }
    } catch (e) {
      toast({
        title: 'Clear failed',
        description: e instanceof Error ? e.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Only admins can manage attendance exceptions.</p>
      </div>
    );
  }

  const removeCount = pendingRemove?.length ?? 0;
  const usersWithExceptions = roster.filter((r) => r.exceptionCount > 0).length;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            Attendance exceptions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse teammates, open a person for full day details, then grant WFH or forgive late
            check-ins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-xl tabular-nums">
            {data?.exception_count ?? 0} days active
          </Badge>
          <Badge variant="secondary" className="rounded-xl tabular-nums">
            {usersWithExceptions} people
          </Badge>
          <Badge variant="outline" className="rounded-xl tabular-nums">
            {data?.late_count ?? 0} late on record
          </Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold">Grant exception</p>
          {detailUserId ? (
            <p className="text-xs text-muted-foreground">
              Granting for selected user · change below if needed
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label>User</Label>
            <Select
              value={grantUserId}
              onValueChange={(id) => {
                setGrantUserId(id);
              }}
              disabled={saving || users.length === 0}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-72">
                {users.map((u) => {
                  const hoursLabel = formatHoursShort(u.today_hours_worked);
                  const stats = exceptionsByUser.get(String(u.id));
                  return (
                    <SelectItem key={u.id} value={String(u.id)} className="rounded-lg">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{u.username}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{u.role}</span>
                        {hoursLabel ? (
                          <span className="text-xs tabular-nums text-sky-600 dark:text-sky-400 shrink-0">
                            {hoursLabel}
                          </span>
                        ) : null}
                        {(stats?.exceptionCount ?? 0) > 0 ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                            {stats?.exceptionCount} exc
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label>Dates</Label>
            <DatePicker
              mode="multiple"
              values={exceptionDates}
              onChange={setExceptionDates}
              placeholder="Pick one or more dates"
              className="h-11 rounded-xl border-border/60 bg-background text-sm"
            />
          </div>
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label htmlFor="att-note">Admin note (optional)</Label>
            <Input
              id="att-note"
              value={adminNote}
              maxLength={255}
              onChange={(e) => setAdminNote(e.target.value.slice(0, 255))}
              placeholder="e.g. Client visit / transport delay"
              className="h-11 rounded-xl"
            />
          </div>
          <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
            <div className="flex items-start gap-2 min-w-0">
              <Home className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Allow WFH</p>
                <p className="text-xs text-muted-foreground">Even during Office-only week</p>
              </div>
            </div>
            <Switch checked={allowWfh} onCheckedChange={setAllowWfh} disabled={saving} />
          </div>
          <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Forgive late (after 10:00 AM)</p>
                <p className="text-xs text-muted-foreground">Clears late strike for those days</p>
              </div>
            </div>
            <Switch checked={forgiveLate} onCheckedChange={setForgiveLate} disabled={saving} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !grantUserId || exceptionDates.length === 0}
            className="rounded-xl h-11"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : exceptionDates.length > 1 ? (
              `Save ${exceptionDates.length} exceptions`
            ) : (
              'Save exception'
            )}
          </Button>
          {grantUserId ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl h-11"
              disabled={saving}
              onClick={() => openUser(grantUserId)}
            >
              Open {grantUser?.username || 'user'} details
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 lg:col-span-5 h-80 rounded-2xl" />
          <Skeleton className="col-span-12 lg:col-span-7 h-80 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* User roster */}
          <div
            className={cn(
              'col-span-12 space-y-3',
              detailUserId ? 'lg:col-span-5' : 'lg:col-span-12'
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-semibold">People</p>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people…"
                  className="h-10 rounded-xl pl-9"
                />
              </div>
            </div>

            {roster.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
                {query.trim() ? 'No people match this search.' : 'No active teammates found.'}
              </p>
            ) : (
              <div
                className={cn(
                  'grid gap-3',
                  detailUserId
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                )}
              >
                {roster.map((row) => {
                  const uid = String(row.user.id);
                  const active = detailUserId === uid;
                  const hoursLabel = formatHoursShort(row.user.today_hours_worked);
                  return (
                    <button
                      key={uid}
                      type="button"
                      onClick={() => openUser(uid)}
                      className={cn(
                        'text-left rounded-2xl border px-4 py-3.5 transition-colors',
                        'hover:border-sky-500/40 hover:bg-sky-500/5',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
                        active
                          ? 'border-sky-500/50 bg-sky-500/10 shadow-sm'
                          : 'border-border/60 bg-card/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{row.user.username}</p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {row.user.role}
                              {hoursLabel ? ` · ${hoursLabel} today` : ''}
                              {row.user.status === 'active'
                                ? ' · Active'
                                : row.user.status === 'idle'
                                  ? ' · Idle'
                                  : row.user.checked_in_today
                                    ? ' · Checked in'
                                    : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 mt-1 text-muted-foreground',
                            active && 'text-sky-600 dark:text-sky-400'
                          )}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge
                          variant={row.exceptionCount > 0 ? 'secondary' : 'outline'}
                          className="rounded-xl tabular-nums"
                        >
                          {row.exceptionCount} exception{row.exceptionCount === 1 ? '' : 's'}
                        </Badge>
                        <Badge
                          variant={row.lateCount > 0 ? 'destructive' : 'outline'}
                          className={cn(
                            'rounded-xl tabular-nums',
                            row.lateCount > 0
                              ? ''
                              : 'text-muted-foreground'
                          )}
                        >
                          {row.lateCount} late
                        </Badge>
                        {row.latestExceptionDate ? (
                          <span className="text-[11px] text-muted-foreground self-center">
                            Latest {formatDay(row.latestExceptionDate)}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* User detail */}
          {detailUserId ? (
            <div className="col-span-12 lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-xl shrink-0 -ml-1"
                      onClick={closeDetail}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      People
                    </Button>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold truncate">
                        {detailUser?.username || 'User'}
                      </h2>
                      <p className="text-xs text-muted-foreground capitalize">
                        {detailUser?.role || 'teammate'}
                        {detailUser?.today_hours_worked
                          ? ` · ${formatHoursShort(detailUser.today_hours_worked)} today`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl shrink-0" asChild>
                    <Link to={`/${role}/users/${detailUserId}`}>
                      Full profile
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>

                {detailLoading ? (
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="p-4 sm:p-5 grid grid-cols-12 gap-5">
                    <div className="col-span-12 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          Day exceptions
                          <span className="text-muted-foreground font-normal ml-2 tabular-nums">
                            {detailExceptions.length}
                          </span>
                        </p>
                        {detailExceptions.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-xl h-8 px-2 text-xs"
                              disabled={saving}
                              onClick={() => toggleSelectAll(!allSelected)}
                            >
                              {allSelected ? 'Clear selection' : 'Select all'}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="rounded-xl h-8"
                              disabled={saving || selectedKeys.length === 0}
                              onClick={() => {
                                const rows = detailExceptions.filter((r) =>
                                  selectedKeys.includes(
                                    exceptionKey({ ...r, user_id: detailUserId })
                                  )
                                );
                                setPendingRemove(
                                  rows.map((r) => ({ ...r, user_id: detailUserId }))
                                );
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Remove {selectedKeys.length > 0 ? selectedKeys.length : ''}
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      {detailExceptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          No day exceptions for this user yet. Use Grant exception above.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {detailExceptions.map((row) => {
                            const key = exceptionKey({ ...row, user_id: detailUserId });
                            const checked = selectedKeys.includes(key);
                            return (
                              <div
                                key={`${key}-${row.id ?? 'x'}`}
                                className={cn(
                                  'rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
                                  checked
                                    ? 'border-primary/50 bg-primary/5'
                                    : 'border-border/60'
                                )}
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <Checkbox
                                    className="mt-1 rounded-md"
                                    checked={checked}
                                    disabled={saving}
                                    onCheckedChange={(v) => toggleKey(key, v === true)}
                                    aria-label={`Select ${formatDay(row.exception_date)}`}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                      {formatDay(row.exception_date)}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                      {row.allow_wfh ? (
                                        <Badge variant="secondary" className="rounded-xl">
                                          WFH allowed
                                        </Badge>
                                      ) : null}
                                      {row.forgive_late ? (
                                        <Badge variant="outline" className="rounded-xl">
                                          Late forgiven
                                        </Badge>
                                      ) : null}
                                    </div>
                                    {row.admin_note ? (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {row.admin_note}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl shrink-0"
                                  disabled={saving}
                                  onClick={() =>
                                    setPendingRemove([{ ...row, user_id: detailUserId }])
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 space-y-3">
                      <p className="text-sm font-semibold">
                        Late check-ins
                        <span className="text-muted-foreground font-normal ml-2 tabular-nums">
                          {detailLates.length}
                        </span>
                      </p>
                      {detailLates.length === 0 ? (
                        <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-8 text-center">
                          No late check-ins on record for this user.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {detailLates.map((row) => (
                            <div
                              key={`${row.user_id}-${row.id}`}
                              className="rounded-xl border border-rose-200/70 dark:border-rose-900/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {formatDay(row.submission_date)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatCheckIn(row.check_in_time)}
                                  {row.late_strike_consumed
                                    ? ' · counted toward Office-only'
                                    : ' · open strike'}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl shrink-0 border-rose-300 dark:border-rose-800"
                                disabled={saving}
                                onClick={() => void handleForgiveLate(row)}
                              >
                                Unmark late
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="col-span-12 lg:col-span-12">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Select a person to view every exception day and late check-in for them.
              </p>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!pendingRemove}
        onOpenChange={(open) => {
          if (!open && !saving) setPendingRemove(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeCount > 1 ? `Remove ${removeCount} exceptions?` : 'Remove this exception?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemove && pendingRemove.length > 0
                ? `Clear exception${removeCount > 1 ? 's' : ''} for ${
                    removeCount === 1
                      ? `${detailUser?.username || pendingRemove[0].username || 'user'} · ${formatDay(
                          pendingRemove[0].exception_date
                        )}`
                      : summarizeDates(pendingRemove.map((r) => r.exception_date))
                  }. WFH allow for those days will stop applying.`
                : 'This cannot be undone from here.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={saving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving || !pendingRemove?.length}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmRemove();
              }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : removeCount > 1 ? (
                `Remove ${removeCount}`
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
