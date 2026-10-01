import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Clock,
  Coffee,
  FileCheck2,
  FileClock,
  FileText,
  HelpCircle,
  Home,
  ListChecks,
  Loader,
  LogIn,
  LogOut,
  Plane,
  RefreshCw,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/users/UserAvatar';
import { resolveAvatarUrl } from '@/lib/avatarUrl';
import { cn } from '@/lib/utils';
import {
  getBugDatesDayAttendance,
  type BugDatesAttendancePerson,
  type BugDatesDayAttendance,
  type BugDatesLeavePerson,
  type BugDatesWeeklyReportFiler,
  type BugDatesWeeklyReportPending,
} from '@/services/bugDatesService';

function formatIstTime(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const STAT_TONES = {
  emerald: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-800 dark:text-rose-200 [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400',
  blue: 'bg-blue-500/10 text-blue-800 dark:text-blue-200 [&_svg]:text-blue-600 dark:[&_svg]:text-blue-400',
  violet: 'bg-violet-500/10 text-violet-800 dark:text-violet-200 [&_svg]:text-violet-600 dark:[&_svg]:text-violet-400',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-200 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400',
  gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 [&_svg]:text-gray-500',
} as const;

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: keyof typeof STAT_TONES;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] sm:text-xs',
        STAT_TONES[tone]
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="opacity-80">{label}</span>
      <span className="whitespace-nowrap font-semibold tabular-nums">{value}</span>
    </span>
  );
}

function PersonRow({ person, isToday }: { person: BugDatesAttendancePerson; isToday: boolean }) {
  const checkIn = formatIstTime(person.check_in_time);
  const checkout = formatIstTime(person.checkout_time);
  const hasTimes = person.status === 'checked_in' && checkIn !== null;
  const breakMin = Number(person.break_minutes ?? 0);
  const worked = Number(person.hours_worked ?? 0);
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-xl border border-gray-100 px-2.5 py-2 dark:border-gray-800">
      <UserAvatar
        name={person.username}
        avatar={person.avatar ? resolveAvatarUrl(person.avatar, person.username) : undefined}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="min-w-0 max-w-full truncate text-sm font-semibold text-gray-900 dark:text-white">
            {person.username}
          </span>
          {person.wfh_request_status === 'pending' ? (
            <Badge tone="amber">WFH pending</Badge>
          ) : person.wfh_request_status === 'approved' || person.status === 'planned' ? (
            <Badge tone="cyan">Approved WFH</Badge>
          ) : null}
          {person.is_late ? (
            <span className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-300">
              Late
            </span>
          ) : null}
          {hasTimes && !checkout ? (
            <span
              className={cn(
                'rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold',
                isToday
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-gray-400/40 bg-gray-500/10 text-gray-600 dark:text-gray-300'
              )}
            >
              {isToday ? 'Working' : 'No checkout'}
            </span>
          ) : null}
        </div>
        {hasTimes ? (
          <div className="flex flex-wrap gap-1">
            <Stat
              icon={LogIn}
              label={person.is_late ? 'Late in' : 'In'}
              value={checkIn}
              tone={person.is_late ? 'rose' : 'emerald'}
            />
            <Stat icon={Coffee} label="Break" value={formatDuration(breakMin)} tone="violet" />
            <Stat icon={Clock} label="Worked" value={formatDuration(worked * 60)} tone="blue" />
            <Stat
              icon={LogOut}
              label="Out"
              value={checkout ?? '—'}
              tone={checkout ? 'amber' : 'gray'}
            />
          </div>
        ) : null}
        {person.note ? <Note text={person.note} /> : null}
      </div>
    </li>
  );
}

const BADGE_TONES = {
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  gray: 'border-gray-400/40 bg-gray-500/10 text-gray-600 dark:text-gray-300',
} as const;

function Badge({ tone, children }: { tone: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span className={cn('rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold', BADGE_TONES[tone])}>
      {children}
    </span>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p className="line-clamp-3 break-words text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
      {text}
    </p>
  );
}

