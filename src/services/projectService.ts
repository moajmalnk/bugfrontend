import { api } from '@/lib/api';
import { ENV } from '@/lib/env';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectData {
  name: string;
  description: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
}

const API_URL = `${ENV.API_URL}/projects`;

class ProjectService {
  async getProjects(): Promise<Project[]> {
    try {
      const response = await fetch(`${API_URL}/getAll.php`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      
      throw new Error(data.message || 'Failed to fetch projects');
    } catch (error) {
      // // console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getProject(id: string): Promise<Project> {
    try {
      const response = await fetch(`${API_URL}/get.php?id=${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      
      throw new Error(data.message || 'Failed to fetch project');
    } catch (error) {
      // // console.error('Error fetching project:', error);
      throw error;
    }
  }

  async createProject(projectData: CreateProjectData): Promise<Project> {
    try {
      const response = await fetch(`${API_URL}/create.php`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      
      throw new Error(data.message || 'Failed to create project');
    } catch (error) {
      // // console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: UpdateProjectData): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/update.php?id=${id}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to update project');
      }
    } catch (error) {
      // // console.error('Error updating project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService(); 