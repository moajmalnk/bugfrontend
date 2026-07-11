import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ActiveUserActivityDialog } from "@/components/users/ActiveUserActivityDialog";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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

function StatusCard({ user, onClick }: { user: User; onClick: () => void }) {
  const name = user.username || user.name || "User";
  const avatar =
    user.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`;
  const checkInLabel = formatCheckInTime(user.check_in_time);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-40 w-[6.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/60",
        "bg-gradient-to-b from-primary/25 via-card to-card text-left shadow-sm outline-none",
        "transition-[border-color,box-shadow,filter] hover:border-border hover:brightness-110",
        "focus-visible:border-primary/50 focus-visible:ring-0"
      )}
      aria-label={`View activity for ${name}`}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${avatar})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(10px) saturate(1.1)",
          transform: "scale(1.2)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/90" />

      <div className="relative z-10 flex h-full flex-col p-2.5">
        <div
          className={cn(
            "h-9 w-9 overflow-hidden rounded-full ring-2 ring-offset-1 ring-offset-background",
            presenceRing(user.status)
          )}
        >
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        </div>

        <div className="mt-auto min-w-0">
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

  return (
    <>
      <div className="shrink-0 border-b bg-background/95 px-3 py-2.5 backdrop-blur-sm md:px-4">

        <Carousel
          setApi={setCarouselApi}
          opts={{
            align: "start",
            dragFree: true,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {checkedInUsers.map((user) => (
              <CarouselItem key={user.id} className="basis-auto pl-2">
                <StatusCard
                  user={user}
                  onClick={() => {
                    setSelectedUser(user);
                    setDialogOpen(true);
                  }}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {canScrollPrev ? (
            <CarouselPrevious className="left-0 hidden h-7 w-7 border bg-background/90 sm:flex" />
          ) : null}
          {canScrollNext ? (
            <CarouselNext className="right-0 hidden h-7 w-7 border bg-background/90 sm:flex" />
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
