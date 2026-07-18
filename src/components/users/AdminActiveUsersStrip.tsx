import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ActiveUserActivityDialog } from "@/components/users/ActiveUserActivityDialog";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, UserCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const ACTIVE_USERS_STRIP_HIDDEN_KEY = "bugricer_admin_active_users_strip_hidden";

function formatCheckInTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : value.replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T"));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function presenceRing(status?: User["status"]) {
  if (status === "active") return "ring-emerald-500";
  if (status === "idle") return "ring-amber-500";
  return "ring-muted-foreground/40";
}

function presenceSortRank(status?: User["status"]) {
  if (status === "active") return 0;
  if (status === "idle") return 1;
  return 2;
}

function getUserDisplay(user: User) {
  const name = user.username || user.name || "User";
  const avatar =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  return { name, avatar, checkInLabel: formatCheckInTime(user.check_in_time) };
}

/** Instagram-style circular story avatar — mobile only */
function InstagramStoryAvatar({ user, onClick }: { user: User; onClick: () => void }) {
  const { name, avatar, checkInLabel } = getUserDisplay(user);
  const isLive = user.status === "active" || user.status === "idle";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 outline-none"
      aria-label={`View activity for ${name}`}
    >
      <div
        className={cn(
          "rounded-full p-[2.5px] transition-opacity group-hover:opacity-90",
          isLive
            ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600"
            : "bg-muted-foreground/35"
        )}
      >
        <div className="rounded-full bg-background p-[2px]">
          <img
            src={avatar}
            alt=""
            className="h-[3.65rem] w-[3.65rem] rounded-full object-cover"
          />
        </div>
      </div>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground">{name}</p>
        {checkInLabel ? (
          <p className="truncate text-[10px] leading-tight text-muted-foreground">{checkInLabel}</p>
        ) : null}
      </div>
    </button>
  );
}

/** WhatsApp-style tall status card — tablet & desktop */
function WhatsAppStatusCard({ user, onClick }: { user: User; onClick: () => void }) {
  const { name, avatar, checkInLabel } = getUserDisplay(user);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-[10.5rem] w-[6.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/50",
        "bg-gradient-to-b from-primary/20 via-card to-card text-left shadow-sm outline-none",
        "transition-[border-color,filter] hover:border-border hover:brightness-[1.06]",
        "focus-visible:border-primary/40"
      )}
      aria-label={`View activity for ${name}`}
    >
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage: `url(${avatar})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(12px) saturate(1.15)",
          transform: "scale(1.25)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/45 to-background/95" />

      <div className="relative z-10 flex h-full flex-col p-2.5">
        <div
          className={cn(
            "h-9 w-9 overflow-hidden rounded-full ring-2 ring-offset-1 ring-offset-background",
            presenceRing(user.status)
          )}
        >
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="mt-auto min-w-0 space-y-0.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-foreground">
            {name}
          </p>
          {checkInLabel ? (
            <p className="truncate text-[10px] text-muted-foreground">{checkInLabel}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function AdminActiveUsersStrip() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [hidden, setHidden] = useState(
    () => localStorage.getItem(ACTIVE_USERS_STRIP_HIDDEN_KEY) === "true"
  );

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["admin-active-users-strip"],
    queryFn: () => userService.getUsers(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const checkedInUsers = useMemo(() => {
    return users
      .filter((u) => u.checked_in_today)
      .sort((a, b) => {
        const rank = presenceSortRank(a.status) - presenceSortRank(b.status);
        if (rank !== 0) return rank;
        const aTime = a.check_in_time ? new Date(a.check_in_time).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.check_in_time ? new Date(b.check_in_time).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
  }, [users]);

  useEffect(() => {
    const syncHidden = () => {
      setHidden(localStorage.getItem(ACTIVE_USERS_STRIP_HIDDEN_KEY) === "true");
    };
    window.addEventListener("storage", syncHidden);
    return () => window.removeEventListener("storage", syncHidden);
  }, []);

  const hideStrip = () => {
    localStorage.setItem(ACTIVE_USERS_STRIP_HIDDEN_KEY, "true");
    setHidden(true);
  };

  const showStrip = () => {
    localStorage.removeItem(ACTIVE_USERS_STRIP_HIDDEN_KEY);
    setHidden(false);
  };

  useEffect(() => {
    if (!carouselApi) return;

    const syncScrollState = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    syncScrollState();
    carouselApi.on("select", syncScrollState);
    carouselApi.on("reInit", syncScrollState);
    carouselApi.on("resize", syncScrollState);

    return () => {
      carouselApi.off("select", syncScrollState);
      carouselApi.off("reInit", syncScrollState);
      carouselApi.off("resize", syncScrollState);
    };
  }, [carouselApi]);

  useEffect(() => {
    carouselApi?.reInit();
  }, [carouselApi, checkedInUsers.length]);

  if (checkedInUsers.length === 0) {
    return null;
  }

  const openUser = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  if (hidden) {
    return (
      <div className="shrink-0 border-b border-border/50 bg-background/95 px-3 py-1.5 backdrop-blur-sm md:px-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={showStrip}
            className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" />
            Show Active · {checkedInUsers.length}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="shrink-0 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-sm md:px-4 md:py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              Active today · {checkedInUsers.length}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={hideStrip}
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            aria-label="Hide active users strip"
            title="Hide active users strip"
          >
            <EyeOff className="h-3.5 w-3.5" />
            Hide
          </Button>
        </div>

        <Carousel
          setApi={setCarouselApi}
          opts={{
            align: "start",
            dragFree: true,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2.5 md:-ml-3">
            {checkedInUsers.map((user) => (
              <CarouselItem key={user.id} className="basis-auto pl-2.5 md:pl-3">
                {/* Mobile: Instagram stories */}
                <div className="md:hidden">
                  <InstagramStoryAvatar user={user} onClick={() => openUser(user)} />
                </div>
                {/* Tablet & desktop: WhatsApp status cards */}
                <div className="hidden md:block">
                  <WhatsAppStatusCard user={user} onClick={() => openUser(user)} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {canScrollPrev ? (
            <CarouselPrevious className="left-0 hidden h-8 w-8 border bg-background/95 shadow-sm md:flex" />
          ) : null}
          {canScrollNext ? (
            <CarouselNext className="right-0 hidden h-8 w-8 border bg-background/95 shadow-sm md:flex" />
          ) : null}
        </Carousel>
      </div>

      <ActiveUserActivityDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedUser(null);
        }}
      />
    </>
  );
}
