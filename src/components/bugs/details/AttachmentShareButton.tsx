import { useRef, useState } from "react";
import { Check, Link2, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiClient } from "@/lib/axios";
import { extractApiErrorMessage } from "@/lib/apiError";
import {
  copyShareText,
  toAttachmentShareLinks,
  type AttachmentShareLinks,
  type AttachmentSharePayload,
} from "@/lib/attachmentShare";
import { cn } from "@/lib/utils";

type AttachmentShareButtonProps = {
  attachmentId?: string;
  fileName: string;
  bugTitle?: string;
  className?: string;
  /** Visible label beside the icon. Overlay thumbnails stay icon-only. */
  label?: string;
  /** Keep a parent click (screenshot card) from opening the viewer. */
  stopParentClick?: boolean;
};

/**
 * Why: One public link previews the file for anyone, and the Cursor note
 * is what you paste in chat instead of downloading the video into the repo.
 */
export function AttachmentShareButton({
  attachmentId,
  fileName,
  bugTitle,
  className,
  label,
  stopParentClick = false,
}: AttachmentShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [links, setLinks] = useState<AttachmentShareLinks | null>(null);
  const [copied, setCopied] = useState<"preview" | "cursor" | null>(null);
  const requestLock = useRef(false);

  if (!attachmentId) {
    return null;
  }

  const load = async () => {
    if (links || loading || requestLock.current) return;
    requestLock.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: AttachmentSharePayload;
      }>("/bugs/share_attachment.php", { attachment_id: attachmentId });
      setLinks(toAttachmentShareLinks(response.data.data, bugTitle));
    } catch (err) {
      setError(extractApiErrorMessage(err, "Could not create a share link."));
    } finally {
      requestLock.current = false;
      setLoading(false);
    }
  };

  const copy = async (kind: "preview" | "cursor") => {
    if (!links) return;
    try {
      await copyShareText(kind === "preview" ? links.previewUrl : links.cursorPrompt);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Could not copy. Select the link and copy it manually.");
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("rounded-xl", className)}
          title="Share public preview"
          aria-label={`Share ${fileName}`}
          onClick={(event) => {
            if (stopParentClick) event.stopPropagation();
          }}
        >
          <Share2 className="h-4 w-4" />
          {label ? <span>{label}</span> : <span className="sr-only">Share</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Public preview</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Anyone with this link can preview the file. Paste the Cursor note
              into chat to refer to it while you fix the bug.
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating link…
            </div>
          )}

          {error && !loading && !links && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={loading}
                onClick={() => void load()}
              >
                Try again
              </Button>
            </div>
          )}

          {links && !loading && (
            <div className="space-y-2">
              <p className="truncate text-xs text-muted-foreground" title={links.fileName}>
                {links.fileName}
              </p>
              <div className="rounded-xl border bg-muted/30 px-3 py-2 text-xs break-all text-foreground">
                {links.previewUrl}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl justify-start"
                  onClick={() => void copy("preview")}
                >
                  {copied === "preview" ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}
                  {copied === "preview" ? "Preview link copied" : "Copy preview link"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl justify-start"
                  onClick={() => void copy("cursor")}
                >
                  {copied === "cursor" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {copied === "cursor" ? "Cursor note copied" : "Copy for Cursor"}
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
