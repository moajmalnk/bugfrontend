import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { extractApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import {
  canShiftYearMonth,
  clampYearMonth,
  defaultPayVerifyYearMonth,
  fetchPayVerifyUserMonth,
  formatHours,
  formatInr,
  formatYearMonthLabel,
  employeeMonthVerifyLabel,
  adminMonthVerifyLabel,
  employeeWeekVerifyLabel,
  adminWeekVerifyLabel,
  shiftYearMonth,
  type PayVerifyUserMonthResponse,
  type PayVerifyWeek,
} from '@/services/payVerifyService';

type Props = {
  userId: string;
  isAdmin?: boolean;
  isSelf?: boolean;
};

function monthTitle(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function shortWeekRange(weekStart: string, weekEnd: string): string {
  const s = new Date(`${weekStart}T12:00:00`);
  const e = new Date(`${weekEnd}T12:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function statusTone(label: string): string {
  const l = label.toLowerCase();
  if (
    l === 'paid' ||
    l === 'done' ||
    l === 'verified' ||
    l === 'approved' ||
    l.includes('locked')
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
  if (l === 'correction' || l.includes('correction')) {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
  }
  if (
    l === 'ready to pay' ||
    l === 'completed' ||
    l === 'reviewed' ||
    l === 'awaiting' ||
    l.includes('awaiting')
  ) {
    return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
  }
  return 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300';
}

function StatusBadge({ label }: { label: string }) {
  const l = label.toLowerCase();
  const isOk = l === 'paid' || l === 'done' || l === 'verified' || l === 'approved';
  const isPending = l === 'pending';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-semibold',
        statusTone(label)
      )}
    >
      {isOk ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
      ) : isPending ? (
        <CircleDashed className="h-3 w-3 shrink-0" aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

function weekDot(week: PayVerifyWeek): string {
  if (week.admin_status === 'approved') return 'bg-emerald-500';
  if (week.admin_status === 'correction_requested' || week.employee_status === 'correction_needed') {
    return 'bg-amber-500';
  }
  if (week.employee_status === 'verified') return 'bg-sky-500';
  return 'bg-gray-400 dark:bg-gray-500';
}

function PayHoursSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="col-span-6 h-[4.5rem] rounded-xl sm:col-span-4 lg:col-span-2" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export function UserPayVerify({ userId, isAdmin = false, isSelf = false }: Props) {
  const [month, setMonth] = useState(defaultPayVerifyYearMonth());
  const [data, setData] = useState<PayVerifyUserMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPayVerifyUserMonth(userId, month);
      setData(res);
    } catch (e) {
      setError(extractApiErrorMessage(e) || 'Failed to load pay verify');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId, month]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data?.month_bounds) return;
    const target = data.month || clampYearMonth(month, data.month_bounds);
    if (target !== month) setMonth(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.month, data?.month_bounds?.min, data?.month_bounds?.max]);

  const m = data?.month_verification;
  const monthBounds = data?.month_bounds ?? null;
  const canGoPrev = monthBounds ? canShiftYearMonth(month, -1, monthBounds) : true;
  const canGoNext = monthBounds ? canShiftYearMonth(month, 1, monthBounds) : true;
  const payPath =
    isSelf || isAdmin
      ? `/pay-verify?month=${encodeURIComponent(month)}${isSelf && !isAdmin ? '&role=mine' : ''}`
      : null;

  const rate = Number(
    data?.rate_info?.current_rate ?? m?.hourly_rate_used ?? m?.hourly_rate ?? 0
  );
  const rateSince = data?.rate_info?.effective_from ?? null;
  const userMonthLabel = m ? employeeMonthVerifyLabel(m) : 'Pending';
  const adminMonthLabel = m ? adminMonthVerifyLabel(m) : 'Pending';

  const weeksUserDone = useMemo(() => {
    return (data?.weeks ?? []).filter((w) => w.employee_status === 'verified').length;
  }, [data?.weeks]);
  const weeksAdminDone = useMemo(() => {
    return (data?.weeks ?? []).filter((w) => w.admin_status === 'approved').length;
  }, [data?.weeks]);

  const metrics = m
    ? [
        { label: 'Hours', value: formatHours(m.total_hours), hint: null as string | null },
        { label: 'Worked days', value: String(m.worked_days ?? 0), hint: null },
        {
          label: 'Leave',
          value: `${Number(m.leave_days ?? 0) % 1 === 0 ? Number(m.leave_days ?? 0) : Number(m.leave_days).toFixed(1)}d`,
          hint: null,
        },
        {
          label: 'Rate',
          value: rate > 0 ? `₹${rate}/h` : '—',
          hint: rateSince
            ? `since ${new Date(`${rateSince}T12:00:00`).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}`
            : null,
        },
        { label: 'Gross', value: formatInr(m.gross_estimate), hint: null },
        { label: 'Net', value: formatInr(m.net_estimate), hint: null },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Header */}
      <div className="grid grid-cols-12 items-start gap-3 sm:gap-4">
        <div className="col-span-12 min-w-0 lg:col-span-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Pay / Hours
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.period_label
              ? `Hour verification & estimated salary · ${data.period_label}`
              : 'Hour verification and estimated salary for the selected month.'}
          </p>
        </div>

        <div className="col-span-12 flex flex-wrap items-center gap-2 lg:col-span-6 lg:justify-end">
          <div className="inline-flex flex-col gap-1">
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl"
                disabled={!canGoPrev || loading}
                onClick={() => {
                  if (!canGoPrev) return;
                  setMonth(shiftYearMonth(month, -1));
                }}
                aria-label="Previous month"
                title={
                  canGoPrev
                    ? 'Previous month'
                    : monthBounds
                      ? `Earliest: ${formatYearMonthLabel(monthBounds.min)} (joining)`
                      : 'Previous month'
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="inline-flex min-w-[7.25rem] items-center justify-center gap-1.5 px-2 text-sm font-semibold tabular-nums">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {monthTitle(month)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl"
                disabled={!canGoNext || loading}
                onClick={() => {
                  if (!canGoNext) return;
                  setMonth(shiftYearMonth(month, 1));
                }}
                aria-label="Next month"
                title={
                  canGoNext
                    ? 'Next month'
                    : monthBounds
                      ? `Latest: ${formatYearMonthLabel(monthBounds.max)} (current month)`
                      : 'Next month'
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {monthBounds ? (
              <p className="px-1 text-center text-[10px] text-muted-foreground">
                {formatYearMonthLabel(monthBounds.min)} – {formatYearMonthLabel(monthBounds.max)}
                <span className="text-muted-foreground/80"> · joining to today</span>
              </p>
            ) : null}
          </div>

          {payPath && (
            <Button type="button" asChild size="sm" className="h-9 rounded-xl gap-1.5">
              <Link to={payPath}>
                Open Pay Verify
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <PayHoursSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/50 dark:bg-rose-950/30 sm:p-5">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-200">Couldn’t load pay data</p>
          <p className="mt-1 text-sm text-rose-700/90 dark:text-rose-300/90">{error}</p>
          <Button type="button" className="mt-3 rounded-xl" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : !m ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
          No verification data for {monthTitle(month)}.
        </div>
      ) : (
        <>
          {/* Metrics — equal 12-col grid */}
          <div className="grid grid-cols-12 gap-3">
            {metrics.map((card) => (
              <div
                key={card.label}
                className="col-span-6 flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-border/80 bg-muted/20 p-3 sm:col-span-4 lg:col-span-2"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {card.label}
                </p>
                <div className="mt-2">
                  <p className="text-base font-semibold tabular-nums text-foreground sm:text-lg">
                    {card.value}
                  </p>
                  {card.hint ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{card.hint}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {/* Week table */}
          <div className="overflow-hidden rounded-2xl border border-border/80">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/25 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Weekly verification</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  User {weeksUserDone}/{data?.weeks?.length ?? 0} verified
                  <span className="mx-1.5 text-border">·</span>
                  Admin {weeksAdminDone}/{data?.weeks?.length ?? 0} approved
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    User
                  </span>
                  <StatusBadge label={userMonthLabel} />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Admin
                  </span>
                  <StatusBadge label={adminMonthLabel} />
                </div>
              </div>
            </div>

            {/* Column headers (desktop) */}
            <div className="hidden grid-cols-12 gap-3 border-b border-border/60 bg-muted/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <div className="col-span-4">Week</div>
              <div className="col-span-2 text-right">Hours</div>
              <div className="col-span-2 text-right">Leave</div>
              <div className="col-span-4 text-right">User / Admin</div>
            </div>

            <div className="divide-y divide-border/60">
              {(data?.weeks ?? []).map((week) => {
                return (
                  <div
                    key={week.week_start}
                    className="grid grid-cols-12 items-center gap-2 px-4 py-3 sm:gap-3"
                  >
                    <div className="col-span-12 flex min-w-0 items-center gap-2 sm:col-span-4">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', weekDot(week))} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {shortWeekRange(week.week_start, week.week_end)}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                          {formatHours(week.worked_hours)} · leave {week.leave_days ?? 0}d
                        </p>
                      </div>
                    </div>
                    <div className="col-span-4 hidden text-right text-sm font-semibold tabular-nums text-foreground sm:col-span-2 sm:block">
                      {formatHours(week.worked_hours)}
                    </div>
                    <div className="col-span-4 hidden text-right text-sm tabular-nums text-muted-foreground sm:col-span-2 sm:block">
                      {week.leave_days ?? 0}d
                    </div>
                    <div className="col-span-12 flex flex-wrap justify-end gap-1.5 sm:col-span-4">
                      <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 px-1.5 py-0.5">
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                          User
                        </span>
                        <StatusBadge label={employeeWeekVerifyLabel(week)} />
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 px-1.5 py-0.5">
                        <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                          Admin
                        </span>
                        <StatusBadge label={adminWeekVerifyLabel(week)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Salary formula */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/80 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 px-4 py-3 text-xs dark:from-emerald-950/25 dark:to-teal-950/15">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium text-foreground">
                {formatHours(m.total_hours)}
                {rate > 0 ? ` × ₹${rate}` : ' × (no rate set)'}
              </span>
              <span className="text-muted-foreground">= {formatInr(m.gross_estimate)}</span>
              {Number(m.adjustments_total) !== 0 && (
                <span className="text-muted-foreground">
                  {Number(m.adjustments_total) > 0 ? '+' : '−'}{' '}
                  {formatInr(Math.abs(Number(m.adjustments_total)))}
                </span>
              )}
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                → Net {formatInr(m.net_estimate)}
              </span>
            </div>
          </div>

          {(isAdmin && (data?.rate_history?.length ?? 0) > 0) && (
            <div className="rounded-2xl border border-border/80 bg-muted/15 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Salary hike timeline
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {data!.rate_history!.length} change
                  {data!.rate_history!.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {data!.rate_history!.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-12 items-start gap-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5 text-sm"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <p className="font-semibold tabular-nums text-foreground">
                        ₹{row.hourly_rate}/h
                      </p>
                      {row.hike_pct != null ? (
                        <p
                          className={cn(
                            'text-[11px] font-medium tabular-nums',
                            row.hike_pct > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : row.hike_pct < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          {row.hike_amount != null
                            ? `${row.hike_amount > 0 ? '+' : ''}₹${row.hike_amount}`
                            : ''}
                          {` · ${row.hike_pct > 0 ? '+' : ''}${row.hike_pct}%`}
                        </p>
                      ) : idx === data!.rate_history!.length - 1 ? (
                        <p className="text-[11px] text-muted-foreground">Baseline</p>
                      ) : null}
                    </div>
                    <div className="col-span-12 text-muted-foreground sm:col-span-4">
                      From{' '}
                      {new Date(`${row.effective_from}T12:00:00`).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {row.updated_by_username ? (
                        <span className="block text-[11px]">by @{row.updated_by_username}</span>
                      ) : null}
                    </div>
                    <div className="col-span-12 text-xs text-muted-foreground sm:col-span-4 sm:text-right">
                      {row.note || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(m.adjustments?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                Adjustments
              </p>
              <div className="flex flex-col gap-2">
                {m.adjustments!.map((adj) => (
                  <div
                    key={adj.id}
                    className="grid grid-cols-12 items-center gap-2 text-sm"
                  >
                    <span className="col-span-8 truncate text-muted-foreground sm:col-span-9">
                      <span className="font-medium capitalize text-foreground">{adj.type}</span>
                      {': '}
                      {adj.reason}
                    </span>
                    <span className="col-span-4 text-right font-semibold tabular-nums sm:col-span-3">
                      {formatInr(adj.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <p className="sr-only" aria-live="polite">
          <Loader2 className="inline h-4 w-4 animate-spin" /> Loading
        </p>
      )}
    </div>
  );
}
