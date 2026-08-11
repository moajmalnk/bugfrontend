import { apiClient } from '@/lib/axios';
import { Bug } from '@/types';

export type { Bug };

export interface BugLifecycleStep {
  status: string;
  from_status?: string | null;
  entered_at?: string | null;
  exited_at?: string | null;
  duration_seconds?: number | null;
  duration_label?: string | null;
  is_current?: boolean;
  source?: string;
  actor_name?: string | null;
  /** raised | fixed | reopened | status_changed */
  event_label?: string | null;
  reason?: string | null;
}

export interface BugConversionEvent {
  from_project_id?: string | null;
  from_project_name?: string | null;
  to_project_id?: string | null;
  to_project_name?: string | null;
  actor_name?: string | null;
  created_at?: string | null;
  description?: string | null;
}

export interface BugLifecycle {
  bug_id: string;
  title?: string;
  status: string;
  priority?: string | null;
  bug_level?: string | null;
  already_raised?: number | null;
  project_id?: string | null;
  project_name?: string | null;
  raised_at?: string | null;
  resolved_at?: string | null;
  updated_at?: string | null;
  is_open?: boolean;
  rise_duration_seconds?: number | null;
  rise_duration_label?: string | null;
  fix_duration_seconds?: number | null;
  fix_duration_label?: string | null;
  age_seconds?: number | null;
  age_label?: string | null;
  wait_share_percent?: number | null;
  active_share_percent?: number | null;
  fix_to_cycle_percent?: number | null;
  status_timeline: BugLifecycleStep[];
  conversion_history?: BugConversionEvent[];
  activity_count?: number;
  actors?: {
    reporter_name?: string | null;
    updated_by_name?: string | null;
    fixed_by_name?: string | null;
  };
}

const API_ENDPOINT = '/bugs';

export type MonthlyOpsMonth = {
  month: string;
  label: string;
  bugs_created: number;
  bugs_fixed: number;
  bugs_declined: number;
  bugs_rejected: number;
  bugs_closed: number;
  bugs_high_created: number;
  updates_created: number;
  updates_completed: number;
  activity: number;
  fix_rate: number | null;
  close_rate: number | null;
  update_to_bug_ratio: number | null;
  avg_fix_duration_seconds: number | null;
  avg_fix_duration_label: string | null;
  avg_fix_days: number | null;
  fix_sample_count: number;
  retention_delta_days: number | null;
  retention_trend: "improving" | "slowing" | "stable" | null;
};

export type MonthlyOpsTimeline = {
  first_month: string;
  last_month: string;
  month_count: number;
  months: MonthlyOpsMonth[];
  totals: {
    bugs_created: number;
    bugs_fixed: number;
    bugs_declined: number;
    bugs_rejected: number;
    updates_created: number;
    updates_completed: number;
    bugs_high_created: number;
  };
  avg_fix_rate: number | null;
  avg_fix_duration_seconds: number | null;
  avg_fix_duration_label: string | null;
  avg_fix_days: number | null;
  fix_sample_count: number;
  retention_growth: {
    from_month: string;
    from_label: string;
    to_month: string;
    to_label: string;
    delta_days: number;
    delta_percent: number | null;
    direction: "improving" | "slowing" | "stable";
  } | null;
  fastest_month: {
    month: string;
    label: string;
    avg_fix_duration_label: string | null;
    avg_fix_days: number | null;
  } | null;
  slowest_month: {
    month: string;
    label: string;
    avg_fix_duration_label: string | null;
    avg_fix_days: number | null;
  } | null;
  peak_month: { month: string; label: string; activity: number } | null;
};

export type BugListParams = {
  projectId?: string | number;
  page?: number;
  limit?: number;
  /** Single status or CSV, e.g. "pending,in_progress" or "fixed,rejected" */
  status?: string;
  /** Reporter filter (reported_by) */
  userId?: string | number;
  search?: string;
  priority?: string;
  fixedBy?: string | number;
  bugTypeId?: string | number;
};

