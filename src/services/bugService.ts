import { Bug } from '@/types';
import { apiClient } from '@/lib/axios';

export type { Bug };

const API_ENDPOINT = '/bugs';

export const bugService = {
  async getBugs(projectId?: string): Promise<Bug[]> {
    const url = projectId ? `${API_ENDPOINT}/getAll.php?project_id=${projectId}` : `${API_ENDPOINT}/getAll.php`;
    const response = await apiClient.get<{ success: boolean, data: { bugs: Bug[] } }>(url);
    if (response.data.success && response.data.data?.bugs) {
      return Array.isArray(response.data.data.bugs) ? response.data.data.bugs : [];
    }
    return [];
  },

  async getBug(id: string): Promise<Bug> {
    const response = await apiClient.get<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/get.php?id=${id}`);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch bug');
  },

  async createBug(bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    const response = await apiClient.post<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/create.php`, bugData);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to create bug');
  },

  async updateBug(bug: Bug): Promise<Bug> {
    const response = await apiClient.post<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/update.php`, bug);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to update bug');
  },

  async deleteBug(id: string): Promise<void> {
    const response = await apiClient.delete<{ success: boolean }>(`${API_ENDPOINT}/delete.php?id=${id}`);
    if(!response.data.success) {
        throw new Error('Failed to delete bug');
    }
  }
}; 