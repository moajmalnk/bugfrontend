import { apiClient } from '@/lib/axios';
import {
  ProjectComplianceData,
  ProjectComplianceSummary,
} from '@/lib/codo/complianceRules';
import { ProjectStatus } from '@/lib/utils/projectUtils';

class ComplianceService {
  async getCompliance(projectId: string): Promise<ProjectComplianceData> {
    const response = await apiClient.get<{
      success: boolean;
      data: ProjectComplianceData;
      message?: string;
    }>(`/projects/compliance/get.php?project_id=${encodeURIComponent(projectId)}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to fetch compliance data');
    }
    return response.data.data;
  }

  async toggleCheck(
    projectId: string,
    phase: 'developer' | 'tester' | 'project',
    ruleKey: string,
    verified: boolean
  ): Promise<ProjectComplianceData> {
    const response = await apiClient.put<{
      success: boolean;
      data: ProjectComplianceData;
      message?: string;
    }>('/projects/compliance/toggle_check.php', {
      project_id: projectId,
      phase,
      rule_key: ruleKey,
      verified,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to update compliance check');
    }
    return response.data.data;
  }

  async authorizeEmergencyBypass(
    projectId: string,
    reason: string
  ): Promise<ProjectComplianceData> {
    const response = await apiClient.post<{
      success: boolean;
      data: ProjectComplianceData;
      message?: string;
    }>('/projects/compliance/emergency_bypass.php', {
      project_id: projectId,
      reason,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to authorize emergency bypass');
    }
    return response.data.data;
  }

  async finalizeStatus(
    projectId: string,
    status: Extract<ProjectStatus, 'completed' | 'release_ready'>
  ): Promise<ProjectComplianceData> {
    const response = await apiClient.put<{
      success: boolean;
      data: ProjectComplianceData;
      message?: string;
    }>('/projects/compliance/finalize_status.php', {
      project_id: projectId,
      status,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to finalize project status');
    }
    return response.data.data;
  }

  async addCustomRule(
    projectId: string,
    phase: 'developer' | 'tester' | 'project',
    payload: { title: string; description: string; subtitle?: string }
  ): Promise<ProjectComplianceData> {
    const response = await apiClient.post<{
      success: boolean;
      data: ProjectComplianceData;
      message?: string;
    }>('/projects/compliance/add_rule.php', {
      project_id: projectId,
      phase,
      title: payload.title,
      description: payload.description,
      subtitle: payload.subtitle,
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Failed to add custom rule');
    }
    return response.data.data;
  }
}

export const complianceService = new ComplianceService();

export type { ProjectComplianceData, ProjectComplianceSummary };
