import { buildAttachmentUrl, documentPreviewKind } from '@/lib/attachmentUtils';
import { cn } from '@/lib/utils';
import { FileText, Film, ImageIcon, Package } from 'lucide-react';

/**
 * Why: Creative uploads include mp4/pdf/zip — cards must not render those as <img>.
 */
export function resolveCreativeMediaUrl(
  path?: string | null
): string {
  const raw = (path || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return buildAttachmentUrl(raw);
}

export function creativeMediaKind(
  path?: string | null
): 'image' | 'video' | 'pdf' | 'other' | 'none' {
  const raw = (path || '').trim();
  if (!raw) return 'none';
  const kind = documentPreviewKind(raw.split('?')[0] || raw);
  if (kind === 'image') return 'image';
  if (kind === 'video') return 'video';
  if (kind === 'pdf') return 'pdf';
  if (kind === 'none') return 'none';
  return 'other';
}

type CreativeMediaPreviewProps = {
  path?: string | null;
  alt?: string;
  className?: string;
  mediaClassName?: string;
  /** Prefer thumbnail when present (images); fall back to uploaded file. */
  fallbackPath?: string | null;
  /** Detail view: show native video controls instead of a muted poster. */
  controls?: boolean;
};

export function CreativeMediaPreview({
  path,
  fallbackPath,
  alt = 'Creative asset',
  className,
  mediaClassName,
  controls = false,
}: CreativeMediaPreviewProps) {
  const primary = (path || '').trim();
  const fallback = (fallbackPath || '').trim();
  // Why: Prefer the uploaded file for video/pdf when thumbnail is an unrelated image.
  const primaryKind = creativeMediaKind(primary);
  const fallbackKind = creativeMediaKind(fallback);
  const mediaPath =
    controls && fallbackKind === 'video'
      ? fallback
      : primary || fallback;
  const src = resolveCreativeMediaUrl(mediaPath);
  const kind = creativeMediaKind(mediaPath);

  if (!src || kind === 'none') {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br from-fuchsia-500/10 via-muted to-violet-500/10',
          className
        )}
      >
        <ImageIcon className="h-10 w-10 text-muted-foreground/70" />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className={cn('relative h-full w-full bg-black', className)}>
        <video
          src={src}
          className={cn(
            'h-full w-full',
            controls ? 'object-contain' : 'object-cover',
            mediaClassName
          )}
          muted={!controls}
          playsInline
          preload="metadata"
          controls={controls}
        />
        {!controls ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <Film className="h-9 w-9 text-white/90 drop-shadow" />
          </div>
        ) : null}
      </div>
    );
  }

  if (kind === 'image' || primaryKind === 'image') {
    const imageSrc =
      kind === 'image' ? src : resolveCreativeMediaUrl(primary) || src;
    return (
      <div className={cn('h-full w-full bg-muted', className)}>
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'h-full w-full object-cover',
            mediaClassName
          )}
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-500/10 via-muted to-fuchsia-500/10',
        className
      )}
    >
      {kind === 'pdf' ? (
        <FileText className="h-10 w-10 text-muted-foreground/80" />
      ) : (
        <Package className="h-10 w-10 text-muted-foreground/80" />
      )}
      <span className="max-w-[90%] truncate px-2 text-xs font-medium text-muted-foreground">
        {kind === 'pdf' ? 'PDF file' : 'Uploaded file'}
      </span>
    </div>
  );
}
