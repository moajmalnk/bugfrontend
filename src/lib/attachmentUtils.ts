import { ENV } from '@/lib/env';

export type DocumentPreviewKind = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'none';

export function buildAttachmentUrl(filePath: string, fileName?: string): string {
  const apiBaseUrl = ENV.API_URL.replace(/\/$/, '');
  const base = `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(filePath)}`;
  return fileName ? `${base}&name=${encodeURIComponent(fileName)}` : base;
}

/**
 * Why: Cross-origin `<a download>` is ignored by browsers, so audio opens and
 * plays. This URL asks the API to send Content-Disposition: attachment.
 */
export function buildAttachmentDownloadUrl(
  filePath: string,
  fileName?: string,
  bugId?: string
): string {
  const url = new URL(buildAttachmentUrl(filePath, fileName));
  url.searchParams.set('download', '1');
  if (bugId) url.searchParams.set('bug_id', bugId);
  return url.toString();
}

function sanitizeDownloadName(fileName?: string): string {
  const cleaned = (fileName || 'download').replace(/[/\\?%*:|"<>]/g, '-').trim();
  return cleaned || 'download';
}

/**
 * Why: Fetch as a blob and save locally so Download never navigates to a
 * playable audio page.
 */
export async function triggerBlobDownload(
  source: string | Blob,
  fileName?: string
): Promise<void> {
  const safeName = sanitizeDownloadName(fileName);
  let objectUrl: string | null = null;
  const blob =
    source instanceof Blob
      ? source
      : await fetchBlobForDownload(source);
  objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = safeName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, 2000);
}

async function fetchBlobForDownload(url: string): Promise<Blob> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const withCredentials = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
    if (withCredentials.ok) {
      return withCredentials.blob();
    }
  } catch {
    // Cross-origin wildcard CORS rejects credentialed fetches
  }

  const anonymous = await fetch(url, { method: 'GET', credentials: 'omit' });
  if (!anonymous.ok) {
    throw new Error(`Download failed (${anonymous.status})`);
  }
  return anonymous.blob();
}

export async function downloadAttachmentFile(
  filePath: string,
  fileName?: string,
  bugId?: string
): Promise<void> {
  const url = buildAttachmentDownloadUrl(filePath, fileName, bugId);
  await triggerBlobDownload(url, fileName);
}

export function buildDocumentPreviewPagePath(
  role: string,
  options: { filePath: string; fileName: string; returnTo?: string }
): string {
  const params = new URLSearchParams({
    path: options.filePath,
    name: options.fileName,
  });

  if (options.returnTo) {
    params.set('return', options.returnTo);
  }

  return `/${role}/document?${params.toString()}`;
}

export function documentPreviewKind(fileName: string): DocumentPreviewKind {
  const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['txt', 'csv', 'log', 'md', 'json', 'xml', 'html', 'yaml', 'yml', 'js', 'ts', 'tsx', 'jsx', 'css', 'sql'].includes(ext)) return 'text';
  return 'none';
}
