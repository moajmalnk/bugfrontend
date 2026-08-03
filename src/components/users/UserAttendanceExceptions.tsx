import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, CalendarClock, Home, Loader2, MapPin, Trash2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  listAttendanceExceptions,
  saveAttendanceException,
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

function summarizeDates(dates: string[], max = 3): string {
  const sorted = [...dates].sort();
  if (sorted.length <= max) {
    return sorted.map(formatDay).join('; ');
  }
  const head = sorted.slice(0, max).map(formatDay).join('; ');
  return `${head}; +${sorted.length - max} more`;
}

export function UserAttendanceExceptions({ userId, username }: Props) {
  const [data, setData] = useState<AttendanceExceptionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exceptionDates, setExceptionDates] = useState<string[]>([todayYMD()]);
  const [allowWfh, setAllowWfh] = useState(true);
  const [forgiveLate, setForgiveLate] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [pendingRemoveDates, setPendingRemoveDates] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const payload = await listAttendanceExceptions(userId);
      setData(payload);
      const alive = new Set((payload.exceptions ?? []).map((e) => e.exception_date));
      setSelectedDates((prev) => prev.filter((d) => alive.has(d)));
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

  const exceptions = data?.exceptions ?? [];
  const lateDays = data?.late_days ?? [];
  /** Known active exception dates — used to ignore stale multi-remove selections. */
  const activeExceptionDates = useMemo(
    () => new Set(exceptions.map((e) => e.exception_date)),
    [exceptions]
  );
  const allSelected =
    exceptions.length > 0 && selectedDates.length > 0 && selectedDates.length === exceptions.length;
  const someSelected = selectedDates.length > 0 && !allSelected;

  function toggleSelected(date: string, checked: boolean) {
    setSelectedDates((prev) => {
      if (checked) {
        return prev.includes(date) ? prev : [...prev, date].sort();
      }
      return prev.filter((d) => d !== date);
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedDates([]);
      return;
    }
    setSelectedDates(exceptions.map((e) => e.exception_date).sort());
  }

  async function handleSaveException() {
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
      const saved = result.saved_count ?? dates.length;
      toast({
        title: dates.length === 1 ? 'Exception saved' : 'Exceptions saved',
        description:
          dates.length === 1
            ? `${username || 'User'}: ${formatDay(dates[0])} updated.`
            : `${username || 'User'}: ${saved} day(s) updated.`,
      });
      setAdminNote('');
      setExceptionDates([todayYMD()]);
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

  async function handleConfirmRemove() {
    const dates = (pendingRemoveDates ?? []).filter((d) => activeExceptionDates.has(d));
    if (dates.length === 0) {
      setPendingRemoveDates(null);
      return;
    }
    setSaving(true);
    try {
      const result = await saveAttendanceException({
        user_id: userId,
        dates,
        action: 'clear',
      });
      toast({
        title: dates.length === 1 ? 'Exception cleared' : 'Exceptions cleared',
        description:
          dates.length === 1
            ? formatDay(dates[0])
            : `${result.cleared ?? dates.length} day(s) removed.`,
      });
      setPendingRemoveDates(null);
      setSelectedDates((prev) => prev.filter((d) => !dates.includes(d)));
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
  const removeCount = pendingRemoveDates?.length ?? 0;

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
        <p className="text-sm font-semibold">Grant exception for day(s)</p>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 space-y-2">
            <Label htmlFor="exc-date">Dates</Label>
            <DatePicker
              mode="multiple"
              values={exceptionDates}
              onChange={setExceptionDates}
              placeholder="Pick one or more dates"
              className="h-11 rounded-xl border-border/60 bg-background text-sm"
            />
            {exceptionDates.length > 1 ? (
              <p className="text-xs text-muted-foreground">
                {exceptionDates.length} dates selected — click dates again to deselect
              </p>
            ) : null}
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
          disabled={saving || exceptionDates.length === 0}
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
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Active exceptions</p>
            {exceptions.length > 0 ? (
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
                  disabled={saving || selectedDates.length === 0}
                  onClick={() => setPendingRemoveDates([...selectedDates].sort())}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Remove {selectedDates.length > 0 ? selectedDates.length : ''}
                </Button>
              </div>
            ) : null}
          </div>

          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 px-4 py-6 text-center">
              No day exceptions yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 px-1 text-xs text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  className="rounded-md"
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  disabled={saving}
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                />
                {selectedDates.length > 0
                  ? `${selectedDates.length} selected`
                  : 'Select dates to remove'}
              </label>
              {exceptions.map((row) => {
                const checked = selectedDates.includes(row.exception_date);
                return (
                  <div
                    key={`${row.exception_date}-${row.id ?? 'x'}`}
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
                        onCheckedChange={(v) =>
                          toggleSelected(row.exception_date, v === true)
                        }
                        aria-label={`Select ${formatDay(row.exception_date)}`}
                      />
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
                          <p className="text-xs text-muted-foreground mt-1 truncate">
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
                      onClick={() => setPendingRemoveDates([row.exception_date])}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
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

      <AlertDialog
        open={!!pendingRemoveDates}
        onOpenChange={(open) => {
          if (!open && !saving) setPendingRemoveDates(null);
        }}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeCount > 1 ? `Remove ${removeCount} exceptions?` : 'Remove this exception?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveDates && pendingRemoveDates.length > 0
                ? `Clear attendance exception${removeCount > 1 ? 's' : ''} for ${summarizeDates(
                    pendingRemoveDates
                  )}${
                    username ? ` (${username})` : ''
                  }. WFH allow for those days will stop applying. Late days already unmarked stay unmarked.`
                : 'This cannot be undone from here.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={saving}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={saving || !pendingRemoveDates?.length}
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
