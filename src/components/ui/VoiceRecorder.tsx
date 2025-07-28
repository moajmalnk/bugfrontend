import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import {
  Download,
  Mic,
  Pause,
  Play,
  Send,
  Square,
  Trash2,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onSendVoiceNote?: (audioBlob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
  maxDuration?: number; // in seconds
  showSendButton?: boolean;
}

export function VoiceRecorder({
  onSendVoiceNote,
  onCancel,
  maxDuration = 120, // 2 minutes default
  showSendButton = true,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Create audio element to get duration
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
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
        title: "Recording Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const playAudio = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);

      // Update playback progress
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          if (audioRef.current.ended) {
            setIsPlaying(false);
            clearInterval(playbackIntervalRef.current!);
          }
        }
      }, 100);
    }
  };

  const handleSend = async () => {
    if (!audioBlob || !onSendVoiceNote) return;

    try {
      await onSendVoiceNote(audioBlob, duration);
      toast({
        title: "Voice Note Sent",
        description: "Your voice note has been sent successfully",
      });

      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setDuration(0);
      setIsPlaying(false);
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send voice note. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setDuration(0);
    setIsPlaying(false);
    onCancel?.();
  };

  const downloadAudio = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-note-${new Date().toISOString().slice(0, 19)}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Recording Controls */}
          {!audioBlob && (
            <div className="flex items-center justify-center gap-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                >
                  <Mic className="w-6 h-6" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="w-16 h-16 rounded-full bg-gray-500 hover:bg-gray-600"
                >
                  <Square className="w-6 h-6" />
                </Button>
              )}

              {isRecording && (
                <div className="text-center">
                  <div className="text-2xl font-mono text-red-500">
                    {formatTime(recordingTime)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Recording... (Max: {formatTime(maxDuration)})
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Playback Controls */}
          {audioBlob && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="lg"
                  className="w-12 h-12 rounded-full"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </Button>

                <div className="text-center">
                  <div className="text-lg font-mono">
                    {formatTime(duration)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Voice Note
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2">
                {showSendButton && onSendVoiceNote && (
                  <Button
                    onClick={handleSend}
                    className="flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Voice Note
                  </Button>
                )}

                <Button
                  onClick={downloadAudio}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>

                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!audioBlob && !isRecording && (
            <div className="text-center text-sm text-muted-foreground">
              <Volume2 className="w-4 h-4 mx-auto mb-2" />
              Click the microphone to start recording your voice note
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
