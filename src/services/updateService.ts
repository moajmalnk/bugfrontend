import { apiClient } from '@/lib/axios';

export interface Update {
  id: string;
  title: string;
  description: string;
  type: 'feature' | 'fix' | 'maintenance';
  project_name: string;
  created_by_id?: string | number;
  created_by: string;
  created_at: string;
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
}

export const updateService = new UpdateService(); 