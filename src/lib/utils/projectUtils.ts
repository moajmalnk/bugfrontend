export type ProjectStatus = 'active' | 'completed' | 'archived' | 'release_ready';
export type ClientAccountStatus = 'active' | 'inactive';
export type ProjectMemberRole = 'manager' | 'developer' | 'tester';

import type { ClientSummary } from '@/types';

export interface ProjectComplianceSummaryLite {
  pipeline_stage: string;
  developer_verified: number;
  developer_total: number;
  tester_verified: number;
  tester_total: number;
  project_verified: number;
  project_total: number;
  emergency_bypass: boolean;
}

export interface ProjectMemberDetail {
  user_id: string;
  role: ProjectMemberRole;
  username?: string;
  email?: string;
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  uploaded_by?: string;
  created_at?: string;
}

export interface ProjectBugStatsLite {
  total: number;
  open: number;
  fixed: number;
}

export interface ProjectMemberStatsLite {
  total: number;
  developers: number;
  testers: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  client_id?: string | null;
  client?: ClientSummary | null;
  client_name?: string | null;
  client_location?: string | null;
  client_contact_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_account_status?: ClientAccountStatus;
  technology_stack?: string | null;
  reference_sites_or_themes?: string | null;
  start_date?: string | null;
  deadline_date?: string | null;
  expected_publish_date?: string | null;
  testing_start_date?: string | null;
  testing_end_date?: string | null;
  frontend_finish_date?: string | null;
  backend_finish_date?: string | null;
  members?: string[];
  members_detail?: ProjectMemberDetail[];
  bug_stats?: ProjectBugStatsLite;
  member_stats?: ProjectMemberStatsLite;
  attachments?: ProjectAttachment[];
  compliance?: ProjectComplianceSummaryLite;
}

export type ExtractedProjectStats = {
  bugs: Record<string, number>;
  open: Record<string, number>;
  fixed: Record<string, number>;
  members: Record<string, ProjectMemberStatsLite>;
  hasEmbeddedStats: boolean;
};

export function extractStatsFromProjects(projects: Project[]): ExtractedProjectStats {
  const bugs: Record<string, number> = {};
  const open: Record<string, number> = {};
  const fixed: Record<string, number> = {};
  const members: Record<string, ProjectMemberStatsLite> = {};
  let hasEmbeddedStats = false;

  projects.forEach((project) => {
    if (project.bug_stats) {
      hasEmbeddedStats = true;
      bugs[project.id] = project.bug_stats.total;
      open[project.id] = project.bug_stats.open;
      fixed[project.id] = project.bug_stats.fixed;
    }
    if (project.member_stats) {
      hasEmbeddedStats = true;
      members[project.id] = {
        total: project.member_stats.total,
        developers: project.member_stats.developers,
        testers: project.member_stats.testers,
      };
    }
  });

  return { bugs, open, fixed, members, hasEmbeddedStats };
}

export interface ProjectMemberInput {
  user_id: string;
  role: ProjectMemberRole;
}

export interface CreateProjectData {
  name: string;
  description: string;
  status?: ProjectStatus;
  client_id?: string | null;
  client_name?: string;
  client_location?: string;
  client_contact_name?: string;
  client_email?: string;
  client_phone?: string;
  client_account_status?: ClientAccountStatus;
  technology_stack?: string;
  reference_sites_or_themes?: string;
  start_date?: string;
  deadline_date?: string;
  expected_publish_date?: string;
  testing_start_date?: string;
  testing_end_date?: string;
  frontend_finish_date?: string;
  backend_finish_date?: string;
  members?: ProjectMemberInput[];
}

export type UpdateProjectData = Partial<CreateProjectData>;

export interface ProjectFormValues {
  name: string;
  description: string;
  status: ProjectStatus;
  client_id: string;
  client_name: string;
  client_location: string;
  client_contact_name: string;
  client_email: string;
  client_phone: string;
  client_account_status: ClientAccountStatus;
  technology_stack: string;
  reference_sites_or_themes: string;
  start_date: string;
  deadline_date: string;
  expected_publish_date: string;
  testing_start_date: string;
  testing_end_date: string;
  frontend_finish_date: string;
  backend_finish_date: string;
  project_lead_id: string;
  developer_ids: string[];
  tester_ids: string[];
}

