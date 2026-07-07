import { ENV } from '@/lib/env';

export type DocumentPreviewKind = 'pdf' | 'image' | 'video' | 'audio' | 'text' | 'none';

export function buildAttachmentUrl(filePath: string, fileName?: string): string {
  const apiBaseUrl = ENV.API_URL.replace(/\/$/, '');
  const base = `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(filePath)}`;
  return fileName ? `${base}&name=${encodeURIComponent(fileName)}` : base;
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
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['txt', 'csv', 'log', 'md', 'json', 'xml'].includes(ext)) return 'text';
  return 'none';
}
