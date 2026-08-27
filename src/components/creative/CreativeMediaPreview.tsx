import { buildAttachmentUrl, documentPreviewKind } from '@/lib/attachmentUtils';
import { parseGoogleDriveLink } from '@/lib/googleDrive';
import { cn } from '@/lib/utils';
import {
  ExternalLink,
  FileText,
  Film,
  FolderOpen,
  ImageIcon,
  Package,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Why: Creative uploads include mp4/pdf/zip — cards must not render those as <img>.
 */
export function resolveCreativeMediaUrl(path?: string | null): string {
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
  /** Google Drive file/folder share link — used when no local upload/thumbnail. */
  driveLink?: string | null;
  /** Detail view: show native video controls instead of a muted poster. */
  controls?: boolean;
  /** Detail view: embed Drive folder grid so PDF/.ai thumbnails are visible. */
  embedDriveFolder?: boolean;
};

function DriveFolderPreview({
  openUrl,
  embedUrl,
  embed,
  className,
}: {
  openUrl: string;
  embedUrl: string | null;
  embed: boolean;
  className?: string;
}) {
  if (embed && embedUrl) {
    return (
      <div className={cn('relative h-full w-full overflow-hidden bg-muted', className)}>
        <iframe
          title="Google Drive folder"
          src={embedUrl}
          className="h-full min-h-[220px] w-full border-0 bg-white"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-border"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open Drive
        </a>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-500/15 via-muted to-emerald-500/10',
        className
      )}
    >
      <FolderOpen className="h-10 w-10 text-sky-600 dark:text-sky-400" />
      <span className="px-3 text-center text-xs font-semibold text-foreground">
        Drive folder
      </span>
      <span className="max-w-[90%] truncate px-3 text-[11px] text-muted-foreground">
        PDF · AI · ZIP and more
      </span>
    </div>
  );
}

function DriveFilePreview({
  thumbnailUrl,
  openUrl,
  alt,
  className,
  mediaClassName,
}: {
  thumbnailUrl: string | null;
  openUrl: string;
  alt: string;
  className?: string;
  mediaClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (thumbnailUrl && !failed) {
    return (
      <div className={cn('relative h-full w-full bg-muted', className)}>
        <img
          src={thumbnailUrl}
          alt={alt}
          className={cn('h-full w-full object-cover', mediaClassName)}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-xl bg-background/90 px-2 py-1 text-[10px] font-semibold shadow-sm ring-1 ring-border"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Drive
        </a>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-amber-500/15 via-muted to-sky-500/10',
        className
      )}
    >
      <FileText className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      <span className="px-3 text-center text-xs font-semibold text-foreground">
        Drive file
      </span>
    </div>
  );
}

export function CreativeMediaPreview({
  path,
  fallbackPath,
  driveLink,
  alt = 'Creative asset',
  className,
  mediaClassName,
  controls = false,
  embedDriveFolder = false,
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
  const drive = parseGoogleDriveLink(driveLink);

  if (!src || kind === 'none') {
    if (drive?.kind === 'folder' && drive.id) {
      return (
        <DriveFolderPreview
          openUrl={drive.openUrl}
          embedUrl={drive.embedFolderUrl}
          embed={embedDriveFolder}
          className={className}
        />
      );
    }
    if (drive?.kind === 'file' && drive.id) {
      return (
        <DriveFilePreview
          thumbnailUrl={drive.thumbnailUrl}
          openUrl={drive.openUrl}
          alt={alt}
          className={className}
          mediaClassName={mediaClassName}
        />
      );
    }
    if (drive) {
      return (
        <div
          className={cn(
            'flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-sky-500/15 via-muted to-violet-500/10',
            className
          )}
        >
          <ExternalLink className="h-10 w-10 text-muted-foreground/80" />
          <span className="text-xs font-medium text-muted-foreground">Drive link</span>
        </div>
      );
    }

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
          className={cn('h-full w-full object-cover', mediaClassName)}
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
