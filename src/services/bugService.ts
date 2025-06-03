import { Bug } from '@/types';
import { ENV } from '@/lib/env';

export type { Bug };

const API_URL = `${ENV.API_URL}/bugs`;

export const bugService = {
  async getBugs(projectId?: string): Promise<Bug[]> {
    try {
      const url = projectId ? `${API_URL}/getAll.php?project_id=${projectId}` : `${API_URL}/getAll.php`;
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bugs');
      }

      const data = await response.json();
      return Array.isArray(data.data?.bugs) ? data.data.bugs : [];
    } catch (error) {
      // // // console.error('Error fetching bugs:', error);
      throw error;
    }
  },

  async getBug(id: string): Promise<Bug> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/get.php?id=${id}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bug');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      // // // console.error('Error fetching bug:', error);
      throw error;
    }
  },

  async createBug(bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/create.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bugData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create bug');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      // // // console.error('Error creating bug:', error);
      throw error;
    }
  },

  async updateBug(bug: Bug): Promise<Bug> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/update.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bug)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update bug');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      // // // console.error('Error updating bug:', error);
      throw error;
    }
  },

  async deleteBug(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/delete.php?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete bug');
      }
    } catch (error) {
      // // // console.error('Error deleting bug:', error);
      throw error;
    }
  }
}; 