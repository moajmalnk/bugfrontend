import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Download, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { probeAudioDuration } from "@/components/voice/probeAudioDuration";
import { triggerBlobDownload } from "@/lib/attachmentUtils";

export interface WhatsAppVoiceMessageProps {
  id: string;
  audioSource: string | Blob;
  duration?: number;
  fileName?: string;
  onDownload?: () => void;
  onRemove?: () => void;
  accent?: "sent" | "received";
  waveform?: number[];
  autoPlay?: boolean;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  isActive?: boolean;
  /** bubble = chat alignment; form = full-width, left-aligned like other inputs */
  layout?: "bubble" | "form";
}

const SPEED_STEPS: Array<0.75 | 1 | 1.5 | 2> = [0.75, 1, 1.5, 2];

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "AbortError" || name === "NotAllowedError";
};

export function WhatsAppVoiceMessage({
  id,
  audioSource,
  duration = 0,
  fileName,
  onDownload,
  onRemove,
  accent = "received",
  waveform,
  autoPlay = false,
  onPlay,
  onPause,
  isActive = false,
  layout = "bubble",
}: WhatsAppVoiceMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [mediaDuration, setMediaDuration] = useState(
    Number.isFinite(duration) && duration > 0 ? duration : 0
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const derivedUrlRef = useRef<string | null>(null);
  const playIntentRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const speedIndexRef = useRef(1);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const waveTrackRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);
  const durationRef = useRef(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
  }, [onPlay, onPause]);

  useEffect(() => {
    speedIndexRef.current = speedIndex;
  }, [speedIndex]);

  useEffect(() => {
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      setMediaDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (!audioUrl) return;
    if (Number.isFinite(duration) && duration > 0) return;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return;

    let cancelled = false;
    void probeAudioDuration(audioUrl).then((seconds) => {
      if (cancelled || !(seconds && seconds > 0)) return;
      setMediaDuration(seconds);
    });

    return () => {
      cancelled = true;
    };
  }, [audioUrl, duration, mediaDuration]);

  useEffect(() => {
    let cancelled = false;

    const revoke = () => {
      if (derivedUrlRef.current) {
        URL.revokeObjectURL(derivedUrlRef.current);
        derivedUrlRef.current = null;
      }
    };

    if (audioSource instanceof Blob) {
      revoke();
      const url = URL.createObjectURL(audioSource);
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      derivedUrlRef.current = url;
      setLoadError(null);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      return () => {
        cancelled = true;
        revoke();
      };
    }

    if (typeof audioSource === "string" && audioSource.trim()) {
      revoke();
      setLoadError(null);
      setAudioUrl(audioSource);
      return () => {
        cancelled = true;
        revoke();
      };
    }

    revoke();
    setAudioUrl(null);
    setLoadError("Unable to load voice note");
    return () => {
      cancelled = true;
      revoke();
    };
  }, [audioSource]);

  const applyRate = (audio: HTMLAudioElement) => {
    audio.playbackRate = SPEED_STEPS[speedIndexRef.current] ?? 1;
  };

  /**
   * Why: Plain HTMLAudioElement playback — no Web Audio / crossOrigin.
   * Forced robot graphs + crossOrigin broke shared notes when CORS mismatched.
   */
  useEffect(() => {
    if (!audioUrl) return;

    playIntentRef.current = false;
    playRequestIdRef.current += 1;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = audioUrl;
    audioRef.current = audio;
    applyRate(audio);

    const onTime = () => {
      if (scrubbingRef.current) return;
      setCurrentTime(audio.currentTime);
    };
    const onEnded = () => {
      playIntentRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      onPauseRef.current?.(id);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMediaDuration((prev) => (prev > 0 ? prev : audio.duration));
      }
    };
    const onError = () => {
      if (audioRef.current !== audio) return;
      playIntentRef.current = false;
      setIsPlaying(false);
      setLoadError("Unable to play voice note");
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("error", onError);

    return () => {
      playIntentRef.current = false;
      playRequestIdRef.current += 1;
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("error", onError);
      if (audioRef.current === audio) audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, id]);

  useEffect(() => {
    if (audioRef.current) applyRate(audioRef.current);
  }, [speedIndex]);

  useEffect(() => {
    if (!autoPlay) return;
    if (isActive) {
      if (!playIntentRef.current) void togglePlayback(true);
    } else if (playIntentRef.current || isPlaying) {
      void togglePlayback(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isActive]);

  const togglePlayback = async (play?: boolean) => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const shouldPlay = play ?? !playIntentRef.current;

    if (shouldPlay) {
      if (playIntentRef.current && !audio.paused) return;

      const requestId = ++playRequestIdRef.current;
      playIntentRef.current = true;
      setLoadError(null);
      setIsPlaying(true);
      onPlayRef.current?.(id);
      applyRate(audio);

      try {
        // Reload once if a prior network error left the element unusable
        if (audio.error) {
          audio.load();
        }
        await audio.play();
        if (requestId !== playRequestIdRef.current || !playIntentRef.current) {
          audio.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        if (isAbortError(error) || !playIntentRef.current) {
          setIsPlaying(false);
          return;
        }
        playIntentRef.current = false;
        setIsPlaying(false);
        setLoadError("Unable to play voice note");
      }
    } else {
      playIntentRef.current = false;
      playRequestIdRef.current += 1;
      audio.pause();
      setIsPlaying(false);
      onPauseRef.current?.(id);
    }
  };

  const handleDownload = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const name = fileName || `voice-note-${id}.webm`;
    try {
      if (audioSource instanceof Blob) {
        await triggerBlobDownload(audioSource, name);
        return;
      }
      if (audioUrl) {
        await triggerBlobDownload(audioUrl, name);
        return;
      }
      onDownload?.();
    } catch {
      onDownload?.();
    }
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_STEPS.length);
  };

  const effectiveDuration =
    (Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : null) ??
    (Number.isFinite(duration) && duration > 0 ? duration : 0);

  durationRef.current = effectiveDuration;

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    const total = durationRef.current;
    if (!audio || !(total > 0)) return;
    const next = Math.min(1, Math.max(0, ratio)) * total;
    try {
      audio.currentTime = next;
    } catch {
      /* WebM may not seek until buffered — still update UI */
    }
    setCurrentTime(next);
  };

  const ratioFromPointer = (clientX: number) => {
    const track = waveTrackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const startScrub = (clientX: number) => {
    if (!(durationRef.current > 0) || !audioUrl) return;
    scrubbingRef.current = true;
    setIsScrubbing(true);
    seekToRatio(ratioFromPointer(clientX));
  };

  const moveScrub = (clientX: number) => {
    if (!scrubbingRef.current) return;
    seekToRatio(ratioFromPointer(clientX));
  };

  const endScrub = () => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setIsScrubbing(false);
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => moveScrub(e.clientX);
    const onUp = () => endScrub();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl]);

  const formattedDuration = useMemo(
    () => formatTime(effectiveDuration),
    [effectiveDuration]
  );
  const formattedCurrent = useMemo(
    () => formatTime(currentTime || 0),
    [currentTime]
  );
  const displayCurrentTime =
    currentTime > 0 || isPlaying || isScrubbing
      ? formattedCurrent
      : formattedDuration;
  const progress =
    effectiveDuration > 0
      ? Math.min(1, (currentTime || 0) / effectiveDuration)
      : isPlaying
        ? 0.08
        : 0;

  const waveValues = useMemo(
    () =>
      waveform && waveform.length > 0 ? waveform : placeholderWaveform(),
    [waveform]
  );

  const bars = useMemo(() => {
    const activeCount = Math.floor(waveValues.length * progress);
    return waveValues.map((value, index) => {
      const height = Math.max(8, value * 28);
      const isBarActive = index < activeCount;
      return (
        <div
          key={`${id}-bar-${index}`}
          className={cn(
            "w-[2.5px] rounded-full pointer-events-none",
            !isScrubbing && "transition-[background-color,height] duration-75",
            accent === "sent"
              ? isBarActive
                ? "bg-white"
                : "bg-white/40"
              : isBarActive
                ? "bg-foreground/80"
                : "bg-muted-foreground/35"
          )}
          style={{ height: `${height}px` }}
        />
      );
    });
  }, [accent, id, isScrubbing, progress, waveValues]);

  const isForm = layout === "form";
  const isSent = accent === "sent";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 max-w-full items-center",
        isForm || !isSent ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-2.5 rounded-2xl px-2.5 py-2 shadow-sm sm:gap-3 sm:px-3",
          isForm
            ? "w-full max-w-full flex-1 rounded-xl border border-border/60"
            : "w-full max-w-[min(100%,22rem)]",
          isSent
            ? "bg-emerald-600 text-white dark:bg-emerald-600"
            : "bg-muted/80 text-foreground dark:bg-slate-800/95"
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => {
            if (loadError) setLoadError(null);
            void togglePlayback();
          }}
          disabled={!audioUrl}
          className={cn(
            "h-9 w-9 shrink-0 rounded-full transition sm:h-10 sm:w-10",
            isSent
              ? "border border-white/25 bg-white/15 text-white hover:bg-white/25"
              : "border border-border/50 bg-background/80 text-foreground hover:bg-background",
            isPlaying && (isSent ? "ring-2 ring-white/35" : "ring-2 ring-foreground/20"),
            !audioUrl && "opacity-60"
          )}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 translate-x-px" />
          )}
        </Button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums tracking-wide">
            <span className="font-semibold">
              {displayCurrentTime}
              {effectiveDuration > 0 &&
              (isPlaying || isScrubbing || currentTime > 0) ? (
                <span className="font-medium opacity-50">
                  {" "}
                  / {formattedDuration}
                </span>
              ) : null}
            </span>
          </div>
          <div
            ref={waveTrackRef}
            role="slider"
            tabIndex={effectiveDuration > 0 ? 0 : -1}
            aria-label="Seek voice note"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, Math.floor(effectiveDuration))}
            aria-valuenow={Math.floor(currentTime || 0)}
            aria-disabled={!(effectiveDuration > 0)}
            onPointerDown={(e) => {
              if (!(effectiveDuration > 0)) return;
              e.preventDefault();
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              startScrub(e.clientX);
            }}
            onKeyDown={(e) => {
              if (!(effectiveDuration > 0)) return;
              const step = Math.max(1, effectiveDuration * 0.05);
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                seekToRatio(
                  Math.min(1, (currentTime + step) / effectiveDuration)
                );
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                seekToRatio(
                  Math.max(0, (currentTime - step) / effectiveDuration)
                );
              } else if (e.key === "Home") {
                e.preventDefault();
                seekToRatio(0);
              } else if (e.key === "End") {
                e.preventDefault();
                seekToRatio(1);
              }
            }}
            className={cn(
              "relative mt-1 flex h-9 items-center touch-none select-none",
              effectiveDuration > 0
                ? "cursor-pointer"
                : "cursor-default opacity-80"
            )}
          >
            <div className="flex h-8 w-full items-end gap-[2px] overflow-hidden px-0.5">
              {bars}
            </div>
          </div>
          {loadError && (
            <button
              type="button"
              className={cn(
                "mt-1.5 text-left text-[11px] font-medium leading-tight underline-offset-2 hover:underline",
                isSent ? "text-white/90" : "text-destructive"
              )}
              onClick={() => {
                setLoadError(null);
                const audio = audioRef.current;
                if (audio) {
                  audio.load();
                }
                void togglePlayback(true);
              }}
            >
              {loadError} · Tap to retry
            </button>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cycleSpeed}
            disabled={!audioUrl}
            className={cn(
              "h-7 rounded-xl border px-2 text-[11px] font-semibold uppercase tracking-wide sm:px-2.5",
              isSent
                ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                : "border-border/60 bg-background/60 text-muted-foreground hover:bg-background hover:text-foreground",
              !audioUrl && "opacity-60"
            )}
          >
            {`${SPEED_STEPS[speedIndex]}`.replace(/\.0$/, "")}x
          </Button>
          <div className="flex items-center gap-1">
            {(onDownload || audioUrl) && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={(event) => {
                  void handleDownload(event);
                }}
                className={cn(
                  "h-7 w-7 rounded-xl",
                  isSent
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                )}
                aria-label="Download voice note"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRemove && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onRemove}
                className={cn(
                  "h-7 w-7 rounded-xl",
                  isSent
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                )}
                aria-label="Remove voice note"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const normalizedSeconds = seconds < 1 ? 1 : Math.floor(seconds);
  const mins = Math.floor(normalizedSeconds / 60);
  const secs = normalizedSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const placeholderWaveform = () =>
  new Array(36).fill(0).map((_, idx) => {
    const base = Math.sin((idx / 5) * Math.PI) ** 2;
    return 0.28 + base * 0.55;
  });
