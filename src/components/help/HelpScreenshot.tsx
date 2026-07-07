import { useState } from "react";
import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface HelpScreenshotProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

export function HelpScreenshot({ src, alt, caption, className }: HelpScreenshotProps) {
  const [open, setOpen] = useState(false);

  return (
    <figure className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-muted/20 transition-all hover:shadow-md hover:border-blue-300/50 dark:hover:border-blue-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        aria-label={`Enlarge: ${alt}`}
      >
        <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 dark:bg-gray-900/90 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
            <ZoomIn className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </button>
      {caption && (
        <figcaption className="text-center text-xs text-muted-foreground px-2">
          {caption}
        </figcaption>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-2 rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <img src={src} alt={alt} className="w-full h-auto rounded-xl" />
        </DialogContent>
      </Dialog>
    </figure>
  );
}