export const emptyProjectFormValues = (): ProjectFormValues => ({
  name: '',
  description: '',
  status: 'active',
  client_id: '',
  client_name: '',
  client_location: '',
  client_contact_name: '',
  client_email: '',
  client_phone: '',
  client_account_status: 'active',
  technology_stack: '',
  reference_sites_or_themes: '',
  start_date: '',
  deadline_date: '',
  expected_publish_date: '',
  testing_start_date: '',
  testing_end_date: '',
  frontend_finish_date: '',
  backend_finish_date: '',
  project_lead_id: '',
  developer_ids: [],
  tester_ids: [],
});

export function projectToFormValues(project: Project): ProjectFormValues {
  const members = project.members_detail || [];
  return {
    name: project.name || '',
    description: project.description || '',
    status: project.status || 'active',
    client_id: project.client_id || project.client?.id || '',
    client_name: project.client?.corporate_name || project.client_name || '',
    client_location: project.client_location || '',
    client_contact_name: project.client_contact_name || '',
    client_email: project.client_email || '',
    client_phone: project.client_phone || '',
    client_account_status: project.client_account_status || 'active',
    technology_stack: project.technology_stack || '',
    reference_sites_or_themes: project.reference_sites_or_themes || '',
    start_date: project.start_date || '',
    deadline_date: project.deadline_date || '',
    expected_publish_date: project.expected_publish_date || '',
    testing_start_date: project.testing_start_date || '',
    testing_end_date: project.testing_end_date || '',
    frontend_finish_date: project.frontend_finish_date || '',
    backend_finish_date: project.backend_finish_date || '',
    project_lead_id: members.find((m) => m.role === 'manager')?.user_id || '',
    developer_ids: members.filter((m) => m.role === 'developer').map((m) => m.user_id),
    tester_ids: members.filter((m) => m.role === 'tester').map((m) => m.user_id),
  };
}

export function formValuesToPayload(values: ProjectFormValues): CreateProjectData {
  const members: ProjectMemberInput[] = [];
  if (values.project_lead_id) {
    members.push({ user_id: values.project_lead_id, role: 'manager' });
  }
  values.developer_ids.forEach((userId) => {
    if (userId) members.push({ user_id: userId, role: 'developer' });
  });
  values.tester_ids.forEach((userId) => {
    if (userId) members.push({ user_id: userId, role: 'tester' });
  });

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    status: values.status,
    client_id: values.client_id.trim() || null,
    client_name: values.client_name.trim() || undefined,
    client_location: values.client_location.trim() || undefined,
    client_contact_name: values.client_contact_name.trim() || undefined,
    client_email: values.client_email.trim() || undefined,
    client_phone: values.client_phone.trim() || undefined,
    client_account_status: values.client_account_status,
    technology_stack: values.technology_stack.trim() || undefined,
    reference_sites_or_themes: values.reference_sites_or_themes.trim() || undefined,
    start_date: values.start_date || undefined,
    deadline_date: values.deadline_date || undefined,
    expected_publish_date: values.expected_publish_date || undefined,
    testing_start_date: values.testing_start_date || undefined,
    testing_end_date: values.testing_end_date || undefined,
    frontend_finish_date: values.frontend_finish_date || undefined,
    backend_finish_date: values.backend_finish_date || undefined,
    members,
  };
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  switch (status) {
    case 'active':
      return 'Ongoing';
    case 'completed':
      return 'Completed';
    case 'archived':
      return 'Archived';
    case 'release_ready':
      return 'Release Ready';
    default:
      return status;
  }
}

export function computeProjectDurationDays(project: Pick<Project, 'start_date' | 'created_at' | 'deadline_date' | 'status'>): number {
  const start = project.start_date || project.created_at?.slice(0, 10);
  if (!start) return 0;

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return 0;

  const end = project.deadline_date ? new Date(project.deadline_date) : new Date();
  const diffMs = end.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatProjectDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}
