import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { shortsService, resolveShortMediaUrl, type ShortItem } from "@/services/shortsService";
import { prefetchYouTubeApi } from "@/components/shorts/CustomShortPlayer";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn, getEffectiveRole } from "@/lib/utils";

/** Compact stripe card — same footprint as active-users WhatsApp cards */
function ShortStripeCard({ short, onClick }: { short: ShortItem; onClick: () => void }) {
  const customThumb = resolveShortMediaUrl(short.thumbnail_url || short.thumbnail_path);
  const ytId =
    short.youtube_id ||
    (short.source_type === "youtube" && short.source_url
      ? short.source_url.match(/(?:shorts\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1]
      : null);
  const thumb = customThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);

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
      aria-label={`Play ${short.title}`}
    >
      {thumb ? (
        <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-primary/30 to-card">
          <Play className="h-7 w-7 text-foreground/60" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />

      <div className="relative z-10 flex h-full flex-col p-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white ring-2 ring-white/30 backdrop-blur-sm">
          <Clapperboard className="h-3.5 w-3.5" />
        </span>
        <div className="mt-auto min-w-0 space-y-0.5">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white">
            {short.title}
          </p>
          <p className="truncate text-[10px] capitalize text-white/70">{short.source_type}</p>
        </div>
      </div>
    </button>
  );
}

export function AdminShortsStrip() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rolePath = getEffectiveRole(currentUser || { role: "admin" });
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Hide on Shorts management page and Users (users page shows active-users strip instead)
  const onShortsPage = /\/shorts(\/|$)/.test(pathname);
  const onUsersPage = /\/users(\/|$)/.test(pathname);

  const { data: shorts = [] } = useQuery({
    queryKey: ["shorts", "published-strip"],
    queryFn: () => shortsService.list({ published: true }),
    refetchInterval: 120_000,
    staleTime: 60_000,
    enabled: !onShortsPage && !onUsersPage,
  });

  useEffect(() => {
    prefetchYouTubeApi();
  }, []);

  useEffect(() => {
    shorts.forEach((s) => {
      const url = resolveShortMediaUrl(s.thumbnail_url || s.thumbnail_path);
      const yt =
        s.youtube_id ||
        (s.source_type === "youtube" && s.source_url
          ? s.source_url.match(/(?:shorts\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1]
          : null);
      const poster = url || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null);
      if (poster) {
        const img = new Image();
        img.src = poster;
      }
    });
  }, [shorts]);

  useEffect(() => {
    if (!carouselApi) return;
    const sync = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };
    sync();
    carouselApi.on("select", sync);
    carouselApi.on("reInit", sync);
    carouselApi.on("resize", sync);
    return () => {
      carouselApi.off("select", sync);
      carouselApi.off("reInit", sync);
      carouselApi.off("resize", sync);
    };
  }, [carouselApi]);

  useEffect(() => {
    carouselApi?.reInit();
  }, [carouselApi, shorts.length]);

  if (onShortsPage || onUsersPage || shorts.length === 0) {
    return null;
  }

  return (
    <div className="shrink-0 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-sm md:px-4 md:py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Clapperboard className="h-3.5 w-3.5 text-primary" />
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            Shorts · {shorts.length}
          </p>
        </div>
        <Link
          to={`/${rolePath}/shorts`}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          Open page
        </Link>
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
          {shorts.map((short) => (
            <CarouselItem key={short.id} className="basis-auto pl-2.5 md:pl-3">
              <ShortStripeCard
                short={short}
                onClick={() => {
                  const tab = short.category || "all";
                  const qs = tab !== "all" ? `?tab=${encodeURIComponent(tab)}` : "";
                  navigate(`/${rolePath}/shorts/${short.id}${qs}`);
                }}
              />
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
  );
}
