import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CalendarClock, Home, Loader2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import {
  listAttendanceExceptions,
  saveAttendanceException,
  type AttendanceDayException,
  type AttendanceExceptionsPayload,
  type LateDayRow,
} from '@/services/attendanceExceptionService';

type Props = {
  userId: string;
  username?: string;
};

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

export function UserAttendanceExceptions({ userId, username }: Props) {
  const [data, setData] = useState<AttendanceExceptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exceptionDate, setExceptionDate] = useState(todayYMD());
  const [allowWfh, setAllowWfh] = useState(true);
  const [forgiveLate, setForgiveLate] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = await listAttendanceExceptions(userId);
      setData(payload);
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
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveException() {
    if (!exceptionDate) return;
    if (!allowWfh && !forgiveLate) {
      toast({
        title: 'Select at least one option',
        description: 'Allow WFH and/or forgive late for this date.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await saveAttendanceException({
        user_id: userId,
        date: exceptionDate,
        allow_wfh: allowWfh,
        forgive_late: forgiveLate,
        admin_note: adminNote.trim() || undefined,
        action: forgiveLate ? 'forgive_late' : 'save',
      });
      toast({
        title: 'Exception saved',
        description: `${username || 'User'}: ${formatDay(exceptionDate)} updated.`,
      });
      setAdminNote('');
      await load();
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

  async function handleForgiveLateDay(row: LateDayRow) {
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
        description: `${formatDay(row.submission_date)} no longer counts toward Office-only strikes.`,
      });
      await load();
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

  async function handleClearException(row: AttendanceDayException) {
    setSaving(true);
    try {
      await saveAttendanceException({
        user_id: userId,
        date: row.exception_date,
        action: 'clear',
      });
      toast({ title: 'Exception cleared', description: formatDay(row.exception_date) });
      await load();
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

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const lateCount = data?.late_count ?? 0;
  const lateLimit = data?.late_limit ?? 3;
  const exceptions = data?.exceptions ?? [];
  const lateDays = data?.late_days ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Attendance exceptions
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Allow WFH on specific days, or unmark late check-ins so they do not count toward the
            Office-only rule.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-xl">
            Late strikes {lateCount}/{lateLimit}
          </Badge>
          {data?.office_only ? (
            <Badge className="rounded-xl bg-amber-600 hover:bg-amber-600">Office-only week</Badge>
          ) : data?.upcoming_office_only_week ? (
            <Badge variant="secondary" className="rounded-xl">
              Upcoming Office-only
            </Badge>
          ) : null}
        </div>
      </div>

      {(data?.office_only_week_start || data?.upcoming_office_only_week) && (
        <div className="rounded-xl border border-amber-300/70 bg-amber-50/80 dark:border-amber-800/60 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            {data.office_only ? (
              <p>
                Office-only this week ({data.office_only_week_start} – {data.office_only_week_end}
                ). Grant <strong>Allow WFH</strong> for a date to override.
              </p>
            ) : data.upcoming_office_only_week ? (
              <p>
                Upcoming Office-only week:{' '}
                {data.upcoming_office_only_week.week_start} –{' '}
                {data.upcoming_office_only_week.week_end}. Unmarking late days can cancel this.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-background/60 p-4 space-y-4">
        <p className="text-sm font-semibold">Grant exception for a day</p>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label htmlFor="exc-date">Date</Label>
            <Input
              id="exc-date"
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="col-span-12 md:col-span-8 space-y-2">
            <Label htmlFor="exc-note">Admin note (optional)</Label>
            <Input
              id="exc-note"
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
                <p className="text-xs text-muted-foreground">
                  Even during Office-only week (no office GPS needed for WFH)
                </p>
              </div>
            </div>
            <Switch checked={allowWfh} onCheckedChange={setAllowWfh} disabled={saving} />
          </div>
          <div className="col-span-12 sm:col-span-6 flex items-center justify-between gap-3 rounded-xl border border-border/60 px-4 py-3">
            <div className="flex items-start gap-2 min-w-0">
              <MapPin className="h-4 w-4 mt-0.5 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Forgive late (after 10:00 AM)</p>
                <p className="text-xs text-muted-foreground">
                  Unmark this day from the late list / strike count
                </p>
              </div>
            </div>
            <Switch checked={forgiveLate} onCheckedChange={setForgiveLate} disabled={saving} />
          </div>
        </div>
        <Button
          onClick={() => void handleSaveException()}
          disabled={saving || !exceptionDate}
          className="rounded-xl h-11"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </span>
          ) : (
            'Save exception'
          )}
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6 space-y-3">
          <p className="text-sm font-semibold">Active exceptions</p>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
              No day exceptions yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {exceptions.map((row) => (
                <div
                  key={`${row.exception_date}-${row.id ?? 'x'}`}
                  className="rounded-xl border border-border/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDay(row.exception_date)}</p>
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
                      <p className="text-xs text-muted-foreground mt-1 truncate">{row.admin_note}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl shrink-0"
                    disabled={saving}
                    onClick={() => void handleClearException(row)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-6 space-y-3">
          <p className="text-sm font-semibold">Late check-ins (after 10:00 AM)</p>
          {lateDays.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
              No late check-ins on record.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {lateDays.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-rose-200/70 dark:border-rose-900/50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDay(row.submission_date)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {row.check_in_time
                        ? new Date(
                            row.check_in_time.includes('T')
                              ? row.check_in_time
                              : row.check_in_time.replace(' ', 'T')
                          ).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Kolkata',
                          })
                        : 'Late'}
                      {row.late_strike_consumed ? ' · counted toward Office-only' : ' · open strike'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl shrink-0 border-rose-300 dark:border-rose-800"
                    disabled={saving}
                    onClick={() => void handleForgiveLateDay(row)}
                  >
                    Unmark late
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
