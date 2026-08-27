import { ENV } from '@/lib/env';

export type CreativeStatus = 'Draft' | 'In Review' | 'Completed' | 'Published' | 'Rejected';
export type CreativeMaterialType =
  | 'Poster'
  | 'Reel'
  | 'Carousel'
  | 'Mockup Web'
  | 'Mockup App'
  | 'Tips'
  | 'Document'
  | 'Logo'
  | 'Brochure'
  | 'Other';
export type CreativePlatform = 'Insta' | 'Web' | 'YouTube' | 'LinkedIn' | 'Other';
export type CreativeSource = 'link' | 'upload';
export type CreativeReviewStatus = 'Approved' | 'Changes Requested' | 'Rejected';

export type CreativeReview = {
  id: string;
  asset_id: string;
  reviewer_id: string;
  reviewer_name?: string | null;
  status: CreativeReviewStatus;
  comments?: string | null;
  created_at?: string | null;
};

export type CreativeAsset = {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  creator_id: string;
  creator_name?: string | null;
  title: string;
  material_type: CreativeMaterialType;
  platform: CreativePlatform;
  hook_content?: string | null;
  asset_source: CreativeSource;
  drive_link?: string | null;
  uploaded_file_path?: string | null;
  preview_thumbnail_url?: string | null;
  status: CreativeStatus;
  admin_feedback?: string | null;
  scheduled_date?: string | null;
  published_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  reviews?: CreativeReview[] | null;
};

export type CreativeAssetPayload = {
  id?: string;
  title: string;
  material_type: CreativeMaterialType;
  platform: CreativePlatform;
  hook_content?: string | null;
  asset_source: CreativeSource;
  drive_link?: string | null;
  uploaded_file_path?: string | null;
  preview_thumbnail_url?: string | null;
  project_id?: string | null;
  creator_id?: string | null;
  scheduled_date?: string | null;
  published_date?: string | null;
  status?: CreativeStatus;
  submit?: boolean;
  publish?: boolean;
};

export type CreativeListParams = {
  q?: string;
  status?: CreativeStatus | 'all' | '';
  material_type?: CreativeMaterialType | 'all' | '';
  platform?: CreativePlatform | 'all' | '';
  project_id?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type CreativeListResult = {
  items: CreativeAsset[];
  total: number;
  page: number;
  limit: number;
};

export type CreativeStats = {
  by_status: Record<CreativeStatus, number>;
  total: number;
  due_this_week: number;
  published_in_period: number;
  in_review: number;
};

export const CREATIVE_STATUSES: CreativeStatus[] = [
  'Draft',
  'In Review',
  'Completed',
  'Published',
  'Rejected',
];

export const CREATIVE_MATERIALS: CreativeMaterialType[] = [
  'Poster',
  'Reel',
  'Carousel',
  'Mockup Web',
  'Mockup App',
  'Tips',
  'Document',
  'Logo',
  'Brochure',
  'Other',
];

export const CREATIVE_PLATFORMS: CreativePlatform[] = [
  'Insta',
  'Web',
  'YouTube',
  'LinkedIn',
  'Other',
];

function authHeaders(json = true): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function listCreativeAssets(
  params: CreativeListParams = {}
): Promise<CreativeListResult> {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set('q', params.q.trim());
  if (params.status && params.status !== 'all') qs.set('status', params.status);
  if (params.material_type && params.material_type !== 'all') {
    qs.set('material_type', params.material_type);
  }
  if (params.platform && params.platform !== 'all') qs.set('platform', params.platform);
  if (params.project_id && params.project_id !== 'all') qs.set('project_id', params.project_id);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  qs.set('page', String(params.page ?? 1));
  qs.set('limit', String(params.limit ?? 20));

  const res = await fetch(`${ENV.API_URL}/creative/list.php?${qs}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return {
    items: data.data?.items ?? [],
    total: data.data?.total ?? 0,
    page: data.data?.page ?? 1,
    limit: data.data?.limit ?? 20,
  };
}

export async function getCreativeAsset(id: string): Promise<CreativeAsset> {
  const res = await fetch(
    `${ENV.API_URL}/creative/get.php?id=${encodeURIComponent(id)}`,
    { headers: authHeaders() }
  );
  const data = await parseJson(res);
  return data.data as CreativeAsset;
}

export async function createCreativeAsset(
  payload: CreativeAssetPayload
): Promise<CreativeAsset> {
  const res = await fetch(`${ENV.API_URL}/creative/create.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data as CreativeAsset;
}

export async function updateCreativeAsset(
  payload: CreativeAssetPayload & { id: string }
): Promise<CreativeAsset> {
  const res = await fetch(`${ENV.API_URL}/creative/update.php`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data as CreativeAsset;
}

export async function deleteCreativeAsset(id: string): Promise<void> {
  const res = await fetch(
    `${ENV.API_URL}/creative/delete.php?id=${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: authHeaders() }
  );
  await parseJson(res);
}

export async function reviewCreativeAsset(payload: {
  asset_id: string;
  status: CreativeReviewStatus;
  comments?: string | null;
}): Promise<CreativeAsset> {
  const res = await fetch(`${ENV.API_URL}/creative/review.php`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data as CreativeAsset;
}

export async function uploadCreativeFile(file: File): Promise<{
  file_path: string;
  file_name: string;
  file_size: number;
  preview_thumbnail_url?: string | null;
}> {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${ENV.API_URL}/creative/upload.php`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await parseJson(res);
  return data.data;
}

export async function getCreativeStats(params?: {
  from?: string;
  to?: string;
}): Promise<CreativeStats> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const res = await fetch(`${ENV.API_URL}/creative/stats.php?${qs}`, {
    headers: authHeaders(),
  });
  const data = await parseJson(res);
  return data.data as CreativeStats;
}
