import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Download,
  Facebook,
  Instagram,
  Linkedin,
  Loader2,
  Mail,
  MessageCircle,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  POSTER_SHARE_PLATFORMS,
  sharePosterToPlatform,
  type PosterSharePlatform,
} from './posterSocialShare';

/** Simple X mark — lucide may not export Twitter/X consistently across versions. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const PLATFORM_ICON: Record<PosterSharePlatform, ReactNode> = {
  linkedin: <Linkedin className="h-5 w-5" />,
  instagram: <Instagram className="h-5 w-5" />,
  x: <XIcon className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  whatsapp: <MessageCircle className="h-5 w-5" />,
  email: <Mail className="h-5 w-5" />,
  download: <Download className="h-5 w-5" />,
};

type Props = {
  open: boolean;
  busy: boolean;
  previewUrl: string;
  filename: string;
  blob: Blob;
  file: File;
  initialCaption: string;
  onClose: () => void;
  onDownload: (blob: Blob, filename: string) => void;
  onToast: (args: { title: string; description?: string; variant?: 'destructive' }) => void;
};

export function PosterSocialShareDialog({
  open,
  busy,
  previewUrl,
  filename,
  blob,
  file,
  initialCaption,
  onClose,
  onDownload,
  onToast,
}: Props) {
  const [platform, setPlatform] = useState<PosterSharePlatform>('linkedin');
  const [caption, setCaption] = useState(initialCaption);
  const [sharing, setSharing] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setCaption(initialCaption);
    setPlatform('linkedin');
    cancelRef.current?.focus();
  }, [open, initialCaption]);

  const actionLabel = useMemo(
    () => POSTER_SHARE_PLATFORMS.find((p) => p.id === platform)?.actionLabel ?? 'Share',
    [platform]
  );

  if (!open) return null;

  const runShare = async () => {
    if (sharing || busy) return;
    setSharing(true);
    try {
      const result = await sharePosterToPlatform({
        platform,
        file,
        blob,
        caption: caption.trim(),
        download: onDownload,
      });
      if (result.ok === false) {
        if (result.aborted) return;
        onToast({ title: 'Share failed', description: result.message, variant: 'destructive' });
        return;
      }
      onToast({
        title:
          result.mode === 'shared'
            ? 'Shared'
            : result.mode === 'downloaded'
              ? 'Downloaded'
              : 'Ready to post',
        description: result.hint,
      });
      if (result.mode === 'shared' || platform === 'download') onClose();
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (!sharing && !busy) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="poster-social-share-title"
        className="flex max-h-[92dvh] w-full max-w-[440px] flex-col gap-3 overflow-y-auto rounded-t-2xl border border-gray-200/60 bg-white p-5 shadow-2xl dark:border-gray-700/60 dark:bg-gray-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="poster-social-share-title"
              className="text-base font-bold text-gray-900 dark:text-white"
            >
              Share poster
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a network, edit the caption, then share. Image attaches when your device allows it.
            </p>
          </div>
          <Share2 className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/40">
          <img
            src={previewUrl}
            alt="Poster preview"
            className="mx-auto max-h-48 w-auto object-contain"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="poster-share-caption" className="text-xs font-semibold">
            Caption
          </Label>
          <Textarea
            id="poster-share-caption"
            value={caption}
            maxLength={2000}
            onChange={(e) => setCaption(e.target.value.slice(0, 2000))}
            className="min-h-[96px] rounded-xl text-sm"
          />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {caption.length}/2000
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Share destination"
          className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5"
        >
          {POSTER_SHARE_PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={p.label}
                disabled={sharing}
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition',
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-border text-foreground hover:border-blue-300 dark:hover:border-blue-700'
                )}
              >
                {PLATFORM_ICON[p.id]}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          File: <span className="font-medium text-foreground">{filename}</span>
        </p>

        <div className="mt-1 flex flex-row items-center justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            className="h-11 min-w-0 flex-1 rounded-xl sm:w-auto sm:flex-none"
            disabled={sharing}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 min-w-0 flex-[1.4] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-800 sm:flex-none"
            disabled={sharing || busy}
            onClick={() => void runShare()}
          >
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : PLATFORM_ICON[platform]}
            <span className="ms-1.5 truncate">{actionLabel}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
