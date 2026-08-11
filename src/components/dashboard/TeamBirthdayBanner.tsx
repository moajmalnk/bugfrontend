import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { UserAvatar } from "@/components/users/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import {
  getIstTodayYmd,
  useTodaysBirthdays,
} from "@/hooks/useTodaysBirthdays";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { cn, getEffectiveRole } from "@/lib/utils";
import { userService, type BirthdayPerson } from "@/services/userService";
import { useQueryClient } from "@tanstack/react-query";
import {
  Cake,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  PartyPopper,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const COLLAPSE_KEY_PREFIX = "br-birthday-banner-collapsed:";

function collapseStorageKey(date: string): string {
  return `${COLLAPSE_KEY_PREFIX}${date}`;
}

function readCollapsed(date: string): boolean {
  try {
    return localStorage.getItem(collapseStorageKey(date)) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(date: string, collapsed: boolean) {
  try {
    if (collapsed) {
      localStorage.setItem(collapseStorageKey(date), "1");
    } else {
      localStorage.removeItem(collapseStorageKey(date));
    }
  } catch {
    // ignore
  }
}

function formatSubtitle(person: BirthdayPerson): string {
  return [person.job_title, person.department, person.role]
    .map((p) => (p || "").trim())
    .filter(Boolean)
    .join(" · ");
}

function personHasPhoto(avatar?: string | null): boolean {
  const raw = (avatar || "").trim();
  return raw !== "" && !/^https?:\/\/ui-avatars\.com\//i.test(raw);
}

function Balloon({
  className,
  colorClass,
  size = "md",
  delayMs,
}: {
  className?: string;
  colorClass: string;
  size?: "sm" | "md" | "lg";
  delayMs: number;
}) {
  const sizeClass =
    size === "lg" ? "h-10 w-7" : size === "sm" ? "h-5 w-3.5" : "h-8 w-6";
  const stringClass = size === "lg" ? "h-8" : size === "sm" ? "h-4" : "h-6";

  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[1] flex flex-col items-center",
        className
      )}
    >
      <span
        className={cn(
          "block rounded-[50%] shadow-md opacity-90",
          "animate-[br-balloon-float_4.8s_ease-in-out_infinite]",
          sizeClass,
          colorClass
        )}
        style={{ animationDelay: `${delayMs}ms` }}
      />
      <span className={cn("mt-0.5 w-px bg-border/70", stringClass)} />
    </span>
  );
}

function FairBunting() {
  const flags = [
    "bg-rose-400/80",
    "bg-amber-400/80",
    "bg-sky-400/80",
    "bg-emerald-400/70",
    "bg-violet-400/70",
    "bg-rose-400/80",
    "bg-amber-400/80",
    "bg-sky-400/80",
  ];
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-4 top-2 flex items-start justify-center gap-1.5 sm:inset-x-8"
    >
      <div className="absolute inset-x-0 top-1 h-px bg-border/50" />
      {flags.map((tone, i) => (
        <span
          key={i}
          className={cn(
            "mt-1 h-3 w-2.5 shrink-0 opacity-80",
            "[clip-path:polygon(0_0,100%_0,50%_100%)]",
            tone
          )}
        />
      ))}
    </div>
  );
}

