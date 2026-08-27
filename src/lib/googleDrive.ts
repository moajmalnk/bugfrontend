/**
 * Why: BugCreative often stores Google Drive folder/file share links.
 * Cards need a fast visual (thumbnail or folder embed cue) without a Drive API call.
 */

export type DriveLinkKind = 'file' | 'folder' | 'unknown';

export type ParsedDriveLink = {
  kind: DriveLinkKind;
  id: string | null;
  openUrl: string;
  /** Public thumbnail for Drive files (images/PDF when shared). */
  thumbnailUrl: string | null;
  /** Embeddable folder grid for shared folders. */
  embedFolderUrl: string | null;
};

const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

export function parseGoogleDriveLink(raw?: string | null): ParsedDriveLink | null {
  const input = (raw || '').trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (
    host !== 'drive.google.com' &&
    host !== 'docs.google.com' &&
    !host.endsWith('.googleusercontent.com')
  ) {
    return null;
  }

  const path = url.pathname;
  let kind: DriveLinkKind = 'unknown';
  let id: string | null = null;

  const folderMatch = path.match(/\/folders\/([a-zA-Z0-9_-]+)/i);
  const fileMatch = path.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  const openId = url.searchParams.get('id');

  if (folderMatch?.[1]) {
    kind = 'folder';
    id = folderMatch[1];
  } else if (fileMatch?.[1]) {
    kind = 'file';
    id = fileMatch[1];
  } else if (path.includes('/open') && openId && DRIVE_ID_RE.test(openId)) {
    // /open?id= can be file or folder; prefer file thumbnail attempt.
    kind = 'file';
    id = openId;
  } else if (openId && DRIVE_ID_RE.test(openId)) {
    kind = path.includes('folder') ? 'folder' : 'file';
    id = openId;
  }

  if (!id) {
    return {
      kind: 'unknown',
      id: null,
      openUrl: input,
      thumbnailUrl: null,
      embedFolderUrl: null,
    };
  }

  const openUrl =
    kind === 'folder'
      ? `https://drive.google.com/drive/folders/${id}`
      : `https://drive.google.com/file/d/${id}/view`;

  return {
    kind,
    id,
    openUrl,
    thumbnailUrl:
      kind === 'file'
        ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`
        : null,
    embedFolderUrl:
      kind === 'folder'
        ? `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}#grid`
        : null,
  };
}

export function isGoogleDriveUrl(raw?: string | null): boolean {
  return parseGoogleDriveLink(raw) !== null;
}
