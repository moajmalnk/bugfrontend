import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MonthFilterChips } from "@/components/ui/MonthFilterChips";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { currentMonthKey, type MonthFilterValue } from "@/lib/monthFilter";
import { cn } from "@/lib/utils";
import {
  userService,
  type UserAnalyticsMember,
  type UsersAnalyticsPayload,
} from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Filter,
  Loader2,
  Search,
  Shield,
  Timer,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

type UserAnalyticsProps = {
  rolePath?: string;
};

type RoleKey = "admin" | "developer" | "tester";

const ROLE_META: Record<
  RoleKey,
  { label: string; icon: typeof Shield; badgeClass: string; accentClass: string }
> = {
  admin: {
    label: "Admins",
    icon: Shield,
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    accentClass: "from-blue-500/15 to-sky-500/10",
  },
  developer: {
    label: "Developers",
    icon: Code2,
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    accentClass: "from-emerald-500/15 to-green-500/10",
  },
  tester: {
    label: "Testers",
    icon: Bug,
    badgeClass: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
    accentClass: "from-amber-500/15 to-yellow-500/10",
  },
};

const ROLE_ORDER: RoleKey[] = ["developer", "tester", "admin"];

const RANKING_LABELS: Record<string, string> = {
  avg_hours_per_day: "Avg hours / day",
  tasks_completed: "Tasks completed",
  work_days: "Work days",
  overtime_hours: "Overtime hours",
};

function hasActivity(user: UserAnalyticsMember): boolean {
  const current = user.current_period;
  return (
    Number(current.hours || 0) > 0 ||
    Number(current.days || 0) > 0 ||
    Number(current.tasks_completed || 0) > 0 ||
    Number(current.overtime_hours || 0) > 0 ||
    Number(current.bugs_reported || 0) > 0 ||
    Number(current.bugs_fixed || 0) > 0
  );
}

