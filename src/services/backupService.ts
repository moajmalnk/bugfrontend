import { apiClient } from '@/lib/axios';

export type BackupJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type BackupJob = {
  id: number;
  email: string;
  status: BackupJobStatus;
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
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  requested_by?: string | null;
};

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
  delivery_method: 'email';
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
    const response = await apiClient.post<{
      success: boolean;
      data?: { job_id?: number | null };
      message?: string;
    }>('/backup/create.php', payload);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to start backup');
    }

    return { job_id: response.data.data?.job_id ?? null };
  }
}

export const backupService = new BackupService();
