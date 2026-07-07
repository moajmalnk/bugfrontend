import { apiClient } from '@/lib/axios';
import { CommonBug, CommonBugsSummary } from '@/types';

export type CommonBugReasonFilter = 'all' | 'already_raised' | 'duplicate';

export const commonBugsService = {
  async getCommonBugs({
    page = 1,
    limit = 20,
    projectId,
    reason = 'all',
  }: {
    page?: number;
    limit?: number;
    projectId?: string;
    reason?: CommonBugReasonFilter;
  } = {}): Promise<{
    bugs: CommonBug[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalBugs: number;
      limit: number;
    };
    summary: CommonBugsSummary;
  }> {
    let url = `/bugs/getCommon.php?page=${page}&limit=${limit}&reason=${reason}`;
    if (projectId) {
      url += `&project_id=${encodeURIComponent(projectId)}`;
    }

    const response = await apiClient.get<{
      success: boolean;
      data: {
        bugs: CommonBug[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalBugs: number;
          limit: number;
        };
        summary: CommonBugsSummary;
      };
    }>(url);

    if (response.data.success && response.data.data) {
      return {
        bugs: Array.isArray(response.data.data.bugs) ? response.data.data.bugs : [],
        pagination: response.data.data.pagination ?? {
          currentPage: 1,
          totalPages: 1,
          totalBugs: 0,
          limit,
        },
        summary: response.data.data.summary ?? {
          total: 0,
          already_raised_count: 0,
          duplicate_count: 0,
        },
      };
    }

    return {
      bugs: [],
      pagination: { currentPage: 1, totalPages: 1, totalBugs: 0, limit },
      summary: { total: 0, already_raised_count: 0, duplicate_count: 0 },
    };
  },
};
