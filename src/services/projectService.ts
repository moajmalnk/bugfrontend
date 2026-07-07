import { apiClient } from '@/lib/axios';
import {
  CreateProjectData,
  Project,
  ProjectAttachment,
  UpdateProjectData,
} from '@/lib/utils/projectUtils';

export type {
  CreateProjectData,
  Project,
  ProjectAttachment,
  ProjectFormValues,
  ProjectMemberDetail,
  ProjectMemberInput,
  ProjectStatus,
  UpdateProjectData,
} from '@/lib/utils/projectUtils';

export {
  emptyProjectFormValues,
  formValuesToPayload,
  projectToFormValues,
  getProjectStatusLabel,
  computeProjectDurationDays,
  formatProjectDate,
} from '@/lib/utils/projectUtils';

class ProjectService {
  async getProjects(): Promise<Project[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Project[]; message?: string }>('/projects/getAll.php');
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      throw error;
    }
  }

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get<{ success: boolean; data: Project }>(`/projects/get.php?id=${id}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch project');
  }

  async createProject(projectData: CreateProjectData): Promise<Project> {
    const response = await apiClient.post<{ success: boolean; data: Project }>('/projects/create.php', projectData);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to create project');
  }

  async updateProject(id: string, projectData: UpdateProjectData): Promise<void> {
    const response = await apiClient.put<{ success: boolean }>(`/projects/update.php?id=${id}`, projectData);
    if (!response.data.success) {
      throw new Error('Failed to update project');
    }
  }

  async getAttachments(projectId: string): Promise<ProjectAttachment[]> {
    const response = await apiClient.get<{ success: boolean; data: ProjectAttachment[] }>(
      `/projects/get_attachments.php?project_id=${projectId}`
    );
    if (response.data.success) {
      return response.data.data || [];
    }
    return [];
  }

  async uploadAttachments(projectId: string, files: File[]): Promise<ProjectAttachment[]> {
    if (files.length === 0) return [];

    const formData = new FormData();
    formData.append('project_id', projectId);
    files.forEach((file) => formData.append('files[]', file));

    const response = await apiClient.post<{ success: boolean; data: ProjectAttachment[] }>(
      '/projects/upload_attachment.php',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.data.success) {
      return response.data.data || [];
    }
    throw new Error('Failed to upload attachments');
  }
}

export const projectService = new ProjectService();
