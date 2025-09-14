import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { Copy, Download, Pause, Phone, Play, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface VoiceNoteMessageProps {
  audioUrl: string;
  phone?: string;
  timestamp?: string;
  status?: "sent" | "delivered" | "read" | "failed";
  duration?: number;
  fileName?: string;
  showCopyButton?: boolean;
}

export function VoiceNoteMessage({
  audioUrl,
  phone,
  timestamp,
  status = "sent",
  duration = 0,
  fileName = "voice-note",
  showCopyButton = true,
}: VoiceNoteMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const playAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onloadedmetadata = () => {
        setIsLoading(false);
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      setIsLoading(true);
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error playing audio:", error);
          setIsLoading(false);
          toast({
            title: "Playback Error",
            description: "Failed to play voice note",
            variant: "destructive",
          });
        });
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: "Voice note downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download voice note",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(audioUrl);
      toast({
        title: "Link Copied",
        description: "Voice note link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy voice note link",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "delivered":
        return "text-blue-500";
      case "read":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      case "failed":
        return "✗";
      default:
        return "✓";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {phone && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{phone}</span>
                </div>
              )}
              {timestamp && (
                <span className="text-xs text-muted-foreground">
                  {formatLocalDate(timestamp, "time")}
                </span>
              )}
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-3">
                <Button
                  onClick={playAudio}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="w-10 h-10 rounded-full p-0"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Voice Note</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mb-1">
                    <div
                      className="bg-green-500 h-1 rounded-full transition-all duration-100"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {fileName}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${getStatusColor()}`}>
                  {getStatusIcon()}
                </span>
                <span className="text-xs text-muted-foreground capitalize">
                  {status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {showCopyButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyLink}
                    className="h-8 px-2 text-xs"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 px-2 text-xs"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
