import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

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


export function WhatsAppVoiceRecorder({
  onComplete,
  onCancel,
  disabled = false,
  maxDuration = 5 * 60,
}: WhatsAppVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const resetState = () => {
    setIsRecording(false);
    setElapsed(0);
    chunksRef.current = [];
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
              waveform: generateFallbackWaveform(duration),
            });
          } finally {
            setIsProcessing(false);
          }
        }
        resetState();
        cleanup();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);
      setElapsed(0);
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
  };

  const handleToggleRecording = () => {
    if (disabled || isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generateFallbackWaveform = (duration: number) => {
    const samples = Math.max(20, Math.floor(duration * 6));
    return new Array(samples).fill(0).map(() => Math.random() * 0.6 + 0.2);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isIdle = !isRecording && !isProcessing && elapsed === 0;

  return (
    <div
      className={cn(
        // Match visual style of attachment cards (Add Screenshots / Attach Files)
        "w-full h-28 sm:h-28 rounded-xl border-2 border-dashed border-gray-300 bg-slate-900/60 px-4 py-3 shadow-sm transition-all dark:border-gray-600",
        isRecording && "border-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
      )}
    >
      <div className="flex h-full w-full items-center justify-center gap-4">
        <Button
          type="button"
          disabled={disabled || isProcessing}
          onClick={handleToggleRecording}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition-all",
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-emerald-500 hover:bg-emerald-600",
            disabled && "opacity-50",
            isProcessing && "cursor-wait opacity-75"
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        {isRecording && (
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span>{formatTime(elapsed)}</span>
          </div>
        )}

        {!isRecording && isIdle && (
          <span className="text-sm font-semibold text-gray-100">
            Add Voice Note
          </span>
        )}
      </div>
    </div>
  );
}

