import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock,
  Check,
  ChevronRight,
  Filter,
  Home,
  Loader2,
  MapPin,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
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
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  listAllAttendanceExceptions,
  saveAttendanceException,
  type AttendanceExceptionsAllPayload,
} from '@/services/attendanceExceptionService';
import {
  deleteWfhRequest,
  listPendingWfhRequests,
  reviewWfhRequest,
  type WfhRequest,
} from '@/services/wfhRequestService';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import { userService } from '@/services/userService';
import type { User } from '@/types';
import {
  compareUsersByActivityThenHours,
  formatDay,
  formatDayShort,
  formatHoursShort,
  isAccountActive,
  todayYMD,
  type UserRosterRow,
} from '@/pages/adminAttendanceShared';

/**
 * Admin attendance exceptions — list: people roster, pending WFH, grant form.
 * Day-level detail lives on `/attendance-exceptions/:userId`.
 */
export default function AdminAttendanceExceptions() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canManageAttendance = hasPermissionOrAdmin(role, hasPermission, 'ATTENDANCE_MANAGE');
  const navigate = useNavigate();

  const [data, setData] = useState<AttendanceExceptionsAllPayload | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [pendingWfh, setPendingWfh] = useState<WfhRequest[]>([]);
  const [wfhReview, setWfhReview] = useState<{
    request: WfhRequest;
    action: 'approve' | 'reject' | 'delete';
  } | null>(null);
  const [wfhReviewing, setWfhReviewing] = useState(false);

  const [grantUserId, setGrantUserId] = useState('');
  const [exceptionDates, setExceptionDates] = useState<string[]>([todayYMD()]);
  const [allowWfh, setAllowWfh] = useState(true);
  const [forgiveLate, setForgiveLate] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [payload, userList, wfhPayload] = await Promise.all([
        listAllAttendanceExceptions(),
        userService.getUsers().catch(() => [] as User[]),
        listPendingWfhRequests().catch(() => ({
          pending: [] as WfhRequest[],
          pending_count: 0,
          today: todayYMD(),
        })),
      ]);
      setData(payload);
      setPendingWfh(Array.isArray(wfhPayload.pending) ? wfhPayload.pending : []);
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
      setPendingWfh([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const exceptionsByUser = useMemo(() => {
    const map = new Map<
      string,
      {
        exceptionCount: number;
        lateCount: number;
        officeActiveDays: number;
        latestExceptionDate: string | null;
        latestLateDate: string | null;
      }
    >();
    for (const row of data?.exceptions ?? []) {
      const uid = String(row.user_id ?? '');
      if (!uid) continue;
      const cur = map.get(uid) ?? {
        exceptionCount: 0,
        lateCount: 0,
        officeActiveDays: 0,
        latestExceptionDate: null as string | null,
        latestLateDate: null as string | null,
      };
      cur.exceptionCount += 1;
      if (!cur.latestExceptionDate || row.exception_date > cur.latestExceptionDate) {
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
        officeActiveDays: 0,
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
      if (!uid) continue;
      const cur = map.get(uid) ?? {
        exceptionCount: summary.exception_count ?? 0,
        lateCount: summary.late_count ?? 0,
        officeActiveDays: summary.office_active_days ?? 0,
        latestExceptionDate: summary.latest_exception_date ?? null,
        latestLateDate: summary.latest_late_date ?? null,
      };
      cur.officeActiveDays = summary.office_active_days ?? cur.officeActiveDays ?? 0;
      if (!map.has(uid)) {
        map.set(uid, cur);
      } else {
        map.set(uid, { ...cur, officeActiveDays: summary.office_active_days ?? 0 });
      }
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
        officeActiveDays: stats?.officeActiveDays ?? 0,
        latestExceptionDate: stats?.latestExceptionDate ?? null,
        latestLateDate: stats?.latestLateDate ?? null,
      };
    });

    const filtered = rows.filter((row) => {
      if (roleFilter !== 'all') {
        const r = String(row.user.role || '').toLowerCase();
        if (r !== roleFilter) return false;
      }
      if (activityFilter === 'exceptions' && row.exceptionCount <= 0) return false;
      if (activityFilter === 'late' && row.lateCount <= 0) return false;
      if (activityFilter === 'office' && row.officeActiveDays <= 0) return false;
      if (activityFilter === 'clean' && (row.exceptionCount > 0 || row.lateCount > 0)) {
        return false;
      }
      if (!q) return true;
      const hay = [
        row.user.username,
        row.user.name,
        row.user.role,
        row.user.status,
        row.exceptionCount ? 'exception' : '',
        row.lateCount ? 'late' : '',
        row.officeActiveDays ? 'office' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });

    return [...filtered].sort((a, b) => compareUsersByActivityThenHours(a.user, b.user));
  }, [users, exceptionsByUser, query, roleFilter, activityFilter]);

  const hasActiveFilters =
    query.trim() !== '' || roleFilter !== 'all' || activityFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setActivityFilter('all');
  };

  const filterTriggerClass =
    'w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-sky-500/40';

  const filterFieldClass = 'flex items-center gap-2 min-w-0 w-full';

  const grantUser = users.find((u) => String(u.id) === grantUserId);

  function openUser(userId: string) {
    navigate(`/${role}/attendance-exceptions/${userId}`);
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
      navigate(`/${role}/attendance-exceptions/${grantUserId}`);
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

  async function handleConfirmWfhReview() {
    if (!wfhReview || wfhReviewing) return;
    setWfhReviewing(true);
    try {
      const dayLabel = formatDay(wfhReview.request.request_date);
      const who = wfhReview.request.username || 'User';

      if (wfhReview.action === 'delete') {
        const result = await deleteWfhRequest({
          user_id: wfhReview.request.user_id,
          date: wfhReview.request.request_date,
        });
        toast({
          title: 'WFH request deleted',
          description: result.message || `${who} · ${dayLabel}`,
        });
      } else {
        const result = await reviewWfhRequest({
          user_id: wfhReview.request.user_id,
          date: wfhReview.request.request_date,
          action: wfhReview.action,
        });
        toast({
          title: wfhReview.action === 'approve' ? 'WFH approved' : 'WFH rejected',
          description: result.message || `${who} · ${dayLabel}`,
        });
      }

      setWfhReview(null);
      notifyAdminNavCountsChanged();
      await loadOverview();
    } catch (e) {
      toast({
        title: wfhReview.action === 'delete' ? 'Delete failed' : 'Review failed',
        description:
          e instanceof Error
            ? e.message
            : wfhReview.action === 'delete'
              ? 'Could not delete WFH request.'
              : 'Could not update WFH request.',
        variant: 'destructive',
      });
    } finally {
      setWfhReviewing(false);
    }
  }

  if (!canManageAttendance) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 via-blue-50/30 to-indigo-50/50 dark:from-sky-950/20 dark:via-blue-950/10 dark:to-indigo-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
              <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <CalendarClock className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Only admins can manage attendance exceptions.
              </p>
            </div>
          </div>
      </div>
    );
  }

  const usersWithExceptions = users.filter((u) => {
    const stats = exceptionsByUser.get(String(u.id));
    return (stats?.exceptionCount ?? 0) > 0;
  }).length;
  const grantUserOfficeDays = exceptionsByUser.get(String(grantUserId))?.officeActiveDays ?? 0;
  const selectedOfficeName =
    users.find((u) => String(u.id) === grantUserId)?.username || 'selected';

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-50/50 via-transparent to-blue-50/50 dark:from-sky-950/20 dark:via-transparent dark:to-blue-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-12 gap-4 sm:gap-6 min-w-0 w-full">
              <div className="col-span-12 space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg shrink-0">
                    <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      Attendance exceptions
                    </h1>
                    <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl">
                  Browse people below, then open their page for day details, weekly Office &amp; WFH
                  tables, exceptions, and late check-ins.
                </p>
              </div>

              <div className="col-span-12 flex flex-wrap items-stretch gap-3 min-w-0">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border border-sky-200 dark:border-sky-800 rounded-xl shadow-sm min-w-0 flex-1 basis-[min(100%,11rem)] sm:basis-[min(100%,12rem)]">
                  <div className="p-1.5 bg-sky-500 rounded-lg shrink-0">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-sky-700 dark:text-sky-300 tabular-nums leading-none">
                      {grantUserOfficeDays}
                    </p>
                    <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80 truncate mt-1">
                      office days · {selectedOfficeName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm min-w-0 flex-1 basis-[min(100%,11rem)] sm:basis-[min(100%,12rem)]">
                  <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                    <UserRound className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums leading-none">
                      {data?.office_active_days_total ?? 0}
                    </p>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-1 truncate">
                      office days total
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-xl shadow-sm min-w-0 flex-1 basis-[min(100%,11rem)] sm:basis-[min(100%,12rem)]">
                  <div className="p-1.5 bg-violet-500 rounded-lg shrink-0">
                    <CalendarClock className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-violet-700 dark:text-violet-300 tabular-nums leading-none">
                      {data?.exception_count ?? 0}
                    </p>
                    <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80 mt-1 truncate">
                      exceptions · {usersWithExceptions} people
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 border border-rose-200 dark:border-rose-800 rounded-xl shadow-sm min-w-0 flex-1 basis-[min(100%,11rem)] sm:basis-[min(100%,12rem)]">
                  <div className="p-1.5 bg-rose-500 rounded-lg shrink-0">
                    <Home className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-rose-700 dark:text-rose-300 tabular-nums leading-none">
                      {data?.late_count ?? 0}
                    </p>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1 truncate">
                      late on record
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {pendingWfh.length > 0 ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-50/40 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-amber-200/70 dark:border-amber-800/50 rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm sm:text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="p-1.5 bg-amber-500 rounded-lg">
                    <Home className="h-4 w-4 text-white" />
                  </span>
                  Pending WFH requests
                </p>
                <Badge
                  variant="outline"
                  className="rounded-xl tabular-nums border-amber-400/80 bg-amber-50/80 dark:bg-amber-950/40"
                >
                  {pendingWfh.length}
                </Badge>
              </div>
              <div className="flex flex-col gap-4">
                {pendingWfh.map((req) => (
                  <div
                    key={`${req.user_id}-${req.request_date}-${req.id ?? ''}`}
                    className="rounded-xl border border-border/60 bg-background/90 p-3 sm:p-4"
                  >
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-7 min-w-0 space-y-1">
                        <p className="font-semibold truncate">
                          {req.username || `User #${req.user_id}`}
                          {req.role ? (
                            <span className="ms-2 text-xs font-normal text-muted-foreground">
                              {req.role}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDay(req.request_date)}</p>
                        {req.user_note ? (
                          <p className="text-sm text-foreground/90 break-words">{req.user_note}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No note</p>
                        )}
                      </div>
                      <div className="col-span-12 md:col-span-5 flex flex-wrap gap-2 md:justify-end">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white"
                          disabled={saving || wfhReviewing}
                          onClick={() => setWfhReview({ request: req, action: 'approve' })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1.5" />
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={saving || wfhReviewing}
                          onClick={() => setWfhReview({ request: req, action: 'reject' })}
                        >
                          <X className="h-3.5 w-3.5 mr-1.5" />
                          Reject
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-destructive hover:text-destructive"
                          disabled={saving || wfhReviewing}
                          onClick={() => setWfhReview({ request: req, action: 'delete' })}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-xl"
                          onClick={() => openUser(req.user_id)}
                        >
                          Open user
                          <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-sky-50/30 dark:from-gray-800/30 dark:to-sky-900/30 rounded-2xl" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-sky-500 rounded-lg">
                <CalendarClock className="h-4 w-4 text-white" />
              </div>
              <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Grant exception
              </p>
            </div>
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 md:col-span-4 space-y-2 min-w-0">
                <Label>User</Label>
                <Select
                  value={grantUserId}
                  onValueChange={setGrantUserId}
                  disabled={saving || users.length === 0}
                >
                  <SelectTrigger className="h-11 rounded-xl min-w-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
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
                  placeholder="Pick days or a full month"
                  className="h-11 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Multi-select days, or use{' '}
                  <span className="font-medium text-foreground/80">Select month</span> in the calendar
                  for a full-month exemption.
                </p>
                {exceptionDates.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {exceptionDates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        disabled={saving}
                        onClick={() => setExceptionDates((prev) => prev.filter((x) => x !== d))}
                        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-0.5 text-[11px] tabular-nums hover:border-destructive/50 hover:text-destructive transition-colors"
                        title="Remove date"
                      >
                        {formatDayShort(d)}
                        <X className="h-3 w-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="col-span-12 md:col-span-4 space-y-2">
                <Label htmlFor="att-note">Admin note (optional)</Label>
                <Input
                  id="att-note"
                  value={adminNote}
                  maxLength={255}
                  onChange={(e) => setAdminNote(e.target.value.slice(0, 255))}
                  placeholder="e.g. Client visit / transport delay"
                  className="h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                />
              </div>
              <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/60 px-3 sm:px-4 py-3 min-w-0 shadow-sm">
                <div className="flex items-start gap-2 min-w-0">
                  <Home className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Allow WFH</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                      Even during Office-only week
                    </p>
                  </div>
                </div>
                <Switch checked={allowWfh} onCheckedChange={setAllowWfh} disabled={saving} />
              </div>
              <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/60 px-3 sm:px-4 py-3 min-w-0 shadow-sm">
                <div className="flex items-start gap-2 min-w-0">
                  <MapPin className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Forgive late check-in</p>
                    <p className="text-[11px] sm:text-xs text-muted-foreground break-words">
                      Clears late strike for those days
                    </p>
                  </div>
                </div>
                <Switch checked={forgiveLate} onCheckedChange={setForgiveLate} disabled={saving} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void handleSave()}
                disabled={saving || !grantUserId || exceptionDates.length === 0}
                className="rounded-xl h-11 px-6 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold shadow-md hover:scale-[1.02] transition-transform"
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
                  className="rounded-xl h-11 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 font-semibold"
                  disabled={saving}
                  onClick={() => openUser(grantUserId)}
                >
                  Open {grantUser?.username || 'user'} details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-12 gap-4 sm:gap-6">
            <Skeleton className="col-span-12 h-28 rounded-2xl" />
            <Skeleton className="col-span-12 h-64 sm:h-80 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            {/* Search & Filter — same pattern as Bugs / Fixes / Updates */}
            <div className="relative w-full min-w-0">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-sky-50/30 dark:from-gray-800/30 dark:to-sky-900/30 rounded-2xl pointer-events-none" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
                <div className="space-y-3 sm:space-y-4 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-sky-500 rounded-lg shrink-0">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                        Search &amp; Filter
                      </h3>
                    </div>
                    {hasActiveFilters ? (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          {roster.length}
                        </span>{' '}
                        matching {roster.length === 1 ? 'person' : 'people'}
                      </p>
                    ) : null}
                  </div>

                  <div className="relative group w-full min-w-0">
                    <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name, role, or status…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      autoComplete="off"
                      aria-label="Search people"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                    <div className={filterFieldClass}>
                      <div className="p-1.5 bg-violet-500 rounded-lg shrink-0">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                          <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className={filterFieldClass}>
                      <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                        <Filter className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Select value={activityFilter} onValueChange={setActivityFilter}>
                          <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="Activity" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All activity</SelectItem>
                            <SelectItem value="exceptions">Has exceptions</SelectItem>
                            <SelectItem value="late">Has late marks</SelectItem>
                            <SelectItem value="office">Has office days</SelectItem>
                            <SelectItem value="clean">No exceptions or late</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {hasActiveFilters ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="h-10 sm:h-11 w-full sm:w-auto px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                      >
                        Clear filters
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* People roster cards */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/40 to-sky-50/40 dark:from-gray-800/40 dark:to-sky-900/40 rounded-2xl" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6 space-y-4 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-500 rounded-lg">
                    <UserRound className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    People
                  </h3>
                  <Badge variant="outline" className="rounded-xl tabular-nums ms-auto">
                    {roster.length}
                  </Badge>
                </div>

                {roster.length === 0 ? (
                  <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-transparent to-blue-50/40 dark:from-sky-950/20 dark:to-blue-950/20 rounded-2xl" />
                    <div className="relative rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-10 sm:py-12 text-center">
                      <div className="mx-auto w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl mb-4">
                        <UserRound className="h-7 w-7 text-white" />
                      </div>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        {hasActiveFilters
                          ? 'No people match this search and filters.'
                          : 'No active teammates found.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                    {roster.map((row) => {
                      const uid = String(row.user.id);
                      const hoursLabel = formatHoursShort(row.user.today_hours_worked);
                      const statusBit =
                        row.user.status === 'active'
                          ? 'Active'
                          : row.user.status === 'idle'
                            ? 'Idle'
                            : row.user.checked_in_today
                              ? 'Checked in'
                              : '';
                      return (
                        <button
                          key={uid}
                          type="button"
                          onClick={() => openUser(uid)}
                          className={cn(
                            'text-left rounded-2xl border px-3 py-3 sm:px-4 transition-all min-w-0 w-full shadow-sm',
                            'hover:border-sky-500/40 hover:bg-sky-500/5 hover:shadow-md hover:scale-[1.01]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
                            'border-gray-200/70 dark:border-gray-700/70 bg-white/80 dark:bg-gray-800/50'
                          )}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-sky-500/15 to-blue-600/15 flex items-center justify-center shrink-0">
                              <UserRound className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate text-gray-900 dark:text-white">
                                  {row.user.username}
                                </p>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ms-auto" />
                              </div>
                              <p className="text-[11px] sm:text-xs text-muted-foreground capitalize truncate mt-0.5">
                                {[
                                  row.user.role,
                                  hoursLabel ? `${hoursLabel} today` : null,
                                  statusBit || null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <Badge
                                  variant="outline"
                                  className="rounded-xl tabular-nums text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2.5 gap-1"
                                >
                                  <MapPin className="h-3 w-3 shrink-0 opacity-70" />
                                  <span className="sm:hidden">{row.officeActiveDays} off</span>
                                  <span className="hidden sm:inline">
                                    {row.officeActiveDays} office day
                                    {row.officeActiveDays === 1 ? '' : 's'}
                                  </span>
                                </Badge>
                                <Badge
                                  variant={row.exceptionCount > 0 ? 'secondary' : 'outline'}
                                  className="rounded-xl tabular-nums text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2.5"
                                >
                                  <span className="sm:hidden">{row.exceptionCount} exc</span>
                                  <span className="hidden sm:inline">
                                    {row.exceptionCount} exception
                                    {row.exceptionCount === 1 ? '' : 's'}
                                  </span>
                                </Badge>
                                <Badge
                                  variant={row.lateCount > 0 ? 'destructive' : 'outline'}
                                  className={cn(
                                    'rounded-xl tabular-nums text-[10px] sm:text-xs h-5 sm:h-6 px-1.5 sm:px-2.5',
                                    row.lateCount > 0 ? '' : 'text-muted-foreground'
                                  )}
                                >
                                  {row.lateCount} late
                                </Badge>
                                {row.latestExceptionDate ? (
                                  <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums">
                                    <span className="sm:hidden">
                                      {formatDayShort(row.latestExceptionDate)}
                                    </span>
                                    <span className="hidden sm:inline">
                                      Latest {formatDay(row.latestExceptionDate)}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AlertDialog
          open={!!wfhReview}
          onOpenChange={(open) => {
            if (!open && !wfhReviewing) setWfhReview(null);
          }}
        >
          <AlertDialogContent className="max-w-[400px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {wfhReview?.action === 'approve'
                  ? 'Approve WFH request?'
                  : wfhReview?.action === 'delete'
                    ? 'Delete WFH request?'
                    : 'Reject WFH request?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {wfhReview
                  ? `${wfhReview.request.username || 'User'} · ${formatDay(
                      wfhReview.request.request_date
                    )}${
                      wfhReview.action === 'approve'
                        ? '. This grants Allow WFH for that day so they can check in as WFH.'
                        : wfhReview.action === 'delete'
                          ? String(wfhReview.request.status || '').toLowerCase() === 'approved'
                            ? '. This permanently removes the request and revokes Allow WFH for that day.'
                            : '. This permanently removes the request from history.'
                          : '. They will stay on Office-only until you grant an exception.'
                    }`
                  : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={wfhReviewing}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  'rounded-xl',
                  (wfhReview?.action === 'reject' || wfhReview?.action === 'delete') &&
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                )}
                disabled={wfhReviewing || !wfhReview}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmWfhReview();
                }}
              >
                {wfhReviewing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {wfhReview?.action === 'delete' ? 'Deleting…' : 'Saving…'}
                  </>
                ) : wfhReview?.action === 'approve' ? (
                  'Approve'
                ) : wfhReview?.action === 'delete' ? (
                  'Delete'
                ) : (
                  'Reject'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
