import { apiClient } from '@/lib/axios';

export interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  duration?: number;
  uploaded_by: string;
  created_at: string;
  full_url?: string;
}

export interface Update {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'updation' | 'maintenance';
  status: 'pending' | 'approved' | 'declined' | 'completed';
  project_name: string;
  project_id: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
  expected_date?: string;
  expected_time?: string;
  attachments?: Attachment[];
  screenshots?: Attachment[];
  files?: Attachment[];
  voice_notes?: Attachment[];
  attachments_count?: number;
}

class UpdateService {
  async getUpdates(): Promise<Update[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Update[] }>('/updates/getAll.php');
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error('Failed to fetch updates');
    } catch (error) {
     // console.error('Error fetching updates:', error);
      throw error;
    }
  }

  async getUpdatesByProject(projectId: string): Promise<Update[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Update[] }>(`/updates/getByProject.php?project_id=${projectId}`);
      if (response.data.success) {
        return response.data.data || [];
      }
      throw new Error('Failed to fetch project updates');
    } catch (error) {
     // console.error('Error fetching project updates:', error);
      throw error;
    }
  }

  async getUpdate(updateId: string): Promise<Update> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Update }>(`/updates/get.php?id=${updateId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Update not found or you do not have permission to view it.');
    } catch (error) {
      // console.error('Error fetching update:', error);
      throw error;
    }
  }

  async approveUpdate(updateId: string): Promise<string> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/updates/approve.php?id=${updateId}`);
      if (response.data.success) {
        return response.data.message || 'Update approved successfully.';
      }
      throw new Error(response.data.message || 'Failed to approve update.');
    } catch (error) {
      // console.error('Error approving update:', error);
      throw error;
    }
  }

  async declineUpdate(updateId: string): Promise<string> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/updates/decline.php?id=${updateId}`);
      if (response.data.success) {
        return response.data.message || 'Update declined successfully.';
      }
      throw new Error(response.data.message || 'Failed to decline update.');
    } catch (error) {
      // console.error('Error declining update:', error);
      throw error;
    }
  }

  async markAsCompleted(updateId: string): Promise<string> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(`/updates/complete.php?id=${updateId}`);
      if (response.data.success) {
        return response.data.message || 'Update marked as completed successfully.';
      }
      throw new Error(response.data.message || 'Failed to mark update as completed.');
    } catch (error) {
      // console.error('Error marking update as completed:', error);
      throw error;
    }
  }

  async deleteUpdate(updateId: string): Promise<string> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/updates/delete.php?id=${updateId}`);
      if (response.data.success) {
        return response.data.message || 'Update deleted successfully.';
      }
      throw new Error(response.data.message || 'Failed to delete update.');
    } catch (error) {
      // console.error('Error deleting update:', error);
      throw error;
    }
  }
}

export const updateService = new UpdateService(); 