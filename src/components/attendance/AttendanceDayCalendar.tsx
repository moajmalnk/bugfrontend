import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatCheckIn,
  formatDateTime,
  todayYMD,
  wfhStatusBadgeClass,
  type AttendancePeriodRow,
} from '@/pages/adminAttendanceShared';
import type {
  AttendanceDayException,
  AttendanceModeDay,
  LateDayRow,
} from '@/services/attendanceExceptionService';
import type { LeaveRequest } from '@/services/leaveService';
import { leaveStatusPillClass } from '@/services/leaveService';
import type { WfhRequest } from '@/services/wfhRequestService';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function dayStatusTone(row?: AttendancePeriodRow) {
  if (!row) {
    return {
      fill: '',
      number: 'text-foreground',
      bar: 'bg-transparent',
    };
  }
  if (row.leave > 0) {
    return {
      fill: 'bg-teal-500/[0.10] dark:bg-teal-400/[0.12]',
      number: 'text-teal-900 dark:text-teal-100',
      bar: 'bg-teal-500',
    };
  }
  if (row.leavePending > 0) {
    return {
      fill: 'bg-teal-500/[0.06] dark:bg-teal-400/[0.08]',
      number: 'text-teal-800 dark:text-teal-200',
      bar: 'bg-teal-500/50',
    };
  }
  if (row.rejected > 0) {
    return {
      fill: 'bg-rose-500/[0.08] dark:bg-rose-400/[0.10]',
      number: 'text-rose-800 dark:text-rose-200',
      bar: 'bg-rose-500',
    };
  }
  if (row.exceptions > 0) {
    return {
      fill: 'bg-amber-500/[0.10] dark:bg-amber-400/[0.12]',
      number: 'text-amber-900 dark:text-amber-100',
      bar: 'bg-amber-500',
    };
  }
  if (row.wfh > 0) {
    return {
      fill: 'bg-violet-500/[0.08] dark:bg-violet-400/[0.12]',
      number: 'text-violet-900 dark:text-violet-100',
      bar: 'bg-violet-500',
    };
  }
  if (row.office > 0) {
    return {
      fill: 'bg-sky-500/[0.08] dark:bg-sky-400/[0.12]',
      number: 'text-sky-900 dark:text-sky-100',
      bar: 'bg-sky-500',
    };
  }
  if (row.late > 0) {
    return {
      fill: 'bg-muted/70',
      number: 'text-muted-foreground',
      bar: 'bg-muted-foreground/70',
    };
  }
  return {
    fill: '',
    number: 'text-foreground',
    bar: 'bg-transparent',
  };
}

