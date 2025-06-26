import { Bug } from '@/types';
import { apiClient } from '@/lib/axios';

export type { Bug };

const API_ENDPOINT = '/bugs';

export const bugService = {
  async getBugs(projectId?: string, page: number = 1, limit: number = 10): Promise<{ bugs: Bug[], pagination: any }> {
    let url = projectId
      ? `${API_ENDPOINT}/getAll.php?project_id=${projectId}&page=${page}&limit=${limit}`
      : `${API_ENDPOINT}/getAll.php?page=${page}&limit=${limit}`;
    const response = await apiClient.get<{ success: boolean, data: { bugs: Bug[], pagination: any } }>(url);
    if (response.data.success && response.data.data?.bugs) {
      return {
        bugs: Array.isArray(response.data.data.bugs) ? response.data.data.bugs : [],
        pagination: response.data.data.pagination
      };
    }
    return { bugs: [], pagination: { currentPage: 1, totalPages: 1, totalBugs: 0, limit } };
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