/** Square profile photo (matches /profile) framed for the birthday fair. */
function CelebrantPortrait({
  person,
  featured,
}: {
  person: BirthdayPerson;
  featured?: boolean;
}) {
  const photo = personHasPhoto(person.avatar)
    ? resolveAvatarUrl(person.avatar, person.username)
    : null;

  return (
    <div className={cn("relative shrink-0", featured && "mx-auto sm:mx-0")}>
      {featured ? (
        <>
          <Balloon
            className="-left-7 top-1 sm:-left-10"
            colorClass="bg-rose-400 dark:bg-rose-500/90"
            size="lg"
            delayMs={0}
          />
          <Balloon
            className="-left-2 top-12 sm:-left-4"
            colorClass="bg-amber-400 dark:bg-amber-500/90"
            size="sm"
            delayMs={600}
          />
          <Balloon
            className="-right-7 top-0 sm:-right-10"
            colorClass="bg-sky-400 dark:bg-sky-500/90"
            size="lg"
            delayMs={300}
          />
          <Balloon
            className="-right-1 top-12 sm:-right-3"
            colorClass="bg-violet-400 dark:bg-violet-500/80"
            size="sm"
            delayMs={1100}
          />
        </>
      ) : null}
      <div
        className={cn(
          "relative rounded-2xl p-[3px]",
          "bg-gradient-to-br from-rose-400/80 via-amber-300/55 to-sky-400/70",
          "shadow-md"
        )}
      >
        <div
          className={cn(
            "overflow-hidden rounded-[13px] bg-muted ring-1 ring-border/40",
            featured
              ? "h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36"
              : "h-16 w-16"
          )}
        >
          {photo ? (
            <img
              src={photo}
              alt={`${person.username} profile photo`}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-500 to-slate-700 text-2xl font-semibold text-white">
              {person.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background shadow-sm">
        <Cake className="h-4 w-4 text-rose-500" />
      </span>
    </div>
  );
}

/**
 * Why: Full-day sticky birthday fair on dashboards / profile —
 * large square photo, light bunting + balloons, Wish engagement.
 */
export function TeamBirthdayBanner({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = getEffectiveRole(currentUser || {});
  const queryClient = useQueryClient();
  const istDate = getIstTodayYmd();
  const { data, isLoading, isError } = useTodaysBirthdays(true);
  const birthdays = data?.birthdays ?? [];
  const dateKey = data?.date || istDate;

  const [collapsed, setCollapsed] = useState(() => readCollapsed(istDate));
  const [wishingId, setWishingId] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(readCollapsed(dateKey));
  }, [dateKey]);

  const featured = birthdays[0] ?? null;

  const headline = useMemo(() => {
    if (birthdays.length === 0) return "";
    if (birthdays.length === 1) {
      const person = birthdays[0];
      if (person.is_self) return `Happy birthday, ${person.username}!`;
      return `Celebrating ${person.username} today`;
    }
    if (birthdays.length === 2) {
      return `Celebrating ${birthdays[0].username} & ${birthdays[1].username}`;
    }
    return `Celebrating ${birthdays.length} teammates today`;
  }, [birthdays]);

  const wishTargets = useMemo(
    () => birthdays.filter((p) => !p.is_self),
    [birthdays]
  );

  const setCollapsedPersist = (next: boolean) => {
    setCollapsed(next);
    writeCollapsed(dateKey, next);
  };

  const openProfile = (person: BirthdayPerson) => {
    if (person.is_self) {
      navigate(`/${role}/profile`);
      return;
    }
    if (role === "admin") {
      navigate(`/${role}/users/${person.id}`);
    }
  };

  const handleWish = async (person: BirthdayPerson) => {
    if (person.is_self || wishingId) return;
    if (person.already_wished) {
      toast({
        title: "Already wished",
        description: `You already wished ${person.username} today.`,
      });
      return;
    }

    setWishingId(person.id);
    try {
      await userService.sendBirthdayWish(person.id);
      await queryClient.invalidateQueries({
        queryKey: ["todays-birthdays", dateKey],
      });
      toast({
        title: "Wish sent",
        description: `${person.username} will see your birthday wish.`,
      });
    } catch (err) {
      toast({
        title: "Could not send wish",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWishingId(null);
    }
  };

  if (isError) return null;
  if (isLoading && birthdays.length === 0) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border/60 bg-card/80 p-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }
  if (birthdays.length === 0) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsedPersist(false)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-2xl border border-rose-500/25",
          "bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent",
          "px-3 py-2.5 text-left transition-colors hover:bg-rose-500/15",
          className
        )}
        aria-label="Expand birthday celebration"
      >
        <div className="flex -space-x-2">
          {birthdays.slice(0, 3).map((person) => (
            <UserAvatar
              key={person.id}
              name={person.username}
              avatar={person.avatar}
              size="sm"
              className="ring-2 ring-background"
            />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            Birthdays today
          </p>
          <p className="truncate text-xs text-muted-foreground">{headline}</p>
        </div>
        <PartyPopper className="h-4 w-4 shrink-0 text-rose-500/80" />
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rose-500/30",
        "bg-gradient-to-br from-rose-500/[0.12] via-background to-amber-500/[0.10]",
        "shadow-sm",
        className
      )}
    >
      <style>{`
        @keyframes br-balloon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <FairBunting />

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-16 h-40 w-56 -translate-x-1/2 rounded-full bg-rose-400/10 blur-3xl sm:left-24 sm:translate-x-0"
      />

      <div className="relative grid grid-cols-12 gap-5 px-4 pb-4 pt-8 sm:gap-6 sm:px-6 sm:pb-5 sm:pt-9">
        <div className="col-span-12 flex flex-col items-center gap-4 sm:col-span-4 sm:items-start">
          {birthdays.length === 1 && featured ? (
            <CelebrantPortrait person={featured} featured />
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
              {birthdays.slice(0, 4).map((person) => (
                <CelebrantPortrait
                  key={person.id}
                  person={person}
                  featured={person.id === featured?.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="col-span-12 flex min-w-0 flex-col justify-center gap-3 text-center sm:col-span-5 sm:text-left">
          <div className="inline-flex items-center justify-center gap-1.5 self-center rounded-xl border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 sm:self-start">
            <PartyPopper className="h-3 w-3" />
            Birthday fair · today
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {headline}
            </h2>
            {birthdays.length === 1 && featured ? (
              <p className="text-sm capitalize text-muted-foreground">
                {formatSubtitle(featured)}
              </p>
            ) : null}
          </div>
          {birthdays.length > 1 ? (
            <ul className="flex flex-col gap-2">
              {birthdays.map((person) => (
                <li
                  key={person.id}
                  className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm sm:justify-start"
                >
                  <UserAvatar
                    name={person.username}
                    avatar={person.avatar}
                    size="sm"
                  />
                  <span className="font-medium text-foreground">
                    {person.username}
                    {person.is_self ? " (you)" : ""}
                  </span>
                  {formatSubtitle(person) ? (
                    <span className="truncate text-muted-foreground">
                      · {formatSubtitle(person)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Team celebration stays visible all day.
          </p>
        </div>

        <div className="col-span-12 flex flex-col items-stretch justify-center gap-2 sm:col-span-3 sm:items-end">
          {featured && (featured.is_self || role === "admin") ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => openProfile(featured)}
            >
              <UserRound className="mr-1.5 h-3.5 w-3.5" />
              {featured.is_self ? "Open profile" : "View profile"}
            </Button>
          ) : null}
          {wishTargets.map((person) => {
            const busy = wishingId === person.id;
            const done = Boolean(person.already_wished);
            return (
              <Button
                key={person.id}
                type="button"
                size="sm"
                disabled={busy || done || wishingId !== null}
                className={cn(
                  "rounded-xl",
                  done
                    ? "border border-border bg-muted/40 text-muted-foreground hover:bg-muted/40"
                    : "bg-rose-600 text-white hover:bg-rose-600/90"
                )}
                onClick={() => void handleWish(person)}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Heart
                    className={cn("mr-1.5 h-3.5 w-3.5", done && "fill-current")}
                  />
                )}
                {done
                  ? wishTargets.length > 1
                    ? `Wished ${person.username}`
                    : "Wished"
                  : wishTargets.length > 1
                    ? `Wish ${person.username}`
                    : "Send wish"}
              </Button>
            );
          })}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-muted-foreground"
            onClick={() => setCollapsedPersist(true)}
          >
            <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
            Collapse
          </Button>
        </div>
      </div>
    </div>
  );
}
