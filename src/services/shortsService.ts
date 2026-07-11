import { ENV } from '@/lib/env';
import { buildAttachmentUrl } from '@/lib/attachmentUtils';

export type ShortCategory = 'ui_ux' | 'bug' | 'project' | 'stack' | 'other';
export type ShortSourceType = 'youtube' | 'instagram' | 'facebook' | 'upload';

export interface ShortItem {
  id: string;
  title: string;
  description?: string | null;
  category: ShortCategory;
  source_type: ShortSourceType;
  source_url?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
  video_url?: string | null;
  youtube_id?: string | null;
  embed_url?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  created_by?: string;
  created_by_name?: string | null;
  is_published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateShortPayload {
  title: string;
  description?: string | null;
  category?: ShortCategory;
  source_url?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  project_id?: string | null;
  is_published?: boolean;
  sort_order?: number;
}

export interface UpdateShortPayload extends Partial<CreateShortPayload> {
  id: string;
}

export const SHORT_CATEGORIES: { value: ShortCategory; label: string }[] = [
  { value: 'ui_ux', label: 'UI / UX' },
  { value: 'bug', label: 'Bugs' },
  { value: 'project', label: 'Projects' },
  { value: 'stack', label: 'Stack' },
  { value: 'other', label: 'Other' },
];

export function resolveShortMediaUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return buildAttachmentUrl(pathOrUrl);
}

/** Normalize Instagram post/reel URL into an embeddable iframe src. */
export function buildInstagramEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const cleaned = url.trim().split("?")[0].split("#")[0].replace(/\/+$/, "");
    const m = cleaned.match(
      /instagram\.com\/(?:share\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i
    );
    if (!m?.[1]) return null;
    const kind = /\/(?:reel|reels)\b/i.test(cleaned)
      ? "reel"
      : /\/tv\b/i.test(cleaned)
        ? "tv"
        : "p";
    return `https://www.instagram.com/${kind}/${m[1]}/embed/`;
  } catch {
    return null;
  }
}

/** Facebook video / reel plugin embed. */
export function buildFacebookEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const href = encodeURIComponent(url.trim());
    return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=320&height=560`;
  } catch {
    return null;
  }
}


class ShortsService {
  private baseUrl = `${ENV.API_URL}/shorts`;

  private authHeaders(json = true): HeadersInit {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
  }

  private async parse(res: Response) {
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid response' }));
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  async list(params?: { category?: string; published?: boolean | string }): Promise<ShortItem[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.published !== undefined) qs.set('published', String(params.published));
    const url = `${this.baseUrl}/list.php${qs.toString() ? `?${qs}` : ''}`;
    const data = await this.parse(await fetch(url, { headers: this.authHeaders() }));
    return (data.data || []) as ShortItem[];
  }

  async get(id: string): Promise<ShortItem> {
    const data = await this.parse(
      await fetch(`${this.baseUrl}/get.php?id=${encodeURIComponent(id)}`, {
        headers: this.authHeaders(),
      })
    );
    return data.data as ShortItem;
  }

  async create(payload: CreateShortPayload): Promise<ShortItem> {
    const data = await this.parse(
      await fetch(`${this.baseUrl}/create.php`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(payload),
      })
    );
    return data.data as ShortItem;
  }

  async update(payload: UpdateShortPayload): Promise<ShortItem> {
    const data = await this.parse(
      await fetch(`${this.baseUrl}/update.php`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(payload),
      })
    );
    return data.data as ShortItem;
  }

  async delete(id: string): Promise<void> {
    await this.parse(
      await fetch(`${this.baseUrl}/delete.php`, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ id }),
      })
    );
  }

  async upload(file: File, kind: 'video' | 'thumbnail' = 'video'): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const res = await fetch(`${this.baseUrl}/upload.php`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await this.parse(res);
    return data.data.path as string;
  }
}

export const shortsService = new ShortsService();
