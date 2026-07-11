import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
  getPlayerState: () => number;
};

function isYouTubePlayerReady(): boolean {
  return typeof window !== "undefined" && typeof window.YT?.Player === "function";
}

let ytApiPromise: Promise<boolean> | null = null;

function loadYouTubeApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (isYouTubePlayerReady()) return Promise.resolve(true);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (!ok) ytApiPromise = null; // allow retry after failure
      resolve(ok);
    };

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        /* ignore */
      }
      // Player can lag slightly after the callback
      const started = Date.now();
      const waitReady = window.setInterval(() => {
        if (isYouTubePlayerReady()) {
          window.clearInterval(waitReady);
          finish(true);
        } else if (Date.now() - started > 3000) {
          window.clearInterval(waitReady);
          finish(isYouTubePlayerReady());
        }
      }, 40);
    };

    let script = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finish(false);
      document.head.appendChild(script);
    }

    const started = Date.now();
    const poll = window.setInterval(() => {
      if (isYouTubePlayerReady()) {
        window.clearInterval(poll);
        finish(true);
      } else if (Date.now() - started > 10000) {
        window.clearInterval(poll);
        finish(false);
      }
    }, 50);
  });

  return ytApiPromise;
}

/** Prefetch YouTube IFrame API so the player opens without waiting. */
export function prefetchYouTubeApi() {
  void loadYouTubeApi();
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface CustomShortPlayerProps {
  mode: "youtube" | "upload";
  youtubeId?: string | null;
  videoSrc?: string | null;
  poster?: string | null;
  /** When false, pause immediately (e.g. scrolled away). */
  active?: boolean;
  className?: string;
}

export function CustomShortPlayer({
  mode,
  youtubeId,
  videoSrc,
  poster,
  active = true,
  className,
}: CustomShortPlayerProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [ytFallback, setYtFallback] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  }, []);

  const stopTicker = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const tick = useCallback(() => {
    if (mode === "upload" && videoRef.current) {
      setCurrent(videoRef.current.currentTime || 0);
      setDuration(videoRef.current.duration || 0);
    } else if (mode === "youtube" && ytPlayerRef.current) {
      try {
        setCurrent(ytPlayerRef.current.getCurrentTime() || 0);
        setDuration(ytPlayerRef.current.getDuration() || 0);
      } catch {
        /* player not ready */
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [mode]);

  const startTicker = useCallback(() => {
    stopTicker();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    let cancelled = false;
    setShowPoster(true);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setYtFallback(false);

    if (mode === "youtube" && youtubeId && ytHostRef.current) {
      loadYouTubeApi().then((ok) => {
        if (cancelled) return;
        if (!ok || !isYouTubePlayerReady() || !ytHostRef.current) {
          setYtFallback(true);
          setShowPoster(false);
          setPlaying(true);
          return;
        }
        try {
          ytPlayerRef.current?.destroy();
        } catch {
          /* ignore */
        }
        try {
          ytPlayerRef.current = new window.YT!.Player(ytHostRef.current, {
            videoId: youtubeId,
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              origin: window.location.origin,
            },
            events: {
              onReady: (e) => {
                if (cancelled) return;
                try {
                  e.target.playVideo();
                  setDuration(e.target.getDuration() || 0);
                } catch {
                  /* ignore */
                }
                startTicker();
                bumpControls();
              },
              onStateChange: (e) => {
                if (!window.YT?.PlayerState) return;
                const playingNow = e.data === window.YT.PlayerState.PLAYING;
                setPlaying(playingNow);
                if (playingNow) {
                  setShowPoster(false);
                  startTicker();
                }
                if (e.data === window.YT.PlayerState.ENDED) {
                  setPlaying(false);
                  stopTicker();
                  setControlsVisible(true);
                }
              },
              onError: () => {
                if (!cancelled) {
                  setYtFallback(true);
                  setShowPoster(false);
                  setPlaying(true);
                }
              },
            },
          });
        } catch {
          if (!cancelled) {
            setYtFallback(true);
            setShowPoster(false);
            setPlaying(true);
          }
        }
      });
    }

    return () => {
      cancelled = true;
      stopTicker();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, [mode, youtubeId, startTicker, bumpControls]);

  useEffect(() => {
    if (mode !== "upload") return;
    const el = videoRef.current;
    if (!el) return;
    setShowPoster(true);
    const onPlay = () => {
      setPlaying(true);
      setShowPoster(false);
      startTicker();
      bumpControls();
    };
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
    };
    const onLoaded = () => {
      setDuration(el.duration || 0);
    };
    const onEnded = () => {
      setPlaying(false);
      stopTicker();
      setControlsVisible(true);
    };
    const onPlaying = () => setShowPoster(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("pause", onPause);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    void el.play().then(() => setShowPoster(false)).catch(() => setPlaying(false));
    startTicker();
    bumpControls();
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
      stopTicker();
    };
  }, [mode, videoSrc, startTicker, bumpControls]);

  // Pause previous / play current when scroll changes active slide
  useEffect(() => {
    if (mode === "upload" && videoRef.current) {
      if (active) {
        void videoRef.current.play().then(() => setShowPoster(false)).catch(() => undefined);
      } else {
        videoRef.current.pause();
        setPlaying(false);
        setShowPoster(true);
        stopTicker();
      }
      return;
    }
    if (mode === "youtube" && ytPlayerRef.current) {
      try {
        if (active) {
          ytPlayerRef.current.playVideo();
          startTicker();
          bumpControls();
        } else {
          ytPlayerRef.current.pauseVideo();
          setPlaying(false);
          setShowPoster(true);
          stopTicker();
        }
      } catch {
        /* player not ready */
      }
    }
  }, [active, mode, startTicker, bumpControls]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const togglePlay = () => {
    bumpControls();
    if (mode === "upload" && videoRef.current) {
      if (videoRef.current.paused) void videoRef.current.play();
      else videoRef.current.pause();
      return;
    }
    if (mode === "youtube" && ytPlayerRef.current && window.YT) {
      const state = ytPlayerRef.current.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) ytPlayerRef.current.pauseVideo();
      else ytPlayerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    bumpControls();
    if (mode === "upload" && videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
      return;
    }
    if (mode === "youtube" && ytPlayerRef.current) {
      if (ytPlayerRef.current.isMuted()) {
        ytPlayerRef.current.unMute();
        setMuted(false);
      } else {
        ytPlayerRef.current.mute();
        setMuted(true);
      }
    }
  };

  const seek = (ratio: number) => {
    bumpControls();
    const next = Math.max(0, Math.min(1, ratio)) * (duration || 0);
    if (mode === "upload" && videoRef.current) {
      videoRef.current.currentTime = next;
      setCurrent(next);
      return;
    }
    if (mode === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(next, true);
      setCurrent(next);
    }
  };

  const toggleFullscreen = async () => {
    bumpControls();
    const el = shellRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;
  const posterUrl =
    poster ||
    (mode === "youtube" && youtubeId
      ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
      : null);

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative mx-auto aspect-[9/16] w-full max-h-[70vh] overflow-hidden bg-black select-none touch-pan-y",
        className
      )}
      onMouseMove={bumpControls}
      onTouchStart={bumpControls}
    >
      {mode === "youtube" && youtubeId ? (
        ytFallback ? (
          <iframe
            key={`yt-fallback-${youtubeId}-${active ? "on" : "off"}`}
            title="YouTube short"
            src={
              active
                ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=0&controls=0&playsinline=1&rel=0&modestbranding=1&loop=0`
                : undefined
            }
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-150",
              showPoster ? "opacity-0" : "opacity-100"
            )}
          >
            {/* Scale slightly to crop YouTube chrome / Shorts badge */}
            <div className="absolute left-1/2 top-1/2 h-[115%] w-[115%] -translate-x-1/2 -translate-y-1/2">
              <div ref={ytHostRef} className="h-full w-full" />
            </div>
          </div>
        )
      ) : mode === "upload" && videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterUrl || undefined}
          playsInline
          autoPlay
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
          onClick={togglePlay}
        />
      ) : null}

      {/* Instant cover — thumbnail only, never a spinner */}
      {showPoster && !ytFallback ? (
        posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            decoding="async"
            fetchpriority="high"
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 z-[1] bg-neutral-950" />
        )
      ) : null}

      {/* Play affordance — skip for iframe fallback (YouTube handles it) */}
      {!ytFallback ? (
        !playing && !showPoster ? (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/25"
            aria-label="Play"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="h-7 w-7 fill-current pl-0.5" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="absolute inset-0 z-[5]"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          />
        )
      ) : null}

      {/* Custom chrome */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 transition-opacity",
          ytFallback || controlsVisible || !playing ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="pointer-events-auto space-y-2">
          {!ytFallback ? (
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={progress}
              aria-label="Seek"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-primary [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              onChange={(e) => seek(Number(e.target.value) / 100)}
            />
          ) : null}
          <div className="flex items-center gap-1.5">
            {!ytFallback ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                  onClick={togglePlay}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <span className="ml-1 text-[11px] tabular-nums text-white/85">
                  {formatTime(current)} / {formatTime(duration)}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-white/70">YouTube</span>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
