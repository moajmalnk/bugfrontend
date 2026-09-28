import { apiClient } from '@/lib/axios';

export type BackupJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type BackupMailStatus = 'pending' | 'sent' | 'error_sent' | 'failed';

export type BackupStage =
  | 'queued'
  | 'database'
  | 'files'
  | 'finalizing'
  | 'emailing'
  | 'completed'
  | 'failed';

export type BackupDownload = {
  type: 'database' | 'files';
  label: string;
  file: string;
  size_bytes: number;
  size_label: string;
  sha256: string | null;
  url: string;
};

export type BackupJob = {
  id: number;
  email: string;
  status: BackupJobStatus;
  mail_status: BackupMailStatus;
  mail_error?: string | null;
  delivery_method: string;
  include_database: boolean;
  include_uploads: boolean;
  include_config: boolean;
  backup_name: string | null;
  file_size_bytes: number | null;
  file_size_label?: string;
  table_count: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  status_detail?: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  requested_by?: string | null;
  stage?: BackupStage | null;
  progress_percent?: number | null;
  expires_at?: string | null;
  downloads?: BackupDownload[];
};

function apiErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: string } } } | null)?.response?.data?.message;
  if (message) return message;
  return error instanceof Error ? error.message : fallback;
}

export type BackupStats = {
  database: {
    tables: number;
    size_bytes: number;
    size_label: string;
  };
  uploads: {
    size_bytes: number;
    size_label: string;
    path_exists: boolean;
  };
  estimate: {
    total_bytes: number;
    total_label: string;
    eta_seconds?: number;
    eta_label?: string;
  };
  jobs: {
    active: number;
    completed: number;
  };
  last_backup: BackupJob | null;
  server_time: string;
};

export type CreateBackupPayload = {
  email: string;
  include_database: boolean;
  include_uploads: boolean;
  include_config: boolean;
  delivery_method: 'email_link';
};

class BackupService {
  async getStats(): Promise<BackupStats> {
    const response = await apiClient.get<{
      success: boolean;
      data: BackupStats;
      message?: string;
    }>('/backup/stats.php');

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load backup stats');
    }

    return response.data.data;
  }

  async getHistory(limit = 20): Promise<BackupJob[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: { items: BackupJob[] };
      message?: string;
    }>(`/backup/history.php?limit=${limit}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to load backup history');
    }

    return response.data.data.items;
  }

  async createBackup(payload: CreateBackupPayload): Promise<{ job_id: number | null }> {
    let response;
    try {
      response = await apiClient.post<{
        success: boolean;
        data?: { job_id?: number | null };
        message?: string;
      }>('/backup/create.php', payload);
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Failed to start backup'));
    }

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to start backup');
    }

    return { job_id: response.data.data?.job_id ?? null };
  }
}

export const backupService = new BackupService();
