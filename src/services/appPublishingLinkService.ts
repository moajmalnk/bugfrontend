import { apiClient } from '@/lib/axios';
import { ENV } from '@/lib/env';
import type { AppPublishingFormData } from '@/lib/utils/appPublishingForm';
import type { ProjectAttachment } from '@/lib/utils/projectUtils';

export type AppFormLinkStatus = 'active' | 'submitted' | 'revoked' | 'expired';

export interface AppFormActiveLink {
  token: string;
  status: AppFormLinkStatus;
  created_at: string;
  expires_at: string;
}

export interface AppFormLinkHistoryItem {
  id: string;
  status: AppFormLinkStatus;
  created_at: string;
  expires_at: string;
  submitted_at?: string | null;
  revoked_at?: string | null;
}

export interface AppFormLinkManageResponse {
  project_id: string;
  project_name: string;
  app_publishing_form?: string | null;
  active_link: AppFormActiveLink | null;
  history: AppFormLinkHistoryItem[];
}

export interface PublicAppFormResponse {
  link: {
    status: AppFormLinkStatus;
    expires_at?: string | null;
    submitted_at?: string | null;
    created_at?: string | null;
  };
  can_edit: boolean;
  project: {
    name: string;
    client_name?: string | null;
    client_contact_name?: string | null;
    client_phone?: string | null;
    platforms?: string | null;
    app_publishing_form?: string | null;
  };
  attachments: ProjectAttachment[];
  message?: string | null;
}

export function buildAppPublishPublicUrl(token: string): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://bugs.bugricer.com';
  return `${origin}/app-publish/${encodeURIComponent(token)}`;
}

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENV.API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  return body.data as T;
}

export const appPublishingLinkService = {
  async getManageState(projectId: string): Promise<AppFormLinkManageResponse> {
    const response = await apiClient.get<{
      success: boolean;
      data: AppFormLinkManageResponse;
    }>(`/projects/app_publishing_link.php?project_id=${encodeURIComponent(projectId)}`);
    if (!response.data.success) {
      throw new Error('Could not load share link');
    }
    return response.data.data;
  },

  async createLink(
    projectId: string,
    validDays = 14
  ): Promise<AppFormActiveLink> {
    const response = await apiClient.post<{
      success: boolean;
      data: AppFormActiveLink;
      message?: string;
    }>('/projects/app_publishing_link.php', {
      project_id: projectId,
      valid_days: validDays,
    });
    if (!response.data.success || !response.data.data?.token) {
      throw new Error(response.data.message || 'Could not create share link');
    }
    return response.data.data;
  },

  async revokeLink(projectId: string): Promise<void> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      `/projects/app_publishing_link.php?project_id=${encodeURIComponent(projectId)}`,
      { data: { project_id: projectId } }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Could not revoke link');
    }
  },

  async getPublicForm(token: string): Promise<PublicAppFormResponse> {
    return publicJson<PublicAppFormResponse>(
      `/public/app_publishing_form.php?token=${encodeURIComponent(token)}`
    );
  },

  async savePublicForm(
    token: string,
    form: AppPublishingFormData,
    intent: 'draft' | 'submit'
  ): Promise<{ link: { status: string }; form: AppPublishingFormData }> {
    return publicJson(`/public/app_publishing_form.php`, {
      method: 'POST',
      body: JSON.stringify({ token, intent, form }),
    });
  },

  async uploadPublicAssets(
    token: string,
    folder: string,
    files: File[]
  ): Promise<ProjectAttachment[]> {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('folder', folder);
    files.forEach((file) => formData.append('files[]', file));

    const res = await fetch(`${ENV.API_URL}/public/app_publishing_upload.php`, {
      method: 'POST',
      body: formData,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.success === false) {
      throw new Error(body?.message || 'Upload failed');
    }
    return (body.data || []) as ProjectAttachment[];
  },
};
