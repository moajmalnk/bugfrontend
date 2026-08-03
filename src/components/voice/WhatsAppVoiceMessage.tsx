import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Download, Volume2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { probeAudioDuration } from "@/components/voice/probeAudioDuration";

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
/** Noticeable higher / brighter pitch when robot mode is on */
const ROBOT_PITCH = 1.55;

type RobotGraph = {
  ctx: AudioContext;
  dryGain: GainNode;
  wetGain: GainNode;
  tremoloGain: GainNode;
  modulator: OscillatorNode;
  modDepth: GainNode;
};

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  return name === "AbortError" || name === "NotAllowedError";
};

const setPreservesPitch = (audio: HTMLAudioElement, preserve: boolean) => {
  const media = audio as HTMLMediaElement & {
    preservesPitch?: boolean;
    webkitPreservesPitch?: boolean;
    mozPreservesPitch?: boolean;
  };
  media.preservesPitch = preserve;
  media.webkitPreservesPitch = preserve;
  media.mozPreservesPitch = preserve;
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
  const robotGraphRef = useRef<RobotGraph | null>(null);
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

  // If parent didn't pass duration (legacy WebM), discover it once without blocking play
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
    const robot = robotModeRef.current;
    // Chrome defaults preservesPitch=true, so rate alone won't sound robotic
    setPreservesPitch(audio, !robot);
    audio.playbackRate = base * (robot ? ROBOT_PITCH : 1);
  };

  const syncRobotMix = (enabled: boolean) => {
    const graph = robotGraphRef.current;
    if (!graph) return;
    const t = graph.ctx.currentTime;
    graph.dryGain.gain.setTargetAtTime(enabled ? 0.2 : 1, t, 0.02);
    graph.wetGain.gain.setTargetAtTime(enabled ? 0.9 : 0, t, 0.02);
    graph.modDepth.gain.setTargetAtTime(enabled ? 0.45 : 0, t, 0.02);
  };

  /**
   * Why: Lazy Web Audio graph — only built when robot is turned on so
   * normal play stays instant. Tremolo + EQ give a metallic robot timbre.
   */
  const ensureRobotGraph = async (audio: HTMLAudioElement) => {
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
      const tremoloGain = ctx.createGain();
      const modDepth = ctx.createGain();
      const modulator = ctx.createOscillator();
      const bandpass = ctx.createBiquadFilter();
      const highShelf = ctx.createBiquadFilter();

      bandpass.type = "bandpass";
      bandpass.frequency.value = 1600;
      bandpass.Q.value = 0.9;
      highShelf.type = "highshelf";
      highShelf.frequency.value = 2000;
      highShelf.gain.value = 8;

      modulator.type = "sine";
      modulator.frequency.value = 38;
      tremoloGain.gain.value = 1;
      modDepth.gain.value = 0;

      source.connect(dryGain);
      dryGain.connect(ctx.destination);

      source.connect(bandpass);
      bandpass.connect(highShelf);
      highShelf.connect(tremoloGain);
      tremoloGain.connect(wetGain);
      wetGain.connect(ctx.destination);
      modulator.connect(modDepth);
      modDepth.connect(tremoloGain.gain);

      dryGain.gain.value = 1;
      wetGain.gain.value = 0;
      modulator.start();

      const graph: RobotGraph = {
        ctx,
        dryGain,
        wetGain,
        tremoloGain,
        modulator,
        modDepth,
      };
      robotGraphRef.current = graph;
      if (ctx.state === "suspended") await ctx.resume();
      return graph;
    } catch (error) {
      console.error("Robot audio graph failed", error);
      return null;
    }
  };

  // Create audio element once URL is ready — metadata only, play on demand
  useEffect(() => {
    if (!audioUrl) return;

    playIntentRef.current = false;
    playRequestIdRef.current += 1;

    if (robotGraphRef.current) {
      try {
        robotGraphRef.current.modulator.stop();
        void robotGraphRef.current.ctx.close();
      } catch {
        /* ignore */
      }
      robotGraphRef.current = null;
    }

    const audio = new Audio();
    // Required for createMediaElementSource when streaming via audio.php
    audio.crossOrigin = "anonymous";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, id]);

  useEffect(() => {
    if (audioRef.current) applyRate(audioRef.current);
    syncRobotMix(robotMode);
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
      setIsPlaying(true);
      onPlayRef.current?.(id);
      applyRate(audio);

      // If robot already on, ensure graph is live before/while playing
      if (robotModeRef.current) {
        const graph = await ensureRobotGraph(audio);
        if (graph) syncRobotMix(true);
      }

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

  const toggleRobotMode = async () => {
    const next = !robotMode;
    setRobotMode(next);
    robotModeRef.current = next;

    const audio = audioRef.current;
    if (!audio) return;

    applyRate(audio);

    if (next) {
      const graph = await ensureRobotGraph(audio);
      if (graph) {
        if (graph.ctx.state === "suspended") await graph.ctx.resume();
        syncRobotMix(true);
      }
    } else {
      syncRobotMix(false);
    }
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
      const height = Math.max(10, value * 34);
      const isBarActive = index < activeCount;
      return (
        <div
          key={`${id}-bar-${index}`}
          className={cn(
            "w-[3px] rounded-full pointer-events-none",
            !isScrubbing && "transition-[background-color,height] duration-75",
            accent === "sent"
              ? isBarActive
                ? "bg-white"
                : "bg-white/35"
              : isBarActive
                ? "bg-emerald-500 dark:bg-white"
                : "bg-emerald-500/35 dark:bg-white/35"
          )}
          style={{ height: `${height}px` }}
        />
      );
    });
  }, [accent, id, isScrubbing, progress, waveValues]);

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
            <span className="font-semibold tabular-nums">
              {displayCurrentTime}
              {effectiveDuration > 0 && (isPlaying || isScrubbing || currentTime > 0) ? (
                <span className="opacity-50 font-medium normal-case">
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
              "relative mt-1 flex h-11 items-center touch-none select-none",
              effectiveDuration > 0
                ? "cursor-pointer"
                : "cursor-default opacity-80"
            )}
          >
            <div className="flex h-10 w-full items-end gap-[2px] overflow-hidden px-0.5">
              {bars}
            </div>
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
              onClick={() => void toggleRobotMode()}
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
