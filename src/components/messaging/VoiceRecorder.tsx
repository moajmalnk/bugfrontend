import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Mic, MicOff, RotateCcw, Send, Square, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  isMobile?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 120, // 2 minutes default for faster UX
  isMobile = false,
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        cleanup();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingBlob(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Permission Denied",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      setRecordingBlob(null);
      audioChunksRef.current = [];
      cleanup();
    }
    onCancel();
  };

  const sendRecording = () => {
    if (recordingBlob) {
      onRecordingComplete(recordingBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = (recordingTime / maxDuration) * 100;

  // Mobile-optimized component
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Voice Message</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 space-y-8">
          {/* Recording Status */}
          <div className="text-center space-y-2">
            {isRecording ? (
              <>
                <div className="relative">
                  <div
                    className={cn(
                      "w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center",
                      "animate-pulse bg-primary/10"
                    )}
                  >
                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <MicOff className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  {isPaused && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-background/90 rounded-full p-2">
                        <span className="text-xs font-medium">PAUSED</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">
                    {isPaused ? "Recording Paused" : "Recording..."}
                  </p>
                  <p className="text-2xl font-mono text-primary">
                    {formatTime(recordingTime)}
                  </p>
                </div>
              </>
            ) : recordingBlob ? (
              <>
                <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/10">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                    <Send className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">Recording Complete</p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {formatTime(recordingTime)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                    <Mic className="h-8 w-8 text-primary-foreground" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold">Ready to Record</p>
                  <p className="text-sm text-muted-foreground">
                    Tap the button below to start
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Progress Bar */}
          {isRecording && (
            <div className="w-full space-y-2">
              <Progress
                value={progressPercentage}
                className="w-full h-3 rounded-full bg-muted"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0:00</span>
                <span>Max: {formatTime(maxDuration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 w-full">
            {!isRecording && !recordingBlob ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                title="Start recording"
              >
                <Mic className="h-8 w-8" />
              </Button>
            ) : isRecording ? (
              <>
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-full border-2"
                  title={isPaused ? "Resume recording" : "Pause recording"}
                >
                  {isPaused ? (
                    <Mic className="h-6 w-6" />
                  ) : (
                    <Square className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:scale-105 transition-transform"
                  title="Stop recording"
                >
                  <Square className="h-8 w-8" />
                </Button>
                <Button
                  onClick={cancelRecording}
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-full border-2 border-destructive/30 text-destructive hover:border-destructive"
                  title="Cancel recording"
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setRecordingBlob(null);
                    setRecordingTime(0);
                  }}
                  variant="outline"
                  size="lg"
                  className="h-14 w-14 rounded-full border-2"
                  title="Record again"
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>
                <Button
                  onClick={sendRecording}
                  size="lg"
                  className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
                  title="Send recording"
                >
                  <Send className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop component (original design with improvements)
  return (
    <div
      className={`flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 rounded-2xl shadow-lg bg-background/90 border transition-all
        ${
          isRecording
            ? "ring-2 ring-red-400/60 shadow-red-200"
            : "ring-1 ring-muted/30"
        }
      `}
    >
      <div className="text-center w-full">
        <h3 className="font-semibold text-lg mb-1 tracking-tight">
          Voice Message
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          {isRecording
            ? "Recording..."
            : "Press the microphone to start recording"}
        </p>
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <div className="w-full space-y-2 mb-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">Recording time</span>
            <span className="font-bold text-primary">
              {formatTime(recordingTime)}
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className="w-full h-2 rounded-full bg-muted"
          />
          <div className="text-xs text-muted-foreground text-center">
            Max duration: {formatTime(maxDuration)}
          </div>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center justify-center gap-4 mt-2 mb-2">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            size="icon"
            className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
            title="Start recording"
          >
            <Mic className="h-8 w-8" />
          </Button>
        ) : (
          <>
            <Button
              onClick={stopRecording}
              size="icon"
              className="h-16 w-16 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 hover:scale-105 transition-transform"
              title="Stop recording"
            >
              <Square className="h-8 w-8" />
            </Button>
            <Button
              onClick={cancelRecording}
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full border-2 border-muted-foreground/30 hover:border-red-400 transition-colors"
              title="Cancel recording"
            >
              <RotateCcw className="h-6 w-6" />
            </Button>
          </>
        )}
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="flex items-center space-x-2 text-sm text-red-500 font-medium mt-1 animate-pulse">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span>Recording in progress...</span>
        </div>
      )}
    </div>
  );
};
