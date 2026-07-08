import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

function buildHelpShareUrl(articleId?: string): string {
  const origin = window.location.origin;
  return articleId ? `${origin}/help/${articleId}` : `${origin}/help`;
}

interface HelpShareActionsProps {
  articleId?: string;
  title?: string;
  className?: string;
  size?: "sm" | "default";
}

export function HelpShareActions({
  articleId,
  title = "Help article",
  className,
  size = "sm",
}: HelpShareActionsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = buildHelpShareUrl(articleId);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Help article link copied to clipboard.",
      });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy the link. Try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title,
      text: title,
      url: shareUrl,
    };

    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }

    await handleCopyLink();
  };

  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => void handleCopyLink()}
        className="rounded-xl border-gray-200/70 dark:border-gray-700/70 gap-1.5"
        title="Copy link"
        aria-label="Copy link"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Copy link</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => void handleShare()}
        className="rounded-xl border-gray-200/70 dark:border-gray-700/70 gap-1.5"
        title="Share"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </Button>
    </div>
  );
}
