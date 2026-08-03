import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Hourglass,
  Megaphone,
  Minus,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { bugService, type MonthlyOpsMonth } from '@/services/bugService';

const PANEL =
  'relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg';

const volumeChartConfig = {
  bugs_created: { label: 'Bugs created', color: '#f97316' },
  bugs_fixed: { label: 'Bugs fixed', color: '#10b981' },
  updates_created: { label: 'Updates', color: '#6366f1' },
  fix_rate: { label: 'Fix rate %', color: '#38bdf8' },
} satisfies ChartConfig;

const retentionChartConfig = {
  avg_fix_days: { label: 'Avg time to fix (days)', color: '#a855f7' },
  bugs_fixed: { label: 'Bugs fixed', color: '#10b981' },
} satisfies ChartConfig;

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${value}%`;
}

function ratio(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(2);
}

function formatDeltaDays(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return '—';
  const abs = Math.abs(delta);
  const label = abs < 1 ? `${abs.toFixed(1)}d` : `${abs.toFixed(1)}d`;
  if (delta === 0) return '0d';
  return delta < 0 ? `−${label}` : `+${label}`;
}

function MonthActivityBar({ row, max }: { row: MonthlyOpsMonth; max: number }) {
  const createdShare = max > 0 ? (row.bugs_created / max) * 100 : 0;
  const fixedShare = max > 0 ? (row.bugs_fixed / max) * 100 : 0;
  const updateShare = max > 0 ? (row.updates_created / max) * 100 : 0;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/60">
      <div className="bg-orange-500/90" style={{ width: `${createdShare}%` }} />
      <div className="bg-emerald-500/90" style={{ width: `${fixedShare}%` }} />
      <div className="bg-indigo-500/90" style={{ width: `${updateShare}%` }} />
    </div>
  );
}

function TrendBadge({
  direction,
  deltaDays,
  deltaPercent,
}: {
  direction: 'improving' | 'slowing' | 'stable';
  deltaDays?: number | null;
  deltaPercent?: number | null;
}) {
  const Icon =
    direction === 'improving'
      ? ArrowDownRight
      : direction === 'slowing'
        ? ArrowUpRight
        : Minus;
  const tone =
    direction === 'improving'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      : direction === 'slowing'
        ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
        : 'bg-muted text-muted-foreground border-border/60';
  const copy =
    direction === 'improving'
      ? 'Faster'
      : direction === 'slowing'
        ? 'Slower'
        : 'Stable';
  return (
    <Badge
      variant="outline"
      className={cn('rounded-xl gap-1 tabular-nums font-medium', tone)}
    >
      <Icon className="h-3 w-3" />
      {copy}
      {deltaDays != null ? (
        <span className="opacity-80">
          {formatDeltaDays(deltaDays)}
          {deltaPercent != null ? ` (${deltaPercent > 0 ? '+' : ''}${deltaPercent}%)` : ''}
        </span>
      ) : null}
    </Badge>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="col-span-6 sm:col-span-4 lg:col-span-2 rounded-xl border border-border/60 bg-background/60 px-3.5 py-3.5 min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 truncate">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          'text-xl font-bold tabular-nums mt-1.5 tracking-tight truncate',
          valueClassName
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Why: Ops Overview needs a professional month-by-month story — volume, fixes,
 * updates, and average time retention (created→fixed) for growth/velocity.
 */
export function MonthlyOpsTimelinePanel({ enabled }: { enabled: boolean }) {
  const [showAllMonths, setShowAllMonths] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-ops-monthly-timeline'],
    queryFn: () => bugService.getMonthlyTimeline(),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const months = data?.months ?? [];
  const chartMonths = useMemo(() => {
    if (months.length <= 18) return months;
    return months.slice(-18);
  }, [months]);

  const tableMonths = useMemo(() => {
    const reversed = [...months].reverse();
    if (showAllMonths || reversed.length <= 12) return reversed;
    return reversed.slice(0, 12);
  }, [months, showAllMonths]);

  const maxActivity = useMemo(
    () => months.reduce((m, row) => Math.max(m, row.activity), 0),
    [months]
  );

  const rateDomainMax = useMemo(() => {
    const rates = chartMonths
      .map((m) => m.fix_rate)
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (!rates.length) return 100;
    return Math.max(100, Math.ceil(Math.max(...rates) / 10) * 10);
  }, [chartMonths]);

  if (isLoading) {
    return (
      <div className={cn(PANEL, 'p-5 sm:p-6 space-y-4')}>
        <Skeleton className="h-8 w-64 rounded-xl" />
        <div className="grid grid-cols-12 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="col-span-6 sm:col-span-4 lg:col-span-2 h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn(PANEL, 'p-5 sm:p-6')}>
        <p className="text-sm text-muted-foreground">
          Could not load the monthly ops timeline. Try refreshing the dashboard.
        </p>
      </div>
    );
  }

  const totals = data.totals;
  const growth = data.retention_growth;

  return (
    <div className={cn(PANEL, 'p-5 sm:p-6 space-y-6')}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2.5 rounded-xl shadow text-white shrink-0 bg-gradient-to-br from-sky-500 to-indigo-600">
            <CalendarRange className="h-4 w-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Monthly ops timeline
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Volume, resolution mix, and average time retention from first bug (
              {data.first_month}) through {data.last_month}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-xl tabular-nums">
            {data.month_count} months
          </Badge>
          {data.avg_fix_rate !== null ? (
            <Badge variant="secondary" className="rounded-xl tabular-nums">
              Fix rate {pct(data.avg_fix_rate)}
            </Badge>
          ) : null}
          {growth ? (
            <TrendBadge
              direction={growth.direction}
              deltaDays={growth.delta_days}
              deltaPercent={growth.delta_percent}
            />
          ) : null}
          {data.peak_month ? (
            <Badge className="rounded-xl bg-indigo-600 hover:bg-indigo-600">
              Peak {data.peak_month.label}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        <KpiCard
          label="Bugs created"
          value={totals.bugs_created.toLocaleString()}
          icon={<TrendingUp className="h-3 w-3 text-orange-500" />}
        />
        <KpiCard
          label="Fixed"
          value={totals.bugs_fixed.toLocaleString()}
          icon={<CheckCircle2 className="h-3 w-3 text-emerald-500" />}
          valueClassName="text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          label="Updates"
          value={totals.updates_created.toLocaleString()}
          icon={<Megaphone className="h-3 w-3 text-indigo-500" />}
        />
        <KpiCard
          label="High priority"
          value={totals.bugs_high_created.toLocaleString()}
          icon={<Zap className="h-3 w-3 text-sky-500" />}
        />
        <KpiCard
          label="Avg time retention"
          value={data.avg_fix_duration_label ?? '—'}
          hint={
            data.fix_sample_count > 0
              ? `Across ${data.fix_sample_count.toLocaleString()} fixed bugs`
              : 'No fixed bugs in range'
          }
          icon={<Hourglass className="h-3 w-3 text-violet-500" />}
          valueClassName="text-violet-700 dark:text-violet-300"
        />
        <KpiCard
          label="Retention growth"
          value={
            growth ? (
              <span className="inline-flex items-center gap-1.5">
                {growth.direction === 'improving' ? (
                  <ArrowDownRight className="h-5 w-5 text-emerald-500" />
                ) : growth.direction === 'slowing' ? (
                  <ArrowUpRight className="h-5 w-5 text-amber-500" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                )}
                {formatDeltaDays(growth.delta_days)}
              </span>
            ) : (
              '—'
            )
          }
          hint={
            growth
              ? `${growth.from_label} → ${growth.to_label}`
              : 'Need 2 months with fixes'
          }
          icon={<Timer className="h-3 w-3 text-fuchsia-500" />}
        />
      </div>

      {(data.fastest_month || data.slowest_month) && (
        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          {data.fastest_month ? (
            <div className="col-span-12 sm:col-span-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/80">
                  Fastest resolution month
                </p>
                <p className="font-semibold text-foreground mt-0.5 truncate">
                  {data.fastest_month.label}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300 shrink-0">
                {data.fastest_month.avg_fix_duration_label}
              </p>
            </div>
          ) : null}
          {data.slowest_month ? (
            <div className="col-span-12 sm:col-span-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-amber-800/80 dark:text-amber-300/80">
                  Longest retention month
                </p>
                <p className="font-semibold text-foreground mt-0.5 truncate">
                  {data.slowest_month.label}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums text-amber-800 dark:text-amber-300 shrink-0">
                {data.slowest_month.avg_fix_duration_label}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Volume & fix rate</h4>
          <p className="text-[11px] text-muted-foreground">
            Fix % can exceed 100% when clearing prior-month backlog
          </p>
        </div>
        <ChartContainer
          config={volumeChartConfig}
          className="aspect-[21/9] w-full min-h-[260px]"
        >
          <ComposedChart data={chartMonths} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="count"
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="rate"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, rateDomainMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              yAxisId="count"
              dataKey="bugs_created"
              fill="var(--color-bugs_created)"
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              yAxisId="count"
              dataKey="bugs_fixed"
              fill="var(--color-bugs_fixed)"
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
            <Bar
              yAxisId="count"
              dataKey="updates_created"
              fill="var(--color-updates_created)"
              radius={[6, 6, 0, 0]}
              maxBarSize={26}
            />
            <Line
              yAxisId="rate"
              type="monotone"
              dataKey="fix_rate"
              stroke="var(--color-fix_rate)"
              strokeWidth={2.5}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Hourglass className="h-3.5 w-3.5 text-violet-500" />
            Average time retention
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Created → fixed cycle time (days). Lower is faster growth velocity.
          </p>
        </div>
        <ChartContainer
          config={retentionChartConfig}
          className="aspect-[24/7] w-full min-h-[200px]"
        >
          <ComposedChart data={chartMonths} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="days"
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}d`}
            />
            <YAxis
              yAxisId="fixed"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={36}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              yAxisId="days"
              type="monotone"
              dataKey="avg_fix_days"
              name="avg_fix_days"
              fill="var(--color-avg_fix_days)"
              fillOpacity={0.15}
              stroke="var(--color-avg_fix_days)"
              strokeWidth={2.5}
              connectNulls={false}
              dot={false}
            />
            <Bar
              yAxisId="fixed"
              dataKey="bugs_fixed"
              name="bugs_fixed"
              fill="var(--color-bugs_fixed)"
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              maxBarSize={18}
            />
          </ComposedChart>
        </ChartContainer>
      </div>

      {months.length > 18 ? (
        <p className="text-xs text-muted-foreground -mt-2">
          Charts show the latest 18 months. Full history is in the table below.
        </p>
      ) : null}

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="max-h-[min(52vh,420px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                  Month
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Created
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Fixed
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Updates
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums whitespace-nowrap">
                  Avg time
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  MoM
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Fix %
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Close %
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-right tabular-nums">
                  Upd/Bug
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-background/95 backdrop-blur min-w-[7rem]">
                  Mix
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableMonths.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium whitespace-nowrap">{row.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.bugs_created}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {row.bugs_fixed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-indigo-600 dark:text-indigo-300">
                    {row.updates_created}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-violet-700 dark:text-violet-300 whitespace-nowrap">
                    {row.avg_fix_duration_label ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {row.retention_trend ? (
                      <span
                        className={cn(
                          'inline-flex items-center justify-end gap-0.5',
                          row.retention_trend === 'improving' &&
                            'text-emerald-600 dark:text-emerald-400',
                          row.retention_trend === 'slowing' &&
                            'text-amber-700 dark:text-amber-300',
                          row.retention_trend === 'stable' && 'text-muted-foreground'
                        )}
                      >
                        {row.retention_trend === 'improving' ? (
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        ) : row.retention_trend === 'slowing' ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <Minus className="h-3.5 w-3.5" />
                        )}
                        {formatDeltaDays(row.retention_delta_days)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {pct(row.fix_rate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pct(row.close_rate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {ratio(row.update_to_bug_ratio)}
                  </TableCell>
                  <TableCell>
                    <MonthActivityBar row={row} max={maxActivity || 1} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {months.length > 12 ? (
          <div className="border-t border-border/60 px-4 py-2.5 flex justify-center">
            <button
              type="button"
              className="text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline"
              onClick={() => setShowAllMonths((v) => !v)}
            >
              {showAllMonths
                ? 'Show recent 12 months'
                : `Show all ${months.length} months`}
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Created = bugs opened that month. Fixed / declined / rejected = closed that month (by
        update time). Avg time retention = average created→fixed duration for bugs fixed that
        month. MoM = change vs previous month with fixes (↓ faster). Fix % = fixed ÷ created
        (may exceed 100% when clearing backlog). Close % = (fixed + declined + rejected) ÷
        created. Upd/Bug = updates ÷ bugs created.
      </p>
    </div>
  );
}
