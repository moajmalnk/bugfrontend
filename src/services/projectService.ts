import { apiClient } from '@/lib/axios';
import { bugService } from '@/services/bugService';
import type {
  UserPortfolioWorkItem,
} from '@/services/userService';
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
  parseProjectPlatforms,
  PROJECT_PLATFORM_OPTIONS,
} from '@/lib/utils/projectUtils';

export type ProjectBugStats = {
  total: number;
  open: number;
  fixed: number;
};

export type ProjectMemberStats = {
  total: number;
  developers: number;
  testers: number;
};

export type ProjectStatsBundle = {
  bugs: Record<string, ProjectBugStats>;
  members: Record<string, ProjectMemberStats>;
  memberships: Record<string, boolean>;
};

function hasStatsData(bundle: ProjectStatsBundle): boolean {
  return Object.keys(bundle.bugs).length > 0 || Object.keys(bundle.members).length > 0;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = new Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        results[index] = await mapper(items[index]);
      }
    });

  await Promise.all(workers);
  return results;
}

function countBugsFromList(bugs: Array<{ status: string }>) {
  const open = bugs.filter(
    (bug) => bug.status === 'pending' || bug.status === 'in_progress'
  ).length;
  const fixed = bugs.filter((bug) => bug.status === 'fixed').length;
  return {
    total: bugs.length,
    open,
    fixed,
  };
}

export type ProjectAnalyticsSummary = {
  bugs: number;
  fixes: number;
  updates: number;
  open: number;
  members?: number;
  avg_rise_duration_seconds?: number | null;
  avg_rise_duration_label?: string | null;
  avg_fix_duration_seconds?: number | null;
  avg_fix_duration_label?: string | null;
};

export type ProjectAnalyticsData = {
  project: {
    id: string;
    name: string;
    status?: string | null;
    is_active?: number | null;
    created_at?: string | null;
    member_count?: number;
    counts: {
      bugs: number;
      fixes: number;
      updates: number;
      open: number;
    };
  };
  summary: ProjectAnalyticsSummary;
  bugs: UserPortfolioWorkItem[];
  fixes: UserPortfolioWorkItem[];
  updates: UserPortfolioWorkItem[];
};

class ProjectService {
  async getProjectStats(): Promise<ProjectStatsBundle> {
    const empty: ProjectStatsBundle = { bugs: {}, members: {}, memberships: {} };
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ProjectStatsBundle;
      }>('/projects/get_project_stats.php');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return empty;
    } catch {
      return empty;
    }
  }

  async fetchProjectStatsFromBugs(projects: Project[]): Promise<ProjectStatsBundle> {
    const bundle: ProjectStatsBundle = { bugs: {}, members: {}, memberships: {} };
    if (projects.length === 0) {
      return bundle;
    }

    const [bugResults, memberResults] = await Promise.all([
      mapWithConcurrency(projects, 6, async (project) => {
        try {
          const { bugs, pagination } = await bugService.getBugs({
            projectId: project.id,
            page: 1,
            limit: 1000,
          });
          const counts = countBugsFromList(bugs);
          if (pagination?.totalBugs > bugs.length) {
            counts.total = pagination.totalBugs;
          }
          return { projectId: String(project.id), ...counts };
        } catch {
          return { projectId: String(project.id), total: 0, open: 0, fixed: 0 };
        }
      }),
      mapWithConcurrency(projects, 6, async (project) => {
        try {
          const response = await apiClient.get<{
            success: boolean;
            data?: { members?: Array<{ role?: string }> };
          }>(`/projects/get_members.php?project_id=${project.id}`);
          const memberList = response.data.success ? response.data.data?.members || [] : [];
          return {
            projectId: String(project.id),
            total: memberList.length,
            developers: memberList.filter((m) => m.role === 'developer').length,
            testers: memberList.filter((m) => m.role === 'tester').length,
          };
        } catch {
          return {
            projectId: String(project.id),
            total: project.members?.length ?? 0,
            developers: 0,
            testers: 0,
          };
        }
      }),
    ]);

    bugResults.forEach(({ projectId, total, open, fixed }) => {
      bundle.bugs[projectId] = { total, open, fixed };
    });
    memberResults.forEach(({ projectId, total, developers, testers }) => {
      bundle.members[projectId] = { total, developers, testers };
    });

    return bundle;
  }

  async resolveProjectStats(projects: Project[]): Promise<ProjectStatsBundle> {
    const embedded = projects.some((p) => p.bug_stats || p.member_stats);
    if (embedded) {
      const bundle: ProjectStatsBundle = { bugs: {}, members: {}, memberships: {} };
      projects.forEach((project) => {
        if (project.bug_stats) {
          bundle.bugs[project.id] = { ...project.bug_stats };
        }
        if (project.member_stats) {
          bundle.members[project.id] = { ...project.member_stats };
        }
      });
      return bundle;
    }

    const fromEndpoint = await this.getProjectStats();
    if (hasStatsData(fromEndpoint)) {
      return fromEndpoint;
    }

    return this.fetchProjectStatsFromBugs(projects);
  }

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

  async getProjectWorkActivity(
    projectId: string,
    params: { from?: string; to?: string } = {}
  ) {
    const empty = { project_id: projectId, from: '', to: '', entries: [] as unknown[] };

    const parse = (data: { success?: boolean; data?: unknown }) => {
      const payload = data?.success ? data.data : null;
      if (payload && typeof payload === 'object' && Array.isArray((payload as { entries?: unknown }).entries)) {
        return payload as typeof empty;
      }
      return empty;
    };

    const qs = new URLSearchParams({
      id: projectId,
      work_activity: '1',
      ...(params.from ? { from: params.from } : {}),
      ...(params.to ? { to: params.to } : {}),
    });

    try {
      const response = await apiClient.get<{ success: boolean; data: unknown }>(
        `/projects/get.php?${qs.toString()}`
      );
      return parse(response.data);
    } catch {
      return empty;
    }
  }

  async getUserAssignedProjects(userId: string): Promise<UserAssignedProject[]> {
    const response = await apiClient.get<{
      success: boolean;
      data?: { projects?: UserAssignedProject[] };
      message?: string;
    }>(`/projects/get_user_projects.php?user_id=${encodeURIComponent(userId)}`);

    if (response.data.success) {
      return response.data.data?.projects || [];
    }
    throw new Error(response.data.message || 'Failed to load user projects');
  }

  async addProjectMember(
    projectId: string,
    userId: string,
    role: string
  ): Promise<void> {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      '/projects/add_member.php',
      { project_id: projectId, user_id: userId, role }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to assign project');
    }
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      '/projects/remove_member.php',
      { project_id: projectId, user_id: userId }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to remove from project');
    }
  }

  async getProjectAnalytics(projectId: string): Promise<ProjectAnalyticsData> {
    const response = await apiClient.get<{
      success: boolean;
      data: ProjectAnalyticsData;
      message?: string;
    }>(`/projects/analytics.php?project_id=${encodeURIComponent(projectId)}`);

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to load project analytics');
  }
}

export type UserAssignedProject = {
  id: string;
  name: string;
  status?: string;
  description?: string | null;
  member_role?: string;
  joined_at?: string;
};

export const projectService = new ProjectService();
