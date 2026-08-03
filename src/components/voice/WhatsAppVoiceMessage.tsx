import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Download, Volume2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WhatsAppVoiceMessageProps {
  id: string;
  audioSource: string | Blob;
  duration?: number;
  onDownload?: () => void;
  onRemove?: () => void;
  accent?: "sent" | "received";
  waveform?: number[];
  autoPlay?: boolean;
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  isActive?: boolean;
}

const SPEED_STEPS: Array<1 | 1.5 | 2> = [1, 1.5, 2];
/** Higher pitch for robot / brighter voice — no Web Audio delay */
const ROBOT_PITCH = 1.25;

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "AbortError" || name === "NotAllowedError";
};

export function WhatsAppVoiceMessage({
  id,
  audioSource,
  duration = 0,
  onDownload,
  onRemove,
  accent = "received",
  waveform,
  autoPlay = false,
  onPlay,
  onPause,
  isActive = false,
}: WhatsAppVoiceMessageProps) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [robotMode, setRobotMode] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(
    Number.isFinite(duration) && duration > 0 ? duration : 0
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const derivedUrlRef = useRef<string | null>(null);
  const playIntentRef = useRef(false);
  const playRequestIdRef = useRef(0);
  const robotModeRef = useRef(false);
  const speedIndexRef = useRef(0);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
  }, [onPlay, onPause]);

  useEffect(() => {
    robotModeRef.current = robotMode;
  }, [robotMode]);

  useEffect(() => {
    speedIndexRef.current = speedIndex;
  }, [speedIndex]);

  useEffect(() => {
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      setMediaDuration(duration);
    }
  }, [duration]);

  // Resolve blob / string source once
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
    const base = SPEED_STEPS[speedIndexRef.current] ?? 1;
    audio.playbackRate = base * (robotModeRef.current ? ROBOT_PITCH : 1);
  };

  // Create audio element once URL is ready — metadata only, play on demand
  useEffect(() => {
    if (!audioUrl) return;

    playIntentRef.current = false;
    playRequestIdRef.current += 1;

    const audio = new Audio(audioUrl);
    audio.preload = "metadata";
    audioRef.current = audio;
    applyRate(audio);

    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      playIntentRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
      onPauseRef.current?.(id);
    };
    const onMeta = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMediaDuration((prev) =>
          prev > 0 ? prev : audio.duration
        );
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
  }, [audioUrl, id]);

  useEffect(() => {
    if (audioRef.current) applyRate(audioRef.current);
  }, [speedIndex, robotMode]);

  // Mutual exclusion only — do not re-trigger play if already starting
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
      // Optimistic UX: flip to pause icon immediately
      setIsPlaying(true);
      onPlayRef.current?.(id);
      applyRate(audio);

      try {
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

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_STEPS.length);
  };

  const toggleRobotMode = () => {
    const next = !robotMode;
    setRobotMode(next);
    robotModeRef.current = next;
    if (audioRef.current) applyRate(audioRef.current);
  };

  const effectiveDuration =
    (Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : null) ??
    (Number.isFinite(duration) && duration > 0 ? duration : 0);

  const formattedDuration = useMemo(
    () => formatTime(effectiveDuration),
    [effectiveDuration]
  );
  const formattedCurrent = useMemo(
    () => formatTime(currentTime || 0),
    [currentTime]
  );
  const displayCurrentTime =
    currentTime > 0 || isPlaying ? formattedCurrent : formattedDuration;
  const progress =
    effectiveDuration > 0
      ? Math.min(1, (currentTime || 0) / effectiveDuration)
      : isPlaying
        ? 0.08
        : 0;

  const bars = useMemo(() => {
    const source =
      waveform && waveform.length > 0 ? waveform : placeholderWaveform();
    const activeCount = Math.floor(source.length * progress);
    return source.map((value, index) => {
      const height = Math.max(12, value * 36);
      const isBarActive = index < activeCount;
      return (
        <div
          key={`${id}-bar-${index}`}
          className={cn(
            "w-[3px] rounded-full transition-all duration-100",
            accent === "sent"
              ? isBarActive
                ? "bg-emerald-500"
                : "bg-emerald-400/40"
              : isBarActive
                ? "bg-white"
                : "bg-white/40"
          )}
          style={{ height: `${height}px` }}
        />
      );
    });
  }, [accent, id, progress, waveform]);

  return (
    <div
      className={cn(
        "flex w-full max-w-full items-end gap-2",
        accent === "sent" ? "justify-end" : "justify-start"
      )}
    >
      {accent === "received" && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
          <Volume2 className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          "flex w-full max-w-full items-center gap-3 rounded-3xl px-3 py-2 shadow-sm sm:max-w-[360px]",
          accent === "sent"
            ? "bg-emerald-500 text-white"
            : "bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
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
            "h-10 w-10 rounded-full border border-white/20 bg-white/10 text-current backdrop-blur transition hover:bg-white/20",
            accent === "received" &&
              "border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
            isPlaying && "ring-2 ring-white/40 dark:ring-emerald-400/60",
            !audioUrl && "opacity-60"
          )}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
            <span className="font-semibold">{displayCurrentTime}</span>
          </div>
          <div className="mt-1 flex h-10 items-end gap-[2px] overflow-hidden">
            {bars}
          </div>
          {loadError && (
            <p className="mt-2 text-[11px] font-medium text-red-500 dark:text-red-300">
              {loadError}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={toggleRobotMode}
              disabled={!audioUrl}
              className={cn(
                "h-7 rounded-full border border-white/30 bg-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20",
                accent === "received" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                robotMode &&
                  (accent === "sent"
                    ? "bg-white/30 ring-1 ring-white/60"
                    : "bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-400/50"),
                !audioUrl && "opacity-60"
              )}
              aria-label={
                robotMode ? "Disable robot voice" : "Enable robot voice"
              }
              aria-pressed={robotMode}
              title={robotMode ? "Robot voice on" : "Robot voice"}
            >
              <Bot className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={cycleSpeed}
              disabled={!audioUrl}
              className={cn(
                "h-7 rounded-full border border-white/30 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20",
                accent === "received" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                !audioUrl && "opacity-60"
              )}
            >
              {SPEED_STEPS[speedIndex].toFixed(1).replace(".0", "")}x
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {onDownload && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onDownload}
                className={cn(
                  "h-7 w-7 rounded-full border border-transparent bg-white/10 text-current hover:bg-white/20",
                  accent === "received" &&
                    "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
                aria-label="Download voice note"
              >
                <Download className="h-3 w-3" />
              </Button>
            )}
            {onRemove && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onRemove}
                className={cn(
                  "h-7 w-7 rounded-full bg-white/10 text-current hover:bg-white/20",
                  accent === "received" &&
                    "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                )}
                aria-label="Remove voice note"
              >
                ×
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
  new Array(32).fill(0).map((_, idx) => {
    const base = Math.sin((idx / 5) * Math.PI) ** 2;
    return 0.3 + base * 0.6;
  });
