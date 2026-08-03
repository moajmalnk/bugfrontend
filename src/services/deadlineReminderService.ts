import { apiClient } from '@/lib/axios';

export type DeadlineReminderItem = {
  id: number;
  project_id: string;
  project_name: string;
  milestone_key: string;
  milestone_label: string;
  reminder_offset: number;
  offset_label: string;
  milestone_date: string;
  sent_at: string;
  email_count: number;
  whatsapp_count: number;
  push_ok: boolean;
  status: 'sent' | 'partial' | 'failed' | string;
  error_summary?: string | null;
};

export type DeadlineReminderListResult = {
  items: DeadlineReminderItem[];
  page: number;
  limit: number;
  total: number;
};

export type DeadlineReminderTestResult = {
  project_id: string;
  project_name: string;
  milestone_key: string;
  milestone_label: string;
  milestone_date: string;
  offset: number;
  days_until: number;
  push: boolean;
  emails: number;
  whatsapp: number;
  errors: string[];
  test: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export const deadlineReminderService = {
  async getHistory(params?: {
    projectId?: string;
    page?: number;
    limit?: number;
  }): Promise<DeadlineReminderListResult> {
    const search = new URLSearchParams();
    if (params?.projectId) search.set('project_id', params.projectId);
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    const qs = search.toString();
    const response = await apiClient.get<ApiEnvelope<DeadlineReminderListResult>>(
      `/projects/deadline_reminders.php${qs ? `?${qs}` : ''}`
    );
    return (
      response.data.data ?? {
        items: [],
        page: 1,
        limit: params?.limit ?? 20,
        total: 0,
      }
    );
  },

  async sendTest(projectId: string, milestoneKey = 'deadline_date'): Promise<{
    success: boolean;
    message?: string;
    data?: DeadlineReminderTestResult;
  }> {
    const response = await apiClient.post<ApiEnvelope<DeadlineReminderTestResult>>(
      '/projects/send_deadline_reminder_test.php',
      { project_id: projectId, milestone_key: milestoneKey }
    );
    return {
      success: !!response.data.success,
      message: response.data.message,
      data: response.data.data,
    };
  },
};
