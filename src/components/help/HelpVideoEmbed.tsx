import { Play, Video } from "lucide-react";
import { helpInnerCard } from "./HelpPageShell";

interface HelpVideoEmbedProps {
  title?: string;
  videoUrl?: string;
}

export function HelpVideoEmbed({ title, videoUrl }: HelpVideoEmbedProps) {
  if (videoUrl) {
    const isYoutube = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be");
    const embedUrl = isYoutube
      ? videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")
      : videoUrl;

    return (
      <div className="space-y-2">
        {title && <p className="text-sm font-semibold">{title}</p>}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-muted/30">
          <iframe
            src={embedUrl}
            title={title ?? "Video"}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${helpInnerCard} border-dashed p-8 sm:p-10`}>
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/10 to-emerald-600/10">
          <Video className="h-7 w-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title ?? "Video walkthrough"}</p>
          <p className="mt-1 text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Video coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
