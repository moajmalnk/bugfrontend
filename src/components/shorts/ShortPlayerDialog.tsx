import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomShortPlayer } from "@/components/shorts/CustomShortPlayer";
import { SocialShortEmbed } from "@/components/shorts/SocialShortEmbed";
import { cn } from "@/lib/utils";
import {
  SHORT_CATEGORIES,
  resolveShortMediaUrl,
  type ShortItem,
} from "@/services/shortsService";
import { Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Link } from "react-router-dom";

interface ShortPlayerDialogProps {
  short: ShortItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ordered list for scroll / strip navigation */
  playlist?: ShortItem[];
  onNavigate?: (short: ShortItem) => void;
  /** Build shareable path for each short (used by thumbnail links). */
  shortPath?: (short: ShortItem) => string;
}

function categoryLabel(value: string) {
  return SHORT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

function shortPoster(item: ShortItem) {
  const custom = resolveShortMediaUrl(item.thumbnail_url || item.thumbnail_path);
  if (custom) return custom;
  const yt =
    item.youtube_id ||
    (item.source_type === "youtube" && item.source_url
      ? item.source_url.match(/(?:shorts\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1]
      : null);
  return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
}

function ShortSlideMedia({ item, active }: { item: ShortItem; active: boolean }) {
  const videoSrc = resolveShortMediaUrl(item.video_url || item.video_path);
  const thumb = shortPoster(item);
  const youtubeId = item.youtube_id || null;

  // Inactive = poster only (stops previous audio/video)
  if (!active) {
    return thumb ? (
      <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-neutral-950">
        <Play className="h-10 w-10 text-white/40" />
      </div>
    );
  }

  // YouTube: iframe embed is more reliable across scroll remounts than YT.Player API
  if (item.source_type === "youtube" && youtubeId) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <iframe
          key={`yt-embed-${youtubeId}`}
          title={item.title}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=0&controls=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=0`}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  if (item.source_type === "upload" && videoSrc) {
    return (
      <CustomShortPlayer
        key={`up-${item.id}-play`}
        mode="upload"
        videoSrc={videoSrc}
        poster={thumb}
        active={active}
        className="!mx-0 !max-h-none absolute inset-0 h-full w-full !aspect-auto"
      />
    );
  }

  if (
    item.source_url &&
    (item.source_type === "instagram" || item.source_type === "facebook")
  ) {
    return (
      <SocialShortEmbed
        key={`social-${item.id}-play`}
        sourceType={item.source_type}
        sourceUrl={item.source_url}
        embedUrl={item.embed_url}
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
      <Play className="h-10 w-10 opacity-50" />
      <p className="text-sm">Video unavailable</p>
    </div>
  );
}

export function ShortPlayerDialog({
  short,
  open,
  onOpenChange,
  playlist = [],
  onNavigate,
  shortPath,
}: ShortPlayerDialogProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  const lastReportedId = useRef<string | null>(null);
  /** When true, URL changed because of scroll — don't force-scroll the feed back. */
  const skipUrlScrollSync = useRef(false);
  const [playingId, setPlayingId] = useState<string | null>(short?.id ?? null);

  const list = useMemo(() => {
    if (!short) return [] as ShortItem[];
    return playlist.length > 0 ? playlist : [short];
  }, [playlist, short]);

  const activePlayId = playingId || short?.id || null;
  const playIndex = Math.max(
    0,
    list.findIndex((s) => s.id === activePlayId)
  );
  const total = list.length;

  const scrollToIndex = useCallback((idx: number, behavior: ScrollBehavior = "smooth") => {
    const feed = feedRef.current;
    if (!feed) return;
    const slide = feed.children[idx] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollIntoView({ behavior, block: "start" });
  }, []);

  const goToShort = useCallback(
    (item: ShortItem, opts?: { fromScroll?: boolean; scrollFeed?: boolean }) => {
      const fromScroll = !!opts?.fromScroll;
      const shouldScrollFeed = opts?.scrollFeed ?? !fromScroll;

      setPlayingId(item.id);
      lastReportedId.current = item.id;

      if (shouldScrollFeed) {
        const idx = list.findIndex((s) => s.id === item.id);
        if (idx >= 0) scrollToIndex(idx, "smooth");
      }

      if (onNavigate && item.id !== short?.id) {
        if (fromScroll) skipUrlScrollSync.current = true;
        onNavigate(item);
      }
    },
    [list, onNavigate, scrollToIndex, short?.id]
  );

  // Open / external URL change → sync local play + snap (unless change came from scroll)
  useEffect(() => {
    if (!open || !short) return;
    setPlayingId(short.id);
    lastReportedId.current = short.id;

    if (skipUrlScrollSync.current) {
      skipUrlScrollSync.current = false;
      return;
    }

    const idx = list.findIndex((s) => s.id === short.id);
    if (idx < 0) return;
    const id = window.requestAnimationFrame(() => scrollToIndex(idx, "auto"));
    return () => window.cancelAnimationFrame(id);
  }, [open, short?.id, list, scrollToIndex]);

  // Scroll snap → play next / pause previous (no scroll fight)
  useEffect(() => {
    if (!open || !feedRef.current || list.length < 2) return;
    const feed = feedRef.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let locked = false;

    const pickMostVisible = () => {
      if (locked) return;
      const feedRect = feed.getBoundingClientRect();
      let bestId: string | null = null;
      let bestRatio = 0;
      Array.from(feed.children).forEach((child) => {
        const el = child as HTMLElement;
        const rect = el.getBoundingClientRect();
        const visible =
          Math.min(rect.bottom, feedRect.bottom) - Math.max(rect.top, feedRect.top);
        const ratio = visible / Math.max(feedRect.height, 1);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = el.dataset.shortId || null;
        }
      });
      if (!bestId || bestRatio < 0.55) return;
      if (bestId === lastReportedId.current) return;
      const item = list.find((s) => s.id === bestId);
      if (!item) return;
      locked = true;
      goToShort(item, { fromScroll: true });
      window.setTimeout(() => {
        locked = false;
      }, 320);
    };

    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(pickMostVisible, 80);
    };

    feed.addEventListener("scroll", onScroll, { passive: true });
    feed.addEventListener("scrollend", pickMostVisible as EventListener);
    return () => {
      feed.removeEventListener("scroll", onScroll);
      feed.removeEventListener("scrollend", pickMostVisible as EventListener);
      if (timer) clearTimeout(timer);
    };
  }, [open, list, goToShort]);

  useEffect(() => {
    if (!open || list.length < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        const next = list[playIndex + 1];
        if (next) {
          e.preventDefault();
          goToShort(next);
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        const prev = list[playIndex - 1];
        if (prev) {
          e.preventDefault();
          goToShort(prev);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list, playIndex, goToShort]);

  useEffect(() => {
    if (!open || !activeThumbRef.current) return;
    activeThumbRef.current.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [open, activePlayId]);

  if (!short) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 overflow-hidden border-0 bg-black p-0 shadow-2xl",
          "fixed left-0 right-0 top-auto bottom-0 w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl",
          "h-[min(100dvh,100vh)] max-h-[100dvh]",
          "sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:h-[min(92dvh,920px)] sm:w-[min(100vw-2rem,26rem)]",
          "sm:max-h-[92vh] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-border/40"
        )}
      >
        <DialogTitle className="sr-only">{short.title}</DialogTitle>
        <DialogDescription className="sr-only">
          {categoryLabel(short.category)} · {short.source_type}
          {short.project_name ? ` · ${short.project_name}` : ""}
          {total > 1 ? ` · ${playIndex + 1} of ${total}` : ""}
          {total > 1 ? ". Scroll down for the next short." : ""}
        </DialogDescription>

        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 z-30 h-10 w-10 rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogClose>

        <div className="relative flex h-full min-h-0 flex-col bg-black">
          <div
            ref={feedRef}
            className="min-h-0 flex-1 touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {list.map((item, i) => {
              const active = item.id === activePlayId;
              return (
                <section
                  key={item.id}
                  data-short-id={item.id}
                  className="relative flex h-full min-h-full w-full shrink-0 snap-start snap-always flex-col"
                >
                  <div className="relative min-h-0 flex-1">
                    <ShortSlideMedia item={item} active={active} />
                  </div>

                  <div className="relative z-20 shrink-0 border-t border-white/10 bg-gradient-to-t from-black via-black/95 to-black/80 px-3 pb-2 pt-2.5 sm:px-4">
                    <div className="mx-auto w-full max-w-lg space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="rounded-full border-0 bg-white/15 text-[11px] font-medium text-white hover:bg-white/20">
                          {categoryLabel(item.category)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full border-white/25 text-[11px] capitalize text-white/85"
                        >
                          {item.source_type}
                        </Badge>
                        {item.project_name ? (
                          <span className="truncate text-[11px] text-white/60">
                            {item.project_name}
                          </span>
                        ) : null}
                        {total > 1 ? (
                          <span className="ml-auto text-[11px] tabular-nums text-white/50">
                            {i + 1} / {total}
                          </span>
                        ) : null}
                      </div>
                      <h2 className="text-base font-semibold leading-snug text-white sm:text-lg">
                        {item.title}
                      </h2>
                      {item.description ? (
                        <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                          {item.description}
                        </p>
                      ) : null}
                      {total > 1 && i < total - 1 ? (
                        <p className="text-[10px] text-white/40">Scroll down for next</p>
                      ) : null}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {onNavigate && total > 1 ? (
            <div className="relative z-20 shrink-0 border-t border-white/10 bg-black px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
              <div
                className="-mx-1 flex gap-2 overflow-x-auto px-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.25)_transparent]"
                role="listbox"
                aria-label="Shorts playlist"
              >
                {list.map((item, i) => {
                  const poster = shortPoster(item);
                  const active = item.id === activePlayId;
                  const href = shortPath?.(item);
                  const className = cn(
                    "group relative h-[4.75rem] w-[3.35rem] shrink-0 overflow-hidden rounded-lg border outline-none transition",
                    active
                      ? "border-primary ring-2 ring-primary/60"
                      : "border-white/15 opacity-75 hover:opacity-100"
                  );
                  const body = (
                    <>
                      {poster ? (
                        <img
                          src={poster}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/10">
                          <Play className="h-4 w-4 text-white/70" />
                        </div>
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-3 text-center text-[9px] font-medium tabular-nums text-white">
                        {i + 1}
                      </span>
                    </>
                  );

                  if (href) {
                    return (
                      <Link
                        key={item.id}
                        ref={active ? (activeThumbRef as Ref<HTMLAnchorElement>) : undefined}
                        to={href}
                        replace
                        role="option"
                        aria-selected={active}
                        aria-label={`${i + 1}. ${item.title}`}
                        className={className}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!active) goToShort(item);
                        }}
                      >
                        {body}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      ref={active ? (activeThumbRef as Ref<HTMLButtonElement>) : undefined}
                      type="button"
                      role="option"
                      aria-selected={active}
                      aria-label={`${i + 1}. ${item.title}`}
                      onClick={() => {
                        if (!active) goToShort(item);
                      }}
                      className={className}
                    >
                      {body}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
