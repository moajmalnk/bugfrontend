import { apiClient } from '@/lib/axios';
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
      const response = await apiClient.get<{ success: boolean; data: Project[] }>('/projects/getAll.php');
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
    //console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getProject(id: string): Promise<Project> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Project }>(`/projects/get.php?id=${id}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to fetch project');
    } catch (error) {
      // // console.error('Error fetching project:', error);
      throw error;
    }
  }

  async createProject(projectData: CreateProjectData): Promise<Project> {
    try {
      const response = await apiClient.post<{ success: boolean; data: Project }>('/projects/create.php', projectData);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error('Failed to create project');
    } catch (error) {
      // // console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: string, projectData: UpdateProjectData): Promise<void> {
    try {
      const response = await apiClient.put<{ success: boolean }>(`/projects/update.php?id=${id}`, projectData);
      if (!response.data.success) {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      // // console.error('Error updating project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService(); 