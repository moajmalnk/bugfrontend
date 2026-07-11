import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildFacebookEmbedUrl,
  buildInstagramEmbedUrl,
} from "@/services/shortsService";
import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";

interface SocialShortEmbedProps {
  sourceType: "instagram" | "facebook";
  sourceUrl: string;
  embedUrl?: string | null;
  className?: string;
}

export function SocialShortEmbed({
  sourceType,
  sourceUrl,
  embedUrl: embedUrlProp,
  className,
}: SocialShortEmbedProps) {
  const embedUrl =
    embedUrlProp ||
    (sourceType === "instagram"
      ? buildInstagramEmbedUrl(sourceUrl)
      : buildFacebookEmbedUrl(sourceUrl));
  const [failed, setFailed] = useState(false);

  if (!embedUrl || failed) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center",
          className
        )}
      >
        <div className="flex h-40 w-28 items-center justify-center rounded-xl bg-white/5">
          <Play className="h-10 w-10 text-white/70" />
        </div>
        <p className="max-w-xs text-sm text-white/80">
          {sourceType === "instagram" ? "Instagram" : "Facebook"} couldn’t load in-app.
          Open the original post to watch.
        </p>
        <Button asChild variant="secondary" className="gap-2">
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open original
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      <iframe
        title={`${sourceType} embed`}
        src={embedUrl}
        className={cn(
          "absolute left-1/2 top-0 h-full w-[min(100%,420px)] -translate-x-1/2 border-0 bg-black",
          sourceType === "instagram" && "scale-[1.02]"
        )}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        onError={() => setFailed(true)}
      />
      {/* Tap-through shield so vertical scroll still works around chrome edges */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/40 to-transparent" />
    </div>
  );
}
