import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, File, Loader2, RefreshCw, Save, Timer, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { HourPicker } from '@/components/ui/HourPicker';
import { toast } from '@/components/ui/use-toast';
import { ENV } from '@/lib/env';
import { adminUpsertWorkSubmission } from '@/services/todoService';
import { userService } from '@/services/userService';
import { getAttendanceStatus, type AttendanceStatus } from '@/services/leaveService';
import { buildAdminAddHoursPath, resolveAdminAddHoursReturn } from '@/pages/adminOvertimeShared';
import { format, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';

type UserInfo = { username?: string; role?: string };

export default function AdminAddWorkHours() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const role = (currentUser?.role || 'admin').toLowerCase();
  const isAdmin = role === 'admin';
  const userId = (userIdParam || '').trim();

  const defaultDate = searchParams.get('date') || '';
  const returnTo = searchParams.get('return') || '';
  const monthParam = searchParams.get('month') || '';

  const backPath = useMemo(
    () => resolveAdminAddHoursReturn(role, userId, returnTo, monthParam),
    [role, userId, returnTo, monthParam]
  );

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [submissionDate, setSubmissionDate] = useState('');
  const [hoursToday, setHoursToday] = useState(8);
  const [workNote, setWorkNote] = useState('Admin entry — developer forgot checkout');
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateBlocked, setDateBlocked] = useState(false);
  const [dateBlockedHours, setDateBlockedHours] = useState<number | null>(null);
  const [checkingDate, setCheckingDate] = useState(false);
  const [attendanceBlock, setAttendanceBlock] = useState<AttendanceStatus | null>(null);

  useEffect(() => {
    setSubmissionDate(defaultDate || new Date().toISOString().slice(0, 10));
    setHoursToday(8);
    setWorkNote('Admin entry — developer forgot checkout');
    setAdminNote('');
  }, [defaultDate, userId]);

  useEffect(() => {
    if (!isAdmin || !userId) {
      setLoadingUser(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingUser(true);
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const res = await fetch(`${ENV.API_URL}/users/get.php?id=${encodeURIComponent(userId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        const user = (data as { data?: UserInfo }).data ?? data;
        if (!cancelled) {
          setUserInfo({
            username: (user as UserInfo).username,
            role: (user as UserInfo).role,
          });
        }
      } catch {
        if (!cancelled) setUserInfo(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, userId]);

  useEffect(() => {
    if (!isAdmin || !userId || !submissionDate) {
      setDateBlocked(false);
      setDateBlockedHours(null);
      setAttendanceBlock(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckingDate(true);
      try {
        const [details, status] = await Promise.all([
          userService.getPeriodDetails(userId, submissionDate, submissionDate),
          getAttendanceStatus(userId, submissionDate),
        ]);
        const submissions = Array.isArray(details?.submissions) ? details.submissions : [];
        const match = submissions.find(
          (s: { date?: string; submission_date?: string; hours_today?: number; day_status?: string }) =>
            String(s.date ?? s.submission_date ?? '') === submissionDate &&
            String(s.day_status || '') !== 'leave'
        );
        const hours = Number(match?.hours_today ?? 0);
        if (!cancelled) {
          setDateBlocked(hours >= 1);
          setDateBlockedHours(hours >= 1 ? hours : null);
          setAttendanceBlock(status?.allowed === false ? status : null);
        }
      } catch {
        if (!cancelled) {
          setDateBlocked(false);
          setDateBlockedHours(null);
          setAttendanceBlock(null);
        }
      } finally {
        if (!cancelled) setCheckingDate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, userId, submissionDate]);

  if (!isAdmin) {
    return <Navigate to={`/${role}/projects`} replace />;
  }

  if (!userId) {
    return <Navigate to={`/${role}/overtime-requests`} replace />;
  }

  const handleSave = async () => {
    if (!submissionDate) {
      toast({ title: 'Date required', variant: 'destructive' });
      return;
    }
    if (!adminNote.trim()) {
      toast({
        title: 'Admin reason required',
        description: 'Explain why hours are being added.',
        variant: 'destructive',
      });
      return;
    }
    if (dateBlocked) {
      toast({
        title: 'Date already has hours',
        description: 'Only one work-hours entry is allowed per day. Pick a different date.',
        variant: 'destructive',
      });
      return;
    }
    if (attendanceBlock) {
      toast({
        title: 'Date not available',
        description: attendanceBlock.message || 'Cannot record hours for this date.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await adminUpsertWorkSubmission({
        user_id: userId,
        submission_date: submissionDate,
        hours_today: hoursToday,
        work_note: workNote.trim(),
        admin_note: adminNote.trim(),
      });
      toast({
        title: 'Hours saved',
        description: `${hoursToday}h recorded for ${submissionDate}.`,
      });
      navigate(backPath);
    } catch (e) {
      toast({
        title: 'Failed to save hours',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = userInfo?.username || 'User';

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w mx-auto min-w-0 space-y-6 sm:space-y-8">
        <div className="relative min-w-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <Timer className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      Add / fix work hours
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  {loadingUser
                    ? 'Loading user…'
                    : `Record hours for ${displayName} when they forgot to check out.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!loadingUser && userInfo ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm px-4 py-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {userInfo.role || 'user'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-lg border-gray-200/70 dark:border-gray-700/70"
              onClick={() => navigate(`/${role}/overtime-requests`)}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Switch user
            </Button>
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl shadow-xl border border-gray-200/40 dark:border-gray-700/40 min-w-0">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30" />
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden min-w-0">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="p-6 sm:p-8 pb-2">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0">
                    <File className="h-5 w-5 text-white" />
                  </div>
                  Work Hours Form
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
                  Add one-time hours for users who forgot checkout, with a required admin reason
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-6 sm:p-8 pt-4">
            <div className="space-y-2">
              <Label htmlFor="admin-hours-date" className="text-sm font-semibold">
                Date
              </Label>
              <DatePicker
                value={submissionDate}
                onChange={setSubmissionDate}
                placeholder="Pick work date"
                disableFuture
                className="h-12 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70 text-sm sm:text-base"
              />
              {checkingDate ? (
                <p className="text-xs text-muted-foreground">Checking date…</p>
              ) : attendanceBlock ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200/80 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/30 px-3 py-2.5 text-sm text-rose-900 dark:text-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{attendanceBlock.message}</span>
                </div>
              ) : dateBlocked ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Hours already recorded for{' '}
                    <strong>
                      {submissionDate
                        ? format(parseISO(submissionDate), 'EEEE, MMM d, yyyy')
                        : 'this date'}
                    </strong>
                    {dateBlockedHours != null ? ` (${dateBlockedHours}h)` : ''}. Only one entry per day
                    is allowed — choose another date.
                  </span>
                </div>
              ) : submissionDate ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  This date is available for a one-time hours entry.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Hours worked
              </Label>
              <HourPicker
                value={hoursToday}
                onChange={setHoursToday}
                min={1}
                max={8}
                step={0.25}
                className="h-12 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-work-note" className="text-sm font-semibold">
                Work summary <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="admin-work-note"
                value={workNote}
                onChange={(e) => setWorkNote(e.target.value)}
                placeholder="e.g. Full day development work"
                className="h-12 rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-reason" className="text-sm font-semibold">
                Admin reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="admin-reason"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Forgot checkout on Monday and Tuesday"
                rows={4}
                className="rounded-xl border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70 resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl w-full sm:w-auto"
                onClick={() => navigate(backPath)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl w-full sm:w-auto bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg disabled:opacity-50"
                onClick={handleSave}
                disabled={saving || dateBlocked || !!attendanceBlock || checkingDate}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save hours
              </Button>
            </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Need another day?{' '}
          <Link
            to={buildAdminAddHoursPath(role, userId, { returnTo, month: monthParam })}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Clear form for a new date
          </Link>
        </p>
      </section>
    </main>
  );
}
