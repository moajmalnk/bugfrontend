import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ExternalLink,
  Filter,
  Home,
  Loader2,
  MapPin,
  Search,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  clearAttendanceExceptionsForUsers,
  listAttendanceExceptions,
  saveAttendanceException,
  type AttendanceDayException,
  type AttendanceModeDay,
  type LateDayRow,
} from '@/services/attendanceExceptionService';
import {
  deleteWfhRequest,
  listUserWfhRequests,
  reviewWfhRequest,
  type WfhRequest,
} from '@/services/wfhRequestService';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import { listLeaveRequests, type LeaveRequest } from '@/services/leaveService';
import { userService } from '@/services/userService';
import type { User } from '@/types';
import {
  buildAttendancePeriodRows,
  exceptionKey,
  formatCheckIn,
  formatDateTime,
  formatDay,
  formatDayShort,
  formatHoursShort,
  summarizeDates,
  todayYMD,
  wfhStatusBadgeClass,
  type AttendancePeriodRow,
} from '@/pages/adminAttendanceShared';
import {
  AttendanceDayCalendar,
  AttendancePeriodTable,
} from '@/components/attendance/AttendanceDayCalendar';


/**
 * Admin attendance exception detail — one teammate's day tables, grants, WFH, lates.
 */
export default function AdminAttendanceExceptionUserDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canManageAttendance = hasPermissionOrAdmin(role, hasPermission, 'ATTENDANCE_MANAGE');
  const navigate = useNavigate();

  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailExceptions, setDetailExceptions] = useState<AttendanceDayException[]>([]);
  const [detailLates, setDetailLates] = useState<LateDayRow[]>([]);
  const [detailWfhRequests, setDetailWfhRequests] = useState<WfhRequest[]>([]);
  const [detailLeaveRequests, setDetailLeaveRequests] = useState<LeaveRequest[]>([]);
  const [detailOfficeActiveDays, setDetailOfficeActiveDays] = useState(0);
  const [detailWfhActiveDays, setDetailWfhActiveDays] = useState(0);
  const [detailAttendanceDays, setDetailAttendanceDays] = useState<AttendanceModeDay[]>([]);
  const [attendanceTableTab, setAttendanceTableTab] = useState<'day' | 'weekly' | 'monthly'>(
    'day'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [wfhStatusFilter, setWfhStatusFilter] = useState('all');
  const [exceptionKindFilter, setExceptionKindFilter] = useState('all');

  const [exceptionDates, setExceptionDates] = useState<string[]>([todayYMD()]);
  const [allowWfh, setAllowWfh] = useState(true);
  const [forgiveLate, setForgiveLate] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [pendingRemove, setPendingRemove] = useState<AttendanceDayException[] | null>(null);
  const [pendingForgiveLate, setPendingForgiveLate] = useState<LateDayRow | null>(null);
  const [wfhReview, setWfhReview] = useState<{
    request: WfhRequest;
    action: 'approve' | 'reject' | 'delete';
  } | null>(null);
  const [wfhReviewing, setWfhReviewing] = useState(false);

  const loadUserDetail = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!userId) return;
      if (!opts?.silent) setLoading(true);
      try {
        const [payload, wfhHistory, userList, leaveRows] = await Promise.all([
          listAttendanceExceptions(userId),
          listUserWfhRequests(userId).catch(() => null),
          userService.getUsers().catch(() => [] as User[]),
          listLeaveRequests({ user_id: userId }).catch(() => [] as LeaveRequest[]),
        ]);

        const fromList = (userList || []).find((u) => String(u.id) === userId) ?? null;
        const username =
          fromList?.username ||
          payload.exceptions?.[0]?.username ||
          payload.late_days?.[0]?.username ||
          undefined;

        if (fromList) {
          setDetailUser(fromList);
        } else if (username) {
          setDetailUser({
            id: userId,
            username,
            role: payload.exceptions?.[0]?.role || '',
          } as User);
        } else {
          setDetailUser(null);
        }

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
        setDetailWfhRequests(
          Array.isArray(wfhHistory?.requests)
            ? wfhHistory.requests.map((row) => ({
                ...row,
                user_id: userId,
                username: username ?? row.username,
              }))
            : []
        );
        setDetailLeaveRequests(Array.isArray(leaveRows) ? leaveRows : []);
        setDetailOfficeActiveDays(Number(payload.office_active_days ?? 0) || 0);
        setDetailWfhActiveDays(Number(payload.wfh_active_days ?? 0) || 0);
        setDetailAttendanceDays(
          Array.isArray(payload.attendance_days) ? payload.attendance_days : []
        );
        setSelectedKeys((prev) => {
          const alive = new Set(
            (payload.exceptions ?? []).map((r) => exceptionKey({ ...r, user_id: userId }))
          );
          return prev.filter((k) => alive.has(k));
        });
      } catch (e) {
        toast({
          title: 'Could not load user exceptions',
          description: e instanceof Error ? e.message : 'Please try again.',
          variant: 'destructive',
        });
        setDetailExceptions([]);
        setDetailLates([]);
        setDetailWfhRequests([]);
        setDetailLeaveRequests([]);
        setDetailOfficeActiveDays(0);
        setDetailWfhActiveDays(0);
        setDetailAttendanceDays([]);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadUserDetail();
  }, [loadUserDetail]);

  const dailyAttendanceRows = useMemo(
    () =>
      buildAttendancePeriodRows(
        detailAttendanceDays,
        'day',
        detailWfhRequests,
        detailExceptions,
        detailLeaveRequests
      ),
    [detailAttendanceDays, detailWfhRequests, detailExceptions, detailLeaveRequests]
  );
  const weeklyAttendanceRows = useMemo(
    () =>
      buildAttendancePeriodRows(
        detailAttendanceDays,
        'week',
        detailWfhRequests,
        detailExceptions,
        detailLeaveRequests
      ),
    [detailAttendanceDays, detailWfhRequests, detailExceptions, detailLeaveRequests]
  );
  const monthlyAttendanceRows = useMemo(
    () =>
      buildAttendancePeriodRows(
        detailAttendanceDays,
        'month',
        detailWfhRequests,
        detailExceptions,
        detailLeaveRequests
      ),
    [detailAttendanceDays, detailWfhRequests, detailExceptions, detailLeaveRequests]
  );

  const filteredExceptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return detailExceptions.filter((row) => {
      if (exceptionKindFilter === 'wfh' && !row.allow_wfh) return false;
      if (exceptionKindFilter === 'forgive_late' && !row.forgive_late) return false;
      if (!q) return true;
      const hay = [row.exception_date, formatDay(row.exception_date), row.admin_note || '']
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [detailExceptions, searchQuery, exceptionKindFilter]);

  const filteredWfhRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return detailWfhRequests.filter((row) => {
      const status = String(row.status || 'pending').toLowerCase();
      if (wfhStatusFilter !== 'all' && status !== wfhStatusFilter) return false;
      if (!q) return true;
      const hay = [row.request_date, formatDay(row.request_date), row.user_note || '', row.admin_note || '', status]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [detailWfhRequests, searchQuery, wfhStatusFilter]);

  const filteredLates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return detailLates;
    return detailLates.filter((row) => {
      const hay = [row.submission_date, formatDay(row.submission_date), formatCheckIn(row.check_in_time)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [detailLates, searchQuery]);

  const filteredDailyRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dailyAttendanceRows;
    return dailyAttendanceRows.filter((row) => row.label.toLowerCase().includes(q));
  }, [dailyAttendanceRows, searchQuery]);

  const filteredWeeklyRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return weeklyAttendanceRows;
    return weeklyAttendanceRows.filter((row) => row.label.toLowerCase().includes(q));
  }, [weeklyAttendanceRows, searchQuery]);

  const filteredMonthlyRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return monthlyAttendanceRows;
    return monthlyAttendanceRows.filter((row) => row.label.toLowerCase().includes(q));
  }, [monthlyAttendanceRows, searchQuery]);

  const showOffice = sectionFilter === 'all' || sectionFilter === 'office';
  const showExceptions = sectionFilter === 'all' || sectionFilter === 'exceptions';
  const showWfh = sectionFilter === 'all' || sectionFilter === 'wfh';
  const showLate = sectionFilter === 'all' || sectionFilter === 'late';

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    sectionFilter !== 'all' ||
    wfhStatusFilter !== 'all' ||
    exceptionKindFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSectionFilter('all');
    setWfhStatusFilter('all');
    setExceptionKindFilter('all');
  };

  const filterTriggerClass =
    'w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-sky-500/40';
  const filterFieldClass = 'flex items-center gap-2 min-w-0 w-full';

  const allSelected =
    filteredExceptions.length > 0 &&
    selectedKeys.length > 0 &&
    filteredExceptions.every((row) =>
      selectedKeys.includes(exceptionKey({ ...row, user_id: userId }))
    );

  const backToList = () => navigate(`/${role}/attendance-exceptions`);

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      return prev.filter((k) => k !== key);
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked || !userId) {
      setSelectedKeys([]);
      return;
    }
    setSelectedKeys(filteredExceptions.map((row) => exceptionKey({ ...row, user_id: userId })));
  }

  async function handleSave() {
    if (!userId) return;
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
        user_id: userId,
        dates,
        allow_wfh: allowWfh,
        forgive_late: forgiveLate,
        admin_note: adminNote.trim() || undefined,
        action: forgiveLate ? 'forgive_late' : 'save',
      });
      toast({
        title: dates.length === 1 ? 'Exception saved' : 'Exceptions saved',
        description: `${detailUser?.username || 'User'}: ${
          result.saved_count ?? dates.length
        } day(s) updated.`,
      });
      setAdminNote('');
      setExceptionDates([todayYMD()]);
      await loadUserDetail({ silent: true });
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
    if (!userId) return;
    setSaving(true);
    try {
      await saveAttendanceException({
        user_id: userId,
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
      setPendingForgiveLate(null);
      await loadUserDetail({ silent: true });
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

  async function handleConfirmForgiveLate() {
    if (!pendingForgiveLate) return;
    await handleForgiveLate(pendingForgiveLate);
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
          user_id: String(r.user_id || userId || ''),
          date: r.exception_date,
        }))
      );
      toast({
        title: rows.length === 1 ? 'Exception cleared' : 'Exceptions cleared',
        description: `${cleared} day(s) removed.`,
      });
      setPendingRemove(null);
      setSelectedKeys([]);
      await loadUserDetail({ silent: true });
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
      await loadUserDetail({ silent: true });
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
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto">
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
        </section>
      </main>
    );
  }

  const removeCount = pendingRemove?.length ?? 0;
  const displayName = detailUser?.username || (loading ? 'Loading…' : 'User');

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0 w-full">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-50/50 via-transparent to-blue-50/50 dark:from-sky-950/20 dark:via-transparent dark:to-blue-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-12 gap-4 sm:gap-6 min-w-0 w-full">
              <div className="col-span-12 xl:col-span-8 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl shrink-0 -ms-1 h-9 px-2"
                    onClick={backToList}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">People</span>
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl shadow-lg shrink-0">
                    <UserRound className="h-5 w-5 sm:h-6 sm:w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 basis-[12rem]">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      {displayName}
                    </h1>
                    <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl capitalize">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {(detailUser?.role || 'teammate').toString()}
                  </span>
                  {detailUser?.today_hours_worked
                    ? ` · ${formatHoursShort(detailUser.today_hours_worked)} today`
                    : ''}
                  {' · '}
                  Grant WFH or forgive late check-ins for this teammate
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    variant="secondary"
                    className="rounded-xl tabular-nums text-[10px] sm:text-xs gap-1 bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                  >
                    <MapPin className="h-3 w-3 shrink-0" />
                    {detailOfficeActiveDays} office
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-xl tabular-nums text-[10px] sm:text-xs gap-1 border-emerald-300 dark:border-emerald-700"
                  >
                    <Home className="h-3 w-3 shrink-0" />
                    {detailWfhActiveDays} WFH
                  </Badge>
                  <Badge variant="outline" className="rounded-xl tabular-nums text-[10px] sm:text-xs">
                    {detailExceptions.length} exception{detailExceptions.length === 1 ? '' : 's'}
                  </Badge>
                  <Badge
                    variant={detailLates.length > 0 ? 'destructive' : 'outline'}
                    className="rounded-xl tabular-nums text-[10px] sm:text-xs"
                  >
                    {detailLates.length} late
                  </Badge>
                </div>
              </div>

              <div className="col-span-12 xl:col-span-4 flex flex-col sm:flex-row xl:flex-col items-stretch gap-3 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-xl border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-semibold shadow-sm hover:shadow-md"
                  asChild
                >
                  <Link to={`/${role}/users/${userId}`}>
                    <ExternalLink className="mr-2 h-5 w-5 shrink-0" />
                    Full profile
                  </Link>
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={backToList}
                  className="h-12 w-full px-6 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                >
                  <ArrowLeft className="mr-2 h-5 w-5 shrink-0" />
                  All people
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter — Bugs / Fixes / Updates pattern */}
        {!loading ? (
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
                      Filters active on day records below
                    </p>
                  ) : null}
                </div>

                <div className="relative group w-full min-w-0">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-sky-500 transition-colors pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by date, note, or week/month label…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    autoComplete="off"
                    aria-label="Search day records"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                  <div className={filterFieldClass}>
                    <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                      <Filter className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select value={sectionFilter} onValueChange={setSectionFilter}>
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="Section" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All sections</SelectItem>
                          <SelectItem value="office">Office &amp; WFH tables</SelectItem>
                          <SelectItem value="exceptions">Day exceptions</SelectItem>
                          <SelectItem value="wfh">WFH requests</SelectItem>
                          <SelectItem value="late">Late check-ins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={filterFieldClass}>
                    <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                      <Home className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select value={wfhStatusFilter} onValueChange={setWfhStatusFilter}>
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="WFH status" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All WFH statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={filterFieldClass}>
                    <div className="p-1.5 bg-violet-500 rounded-lg shrink-0">
                      <CalendarClock className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select value={exceptionKindFilter} onValueChange={setExceptionKindFilter}>
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="Exception type" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All exception types</SelectItem>
                          <SelectItem value="wfh">WFH allowed</SelectItem>
                          <SelectItem value="forgive_late">Late forgiven</SelectItem>
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
        ) : null}

        {/* Grant exception — locked to this user */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-sky-50/30 dark:from-gray-800/30 dark:to-sky-900/30 rounded-2xl" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500 rounded-lg">
                  <CalendarClock className="h-4 w-4 text-white" />
                </div>
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                  Grant exception
                </p>
              </div>
              <Badge
                variant="secondary"
                className="rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
              >
                <UserRound className="h-3.5 w-3.5 mr-1.5" />
                {detailUser?.username || 'User'}
              </Badge>
            </div>
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 md:col-span-6 space-y-2">
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
              <div className="col-span-12 md:col-span-6 space-y-2">
                <Label htmlFor="att-detail-note">Admin note (optional)</Label>
                <Input
                  id="att-detail-note"
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
            <Button
              onClick={() => void handleSave()}
              disabled={saving || !userId || exceptionDates.length === 0}
              className="rounded-xl h-11 px-6 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-semibold shadow-md"
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
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl min-w-0">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50/40 via-transparent to-blue-50/40 dark:from-sky-950/20 dark:to-blue-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6 grid grid-cols-12 gap-5 sm:gap-6 min-w-0 shadow-sm">
              {/* Office & WFH */}
              {showOffice ? (
              <div className="col-span-12 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sky-500 rounded-lg shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-white" />
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      Office &amp; WFH days
                    </p>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Last ~120 days · office, leave, exceptions, WFH
                  </p>
                </div>
                <Tabs
                  value={attendanceTableTab}
                  onValueChange={(v) =>
                    setAttendanceTableTab(
                      v === 'weekly' ? 'weekly' : v === 'monthly' ? 'monthly' : 'day'
                    )
                  }
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 rounded-xl h-10 bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-1">
                    <TabsTrigger
                      value="day"
                      className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
                    >
                      Day
                    </TabsTrigger>
                    <TabsTrigger
                      value="weekly"
                      className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
                    >
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger
                      value="monthly"
                      className="rounded-xl text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-sky-700 dark:data-[state=active]:text-sky-300 data-[state=active]:shadow-sm"
                    >
                      Monthly
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="day" className="mt-3">
                    <AttendanceDayCalendar
                      rows={filteredDailyRows}
                      emptySearch={searchQuery.trim() ? 'No days match this search.' : ''}
                      attendanceDays={detailAttendanceDays}
                      exceptions={detailExceptions}
                      wfhRequests={detailWfhRequests}
                      lates={detailLates}
                      leaveRequests={detailLeaveRequests}
                    />
                  </TabsContent>
                  <TabsContent value="weekly" className="mt-3">
                    <AttendancePeriodTable
                      rows={filteredWeeklyRows}
                      periodLabel="Week"
                      emptySearch={searchQuery.trim() ? 'No weeks match this search.' : ''}
                      emptyDefault="No office or WFH days recorded for this user yet."
                    />
                  </TabsContent>
                  <TabsContent value="monthly" className="mt-3">
                    <AttendancePeriodTable
                      rows={filteredMonthlyRows}
                      periodLabel="Month"
                      emptySearch={searchQuery.trim() ? 'No months match this search.' : ''}
                      emptyDefault="No office or WFH days recorded for this user yet."
                    />
                  </TabsContent>
                </Tabs>
              </div>
              ) : null}

              {/* Day exceptions */}
              {showExceptions ? (
              <div className="col-span-12 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    Day exceptions
                    <span className="text-muted-foreground font-normal ml-2 tabular-nums">
                      {filteredExceptions.length}
                      {filteredExceptions.length !== detailExceptions.length
                        ? ` / ${detailExceptions.length}`
                        : ''}
                    </span>
                  </p>
                  {filteredExceptions.length > 0 ? (
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
                          const rows = filteredExceptions.filter((r) =>
                            selectedKeys.includes(exceptionKey({ ...r, user_id: userId }))
                          );
                          setPendingRemove(rows.map((r) => ({ ...r, user_id: userId })));
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Remove {selectedKeys.length > 0 ? selectedKeys.length : ''}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {filteredExceptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                    {detailExceptions.length === 0
                      ? 'No day exceptions for this user yet. Use Grant exception above.'
                      : 'No exceptions match this search and filters.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {filteredExceptions.map((row) => {
                      const key = exceptionKey({ ...row, user_id: userId });
                      const checked = selectedKeys.includes(key);
                      return (
                        <div
                          key={`${key}-${row.id ?? 'x'}`}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 min-w-0',
                            checked ? 'border-primary/50 bg-primary/5' : 'border-border/60'
                          )}
                        >
                          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                            <Checkbox
                              className="mt-1 rounded-md shrink-0"
                              checked={checked}
                              disabled={saving}
                              onCheckedChange={(v) => toggleKey(key, v === true)}
                              aria-label={`Select ${formatDay(row.exception_date)}`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                <span className="sm:hidden">{formatDayShort(row.exception_date)}</span>
                                <span className="hidden sm:inline">
                                  {formatDay(row.exception_date)}
                                </span>
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {row.allow_wfh ? (
                                  <Badge
                                    variant="secondary"
                                    className="rounded-lg sm:rounded-xl text-[10px] sm:text-xs"
                                  >
                                    WFH allowed
                                  </Badge>
                                ) : null}
                                {row.forgive_late ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-lg sm:rounded-xl text-[10px] sm:text-xs"
                                  >
                                    Late forgiven
                                  </Badge>
                                ) : null}
                              </div>
                              {row.admin_note ? (
                                <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 break-words">
                                  {row.admin_note}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl shrink-0 w-full sm:w-auto"
                            disabled={saving}
                            onClick={() => setPendingRemove([{ ...row, user_id: userId }])}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              ) : null}

              {/* WFH requests */}
              {showWfh ? (
              <div className="col-span-12 space-y-3 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  WFH requests
                  <span className="text-muted-foreground font-normal ml-2 tabular-nums">
                    {filteredWfhRequests.length}
                    {filteredWfhRequests.length !== detailWfhRequests.length
                      ? ` / ${detailWfhRequests.length}`
                      : ''}
                  </span>
                  {filteredWfhRequests.some((r) =>
                    ['approved', 'rejected'].includes(String(r.status || '').toLowerCase())
                  ) ? (
                    <span className="font-normal ml-2 text-xs">
                      {filteredWfhRequests.filter((r) => String(r.status).toLowerCase() === 'approved')
                        .length > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          ·{' '}
                          {
                            filteredWfhRequests.filter(
                              (r) => String(r.status).toLowerCase() === 'approved'
                            ).length
                          }{' '}
                          approved
                        </span>
                      ) : null}
                      {filteredWfhRequests.filter((r) => String(r.status).toLowerCase() === 'rejected')
                        .length > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          ·{' '}
                          {
                            filteredWfhRequests.filter(
                              (r) => String(r.status).toLowerCase() === 'rejected'
                            ).length
                          }{' '}
                          rejected
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </p>
                {filteredWfhRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                    {detailWfhRequests.length === 0
                      ? 'No WFH requests for this user yet.'
                      : 'No WFH requests match this search and filters.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredWfhRequests.map((row) => {
                      const status = String(row.status || 'pending').toLowerCase();
                      const reviewedAt = formatDateTime(row.reviewed_at);
                      return (
                        <div
                          key={`${row.user_id}-${row.request_date}-${row.id ?? status}`}
                          className={cn(
                            'rounded-xl border px-4 py-3 space-y-2',
                            status === 'rejected'
                              ? 'border-rose-300/70 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20'
                              : status === 'approved'
                                ? 'border-emerald-300/70 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                                : 'border-amber-300/70 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/20'
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{formatDay(row.request_date)}</p>
                              {row.user_note ? (
                                <p className="text-xs text-muted-foreground mt-1 break-words">
                                  Note: {row.user_note}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground mt-1">No user note</p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('rounded-xl capitalize shrink-0', wfhStatusBadgeClass(status))}
                            >
                              {status}
                            </Badge>
                          </div>
                          {status === 'rejected' || status === 'approved' ? (
                            <div className="text-xs text-muted-foreground space-y-1">
                              {row.admin_note ? (
                                <p>
                                  Admin note:{' '}
                                  <span className="text-foreground/90">{row.admin_note}</span>
                                </p>
                              ) : null}
                              <p>
                                {status === 'rejected' ? 'Rejected' : 'Approved'}
                                {row.reviewed_by_username ? ` by ${row.reviewed_by_username}` : ''}
                                {reviewedAt ? ` · ${reviewedAt}` : ''}
                              </p>
                            </div>
                          ) : null}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {status === 'pending' ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white"
                                  disabled={saving || wfhReviewing}
                                  onClick={() => setWfhReview({ request: row, action: 'approve' })}
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
                                  onClick={() => setWfhReview({ request: row, action: 'reject' })}
                                >
                                  <X className="h-3.5 w-3.5 mr-1.5" />
                                  Reject
                                </Button>
                              </>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-destructive hover:text-destructive"
                              disabled={saving || wfhReviewing}
                              onClick={() => setWfhReview({ request: row, action: 'delete' })}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              ) : null}

              {/* Late check-ins */}
              {showLate ? (
              <div className="col-span-12 space-y-3 min-w-0">
                <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  Late check-ins
                  <span className="text-muted-foreground font-normal ml-2 tabular-nums">
                    {filteredLates.length}
                    {filteredLates.length !== detailLates.length ? ` / ${detailLates.length}` : ''}
                  </span>
                </p>
                {filteredLates.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center">
                    {detailLates.length === 0
                      ? 'No late check-ins on record for this user.'
                      : 'No late check-ins match this search.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredLates.map((row) => (
                      <div
                        key={`${row.user_id}-${row.id}`}
                        className="rounded-xl border border-rose-200/70 dark:border-rose-900/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{formatDay(row.submission_date)}</p>
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
                          onClick={() => setPendingForgiveLate(row)}
                        >
                          Unmark late
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              ) : null}
            </div>
          </div>
        )}

        <AlertDialog
          open={!!pendingForgiveLate}
          onOpenChange={(open) => {
            if (!open && !saving) setPendingForgiveLate(null);
          }}
        >
          <AlertDialogContent className="max-w-[400px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Unmark late check-in?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingForgiveLate
                  ? `Remove the late flag for ${
                      pendingForgiveLate.username || detailUser?.username || 'this user'
                    } · ${formatDay(pendingForgiveLate.submission_date)}. It will no longer count toward Office-only strikes, and they will be notified.`
                  : 'This late day will no longer count toward Office-only strikes.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" disabled={saving}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl"
                disabled={saving || !pendingForgiveLate}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirmForgiveLate();
                }}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unmarking…
                  </>
                ) : (
                  'Unmark late'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
      </section>
    </main>
  );
}