function PersonShell({
  username,
  avatar,
  children,
}: {
  username: string;
  avatar?: string | null;
  children: ReactNode;
}) {
  return (
    <li className="flex min-w-0 items-start gap-2.5 rounded-xl border border-gray-100 px-2.5 py-2 dark:border-gray-800">
      <UserAvatar
        name={username}
        avatar={avatar ? resolveAvatarUrl(avatar, username) : undefined}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">{children}</div>
    </li>
  );
}

function PersonName({ name }: { name: string }) {
  return (
    <span className="min-w-0 max-w-full truncate text-sm font-semibold text-gray-900 dark:text-white">
      {name}
    </span>
  );
}

function LeaveRow({ person }: { person: BugDatesLeavePerson }) {
  const credited = Number(person.credited_hours ?? 0);
  return (
    <PersonShell username={person.username} avatar={person.avatar}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <PersonName name={person.username} />
        {person.status === 'pending' ? <Badge tone="amber">Pending</Badge> : null}
        {person.is_official_leave ? <Badge tone="amber">Official</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        <Stat
          icon={Plane}
          label="Type"
          value={person.leave_type_name}
          tone={person.is_official_leave ? 'amber' : 'rose'}
        />
        <Stat
          icon={CalendarClock}
          label="Span"
          value={
            person.is_half_day
              ? person.half_day_type === 'second_half'
                ? 'Second half'
                : 'First half'
              : 'Full day'
          }
          tone="violet"
        />
        {credited > 0 ? (
          <Stat icon={Clock} label="Credited" value={`${credited.toFixed(1)}h`} tone="blue" />
        ) : null}
      </div>
      {person.reason ? <Note text={person.reason} /> : null}
    </PersonShell>
  );
}

function SubmittedRow({ person }: { person: BugDatesWeeklyReportFiler }) {
  const filedAt = formatIstTime(person.filed_at);
  const filedDay = person.filed_at ? person.filed_at.slice(0, 10) : '';
  return (
    <PersonShell username={person.username} avatar={person.avatar}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <PersonName name={person.username} />
        {person.filed_late ? <Badge tone="rose">Filed late</Badge> : <Badge tone="emerald">On time</Badge>}
        {person.has_blockers ? <Badge tone="amber">Blockers</Badge> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {filedAt ? (
          <Stat
            icon={FileCheck2}
            label="Filed"
            value={person.filed_late && filedDay ? `${formatShortDate(filedDay)} ${filedAt}` : filedAt}
            tone={person.filed_late ? 'rose' : 'emerald'}
          />
        ) : null}
        <Stat icon={ListChecks} label="Done" value={String(person.counts.completed)} tone="blue" />
        <Stat icon={Loader} label="WIP" value={String(person.counts.wip)} tone="violet" />
        <Stat icon={CalendarClock} label="Next" value={String(person.counts.plan)} tone="gray" />
      </div>
    </PersonShell>
  );
}

function PendingRow({ person, overdue }: { person: BugDatesWeeklyReportPending; overdue: boolean }) {
  return (
    <PersonShell username={person.username} avatar={person.avatar}>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <PersonName name={person.username} />
        {overdue ? <Badge tone="rose">Not filed</Badge> : <Badge tone="gray">Due at checkout</Badge>}
      </div>
    </PersonShell>
  );
}

function formatShortDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SubGroup({
  icon: Icon,
  title,
  iconBg,
  count,
  emptyText,
  children,
}: {
  icon: LucideIcon;
  title: string;
  iconBg: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className={cn('rounded-lg p-1 text-white', iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <span className="rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-foreground">
          {count}
        </span>
      </div>
      {count ? (
        <ul className="flex flex-col gap-1.5">{children}</ul>
      ) : (
        <p className="px-2 text-xs text-gray-500 dark:text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

function Card({
  id,
  icon: Icon,
  iconBg,
  title,
  meta,
  action,
  children,
}: {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-gray-200/60 bg-white p-3 shadow-md dark:border-gray-700/60 dark:bg-gray-900 sm:p-4"
    >
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className={cn('shrink-0 rounded-lg p-1.5 text-white', iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 id={id} className="truncate font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {meta ? <p className="truncate text-xs text-gray-500 dark:text-gray-400">{meta}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-32 rounded-lg" />
      <Skeleton className="h-9 w-full rounded-xl" />
      <Skeleton className="h-5 w-32 rounded-lg" />
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

function Group({
  icon: Icon,
  title,
  iconBg,
  people,
  emptyText,
  isToday,
}: {
  icon: LucideIcon;
  title: string;
  iconBg: string;
  people: BugDatesAttendancePerson[];
  emptyText: string;
  isToday: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className={cn('rounded-lg p-1 text-white', iconBg)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        <span className="rounded-full bg-muted px-2 text-xs font-semibold tabular-nums text-foreground">
          {people.length}
        </span>
      </div>
      {people.length ? (
        <ul className="flex flex-col gap-1.5">
          {people.map((p) => (
            <PersonRow key={`${p.user_id}-${p.status}`} person={p} isToday={isToday} />
          ))}
        </ul>
      ) : (
        <p className="px-2 text-xs text-gray-500 dark:text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

type Props = {
  date: string;
  /**
   * Fires with true once the API returned leave + WFH-request data, so the drawer can
   * drop its duplicate leave/WFH cards; false on older backends or errors keeps them.
   */
  onTeamCoverage?: (covered: boolean) => void;
};

/**
 * Office / WFH, leave and Saturday weekly-report roll-up for one BugDates day.
 * Owns its own fetch so the month feed stays light.
 */
export function DayAttendanceSection({ date, onTeamCoverage }: Props) {
  const [data, setData] = useState<BugDatesDayAttendance | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const coverageRef = useRef(onTeamCoverage);
  coverageRef.current = onTeamCoverage;

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setData(null);
    getBugDatesDayAttendance(date, controller.signal)
      .then((res) => {
        setData(res);
        setStatus('success');
        coverageRef.current?.(Array.isArray(res.leave));
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Could not load attendance');
        setStatus('error');
        coverageRef.current?.(false);
      });
    return () => controller.abort();
  }, [date, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const todayIst = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const isFuture = date > todayIst;
  const isToday = date === todayIst;
  const office = data?.office ?? [];
  const wfh = data?.wfh ?? [];
  const unset = data?.unset ?? [];
  const total = [...office, ...wfh, ...unset].filter((p) => p.status === 'checked_in').length;
  const leave = data?.leave;
  const weekly = data?.weekly_report ?? null;
  const approvedLeave = leave?.filter((l) => l.status === 'approved').length ?? 0;
  const isSaturday = new Date(`${date}T12:00:00`).getDay() === 6;

  return (
    <>
      <Card
        id="bugdates-day-attendance"
        icon={Users}
        iconBg="bg-emerald-600"
        title="Office & WFH team"
        action={
          status === 'success' && !isFuture ? (
            <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
              {total} present
            </span>
          ) : null
        }
      >
        {status === 'loading' ? (
          <CardSkeleton />
        ) : status === 'error' ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            <Button type="button" size="sm" variant="outline" className="h-9 rounded-xl" onClick={retry}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="ms-1.5">Retry</span>
            </Button>
          </div>
        ) : isFuture ? (
          <div className="flex flex-col gap-3">
            <Group
              icon={Home}
              title="Planned WFH"
              iconBg="bg-cyan-600"
              people={wfh}
              isToday={isToday}
              emptyText="No WFH requests for this day."
            />
            <p className="px-2 text-xs text-gray-500 dark:text-gray-400">
              Office attendance appears once the team checks in.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Group
              icon={Building2}
              title="In office"
              iconBg="bg-indigo-600"
              people={office}
              isToday={isToday}
              emptyText="No office check-ins."
            />
            <Group
              icon={Home}
              title="Work from home"
              iconBg="bg-cyan-600"
              people={wfh}
              isToday={isToday}
              emptyText="No one worked from home."
            />
            {unset.length ? (
              <Group
                icon={HelpCircle}
                title="Mode not recorded"
                iconBg="bg-gray-500"
                people={unset}
                isToday={isToday}
                emptyText=""
              />
            ) : null}
          </div>
        )}
      </Card>

      {status === 'loading' || (status === 'success' && leave) ? (
        <Card
          id="bugdates-day-leave"
          icon={Plane}
          iconBg="bg-rose-600"
          title="On leave"
          action={
            status === 'success' && leave ? (
              <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                {approvedLeave} approved
                {leave.length > approvedLeave ? ` · ${leave.length - approvedLeave} pending` : ''}
              </span>
            ) : null
          }
        >
          {status === 'loading' || !leave ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          ) : (
            <SubGroup
              icon={Plane}
              title="Leave requests"
              iconBg="bg-rose-500"
              count={leave.length}
              emptyText="No one is on leave."
            >
              {leave.map((l) => (
                <LeaveRow key={`${l.user_id}-${l.status}-${l.leave_type_name}`} person={l} />
              ))}
            </SubGroup>
          )}
        </Card>
      ) : null}

      {(status === 'loading' && isSaturday) || (status === 'success' && weekly) ? (
        <Card
          id="bugdates-day-weekly"
          icon={FileText}
          iconBg="bg-indigo-600"
          title={weekly?.scope === 'self' ? 'My weekly report' : 'Weekly reports'}
          meta={weekly ? `Week of ${weekly.week_label}` : undefined}
          action={
            weekly ? (
              <Button asChild type="button" size="sm" variant="ghost" className="h-8 rounded-xl px-2 text-xs">
                <Link
                  to={`../weekly-report?tab=${weekly.scope === 'team' ? 'team' : 'mine'}&week=${weekly.week_start}`}
                >
                  Open
                  <ArrowUpRight className="ms-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null
          }
        >
          {status === 'loading' || !weekly ? (
            <CardSkeleton />
          ) : weekly.due_state === 'upcoming' && !weekly.submitted.length ? (
            <p className="px-2 text-xs text-gray-500 dark:text-gray-400">
              Due at Saturday checkout. Filing status appears once the week is under way.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {weekly.submitted.length + weekly.pending.length > 0 ? (
                <WeeklyProgress submitted={weekly.submitted.length} pending={weekly.pending.length} />
              ) : null}
              <SubGroup
                icon={FileCheck2}
                title="Submitted"
                iconBg="bg-emerald-600"
                count={weekly.submitted.length}
                emptyText="No reports filed yet."
              >
                {weekly.submitted.map((p) => (
                  <SubmittedRow key={p.user_id} person={p} />
                ))}
              </SubGroup>
              <SubGroup
                icon={FileClock}
                title={weekly.due_state === 'past' ? 'Missing' : 'Pending'}
                iconBg={weekly.due_state === 'past' ? 'bg-rose-600' : 'bg-amber-500'}
                count={weekly.pending.length}
                emptyText={
                  weekly.submitted.length
                    ? 'Everyone who worked this week has filed.'
                    : 'No one checked in this week.'
                }
              >
                {weekly.pending.map((p) => (
                  <PendingRow key={p.user_id} person={p} overdue={weekly.due_state === 'past'} />
                ))}
              </SubGroup>
            </div>
          )}
        </Card>
      ) : null}
    </>
  );
}

function WeeklyProgress({ submitted, pending }: { submitted: number; pending: number }) {
  const total = submitted + pending;
  const pct = total ? Math.round((submitted / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {submitted} of {total} filed
        </span>
        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Weekly reports filed"
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