export function AttendanceDayCalendar({
  rows,
  emptySearch,
  attendanceDays,
  exceptions,
  wfhRequests,
  lates,
  leaveRequests = [],
}: {
  rows: AttendancePeriodRow[];
  emptySearch: string;
  attendanceDays: AttendanceModeDay[];
  exceptions: AttendanceDayException[];
  wfhRequests: WfhRequest[];
  lates: LateDayRow[];
  leaveRequests?: LeaveRequest[];
}) {
  const byDate = useMemo(() => {
    const map = new Map<string, AttendancePeriodRow>();
    for (const row of rows) map.set(row.key, row);
    return map;
  }, [rows]);

  const latestKey = rows[0]?.key;
  const [monthCursor, setMonthCursor] = useState(() => {
    if (latestKey && /^\d{4}-\d{2}-\d{2}$/.test(latestKey)) {
      try {
        return startOfMonth(parseISO(latestKey));
      } catch {
        /* fall through */
      }
    }
    return startOfMonth(parseISO(todayYMD()));
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(latestKey ?? null);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthCursor]);

  const monthStats = useMemo(() => {
    const prefix = format(monthCursor, 'yyyy-MM');
    let office = 0;
    let wfh = 0;
    let exceptions = 0;
    let leave = 0;
    for (const row of rows) {
      if (!row.key.startsWith(prefix)) continue;
      office += row.office;
      wfh += row.wfh;
      exceptions += row.exceptions;
      leave += row.leave;
    }
    return { office, wfh, exceptions, leave };
  }, [rows, monthCursor]);

  const selected = selectedKey ? byDate.get(selectedKey) : undefined;
  const today = todayYMD();

  const relatedAttendance = useMemo(() => {
    if (!selectedKey) return [];
    return attendanceDays.filter((d) => String(d.date || '').slice(0, 10) === selectedKey);
  }, [attendanceDays, selectedKey]);
  const relatedExceptions = useMemo(() => {
    if (!selectedKey) return [];
    return exceptions.filter((d) => String(d.exception_date || '').slice(0, 10) === selectedKey);
  }, [exceptions, selectedKey]);
  const relatedWfh = useMemo(() => {
    if (!selectedKey) return [];
    return wfhRequests.filter((d) => String(d.request_date || '').slice(0, 10) === selectedKey);
  }, [wfhRequests, selectedKey]);
  const relatedLates = useMemo(() => {
    if (!selectedKey) return [];
    return lates.filter((d) => String(d.submission_date || '').slice(0, 10) === selectedKey);
  }, [lates, selectedKey]);
  const relatedLeave = useMemo(() => {
    if (!selectedKey) return [];
    return leaveRequests.filter((req) => {
      const status = String(req.status || '').toLowerCase();
      if (status === 'rejected' || status === 'cancelled') return false;
      const start = String(req.start_date || '').slice(0, 10);
      const end = String(req.end_date || '').slice(0, 10);
      return selectedKey >= start && selectedKey <= end;
    });
  }, [leaveRequests, selectedKey]);

  const hasRelated =
    relatedAttendance.length > 0 ||
    relatedExceptions.length > 0 ||
    relatedWfh.length > 0 ||
    relatedLates.length > 0 ||
    relatedLeave.length > 0;

  const selectedMetrics = selected
    ? [
        { label: 'Office', value: selected.office, className: 'text-sky-700 dark:text-sky-300' },
        { label: 'WFH', value: selected.wfh, className: 'text-violet-700 dark:text-violet-300' },
        {
          label: 'Leave',
          value: selected.leave,
          className: 'text-teal-700 dark:text-teal-300',
        },
        {
          label: 'Exceptions',
          value: selected.exceptions,
          className: 'text-amber-700 dark:text-amber-300',
        },
        {
          label: 'Approved',
          value: selected.approved,
          className: 'text-emerald-700 dark:text-emerald-300',
        },
        {
          label: 'Rejected',
          value: selected.rejected,
          className: 'text-rose-700 dark:text-rose-300',
        },
        { label: 'Late', value: selected.late, className: 'text-muted-foreground' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
    <div className="rounded-2xl border border-border/60 bg-background/70 dark:bg-gray-950/40 overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-5 py-3 border-b border-border/50 bg-muted/30">
        <div className="min-w-0">
          <p className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
            {format(monthCursor, 'MMMM yyyy')}
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 tabular-nums">
            {monthStats.office} office
            <span className="mx-1.5 text-border">·</span>
            {monthStats.wfh} WFH
            <span className="mx-1.5 text-border">·</span>
            {monthStats.leave} leave
            <span className="mx-1.5 text-border">·</span>
            {monthStats.exceptions} exceptions
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            aria-label="Previous month"
            onClick={() => setMonthCursor((m) => startOfMonth(addMonths(m, -1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-xl px-3 text-xs font-medium"
            onClick={() => {
              const now = startOfMonth(parseISO(today));
              setMonthCursor(now);
              setSelectedKey(today);
            }}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            aria-label="Next month"
            onClick={() => setMonthCursor((m) => startOfMonth(addMonths(m, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground py-1.5"
            >
              {d}
            </div>
          ))}
          {gridDays.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const row = byDate.get(key);
            const inMonth = isSameMonth(day, monthCursor);
            const isToday = key === today;
            const isSelected = key === selectedKey;
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const tone = dayStatusTone(inMonth ? row : undefined);
            const titleParts = [
              format(day, 'EEE, MMM d, yyyy'),
              row?.office ? `Office ${row.office}` : '',
              row?.wfh ? `WFH ${row.wfh}` : '',
              row?.leave ? `Leave ${row.leave}` : '',
              row?.leavePending ? `Leave pending ${row.leavePending}` : '',
              row?.exceptions ? `Exceptions ${row.exceptions}` : '',
              row?.approved ? `Approved ${row.approved}` : '',
              row?.rejected ? `Rejected ${row.rejected}` : '',
              row?.late ? `Late ${row.late}` : '',
            ].filter(Boolean);

            return (
              <button
                key={key}
                type="button"
                title={titleParts.join(' · ')}
                disabled={!inMonth}
                onClick={() => setSelectedKey(key)}
                className={cn(
                  'group relative flex flex-col items-center justify-between rounded-xl h-[3.6rem] sm:h-[4.5rem] py-1.5 sm:py-2 px-0.5 transition-all duration-150',
                  inMonth ? 'hover:bg-muted/50' : 'pointer-events-none opacity-30',
                  inMonth && isWeekend && !row && 'bg-muted/20',
                  inMonth && tone.fill,
                  isSelected &&
                    inMonth &&
                    'bg-background shadow-[0_1px_8px_rgba(15,23,42,0.08)] ring-1 ring-foreground/15 dark:shadow-[0_1px_10px_rgba(0,0,0,0.35)] dark:ring-white/15',
                  isToday && !isSelected && inMonth && 'ring-1 ring-sky-400/50'
                )}
              >
                {inMonth && row ? (
                  <span
                    className={cn(
                      'absolute left-1 top-1.5 bottom-1.5 w-0.5 rounded-full opacity-80',
                      tone.bar
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    'text-[12px] sm:text-[13px] font-medium tabular-nums leading-none',
                    inMonth ? tone.number : 'text-muted-foreground',
                    isToday &&
                      'inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white dark:bg-sky-500'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {inMonth && row ? (
                  <span className="flex items-center justify-center gap-0.5 h-2">
                    {row.office > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    ) : null}
                    {row.wfh > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    ) : null}
                    {row.leave > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                    ) : null}
                    {row.leavePending > 0 && row.leave === 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-500/50" />
                    ) : null}
                    {row.exceptions > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    ) : null}
                    {row.late > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/80" />
                    ) : null}
                    {row.rejected > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    ) : null}
                  </span>
                ) : (
                  <span className="h-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-3 sm:px-5 py-2.5 border-t border-border/40 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Office
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> WFH
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> Leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Exception
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Rejected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Late
        </span>
      </div>

      {emptySearch ? (
        <p className="text-sm text-muted-foreground px-4 py-5 text-center border-t border-border/40">
          {emptySearch}
        </p>
      ) : selectedKey ? (
        <div className="border-t border-border/50 px-3 sm:px-5 py-3 sm:py-4 bg-muted/20 flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {format(parseISO(selectedKey), 'EEEE, d MMMM yyyy')}
            </p>
            <p className="text-[11px] text-muted-foreground">Related details</p>
          </div>

          {selected ? (
            <div className="grid grid-cols-12 gap-2">
              {selectedMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="col-span-4 sm:col-span-2 rounded-xl bg-background/80 border border-border/50 px-2.5 py-2"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className={cn('text-sm sm:text-base font-semibold tabular-nums mt-0.5', metric.className)}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {hasRelated ? (
            <div className="grid grid-cols-12 gap-3">
              {relatedLeave.map((req) => {
                const status = String(req.status || 'pending').toLowerCase();
                const start = String(req.start_date || '').slice(0, 10);
                const end = String(req.end_date || '').slice(0, 10);
                return (
                  <div
                    key={`leave-${req.id}`}
                    className="col-span-12 sm:col-span-6 rounded-xl border border-teal-200/70 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/25 px-3.5 py-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-teal-800/80 dark:text-teal-200/80">
                        Leave
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-xl capitalize shrink-0 text-[10px]',
                          leaveStatusPillClass(status)
                        )}
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">
                      {req.leave_type_name || req.leave_type_code || 'Leave'}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {start === end ? start : `${start} → ${end}`}
                      {req.days_count ? ` · ${req.days_count} day${req.days_count === 1 ? '' : 's'}` : ''}
                    </p>
                    {req.reason ? (
                      <p className="text-xs text-muted-foreground break-words">{req.reason}</p>
                    ) : null}
                  </div>
                );
              })}

              {relatedAttendance.map((day) => (
                <div
                  key={`${day.date}-${day.work_mode}-${day.check_in_time || 'x'}`}
                  className="col-span-12 sm:col-span-6 rounded-xl border border-border/60 bg-background/80 px-3.5 py-3 flex flex-col gap-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Check-in
                  </p>
                  <p className="text-sm font-medium">
                    {day.work_mode === 'wfh' ? 'Work from home' : 'Office'}
                    {day.is_late ? (
                      <span className="text-muted-foreground font-normal"> · Late</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCheckIn(day.check_in_time) || 'Time not recorded'}
                    {day.source === 'exception' ? ' · From exception' : ''}
                  </p>
                </div>
              ))}

              {relatedExceptions.map((row) => (
                <div
                  key={`${row.id ?? 'ex'}-${row.exception_date}`}
                  className="col-span-12 sm:col-span-6 rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20 px-3.5 py-3 flex flex-col gap-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-amber-800/80 dark:text-amber-200/80">
                    Day exception
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {row.allow_wfh ? (
                      <Badge variant="secondary" className="rounded-xl text-[10px] sm:text-xs">
                        WFH allowed
                      </Badge>
                    ) : null}
                    {row.forgive_late ? (
                      <Badge variant="outline" className="rounded-xl text-[10px] sm:text-xs">
                        Late forgiven
                      </Badge>
                    ) : null}
                  </div>
                  {row.admin_note ? (
                    <p className="text-xs text-muted-foreground break-words">{row.admin_note}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No admin note</p>
                  )}
                  {row.created_at ? (
                    <p className="text-[11px] text-muted-foreground">
                      Granted {formatDateTime(row.created_at)}
                    </p>
                  ) : null}
                </div>
              ))}

              {relatedWfh.map((row) => {
                const status = String(row.status || 'pending').toLowerCase();
                return (
                  <div
                    key={`${row.user_id}-${row.request_date}-${row.id ?? status}`}
                    className="col-span-12 sm:col-span-6 rounded-xl border border-border/60 bg-background/80 px-3.5 py-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        WFH request
                      </p>
                      <Badge
                        variant="outline"
                        className={cn('rounded-xl capitalize shrink-0 text-[10px]', wfhStatusBadgeClass(status))}
                      >
                        {status}
                      </Badge>
                    </div>
                    {row.user_note ? (
                      <p className="text-xs text-muted-foreground break-words">
                        Note: {row.user_note}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No user note</p>
                    )}
                    {row.admin_note ? (
                      <p className="text-xs text-muted-foreground break-words">
                        Admin: {row.admin_note}
                      </p>
                    ) : null}
                    {row.reviewed_by_username || row.reviewed_at ? (
                      <p className="text-[11px] text-muted-foreground">
                        {row.reviewed_by_username ? `Reviewed by ${row.reviewed_by_username}` : 'Reviewed'}
                        {row.reviewed_at ? ` · ${formatDateTime(row.reviewed_at)}` : ''}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              {relatedLates.map((row) => (
                <div
                  key={`${row.id}-${row.submission_date}`}
                  className="col-span-12 sm:col-span-6 rounded-xl border border-border/60 bg-background/80 px-3.5 py-3 flex flex-col gap-1.5"
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Late check-in
                  </p>
                  <p className="text-sm font-medium">{formatCheckIn(row.check_in_time)}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.work_mode === 'wfh' ? 'WFH' : 'Office'}
                    {row.late_strike_consumed ? ' · Strike consumed' : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No check-in, leave, exception, or WFH request on this date.
            </p>
          )}
        </div>
      ) : null}
    </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All recorded days
        </p>
        <AttendancePeriodTable
          rows={rows}
          periodLabel="Day"
          emptySearch={emptySearch}
          emptyDefault="No office, WFH, leave, or exception days recorded for this user yet."
          highlightKey={selectedKey}
        />
      </div>
    </div>
  );
}

export function AttendancePeriodTable({
  rows,
  periodLabel,
  emptySearch,
  emptyDefault,
  highlightKey,
}: {
  rows: AttendancePeriodRow[];
  periodLabel: string;
  emptySearch: string;
  emptyDefault: string;
  highlightKey?: string | null;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-4 py-8 text-center bg-white/40 dark:bg-gray-900/40">
        {emptySearch ? emptySearch : emptyDefault}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 overflow-x-auto bg-white/60 dark:bg-gray-900/40">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent bg-sky-50/50 dark:bg-sky-950/20">
            <TableHead className="text-xs sm:text-sm">{periodLabel}</TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums">Office</TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums">WFH</TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums text-teal-700 dark:text-teal-400">
              Leave
            </TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums text-amber-700 dark:text-amber-400">
              Exceptions
            </TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums text-emerald-700 dark:text-emerald-400">
              Approved
            </TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums text-rose-700 dark:text-rose-400">
              Rejected
            </TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums">Late</TableHead>
            <TableHead className="text-xs sm:text-sm text-right tabular-nums">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.key}
              className={highlightKey && row.key === highlightKey ? 'bg-sky-50/70 dark:bg-sky-950/30' : undefined}
            >
              <TableCell className="text-xs sm:text-sm font-medium whitespace-nowrap">
                {row.label}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums">
                {row.office}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums">
                {row.wfh}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums text-teal-700 dark:text-teal-400">
                {row.leave}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums text-amber-700 dark:text-amber-400">
                {row.exceptions}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                {row.approved}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums text-rose-700 dark:text-rose-400">
                {row.rejected}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums text-muted-foreground">
                {row.late}
              </TableCell>
              <TableCell className="text-xs sm:text-sm text-right tabular-nums font-semibold">
                {row.total}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
