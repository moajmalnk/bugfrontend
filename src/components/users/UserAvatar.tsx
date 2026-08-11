import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type UserAvatarSize = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<UserAvatarSize, string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-xl",
  "2xl": "h-28 w-28 text-2xl",
};

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type UserAvatarProps = {
  name: string;
  avatar?: string | null;
  size?: UserAvatarSize;
  /** When set, shows a presence dot (active / idle / offline). */
  status?: "active" | "idle" | "offline" | null;
  className?: string;
  alt?: string;
  /**
   * Why: Detail screens open a full-size photo dialog on click when a real
   * upload exists (initials-only faces stay non-clickable).
   */
  previewable?: boolean;
};

/**
 * Why: One professional face for Users / Project members / details —
 * real upload when present, polished initials otherwise.
 */
export function UserAvatar({
  name,
  avatar,
  size = "md",
  status = null,
  className,
  alt,
  previewable = false,
}: UserAvatarProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const displayName = name.trim() || "User";
  const raw = (avatar || "").trim();
  const hasRealPhoto =
    raw !== "" && !/^https?:\/\/ui-avatars\.com\//i.test(raw);
  const imageSrc = hasRealPhoto
    ? resolveAvatarUrl(raw, displayName)
    : undefined;
  const initials = initialsFromName(displayName);
  const label = alt || `${displayName} profile photo`;
  const canPreview = previewable && !!imageSrc;

  const avatarNode = (
    <Avatar
      className={cn(
        SIZE_CLASS[size],
        "ring-1 ring-border/60 shadow-sm bg-muted",
        canPreview && "transition-opacity group-hover/avatar:opacity-90"
      )}
    >
      {imageSrc ? (
        <AvatarImage
          src={imageSrc}
          alt={label}
          className="object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <AvatarFallback
        className="bg-gradient-to-br from-slate-500 to-slate-700 text-white font-semibold tracking-wide"
        delayMs={imageSrc ? 400 : 0}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <>
      <span className={cn("relative inline-flex shrink-0", className)}>
        {canPreview ? (
          <button
            type="button"
            className="group/avatar rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-zoom-in"
            aria-label={`View ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(true);
            }}
          >
            {avatarNode}
          </button>
        ) : (
          avatarNode
        )}
        {status === "active" || status === "idle" ? (
          <span
            className={cn(
              "absolute bottom-0 right-0 rounded-full ring-2 ring-background pointer-events-none",
              size === "sm" && "h-2 w-2",
              (size === "md" || size === "lg") && "h-2.5 w-2.5",
              size === "xl" && "h-3.5 w-3.5",
              size === "2xl" && "h-4 w-4",
              status === "active" ? "bg-emerald-500" : "bg-amber-400"
            )}
            aria-hidden
          />
        ) : null}
      </span>

      {canPreview ? (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            showCloseButton={false}
            className="max-w-[min(92vw,560px)] w-auto p-3 sm:p-4 gap-3 rounded-2xl border-border/60 bg-background z-[1200]"
            overlayClassName="z-[1200] bg-black/85"
          >
            <div className="flex items-center justify-between gap-3 min-w-0">
              <DialogTitle className="text-base font-semibold truncate min-w-0">
                {displayName}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  aria-label="Close photo preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              Full-size profile photo for {displayName}
            </DialogDescription>
            <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
              <img
                src={imageSrc}
                alt={label}
                className="max-h-[min(72vh,520px)] w-auto max-w-full object-contain"
                decoding="async"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
