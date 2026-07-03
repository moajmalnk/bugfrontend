import { cn } from "@/lib/utils";
import { MessagingService } from "@/services/messagingService";
import type { ChatMessage } from "@/types";
import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

function messagingAuthToken(): string {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

interface ChatMessageImageProps {
  message: ChatMessage;
  className?: string;
}

export function ChatMessageImage({ message, className }: ChatMessageImageProps) {
  const mediaPath = message.media_file_path || message.media_thumbnail;
  const resolvedUrl = MessagingService.resolveMediaUrl(mediaPath);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(!resolvedUrl);

  useEffect(() => {
    if (!resolvedUrl) {
      setSrc(null);
      setFailed(true);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    const token = messagingAuthToken();

    const loadImage = async () => {
      try {
        const response = await fetch(resolvedUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setFailed(false);
      } catch {
        if (!cancelled) {
          setSrc(resolvedUrl);
          setFailed(false);
        }
      }
    };

    void loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [resolvedUrl]);

  if (failed || !src) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] min-w-[160px] flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 px-4 py-6 text-muted-foreground",
          !failed && "animate-pulse",
          className
        )}
      >
        <ImageIcon className="h-8 w-8 opacity-60" />
        <span className="text-xs font-medium">
          {!failed
            ? "Loading image..."
            : message.media_file_name || "Image unavailable"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={message.media_file_name || "Image"}
      className={cn(
        "max-h-80 max-w-full rounded-lg object-contain shadow-sm sm:max-h-96",
        className
      )}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
