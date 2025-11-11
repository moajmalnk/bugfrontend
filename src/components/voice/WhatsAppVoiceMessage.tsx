import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const derivedUrlRef = useRef<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cleanupSource = () => {
      if (derivedUrlRef.current) {
        URL.revokeObjectURL(derivedUrlRef.current);
        derivedUrlRef.current = null;
      }
    };

    const resolveSource = async () => {
      cleanupSource();
      setIsPlaying(false);
      setCurrentTime(0);
      setLoadError(null);
      setMediaDuration(duration || 0);

      if (audioSource instanceof Blob) {
        const url = URL.createObjectURL(audioSource);
        if (!cancelled) {
          derivedUrlRef.current = url;
          setAudioUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
        return;
      }

      if (typeof audioSource === "string") {
        if (audioSource.startsWith("blob:") || audioSource.startsWith("data:")) {
          setAudioUrl(audioSource);
          return;
        }

        try {
          setSourceLoading(true);
          const response = await fetch(audioSource, {
            credentials: "include",
            cache: "no-store",
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          if (cancelled) {
            return;
          }
          const url = URL.createObjectURL(blob);
          derivedUrlRef.current = url;
          setAudioUrl(url);
        } catch (error) {
          console.error("Failed to resolve audio source", error);
          if (!cancelled) {
            setLoadError("Unable to load voice note");
            setAudioUrl(null);
          }
        } finally {
          if (!cancelled) {
            setSourceLoading(false);
          }
        }
        return;
      }

      setAudioUrl(null);
      setLoadError("Unsupported audio source");
    };

    resolveSource();

    return () => {
      cancelled = true;
      cleanupSource();
    };
  }, [audioSource, duration]);

  useEffect(() => {
    if (typeof duration === "number" && duration > 0) {
      setMediaDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.playbackRate = SPEED_STEPS[speedIndex];

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPause?.(id);
    };
    const handleLoaded = () => {
      setIsLoading(false);
      if (audio.duration && Number.isFinite(audio.duration)) {
        setMediaDuration(audio.duration);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadeddata", handleLoaded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadeddata", handleLoaded);
      audioRef.current = null;
    };
  }, [audioUrl, id, onPause, speedIndex]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = SPEED_STEPS[speedIndex];
  }, [speedIndex]);

  useEffect(() => {
    if (autoPlay && isActive) {
      togglePlayback(true);
    } else if (!isActive && isPlaying) {
      togglePlayback(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isActive]);

  const togglePlayback = async (play?: boolean) => {
    if (!audioRef.current) return;
    const shouldPlay = play ?? !isPlaying;

    if (shouldPlay) {
      try {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        onPlay?.(id);
      } catch (error) {
        console.error("Failed to play voice message", error);
        setIsLoading(false);
      }
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
      onPause?.(id);
    }
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEED_STEPS.length);
  };

  const formattedDuration = useMemo(
    () => formatTime(mediaDuration || duration),
    [mediaDuration, duration]
  );
  const formattedCurrent = useMemo(
    () => formatTime(currentTime || 0),
    [currentTime]
  );
  const progress =
    (mediaDuration || duration) > 0
      ? Math.min(1, (currentTime || 0) / (mediaDuration || duration))
      : isPlaying
      ? 0.1
      : 0;

  const bars = useMemo(() => {
    const source = waveform && waveform.length > 0 ? waveform : placeholderWaveform();
    const activeCount = Math.floor(source.length * progress);
    return source.map((value, index) => {
      const height = Math.max(12, value * 36);
      const isActive = index < activeCount;
      return (
        <div
          key={`${id}-bar-${index}`}
          className={cn(
            "w-[3px] rounded-full transition-all duration-100",
            accent === "sent"
              ? isActive
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                : "bg-emerald-400/40"
              : isActive
              ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)]"
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
        "flex w-full max-w-lg items-end gap-2",
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
          "flex w-full max-w-[360px] items-center gap-3 rounded-3xl px-3 py-2 shadow-sm",
          accent === "sent"
            ? "bg-emerald-500 text-white"
            : "bg-white text-slate-900 dark:bg-slate-800 dark:text-white"
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => togglePlayback()}
          disabled={isLoading || !audioUrl}
          className={cn(
            "h-10 w-10 rounded-full border border-white/20 bg-white/10 text-current backdrop-blur transition hover:bg-white/20",
            accent === "received" && "border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
            isPlaying && "ring-2 ring-white/40 dark:ring-emerald-400/60"
          )}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
            <span className="font-semibold">{formattedCurrent}</span>
            <span className="text-xs opacity-70">{formattedDuration}</span>
          </div>
          <div className="mt-1 flex h-10 items-end gap-[2px] overflow-hidden">
            {bars}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cycleSpeed}
            className={cn(
              "h-7 rounded-full border border-white/30 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20",
              accent === "received" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
            )}
          >
            {SPEED_STEPS[speedIndex].toFixed(1).replace(".0", "")}x
          </Button>
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
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const placeholderWaveform = () =>
  new Array(32).fill(0).map((_, idx) => {
    const base = Math.sin((idx / 5) * Math.PI) ** 2;
    return 0.3 + base * 0.6;
  });

