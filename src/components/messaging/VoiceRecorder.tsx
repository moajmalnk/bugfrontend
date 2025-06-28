import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 300 // 5 minutes default
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Permission Denied",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (recordingTime / maxDuration) * 100;

  return (
    <div
      className={`flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 rounded-2xl shadow-lg bg-background/90 border transition-all
        ${isRecording ? 'ring-2 ring-red-400/60 shadow-red-200' : 'ring-1 ring-muted/30'}
      `}
    >
      <div className="text-center w-full">
        <h3 className="font-semibold text-lg mb-1 tracking-tight">Voice Message</h3>
        <p className="text-sm text-muted-foreground mb-2">
          {isRecording ? 'Recording...' : 'Press the microphone to start recording'}
        </p>
      </div>

      {/* Recording Progress */}
      {isRecording && (
        <div className="w-full space-y-2 mb-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">Recording time</span>
            <span className="font-bold text-primary">{formatTime(recordingTime)}</span>
          </div>
          <Progress value={progressPercentage} className="w-full h-2 rounded-full bg-muted" />
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