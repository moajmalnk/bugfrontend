import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface AudioWaveformProps {
  audioUrl: string;
  duration?: number;
  isPlaying?: boolean;
  onPlayPause?: () => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  duration = 0,
  isPlaying = false,
  onPlayPause,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isLoading, setIsLoading] = useState(true);
  const [audioData, setAudioData] = useState<number[]>([]);

  useEffect(() => {
    console.log("🎵 Loading audio from URL:", audioUrl);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      console.log("✅ Audio loaded successfully, duration:", audio.duration);
      setAudioDuration(audio.duration);
      setIsLoading(false);
      generateWaveformData(audio);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("ended", () => {
      setCurrentTime(0);
      if (onPlayPause) onPlayPause();
    });

    audio.addEventListener("error", (e) => {
      console.error("❌ Audio loading error:", e);
      console.error("Audio URL:", audioUrl);
      console.error("Audio error details:", audio.error);
      setIsLoading(false);
    });

    // Try to preload the audio
    audio.preload = "metadata";
    audio.load();

    return () => {
      audio.pause();
      audio.remove();
    };
  }, [audioUrl]);

  const generateWaveformData = async (audio: HTMLAudioElement) => {
    // Generate mock waveform data (bars)
    // In a real implementation, you would use Web Audio API to analyze the audio
    const bars = 50;
    const mockData: number[] = [];
    
    for (let i = 0; i < bars; i++) {
      // Create a wave-like pattern
      const t = (i / bars) * Math.PI * 4;
      const height = (Math.sin(t) + 1) / 2 * 0.7 + Math.random() * 0.3;
      mockData.push(height);
    }
    
    setAudioData(mockData);
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error("Error playing audio:", error);
        console.error("Audio URL:", audioUrl);
        // If autoplay fails, user interaction is required
        if (onPlayPause) onPlayPause(); // Toggle back to paused state
      });
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    drawWaveform();
  }, [audioData, currentTime, audioDuration]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || audioData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / audioData.length;
    const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bars
    audioData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height;
      const y = (height - barHeight) / 2;

      // Color based on progress
      const barProgress = (index / audioData.length);
      if (barProgress <= progress) {
        ctx.fillStyle = "hsl(var(--primary))";
      } else {
        ctx.fillStyle = "hsl(var(--muted-foreground) / 0.3)";
      }

      // Draw rounded rectangle
      ctx.beginPath();
      const radius = barWidth / 4;
      ctx.roundRect(x + 1, y, barWidth - 2, barHeight, radius);
      ctx.fill();
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / canvas.width;
    const newTime = progress * audioDuration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[200px] max-w-[300px] p-2 rounded-lg bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={onPlayPause}
        className="h-8 w-8 p-0 bg-primary/10 hover:bg-primary/20 flex-shrink-0"
        disabled={isLoading}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        <canvas
          ref={canvasRef}
          width={200}
          height={30}
          className="w-full h-[30px] cursor-pointer"
          onClick={handleCanvasClick}
          style={{ display: audioData.length > 0 ? "block" : "none" }}
        />
        {audioData.length === 0 && (
          <div className="w-full h-[30px] bg-muted/50 rounded animate-pulse" />
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};

