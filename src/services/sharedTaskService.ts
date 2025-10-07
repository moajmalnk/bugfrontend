import { ENV } from '@/lib/env';

export interface SharedTask {
  id?: number;
  title: string;
  description?: string;
  created_by: string;
  created_by_name?: string;
  assigned_to: string;
  assigned_to_name?: string;
  approved_by?: string;
  approved_by_name?: string;
  completed_by?: string;
  completed_by_name?: string;
  project_id?: string;
  project_ids?: string[];
  project_names?: string[];
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  priority: 'low' | 'medium' | 'high';
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
}

const API_BASE = `${ENV.API_URL}/tasks`;

const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const sharedTaskService = {
  // Get all shared tasks for current user
  async getSharedTasks(status?: string): Promise<SharedTask[]> {
    try {
      const url = status 
        ? `${API_BASE}/shared_tasks_get.php?status=${status}`
        : `${API_BASE}/shared_tasks_get.php`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch shared tasks');
      }

      return data.data || [];
    } catch (error: any) {
      console.error('Error fetching shared tasks:', error);
      throw error;
    }
  },

  // Create a new shared task
  async createSharedTask(task: SharedTask): Promise<SharedTask> {
    try {
      const response = await fetch(`${API_BASE}/shared_tasks_create.php`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(task),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create shared task');
      }

      return data.data;
    } catch (error: any) {
      console.error('Error creating shared task:', error);
      throw error;
    }
  },

  // Update a shared task
  async updateSharedTask(task: Partial<SharedTask> & { id: number }): Promise<SharedTask> {
    try {
      const response = await fetch(`${API_BASE}/shared_tasks_update.php`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(task),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to update shared task');
      }

      return data.data;
    } catch (error: any) {
      console.error('Error updating shared task:', error);
      throw error;
    }
  },

  // Delete a shared task
  async deleteSharedTask(taskId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/shared_tasks_delete.php?id=${taskId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete shared task');
      }
    } catch (error: any) {
      console.error('Error deleting shared task:', error);
      throw error;
    }
  },
};