function MetricTile({
  label,
  value,
  detail,
  className,
  icon,
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="shrink-0 text-muted-foreground/80">{icon}</span> : null}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
      {detail ? <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function RankingList({
  title,
  users,
  metricKey,
  tone,
  rolePath,
}: {
  title: string;
  users: UserAnalyticsMember[];
  metricKey: keyof typeof RANKING_LABELS;
  tone: "high" | "low";
  rolePath: string;
}) {
  const getValue = (user: UserAnalyticsMember) => {
    const current = user.current_period;
    switch (metricKey) {
      case "avg_hours_per_day":
        return `${current.avg_hours_per_day.toFixed(1)} h/day`;
      case "tasks_completed":
        return `${current.tasks_completed}`;
      case "work_days":
        return `${current.days} days · ${current.hours.toFixed(0)}h`;
      case "overtime_hours":
        return `${current.overtime_hours.toFixed(1)} h`;
      default:
        return "—";
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="mb-2 flex items-center gap-2">
        {tone === "high" ? (
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
        )}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      </div>
      {users.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {users.map((user, index) => (
            <li key={user.user_id}>
              <Link
                to={`/${rolePath}/users/${user.user_id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border/50 hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name || user.username}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      @{user.username} · {user.role}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  {getValue(user)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function UserCompactCard({
  user,
  rolePath,
}: {
  user: UserAnalyticsMember;
  rolePath: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/${rolePath}/users/${user.user_id}`}
            className="truncate text-sm font-semibold hover:text-primary hover:underline"
          >
            {user.name || user.username}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
        </div>
        <Badge variant="outline" className="text-[10px] capitalize">
          {user.role}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricTile
          label="Avg h/day"
          value={`${user.current_period.avg_hours_per_day.toFixed(1)}h`}
        />
        <MetricTile label="Days" value={`${user.current_period.days}`} />
        <MetricTile label="Tasks" value={`${user.current_period.tasks_completed}`} />
        <MetricTile label="OT" value={`${user.current_period.overtime_hours.toFixed(1)}h`} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Check-in: {user.current_period.avg_check_in_label || "—"}</span>
        <span>
          Bugs/Fixes: {user.current_period.bugs_reported}/{user.current_period.bugs_fixed}
        </span>
      </div>
    </div>
  );
}

function sortByMetric(
  users: UserAnalyticsMember[],
  metric:
    | "hours"
    | "avg_hours_per_day"
    | "tasks_completed"
    | "bugs_reported"
    | "bugs_fixed"
    | "days",
  direction: "desc" | "asc" = "desc"
): UserAnalyticsMember[] {
  const mult = direction === "desc" ? -1 : 1;
  return [...users].sort((a, b) => {
    const pick = (u: UserAnalyticsMember) => {
      switch (metric) {
        case "hours":
          return u.current_period.hours;
        case "avg_hours_per_day":
          return u.current_period.avg_hours_per_day;
        case "tasks_completed":
          return u.current_period.tasks_completed;
        case "bugs_reported":
          return u.current_period.bugs_reported;
        case "bugs_fixed":
          return u.current_period.bugs_fixed;
        default:
          return u.current_period.days;
      }
    };
    const av = pick(a);
    const bv = pick(b);
    if (av === bv) return String(a.username).localeCompare(String(b.username));
    return (av - bv) * mult;
  });
}

function AllUsersOverview({
  data,
  rolePath,
  monthFilter,
}: {
  data: UsersAnalyticsPayload;
  rolePath: string;
  monthFilter: MonthFilterValue;
}) {
  const [rosterSearch, setRosterSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const allUsers = useMemo(
    () => ROLE_ORDER.flatMap((role) => data.roles[role]?.users ?? []),
    [data.roles]
  );

  const aggregates = useMemo(() => {
    let bugsReported = 0;
    let bugsFixed = 0;
    let tasksPending = 0;
    let tasksOngoing = 0;
    let tasksCompleted = 0;
    let breakMinutes = 0;
    let overtimeHours = 0;
    let active = 0;
    let lookbackHours = 0;
    let lookbackDays = 0;
    let lookbackTasks = 0;

    for (const user of allUsers) {
      const c = user.current_period;
      const l = user.lookback;
      bugsReported += Number(c.bugs_reported || 0);
      bugsFixed += Number(c.bugs_fixed || 0);
      tasksPending += Number(c.tasks_pending || 0);
      tasksOngoing += Number(c.tasks_ongoing || 0);
      tasksCompleted += Number(c.tasks_completed || 0);
      breakMinutes += Number(c.break_minutes || 0);
      overtimeHours += Number(c.overtime_hours || 0);
      if (hasActivity(user)) active += 1;
      lookbackHours += Number(l.avg_hours_per_day || 0);
      lookbackDays += Number(l.avg_days_per_month || 0);
      lookbackTasks += Number(l.avg_tasks_completed_per_month || 0);
    }

    const n = Math.max(allUsers.length, 1);
    return {
      bugsReported,
      bugsFixed,
      tasksPending,
      tasksOngoing,
      tasksCompleted,
      breakHours: breakMinutes / 60,
      overtimeHours,
      active,
      inactive: allUsers.length - active,
      lookbackAvgHDay: lookbackHours / n,
      lookbackAvgDays: lookbackDays / n,
      lookbackAvgTasks: lookbackTasks / n,
    };
  }, [allUsers]);

  const roleSnapshots = useMemo(
    () =>
      ROLE_ORDER.map((role) => {
        const section = data.roles[role];
        const users = section?.users ?? [];
        return {
          role,
          summary: section?.summary,
          activeCount: users.filter(hasActivity).length,
          total: users.length,
          bugsReported: users.reduce(
            (s, u) => s + Number(u.current_period.bugs_reported || 0),
            0
          ),
          bugsFixed: users.reduce((s, u) => s + Number(u.current_period.bugs_fixed || 0), 0),
        };
      }),
    [data.roles]
  );

  const topHours = useMemo(
    () => sortByMetric(allUsers.filter(hasActivity), "hours").slice(0, 8),
    [allUsers]
  );
  const topTasks = useMemo(
    () => sortByMetric(allUsers.filter(hasActivity), "tasks_completed").slice(0, 8),
    [allUsers]
  );
  const topBugs = useMemo(
    () =>
      sortByMetric(
        allUsers.filter((u) => Number(u.current_period.bugs_reported || 0) > 0),
        "bugs_reported"
      ).slice(0, 8),
    [allUsers]
  );
  const topFixes = useMemo(
    () =>
      sortByMetric(
        allUsers.filter((u) => Number(u.current_period.bugs_fixed || 0) > 0),
        "bugs_fixed"
      ).slice(0, 8),
    [allUsers]
  );
  const needsAttention = useMemo(() => {
    const active = allUsers.filter(hasActivity);
    if (active.length === 0) return [];
    return sortByMetric(active, "avg_hours_per_day", "asc").slice(0, 8);
  }, [allUsers]);

  const roster = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    let list = showInactive ? allUsers : allUsers.filter(hasActivity);
    if (q) {
      list = list.filter(
        (u) =>
          String(u.username || "").toLowerCase().includes(q) ||
          String(u.name || "").toLowerCase().includes(q) ||
          String(u.role || "").toLowerCase().includes(q)
      );
    }
    return sortByMetric(list, "hours");
  }, [allUsers, rosterSearch, showInactive]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile
          label="Active members"
          value={`${aggregates.active}`}
          detail={`${aggregates.inactive} with no activity`}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Bugs reported"
          value={`${aggregates.bugsReported}`}
          detail="Period total"
          icon={<Bug className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Bugs fixed"
          value={`${aggregates.bugsFixed}`}
          detail="Period total"
          icon={<Wrench className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Tasks done"
          value={`${aggregates.tasksCompleted}`}
          detail={`${aggregates.tasksPending} pending · ${aggregates.tasksOngoing} ongoing`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Total OT"
          value={`${aggregates.overtimeHours.toFixed(1)}h`}
          detail="Tracked OT"
          icon={<Timer className="h-3.5 w-3.5" />}
        />
        <MetricTile
          label="Break time"
          value={`${aggregates.breakHours.toFixed(1)}h`}
          detail="Logged breaks"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Lookback averages ({data.lookback_months} mo)
          </p>
          <Badge variant="outline" className="text-[10px]">
            {monthFilter === "all" ? "Full window" : "Trailing averages"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <MetricTile
            label="Avg h/day (lookback)"
            value={`${aggregates.lookbackAvgHDay.toFixed(1)}h`}
            detail="Per member mean"
          />
          <MetricTile
            label="Avg days / month"
            value={`${aggregates.lookbackAvgDays.toFixed(1)}`}
            detail="Per member mean"
          />
          <MetricTile
            label="Avg tasks / month"
            value={`${aggregates.lookbackAvgTasks.toFixed(1)}`}
            detail="Per member mean"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Role comparison
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {roleSnapshots.map((snap) => {
            const meta = ROLE_META[snap.role];
            const Icon = meta.icon;
            const summary = snap.summary;
            return (
              <div
                key={snap.role}
                className={cn(
                  "relative overflow-hidden rounded-xl border border-border/50 bg-background/70 bg-gradient-to-br p-4",
                  meta.accentClass
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-background/80 p-1.5 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{meta.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {snap.activeCount}/{snap.total} active
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", meta.badgeClass)}>
                    {snap.total}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Avg h/day</p>
                    <p className="font-bold tabular-nums">
                      {(summary?.avg_hours_per_day ?? 0).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total hours</p>
                    <p className="font-bold tabular-nums">
                      {(summary?.total_hours ?? 0).toFixed(0)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bugs</p>
                    <p className="font-bold tabular-nums">{snap.bugsReported}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fixes</p>
                    <p className="font-bold tabular-nums">{snap.bugsFixed}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            All-users leaderboards
          </p>
          <Badge variant="outline" className="text-[10px]">
            Across all roles
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <RankingList
            title="Most hours"
            users={topHours}
            metricKey="work_days"
            tone="high"
            rolePath={rolePath}
          />
          <RankingList
            title="Most tasks"
            users={topTasks}
            metricKey="tasks_completed"
            tone="high"
            rolePath={rolePath}
          />
          <RankingList
            title="Needs attention (avg h/day)"
            users={needsAttention}
            metricKey="avg_hours_per_day"
            tone="low"
            rolePath={rolePath}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-background/70 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Bug className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top bug reporters
              </p>
            </div>
            {topBugs.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">No bugs reported in this period.</p>
            ) : (
              <ol className="space-y-2">
                {topBugs.map((user, index) => (
                  <li key={user.user_id}>
                    <Link
                      to={`/${rolePath}/users/${user.user_id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate text-sm">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {index + 1}
                        </span>
                        {user.name || user.username}
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          · {user.role}
                        </span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums">
                        {user.current_period.bugs_reported}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-background/70 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top bug fixers
              </p>
            </div>
            {topFixes.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">No fixes recorded in this period.</p>
            ) : (
              <ol className="space-y-2">
                {topFixes.map((user, index) => (
                  <li key={user.user_id}>
                    <Link
                      to={`/${rolePath}/users/${user.user_id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/50"
                    >
                      <span className="truncate text-sm">
                        <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {index + 1}
                        </span>
                        {user.name || user.username}
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          · {user.role}
                        </span>
                      </span>
                      <span className="text-xs font-semibold tabular-nums">
                        {user.current_period.bugs_fixed}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              All users roster
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {roster.length} shown · sorted by hours · open a profile for full BugRicer stats
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-xs font-medium">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
                aria-label="Include inactive users"
              />
              <span>Include inactive</span>
            </label>
            <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search users…"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:hidden">
          {roster.slice(0, 24).map((user) => (
            <UserCompactCard key={user.user_id} user={user} rolePath={rolePath} />
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">User</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Hours</th>
                <th className="py-2 pr-3 font-medium">Avg h/day</th>
                <th className="py-2 pr-3 font-medium">Days</th>
                <th className="py-2 pr-3 font-medium">Tasks</th>
                <th className="py-2 pr-3 font-medium">Pending</th>
                <th className="py-2 pr-3 font-medium">OT</th>
                <th className="py-2 pr-3 font-medium">Check-in</th>
                <th className="py-2 pr-3 font-medium">Bugs</th>
                <th className="py-2 pr-3 font-medium">Fixes</th>
                <th className="py-2 font-medium">Lookback h/day</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((user) => (
                <tr
                  key={user.user_id}
                  className={cn(
                    "border-b border-border/40 last:border-0",
                    !hasActivity(user) && "text-muted-foreground/80"
                  )}
                >
                  <td className="py-2 pr-3">
                    <Link
                      to={`/${rolePath}/users/${user.user_id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {user.name || user.username}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">@{user.username}</div>
                  </td>
                  <td className="py-2 pr-3 text-xs capitalize">{user.role}</td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.hours.toFixed(1)}h</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {user.current_period.avg_hours_per_day.toFixed(1)}h
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.days}</td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.tasks_completed}</td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.tasks_pending}</td>
                  <td className="py-2 pr-3 tabular-nums">
                    {user.current_period.overtime_hours.toFixed(1)}h
                  </td>
                  <td className="py-2 pr-3 text-xs tabular-nums">
                    {user.current_period.avg_check_in_label || "—"}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.bugs_reported}</td>
                  <td className="py-2 pr-3 tabular-nums">{user.current_period.bugs_fixed}</td>
                  <td className="py-2 tabular-nums">{user.lookback.avg_hours_per_day.toFixed(1)}h</td>
                </tr>
              ))}
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
                    No users match this search/filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RoleAnalyticsSection({
  role,
  data,
  rolePath,
}: {
  role: RoleKey;
  data: UsersAnalyticsPayload["roles"][RoleKey];
  rolePath: string;
}) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  const [showLowActivityRows, setShowLowActivityRows] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(role !== "developer");

  const { activeUsers, lowActivityUsers } = useMemo(() => {
    const highSignal = data.users.filter(hasActivity);
    const lowSignal = data.users.filter(
      (user) => !highSignal.some((u) => u.user_id === user.user_id)
    );
    return { activeUsers: highSignal, lowActivityUsers: lowSignal };
  }, [data.users]);

  const roleBugs = useMemo(
    () =>
      data.users.reduce(
        (acc, u) => {
          acc.reported += Number(u.current_period.bugs_reported || 0);
          acc.fixed += Number(u.current_period.bugs_fixed || 0);
          acc.pending += Number(u.current_period.tasks_pending || 0);
          acc.ongoing += Number(u.current_period.tasks_ongoing || 0);
          return acc;
        },
        { reported: 0, fixed: 0, pending: 0, ongoing: 0 }
      ),
    [data.users]
  );

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", meta.accentClass)} />
      <CardHeader className="relative pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-background/80 p-2 shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeUsers.length}/{data.summary.user_count} active · averages for selected period
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("capitalize", meta.badgeClass)}>
              {data.summary.user_count} users
            </Badge>
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background"
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Expand
                </>
              ) : (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse
                </>
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("relative space-y-5", isCollapsed ? "pt-0" : "")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile label="Avg h/day" value={`${data.summary.avg_hours_per_day.toFixed(1)}h`} />
          <MetricTile label="Avg work days" value={`${data.summary.avg_work_days.toFixed(1)}`} />
          <MetricTile
            label="Avg tasks done"
            value={`${data.summary.avg_tasks_completed.toFixed(1)}`}
          />
          <MetricTile
            label="Avg overtime"
            value={`${data.summary.avg_overtime_hours.toFixed(1)}h`}
          />
          <MetricTile label="Bugs / fixes" value={`${roleBugs.reported}/${roleBugs.fixed}`} />
          <MetricTile label="Total hours" value={`${data.summary.total_hours.toFixed(0)}h`} />
        </div>

        {isCollapsed ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-background/50 px-4 py-3 text-xs text-muted-foreground">
            Section collapsed. Expand to view rankings and member breakdown.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  High vs low performance by metric
                </p>
                <Badge variant="outline" className="text-[10px]">
                  Monthly ranking
                </Badge>
              </div>
              {(Object.keys(RANKING_LABELS) as Array<keyof typeof RANKING_LABELS>).map(
                (metricKey) => (
                  <div
                    key={metricKey}
                    className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4"
                  >
                    <p className="text-sm font-semibold">{RANKING_LABELS[metricKey]}</p>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <RankingList
                        title="High performers"
                        users={data.rankings.high[metricKey] ?? []}
                        metricKey={metricKey}
                        tone="high"
                        rolePath={rolePath}
                      />
                      <RankingList
                        title="Needs attention"
                        users={data.rankings.low[metricKey] ?? []}
                        metricKey={metricKey}
                        tone="low"
                        rolePath={rolePath}
                      />
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  All {meta.label.toLowerCase()} — selected period
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {activeUsers.length} active
                  </Badge>
                  {lowActivityUsers.length > 0 ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {lowActivityUsers.length} low activity
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-[10px]">
                    {roleBugs.pending} pending · {roleBugs.ongoing} ongoing
                  </Badge>
                </div>
              </div>

              {activeUsers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  No recorded activity for this role in the selected month.
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 md:hidden">
                {activeUsers.map((user) => (
                  <UserCompactCard key={user.user_id} user={user} rolePath={rolePath} />
                ))}
                {showLowActivityRows &&
                  lowActivityUsers.map((user) => (
                    <UserCompactCard key={user.user_id} user={user} rolePath={rolePath} />
                  ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">User</th>
                      <th className="py-2 pr-3 font-medium">Hours</th>
                      <th className="py-2 pr-3 font-medium">Avg h/day</th>
                      <th className="py-2 pr-3 font-medium">Days</th>
                      <th className="py-2 pr-3 font-medium">Tasks</th>
                      <th className="py-2 pr-3 font-medium">Pending</th>
                      <th className="py-2 pr-3 font-medium">OT</th>
                      <th className="py-2 pr-3 font-medium">Check-in</th>
                      <th className="py-2 pr-3 font-medium">Bugs</th>
                      <th className="py-2 pr-3 font-medium">Fixes</th>
                      <th className="py-2 font-medium">Lookback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map((user) => (
                      <tr key={user.user_id} className="border-b border-border/40 last:border-0">
                        <td className="py-2 pr-3">
                          <Link
                            to={`/${rolePath}/users/${user.user_id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {user.name || user.username}
                          </Link>
                          <div className="text-[11px] text-muted-foreground">@{user.username}</div>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.hours.toFixed(1)}h
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.avg_hours_per_day.toFixed(1)}h
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{user.current_period.days}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.tasks_completed}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{user.current_period.tasks_pending}</td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.overtime_hours.toFixed(1)}h
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.avg_check_in_label || "—"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {user.current_period.bugs_reported}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{user.current_period.bugs_fixed}</td>
                        <td className="py-2 text-xs tabular-nums text-muted-foreground">
                          {user.lookback.avg_hours_per_day.toFixed(1)}h/d
                        </td>
                      </tr>
                    ))}
                    {showLowActivityRows &&
                      lowActivityUsers.map((user) => (
                        <tr
                          key={user.user_id}
                          className="border-b border-border/30 text-muted-foreground/90 last:border-0"
                        >
                          <td className="py-2 pr-3">
                            <Link
                              to={`/${rolePath}/users/${user.user_id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {user.name || user.username}
                            </Link>
                            <div className="text-[11px] text-muted-foreground">@{user.username}</div>
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.hours.toFixed(1)}h
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.avg_hours_per_day.toFixed(1)}h
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{user.current_period.days}</td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.tasks_completed}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.tasks_pending}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.overtime_hours.toFixed(1)}h
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.avg_check_in_label || "—"}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {user.current_period.bugs_reported}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{user.current_period.bugs_fixed}</td>
                          <td className="py-2 text-xs tabular-nums">
                            {user.lookback.avg_hours_per_day.toFixed(1)}h/d
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {lowActivityUsers.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowLowActivityRows((prev) => !prev)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background"
                >
                  {showLowActivityRows ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Hide low-activity members
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Show low-activity members ({lowActivityUsers.length})
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-96 rounded-2xl" />
      ))}
    </div>
  );
}

export function UserAnalytics({ rolePath = "admin" }: UserAnalyticsProps) {
  const [hideDeactivatedUsers, setHideDeactivatedUsers] = useState(true);
  const [monthFilter, setMonthFilter] = useState<MonthFilterValue>(() => currentMonthKey());
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["usersAnalytics", hideDeactivatedUsers, monthFilter],
    queryFn: () =>
      userService.getUsersAnalytics({
        activeOnly: hideDeactivatedUsers,
        month: monthFilter,
      }),
  });

  if (isLoading) return <AnalyticsSkeleton />;

  if (isError || !data) {
    return (
      <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/5">
        <CardContent className="py-10 text-center text-sm text-rose-700 dark:text-rose-300">
          {(error as Error)?.message || "Failed to load user analytics."}
        </CardContent>
      </Card>
    );
  }

  const periodDetail =
    monthFilter === "all"
      ? `${data.period.name} (${data.period.range}) · ${data.lookback_months}-month window`
      : `${data.period.name} (${data.period.range}) · ${data.lookback_months}-month lookback averages`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-violet-50/40 via-transparent to-blue-50/40 dark:from-violet-950/10 dark:to-blue-950/10" />
        <CardHeader className="relative pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 p-2.5 text-white shadow-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">Team analytics</CardTitle>
                <p className="text-xs text-muted-foreground sm:text-sm">{periodDetail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 text-xs font-medium">
                <Switch
                  checked={hideDeactivatedUsers}
                  onCheckedChange={setHideDeactivatedUsers}
                  aria-label="Hide deactivated users"
                />
                <span>Hide deactivated users</span>
              </label>
              {data.filters?.active_only_applied ? (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Filter className="h-3 w-3" />
                  Showing {data.filters.total_users_after_filter ?? data.team_summary.user_count} of{" "}
                  {data.filters.total_users_before_filter ?? data.team_summary.user_count}
                </Badge>
              ) : null}
              {isFetching ? (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="mt-4">
            <MonthFilterChips value={monthFilter} onChange={setMonthFilter} compact />
          </div>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <MetricTile
              label="Team avg h/day"
              value={`${data.team_summary.avg_hours_per_day.toFixed(1)}h`}
              detail="Across admins, devs, testers"
            />
            <MetricTile
              label="Team avg days"
              value={`${data.team_summary.avg_work_days.toFixed(1)}`}
              detail={monthFilter === "all" ? "Work days in window" : "Work days this month"}
            />
            <MetricTile
              label="Team avg tasks"
              value={`${data.team_summary.avg_tasks_completed.toFixed(1)}`}
              detail="Completed tasks"
            />
            <MetricTile
              label="Team overtime"
              value={`${data.team_summary.avg_overtime_hours.toFixed(1)}h`}
              detail="Per member average"
            />
            <MetricTile
              label="Total hours"
              value={`${data.team_summary.total_hours.toFixed(0)}h`}
              detail={`${data.team_summary.user_count} tracked members`}
              className="sm:col-span-2 lg:col-span-1"
            />
          </div>

          <AllUsersOverview data={data} rolePath={rolePath} monthFilter={monthFilter} />
        </CardContent>
      </Card>

      {ROLE_ORDER.map((role) => (
        <RoleAnalyticsSection
          key={role}
          role={role}
          data={data.roles[role]}
          rolePath={rolePath}
        />
      ))}
    </div>
  );
}
