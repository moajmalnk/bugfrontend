import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SHORT_CATEGORIES,
  resolveShortMediaUrl,
  type ShortItem,
} from "@/services/shortsService";
import { Play } from "lucide-react";
import type { ReactNode } from "react";

interface ShortCardProps {
  short: ShortItem;
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
  /** Extra content under meta (e.g. action icons) — keeps card height aligned in grids */
  footer?: ReactNode;
}

function categoryLabel(value: string) {
  return SHORT_CATEGORIES.find((c) => c.value === value)?.label || value;
}

export function ShortCard({ short, onClick, size = "md", className, footer }: ShortCardProps) {
  const customThumb = resolveShortMediaUrl(short.thumbnail_url || short.thumbnail_path);
  const ytId =
    short.youtube_id ||
    (short.source_type === "youtube" && short.source_url
      ? short.source_url.match(/(?:shorts\/|v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1]
      : null);
  const thumb = customThumb || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : null);

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col",
        size === "sm" ? "w-[7.5rem]" : "w-[9.5rem] md:w-[10.5rem]",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="group flex min-w-0 flex-1 flex-col text-left outline-none"
        aria-label={`Play ${short.title}`}
      >
        <div
          className={cn(
            "relative aspect-[9/16] w-full shrink-0 overflow-hidden rounded-xl border border-gray-200/60 bg-muted shadow-sm dark:border-gray-700/60",
            "transition-[border-color,box-shadow,filter] group-hover:border-violet-300 group-hover:shadow-md group-hover:brightness-110 dark:group-hover:border-violet-700"
          )}
        >
          {thumb ? (
            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-primary/25 to-card">
              <Play className="h-8 w-8 text-foreground/70" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute left-2 top-2 z-[1]">
            <Badge
              variant="secondary"
              className="h-5 max-w-[calc(100%-0.5rem)] truncate rounded-full bg-black/50 px-1.5 text-[10px] text-white backdrop-blur-sm"
            >
              {categoryLabel(short.category)}
            </Badge>
          </div>
          <div className="absolute inset-0 z-[1] flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="h-5 w-5 fill-current" />
            </span>
          </div>
        </div>

        {/* Fixed meta block so 1-line / 2-line titles don't shift neighbors */}
        <div className="mt-2 flex min-h-[3.25rem] min-w-0 flex-col px-0.5 md:min-h-[3.5rem]">
          <p className="line-clamp-2 min-h-[2.25rem] text-xs font-medium leading-snug text-foreground md:min-h-[2.5rem] md:text-sm">
            {short.title}
          </p>
          <p className="mt-auto truncate text-[10px] capitalize leading-none text-muted-foreground md:text-xs">
            {short.source_type}
            {short.project_name ? ` · ${short.project_name}` : ""}
          </p>
        </div>
      </button>

      {footer ? <div className="mt-1.5 flex shrink-0 items-center justify-start gap-0.5 px-0.5">{footer}</div> : null}
    </div>
  );
}
