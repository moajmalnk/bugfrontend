import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { userService, type UsersAnalyticsPayload } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bug,
  Code2,
  Loader2,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
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

const RANKING_LABELS: Record<string, string> = {
  avg_hours_per_day: "Avg hours / day",
  tasks_completed: "Tasks completed",
  work_days: "Work days",
  overtime_hours: "Overtime hours",
};

function MetricTile({
  label,
  value,
  detail,
  className,
}: {
  label: string;
  value: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 shadow-sm",
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
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
  users: UsersAnalyticsPayload["roles"]["admin"]["rankings"]["high"]["avg_hours_per_day"];
  metricKey: keyof typeof RANKING_LABELS;
  tone: "high" | "low";
  rolePath: string;
}) {
  const getValue = (user: (typeof users)[number]) => {
    const current = user.current_period;
    switch (metricKey) {
      case "avg_hours_per_day":
        return `${current.avg_hours_per_day.toFixed(1)} h/day`;
      case "tasks_completed":
        return `${current.tasks_completed}`;
      case "work_days":
        return `${current.days} days`;
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
        <p className="text-xs text-muted-foreground py-2">No activity recorded yet.</p>
      ) : (
        <ol className="space-y-2">
          {users.map((user, index) => (
            <li key={user.user_id}>
              <Link
                to={`/${rolePath}/users/${user.user_id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:bg-muted/50 hover:border-border/50 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name || user.username}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
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
  user: UsersAnalyticsPayload["roles"]["admin"]["users"][number];
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
        <MetricTile
          label="OT"
          value={`${user.current_period.overtime_hours.toFixed(1)}h`}
        />
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

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-900/80">
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br",
          meta.accentClass
        )}
      />
      <CardHeader className="relative pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-background/80 p-2 shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">{meta.label}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {data.summary.user_count} members · team averages for current month
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("capitalize", meta.badgeClass)}>
            {data.summary.user_count} users
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-5">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile
            label="Avg h/day"
            value={`${data.summary.avg_hours_per_day.toFixed(1)}h`}
          />
          <MetricTile
            label="Avg work days"
            value={`${data.summary.avg_work_days.toFixed(1)}`}
          />
          <MetricTile
            label="Avg tasks done"
            value={`${data.summary.avg_tasks_completed.toFixed(1)}`}
          />
          <MetricTile
            label="Avg overtime"
            value={`${data.summary.avg_overtime_hours.toFixed(1)}h`}
          />
          <MetricTile
            label="Total hours"
            value={`${data.summary.total_hours.toFixed(0)}h`}
            className="sm:col-span-2 lg:col-span-1"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              High vs low performance by metric
            </p>
            <Badge variant="outline" className="text-[10px]">
              Monthly ranking
            </Badge>
          </div>
          {(Object.keys(RANKING_LABELS) as Array<keyof typeof RANKING_LABELS>).map((metricKey) => (
            <div key={metricKey} className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
              <p className="text-sm font-semibold">{RANKING_LABELS[metricKey]}</p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <RankingList
                  title="High performers"
                  users={data.rankings.high[metricKey]}
                  metricKey={metricKey}
                  tone="high"
                  rolePath={rolePath}
                />
                <RankingList
                  title="Needs attention"
                  users={data.rankings.low[metricKey]}
                  metricKey={metricKey}
                  tone="low"
                  rolePath={rolePath}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            All {meta.label.toLowerCase()} — current month
          </p>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {data.users.map((user) => (
              <UserCompactCard key={user.user_id} user={user} rolePath={rolePath} />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Avg h/day</th>
                  <th className="py-2 pr-3 font-medium">Days</th>
                  <th className="py-2 pr-3 font-medium">Tasks</th>
                  <th className="py-2 pr-3 font-medium">OT</th>
                  <th className="py-2 pr-3 font-medium">Check-in</th>
                  <th className="py-2 pr-3 font-medium">Bugs</th>
                  <th className="py-2 font-medium">Fixes</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
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
                      {user.current_period.avg_hours_per_day.toFixed(1)}h
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{user.current_period.days}</td>
                    <td className="py-2 pr-3 tabular-nums">{user.current_period.tasks_completed}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {user.current_period.overtime_hours.toFixed(1)}h
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {user.current_period.avg_check_in_label || "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{user.current_period.bugs_reported}</td>
                    <td className="py-2 tabular-nums">{user.current_period.bugs_fixed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["usersAnalytics"],
    queryFn: () => userService.getUsersAnalytics(),
  });

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card className="rounded-2xl border border-rose-500/30 bg-rose-500/5">
        <CardContent className="py-10 text-center text-sm text-rose-700 dark:text-rose-300">
          {(error as Error)?.message || "Failed to load user analytics."}
        </CardContent>
      </Card>
    );
  }

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
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {data.period.name} ({data.period.range}) · {data.lookback_months}-month lookback averages
                </p>
              </div>
            </div>
            {isFetching ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <MetricTile
              label="Team avg h/day"
              value={`${data.team_summary.avg_hours_per_day.toFixed(1)}h`}
              detail="Across admins, devs, testers"
            />
            <MetricTile
              label="Team avg days"
              value={`${data.team_summary.avg_work_days.toFixed(1)}`}
              detail="Work days this month"
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
        </CardContent>
      </Card>

      {(["admin", "developer", "tester"] as RoleKey[]).map((role) => (
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
