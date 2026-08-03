import { cn } from "@/lib/utils";
import { User } from "@/types";
import { Activity, Clock, Trophy } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const TOP_N = 5;

function formatHours(hours?: number | null): string {
  const value = Number(hours || 0);
  if (!Number.isFinite(value) || value <= 0) return "0h";
  return Number.isInteger(value) ? `${value}h` : `${value.toFixed(1)}h`;
}

function roleLabel(role?: string | null): string {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "developer") return "Developer";
  if (r === "tester") return "Tester";
  return role ? String(role) : "User";
}

function rankTone(rank: number): string {
  if (rank === 1) {
    return "bg-amber-500 text-white shadow-amber-500/30";
  }
  if (rank === 2) {
    return "bg-slate-400 text-white shadow-slate-400/25";
  }
  if (rank === 3) {
    return "bg-orange-700 text-white shadow-orange-700/25";
  }
  return "bg-muted text-muted-foreground";
}

type UsersTopLeaderboardsProps = {
  users: User[];
  rolePath: string;
  listFromState?: unknown;
  className?: string;
};

export function UsersTopLeaderboards({
  users,
  rolePath,
  listFromState,
  className,
}: UsersTopLeaderboardsProps) {
  const navigate = useNavigate();

  const topActive = useMemo(() => {
    return users
      .filter((u) => u.status === "active" || u.status === "idle")
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;
        const hoursDiff =
          Number(b.today_hours_worked || 0) - Number(a.today_hours_worked || 0);
        if (hoursDiff !== 0) return hoursDiff;
        return String(a.username || "").localeCompare(
          String(b.username || ""),
          undefined,
          { sensitivity: "base" }
        );
      })
      .slice(0, TOP_N);
  }, [users]);

  const topHours = useMemo(() => {
    return users
      .filter(
        (u) => Number(u.today_hours_worked || 0) > 0 || Boolean(u.checked_in_today)
      )
      .sort((a, b) => {
        const hoursDiff =
          Number(b.today_hours_worked || 0) - Number(a.today_hours_worked || 0);
        if (hoursDiff !== 0) return hoursDiff;
        return String(a.username || "").localeCompare(
          String(b.username || ""),
          undefined,
          { sensitivity: "base" }
        );
      })
      .slice(0, TOP_N);
  }, [users]);

  const openUser = (userId: string) => {
    navigate(`/${rolePath}/users/${userId}`, { state: listFromState });
  };

  const renderRow = (
    user: User,
    rank: number,
    metric: ReactNode,
    accent: "emerald" | "blue"
  ) => {
    const initials = String(user.username || user.name || "?")
      .slice(0, 2)
      .toUpperCase();
    const isLive = user.status === "active";

    return (
      <button
        key={`${accent}-${user.id}`}
        type="button"
        onClick={() => openUser(user.id)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all duration-200",
          "hover:border-border/60 hover:bg-muted/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
      >
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm",
            rankTone(rank)
          )}
        >
          {rank}
        </span>

        <div className="relative shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-background"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-semibold text-white ring-2 ring-background">
              {initials}
            </div>
          )}
          {isLive ? (
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {user.username || user.name}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {roleLabel(user.role)}
            {user.status ? (
              <>
                <span className="mx-1 opacity-40">·</span>
                <span
                  className={cn(
                    "capitalize",
                    user.status === "active" && "text-emerald-600 dark:text-emerald-400",
                    user.status === "idle" && "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {user.status}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums",
            accent === "emerald"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
          )}
        >
          {metric}
        </div>
      </button>
    );
  };

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5", className)}>
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/70 via-transparent to-teal-50/40 dark:from-emerald-950/30 dark:via-transparent dark:to-teal-950/20" />
        <div className="relative p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2 text-white shadow-md shadow-emerald-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    Top Active
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Online now — ranked by presence & hours
                  </p>
                </div>
              </div>
            </div>
            <Trophy className="h-4 w-4 text-emerald-600/70 dark:text-emerald-400/70 shrink-0 mt-1" />
          </div>

          {topActive.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No one is online right now.
            </div>
          ) : (
            <div className="space-y-1">
              {topActive.map((user, index) =>
                renderRow(
                  user,
                  index + 1,
                  formatHours(user.today_hours_worked),
                  "emerald"
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-blue-200/50 dark:border-blue-800/40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/70 via-transparent to-indigo-50/40 dark:from-blue-950/30 dark:via-transparent dark:to-indigo-950/20" />
        <div className="relative p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white shadow-md shadow-blue-500/20">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-foreground">
                    Top Hours Worked
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Today&apos;s longest work sessions
                  </p>
                </div>
              </div>
            </div>
            <Trophy className="h-4 w-4 text-blue-600/70 dark:text-blue-400/70 shrink-0 mt-1" />
          </div>

          {topHours.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No work hours logged yet today.
            </div>
          ) : (
            <div className="space-y-1">
              {topHours.map((user, index) =>
                renderRow(
                  user,
                  index + 1,
                  formatHours(user.today_hours_worked),
                  "blue"
                )
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