export const bugService = {
  async getBugs({
    projectId,
    page = 1,
    limit = 10,
    status,
    userId,
    search,
    priority,
    fixedBy,
    bugTypeId,
  }: BugListParams = {}): Promise<{ bugs: Bug[]; pagination: any }> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (projectId != null && projectId !== "" && projectId !== "all") {
      params.set("project_id", String(projectId));
    }
    if (status) params.set("status", String(status));
    if (userId != null && userId !== "" && userId !== "all") {
      params.set("user_id", String(userId));
    }
    if (search?.trim()) params.set("search", search.trim());
    if (priority && priority !== "all") params.set("priority", priority);
    if (fixedBy != null && fixedBy !== "" && fixedBy !== "all") {
      params.set("fixed_by", String(fixedBy));
    }
    if (bugTypeId != null && bugTypeId !== "" && bugTypeId !== "all") {
      params.set("bug_type_id", String(bugTypeId));
    }

    const response = await apiClient.get<{
      success: boolean;
      data: { bugs: Bug[]; pagination: any };
    }>(`/bugs/getAll.php?${params.toString()}`);
    if (response.data.success && response.data.data?.bugs) {
      const raw = Array.isArray(response.data.data.bugs) ? response.data.data.bugs : [];
      // Why: Guard against legacy API JOIN fan-out returning the same bug id multiple times.
      const seen = new Set<string>();
      const bugs = raw.filter((bug) => {
        const id = String(bug?.id ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return {
        bugs,
        pagination: response.data.data.pagination,
      };
    }
    return {
      bugs: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalBugs: 0,
        limit,
        counts: { open: 0, resolved: 0, myOpen: 0, myResolved: 0 },
      },
    };
  },

  /**
   * Why: Dashboard KPIs need full SQL COUNTs (optional from/to), not LIMIT samples.
   */
  async getDashboardStats(opts: { from?: string; to?: string } = {}): Promise<{
    from: string | null;
    to: string | null;
    pending: number;
    in_progress: number;
    fixed: number;
    declined: number;
    rejected: number;
    open: number;
    resolved: number;
    total: number;
    open_priority: { high: number; medium: number; low: number };
  }> {
    const params = new URLSearchParams();
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    const qs = params.toString();
    const response = await apiClient.get<{
      success: boolean;
      data: {
        from: string | null;
        to: string | null;
        pending: number;
        in_progress: number;
        fixed: number;
        declined: number;
        rejected: number;
        open: number;
        resolved: number;
        total: number;
        open_priority: { high: number; medium: number; low: number };
      };
      message?: string;
    }>(`/bugs/dashboardStats.php${qs ? `?${qs}` : ""}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to load dashboard bug stats");
  },

  /**
   * Why: Overview monthly timeline needs full SQL month buckets from first bug → now.
   */
  async getMonthlyTimeline(): Promise<MonthlyOpsTimeline> {
    const response = await apiClient.get<{
      success: boolean;
      data: MonthlyOpsTimeline;
      message?: string;
    }>("/bugs/monthlyTimeline.php");
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to load monthly timeline");
  },

  async getBug(id: string): Promise<Bug> {
    const response = await apiClient.get<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/get.php?id=${id}`);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to fetch bug');
  },

  async getBugLifecycle(id: string): Promise<BugLifecycle> {
    const response = await apiClient.get<{ success: boolean; data: BugLifecycle; message?: string }>(
      `${API_ENDPOINT}/lifecycle.php?id=${encodeURIComponent(id)}`
    );
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to fetch bug lifecycle');
  },

  async createBug(bugData: Omit<Bug, 'id' | 'created_at' | 'updated_at'>): Promise<Bug> {
    // Ensure dates are in Asia/Calcutta timezone when creating bugs
    const now = new Date();
    // Convert to Asia/Calcutta timezone (UTC+5:30)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const calcuttaTime = new Date(utcTime + (5.5 * 60 * 60000));
    
    const bugDataWithDates = {
      ...bugData,
      created_at: calcuttaTime.toISOString(),
      updated_at: calcuttaTime.toISOString(),
    };
    
    const response = await apiClient.post<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/create.php`, bugDataWithDates);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to create bug');
  },

  async updateBug(bug: Bug): Promise<Bug> {
    // Ensure updated_at is set to current Asia/Calcutta time
    const now = new Date();
    // Convert to Asia/Calcutta timezone (UTC+5:30)
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const calcuttaTime = new Date(utcTime + (5.5 * 60 * 60000));
    
    const updatedBug = {
      ...bug,
      updated_at: calcuttaTime.toISOString(),
    };
    
    const response = await apiClient.post<{ success: boolean, data: Bug }>(`${API_ENDPOINT}/update.php`, updatedBug);
    if(response.data.success) {
      return response.data.data;
    }
    throw new Error('Failed to update bug');
  },

  async convertBug(bugId: string, projectId: string): Promise<Bug> {
    const response = await apiClient.post<{ success: boolean; data: Bug; message?: string }>(
      `${API_ENDPOINT}/convert.php`,
      { bug_id: bugId, project_id: projectId }
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to convert bug');
  },

  async requestProjectAccess(
    bugId: string,
    payload: {
      project_id: string;
      intent: 'move' | 'to_update';
      update_type?: 'feature' | 'updation' | 'maintenance';
      note?: string;
    }
  ): Promise<{ bug_id: string; project_id: string; project_name: string; intent: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data?: {
        bug_id: string;
        project_id: string;
        project_name: string;
        intent: string;
      };
      message?: string;
    }>(`${API_ENDPOINT}/request_project_access.php`, {
      bug_id: bugId,
      ...payload,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to send access request');
  },

  async convertToUpdate(
    bugId: string,
    payload: { type: 'feature' | 'updation' | 'maintenance'; project_id?: string }
  ): Promise<{ update: { id: string; project_id: string; title?: string; project_name?: string }; update_id: string; bug_id: string }> {
    const response = await apiClient.post<{
      success: boolean;
      data?: { update: { id: string; project_id: string; title?: string; project_name?: string }; update_id: string; bug_id: string };
      message?: string;
    }>(`${API_ENDPOINT}/convert_to_update.php`, {
      bug_id: bugId,
      type: payload.type,
      project_id: payload.project_id,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to convert bug to update');
  },

  async deleteBug(id: string): Promise<void> {
    const response = await apiClient.delete<{ success: boolean }>(`${API_ENDPOINT}/delete.php?id=${id}`);
    if(!response.data.success) {
        throw new Error('Failed to delete bug');
    }
  }
};
