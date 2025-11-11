import { useEffect, useRef, useState } from "react";
import { Mic, Lock, X, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface VoiceWaveSample {
  timestamp: number;
  value: number;
}

export interface RecordedVoiceNote {
  blob: Blob;
  duration: number;
  waveform: number[];
}

interface WhatsAppVoiceRecorderProps {
  onComplete?: (voice: RecordedVoiceNote) => void;
  onCancel?: () => void;
  disabled?: boolean;
  maxDuration?: number;
}

type PointerPosition = { x: number; y: number };

const CANCEL_THRESHOLD = 90;
const LOCK_THRESHOLD = 80;
const WAVEFORM_SAMPLE_INTERVAL = 55;

export function WhatsAppVoiceRecorder({
  onComplete,
  onCancel,
  disabled = false,
  maxDuration = 5 * 60,
}: WhatsAppVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const pointerStartRef = useRef<PointerPosition | null>(null);
  const lastWaveSampleRef = useRef<VoiceWaveSample | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  };

  const resetState = () => {
    setIsRecording(false);
    setIsLocked(false);
    setIsCancelling(false);
    setElapsed(0);
    setWaveform([]);
    chunksRef.current = [];
    lastWaveSampleRef.current = null;
    pointerStartRef.current = null;
  };

  const initializeAnalyser = (stream: MediaStream) => {
    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const sample = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      const normalized =
        dataArrayRef.current.reduce((sum, value) => {
          const centered = value - 128;
          return sum + Math.abs(centered);
        }, 0) /
        dataArrayRef.current.length /
        128;

      const timestamp = performance.now();
      const lastSample = lastWaveSampleRef.current;
      if (
        !lastSample ||
        timestamp - lastSample.timestamp >= WAVEFORM_SAMPLE_INTERVAL
      ) {
        const clamped = Math.min(1, Math.max(0, normalized * 2.4));
        setWaveform((prev) => {
          const next = [...prev, clamped];
          return next.slice(-80);
        });
        lastWaveSampleRef.current = { timestamp, value: normalized };
      }

      animationRef.current = requestAnimationFrame(sample);
    };
    animationRef.current = requestAnimationFrame(sample);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/wav";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        const duration = (performance.now() - startTimeRef.current) / 1000;
        if (onComplete) {
          try {
            setIsProcessing(true);
            await onComplete({
              blob,
              duration,
              waveform: waveform.length > 0 ? waveform : generateFallbackWaveform(duration),
            });
          } finally {
            setIsProcessing(false);
          }
        }
        resetState();
        cleanup();
      };

      mediaRecorderRef.current = recorder;
      initializeAnalyser(stream);
      recorder.start(200);
      setIsRecording(true);
      setElapsed(0);
      setWaveform([]);
      startTimeRef.current = performance.now();

      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Microphone blocked",
        description: "Allow microphone access to record voice notes.",
        variant: "destructive",
      });
      resetState();
      cleanup();
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const cancelRecording = (silent = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    resetState();
    if (!silent) {
      onCancel?.();
    }
  };

  const handlePointerStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isProcessing) return;
    event.preventDefault();
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    setIsCancelling(false);
    setIsLocked(false);
    startRecording();
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!pointerStartRef.current || !isRecording || isLocked) return;
    const dx = event.clientX - pointerStartRef.current.x;
    const dy = pointerStartRef.current.y - event.clientY;

    if (dx < -CANCEL_THRESHOLD) {
      setIsCancelling(true);
    } else {
      setIsCancelling(false);
    }

    if (dy > LOCK_THRESHOLD) {
      setIsLocked(true);
      setIsCancelling(false);
    }
  };

  const handlePointerEnd = () => {
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerEnd);

    if (!isRecording) return;

    if (isCancelling) {
      cancelRecording();
      return;
    }

    if (isLocked) {
      return;
    }

    stopRecording();
  };

  const handleLockStop = () => {
    if (!isLocked) return;
    setIsLocked(false);
    stopRecording();
  };

  const generateFallbackWaveform = (duration: number) => {
    const samples = Math.max(20, Math.floor(duration * 6));
    return new Array(samples).fill(0).map(() => Math.random() * 0.6 + 0.2);
  };

  const renderWaveformBars = () => {
    const samples = waveform.length > 0 ? waveform : new Array(12).fill(0.3);
    return (
      <div className="flex gap-[2px] h-10 items-end">
        {samples.map((value, index) => (
          <div
            key={index}
            className="w-[3px] rounded-full bg-emerald-500/80 dark:bg-emerald-400/80"
            style={{
              height: `${Math.max(18, value * 40)}px`,
              opacity: 0.5 + value * 0.5,
            }}
          />
        ))}
      </div>
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900/80",
        isRecording && "border-emerald-300 shadow-emerald-100 dark:border-emerald-700/60"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={disabled || isProcessing}
          onPointerDown={handlePointerStart}
          className={cn(
            "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-transform sm:h-14 sm:w-14",
            disabled && "opacity-50",
            isRecording && "scale-105 bg-emerald-600 shadow-emerald-500/40",
            isCancelling && "bg-red-500",
            isProcessing && "cursor-wait opacity-75"
          )}
          aria-label="Hold to record"
        >
          <Mic className="h-7 w-7 sm:h-6 sm:w-6" />
          {isRecording && (
            <span className="absolute -bottom-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600/80 dark:text-emerald-300/70">
              Hold
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold tracking-wide">
              {isRecording ? formatTime(elapsed) : "Voice note"}
            </span>
            {isRecording && !isLocked && !isCancelling && (
              <span className="flex items-center gap-1">
                <X className="h-3 w-3" />
                Slide left to cancel
              </span>
            )}
            {isRecording && isLocked && (
              <span className="flex items-center gap-1 text-emerald-500">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
            {/* {!isRecording && (
              <span className="text-slate-400">
                {disabled ? "Recording disabled" : "Hold mic to record"}
              </span>
            )} */}
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800/90">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex w-full items-center justify-center sm:justify-start">
                {renderWaveformBars()}
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                {isLocked ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-full border border-red-400/40 text-red-500 hover:border-red-500 hover:text-red-600"
                    onClick={handleLockStop}
                    disabled={isProcessing}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <div
                    className={cn(
                      "flex items-center rounded-full border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-600 dark:text-slate-400",
                      isRecording ? "opacity-100" : "opacity-60"
                    )}
                  >                  </div>
                )}

                {isRecording && (
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "rounded-full border border-emerald-400/60 px-2 py-[2px] text-[11px] font-semibold uppercase tracking-wide text-emerald-500 shadow-sm transition-opacity",
                        isLocked ? "opacity-0" : "opacity-100"
                      )}
                    >
                      Slide up to lock
                    </div>
                    <div
                      className={cn(
                        "mt-1 h-5 w-1 rounded-full bg-emerald-400/60 transition-opacity",
                        isLocked ? "opacity-0" : "opacity-100"
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {isRecording && isLocked && (
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-full bg-emerald-500 text-white shadow-md hover:bg-emerald-600"
            onClick={handleLockStop}
            disabled={isProcessing}
            aria-label="Stop recording"
          >
            <Send className="h-5 w-5" />
          </Button>
        )}
      </div>
      {isCancelling && (
        <div className="mt-3 rounded-xl bg-red-100 px-3 py-2 text-center text-xs font-semibold uppercase text-red-600 shadow-sm dark:bg-red-500/10 dark:text-red-300">
          Release to cancel
        </div>
      )}
    </div>
  );
}

