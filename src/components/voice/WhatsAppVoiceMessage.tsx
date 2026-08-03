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
/** Mild pitch bump for a brighter / female-like robot voice */
const ROBOT_PITCH = 1.2;

type RobotGraph = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  dryGain: GainNode;
  wetGain: GainNode;
  modulator: OscillatorNode;
  modulatorGain: GainNode;
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
  const [isLoading, setIsLoading] = useState(false);
  const [mediaDuration, setMediaDuration] = useState(
    Number.isFinite(duration) && duration > 0 ? duration : 0
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const derivedUrlRef = useRef<string | null>(null);
  const storedDurationRef = useRef(
    Number.isFinite(duration) && duration > 0 ? duration : 0
  );
  const probingDurationRef = useRef(false);
  const robotGraphRef = useRef<RobotGraph | null>(null);
  const robotModeRef = useRef(false);
  const speedIndexRef = useRef(0);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    robotModeRef.current = robotMode;
  }, [robotMode]);

  useEffect(() => {
    speedIndexRef.current = speedIndex;
  }, [speedIndex]);

  useEffect(() => {
    let cancelled = false;

    const cleanupDerivedUrl = () => {
      if (derivedUrlRef.current) {
        URL.revokeObjectURL(derivedUrlRef.current);
        derivedUrlRef.current = null;
      }
    };

    const resolveSource = async () => {
      if (audioSource instanceof Blob) {
        cleanupDerivedUrl();
        setIsPlaying(false);
        setCurrentTime(0);
        setLoadError(null);
        setAudioUrl(null);

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
        if (!audioSource.trim()) {
          cleanupDerivedUrl();
          setAudioUrl(null);
          if (!cancelled) {
            setLoadError("Unable to load voice note");
          }
          return;
        }

        cleanupDerivedUrl();
        setLoadError(null);

        if (
          audioSource.startsWith("blob:") ||
          audioSource.startsWith("data:") ||
          audioSource.startsWith("http://") ||
          audioSource.startsWith("https://") ||
          audioSource.startsWith("/")
        ) {
          if (!cancelled) {
            setAudioUrl(audioSource);
          }
          return;
        }

        setAudioUrl(null);
        if (!cancelled) {
          setLoadError("Unsupported audio source");
        }
        return;
      }

      cleanupDerivedUrl();
      setAudioUrl(null);
      if (!cancelled) {
        setLoadError("Unsupported audio source");
      }
    };

    void resolveSource();

    return () => {
      cancelled = true;
      cleanupDerivedUrl();
    };
  }, [audioSource]);

  useEffect(() => {
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      storedDurationRef.current = duration;
      setMediaDuration(duration);
    }
  }, [duration]);

  const applyPlaybackRate = (audio: HTMLAudioElement) => {
    const base = SPEED_STEPS[speedIndexRef.current] ?? 1;
    audio.playbackRate = base * (robotModeRef.current ? ROBOT_PITCH : 1);
  };

  /**
   * Why: MediaRecorder WebM often reports Infinity duration until seeked.
   * Seek near the end once so the player can show total length before play.
   */
  const probeInfiniteDuration = (audio: HTMLAudioElement) => {
    if (probingDurationRef.current) return;
    if (storedDurationRef.current > 0) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) return;

    probingDurationRef.current = true;
    const previousTime = audio.currentTime;

    const finish = (value: number) => {
      probingDurationRef.current = false;
      try {
        audio.currentTime = previousTime;
      } catch {
        /* ignore seek restore failures */
      }
      if (Number.isFinite(value) && value > 0) {
        setMediaDuration(value);
      }
    };

    const onSeeked = () => {
      audio.removeEventListener("seeked", onSeeked);
      const probed = audio.currentTime;
      finish(probed);
    };

    audio.addEventListener("seeked", onSeeked);
    try {
      audio.currentTime = 1e101;
    } catch {
      audio.removeEventListener("seeked", onSeeked);
      probingDurationRef.current = false;
    }
  };

  const acceptMediaDuration = (audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setMediaDuration(audio.duration);
      return;
    }
    if (
      !Number.isFinite(audio.duration) ||
      audio.duration === Infinity
    ) {
      probeInfiniteDuration(audio);
    }
  };

  useEffect(() => {
    if (!audioUrl) return;

    // Tear down previous robot graph when the audio element is replaced
    if (robotGraphRef.current) {
      try {
        robotGraphRef.current.modulator.stop();
        void robotGraphRef.current.ctx.close();
      } catch {
        /* ignore */
      }
      robotGraphRef.current = null;
    }

    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;
    applyPlaybackRate(audio);

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
      acceptMediaDuration(audio);
    };
    const handleDurationChange = () => {
      acceptMediaDuration(audio);
    };
    const handleError = () => {
      setLoadError("Unable to play voice note");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
      if (robotGraphRef.current) {
        try {
          robotGraphRef.current.modulator.stop();
          void robotGraphRef.current.ctx.close();
        } catch {
          /* ignore */
        }
        robotGraphRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recreate only when URL/id changes
  }, [audioUrl, id, onPause]);

  useEffect(() => {
    if (!audioRef.current) return;
    applyPlaybackRate(audioRef.current);
    syncRobotRouting(robotMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedIndex, robotMode]);

  useEffect(() => {
    if (autoPlay && isActive) {
      void togglePlayback(true);
    } else if (!isActive && isPlaying) {
      void togglePlayback(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, isActive]);

  const ensureRobotGraph = async (audio: HTMLAudioElement): Promise<RobotGraph | null> => {
    if (robotGraphRef.current) {
      if (robotGraphRef.current.ctx.state === "suspended") {
        await robotGraphRef.current.ctx.resume();
      }
      return robotGraphRef.current;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audio);

      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const tremolo = ctx.createGain();
      const modulatorGain = ctx.createGain();
      const modulator = ctx.createOscillator();
      const bandpass = ctx.createBiquadFilter();
      const highShelf = ctx.createBiquadFilter();

      bandpass.type = "bandpass";
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 0.7;

      highShelf.type = "highshelf";
      highShelf.frequency.value = 1800;
      highShelf.gain.value = 6;

      modulator.type = "sine";
      modulator.frequency.value = 35;
      // Base tremolo depth; AudioParam offset is 1 so gain oscillates around 1
      tremolo.gain.value = 1;
      modulatorGain.gain.value = 0;

      // Dry path (normal voice)
      source.connect(dryGain);
      dryGain.connect(ctx.destination);

      // Wet robot path: EQ → tremolo → wet mix
      source.connect(bandpass);
      bandpass.connect(highShelf);
      highShelf.connect(tremolo);
      tremolo.connect(wetGain);
      wetGain.connect(ctx.destination);
      modulator.connect(modulatorGain);
      modulatorGain.connect(tremolo.gain);

      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      modulator.start();

      const graph: RobotGraph = {
        ctx,
        source,
        dryGain,
        wetGain,
        modulator,
        modulatorGain,
      };
      robotGraphRef.current = graph;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      return graph;
    } catch (error) {
      console.error("Failed to init robot audio graph", error);
      return null;
    }
  };

  const syncRobotRouting = (enabled: boolean) => {
    const graph = robotGraphRef.current;
    if (!graph) return;
    graph.dryGain.gain.setTargetAtTime(
      enabled ? 0.15 : 1,
      graph.ctx.currentTime,
      0.03
    );
    graph.wetGain.gain.setTargetAtTime(
      enabled ? 0.85 : 0,
      graph.ctx.currentTime,
      0.03
    );
    graph.modulatorGain.gain.setTargetAtTime(
      enabled ? 0.55 : 0,
      graph.ctx.currentTime,
      0.03
    );
  };

  const ensureAudioReady = (audio: HTMLAudioElement) => {
    if (audio.readyState >= 2) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const handleLoaded = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error("Failed to load audio metadata"));
      };

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoaded);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("loadedmetadata", handleLoaded);
      audio.addEventListener("error", handleError);
    });
  };

  const togglePlayback = async (play?: boolean) => {
    if (!audioRef.current || !audioUrl || sourceLoading || loadError) {
      return;
    }

    const shouldPlay = play ?? !isPlaying;

    if (shouldPlay) {
      try {
        setIsLoading(true);
        await ensureAudioReady(audioRef.current);
        acceptMediaDuration(audioRef.current);

        if (robotModeRef.current) {
          const graph = await ensureRobotGraph(audioRef.current);
          if (graph) syncRobotRouting(true);
        }

        applyPlaybackRate(audioRef.current);
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.(id);
      } catch (error) {
        console.error("Failed to play voice note", error);
        setLoadError("Unable to play voice note");
        setIsPlaying(false);
      } finally {
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

  const toggleRobotMode = async () => {
    const next = !robotMode;
    setRobotMode(next);
    robotModeRef.current = next;

    if (!audioRef.current) return;

    if (next) {
      const graph = await ensureRobotGraph(audioRef.current);
      if (graph) {
        if (graph.ctx.state === "suspended") {
          await graph.ctx.resume();
        }
        syncRobotRouting(true);
      }
    } else {
      syncRobotRouting(false);
    }

    applyPlaybackRate(audioRef.current);
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
      ? 0.1
      : 0;

  const bars = useMemo(() => {
    const source = waveform && waveform.length > 0 ? waveform : placeholderWaveform();
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
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                : "bg-emerald-400/40"
              : isBarActive
              ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.25)]"
              : "bg-white/40"
          )}
          style={{ height: `${height}px` }}
        />
      );
    });
  }, [accent, id, progress, waveform]);

  const showError = Boolean(loadError);
  const isBusy = isLoading || sourceLoading;
  const controlsDisabled = sourceLoading || !audioUrl || showError;

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
          onClick={() => void togglePlayback()}
          disabled={controlsDisabled}
          className={cn(
            "h-10 w-10 rounded-full border border-white/20 bg-white/10 text-current backdrop-blur transition hover:bg-white/20",
            accent === "received" && "border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20",
            isPlaying && "ring-2 ring-white/40 dark:ring-emerald-400/60",
            controlsDisabled && "opacity-60"
          )}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isBusy ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
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
          {showError && (
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
              onClick={() => void toggleRobotMode()}
              disabled={controlsDisabled}
              className={cn(
                "h-7 rounded-full border border-white/30 bg-white/10 px-2 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20",
                accent === "received" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                robotMode &&
                  (accent === "sent"
                    ? "bg-white/30 ring-1 ring-white/60"
                    : "bg-violet-500/20 text-violet-600 dark:text-violet-300 ring-1 ring-violet-400/50"),
                controlsDisabled && "opacity-60"
              )}
              aria-label={robotMode ? "Disable robot voice" : "Enable robot voice"}
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
              disabled={controlsDisabled}
              className={cn(
                "h-7 rounded-full border border-white/30 bg-white/10 px-3 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/20",
                accent === "received" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
                controlsDisabled && "opacity-60"
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
  // Any positive duration below 1s should still display as 1 second.
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
