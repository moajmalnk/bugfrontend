import { ENV } from '@/lib/env';
import { User, UserRole } from '@/types';
import axios from 'axios';

export interface UserAnalyticsMember {
  user_id: string;
  username: string;
  name: string;
  role: string;
  account_active?: number;
  current_period: {
    days: number;
    hours: number;
    avg_hours_per_day: number;
    tasks_completed: number;
    tasks_pending: number;
    tasks_ongoing: number;
    overtime_hours: number;
    break_minutes: number;
    avg_check_in_minutes: number | null;
    avg_check_in_label: string | null;
    bugs_reported: number;
    bugs_fixed: number;
  };
  lookback: {
    months: number;
    avg_hours_per_day: number;
    avg_days_per_month: number;
    avg_tasks_completed_per_month: number;
    avg_overtime_hours_per_month: number;
  };
}

export interface UsersAnalyticsPayload {
  period: {
    start: string;
    end: string;
    name: string;
    range: string;
    month?: string;
  };
  lookback_months: number;
  filters?: {
    active_only_requested?: boolean;
    active_only_applied?: boolean;
    total_users_before_filter?: number;
    total_users_after_filter?: number;
    month?: string;
  };
  team_summary: {
    user_count: number;
    avg_hours_per_day: number;
    avg_work_days: number;
    avg_tasks_completed: number;
    avg_overtime_hours: number;
    total_hours: number;
  };
  roles: Record<
    'admin' | 'developer' | 'tester',
    {
      summary: UsersAnalyticsPayload['team_summary'];
      users: UserAnalyticsMember[];
      rankings: {
        high: Record<string, UserAnalyticsMember[]>;
        low: Record<string, UserAnalyticsMember[]>;
      };
    }
  >;
  last_updated: string;
}

interface NewUserData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  joining_date?: string | null;
}

interface UpdateUserData {
  username?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  role_id?: number;
  account_active?: boolean | number;
  joining_date?: string | null;
}

// Define the structure for user statistics
interface UserStats {
  total_projects: number;
  total_bugs: number;
  total_fixes?: number; // Optional for developers/admins
  recent_activity: Array<{ // Define the structure for recent activity items
    type: string; // e.g., 'bug', 'fix'
    title: string;
    created_at: string; // ISO date string
  }>;
}

export interface UserActivitySnapshotItem {
  id: string;
  title: string;
  status?: string;
  priority?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  project_id?: string;
  project_name?: string | null;
}

export interface UserActivitySnapshotWork {
  id?: number | null;
  submission_date?: string | null;
  is_today?: boolean;
  check_in_time?: string | null;
  checkout_time?: string | null;
  hours_today?: number;
  break_minutes?: number;
  start_time?: string | null;
  planned_work?: string | null;
  planned_work_status?: string | null;
  planned_work_notes?: string | null;
  planned_projects?: string[];
  project_names?: string[];
  project_updates?: Array<{
    project_id?: string;
    project_name?: string | null;
    update?: string;
  }>;
  completed_tasks?: string;
  pending_tasks?: string;
  ongoing_tasks?: string;
  notes?: string;
  tasks?: {
    completed?: string[];
    pending?: string[];
    ongoing?: string[];
    upcoming?: string[];
  };
}

export interface UserActivityWorkHistoryDay {
  id?: number | null;
  submission_date: string;
  is_today?: boolean;
  check_in_time?: string | null;
  hours_today?: number;
  planned_work?: string | null;
  planned_work_status?: string | null;
  planned_work_notes?: string | null;
  planned_projects?: string[];
  project_names?: string[];
  notes?: string;
  tasks?: {
    upcoming?: string[];
  };
}

export interface UserActivitySnapshot {
  user: User;
  work: UserActivitySnapshotWork | null;
  work_history?: UserActivityWorkHistoryDay[];
  assigned_projects?: Array<{
    id: string;
    name: string;
    member_role?: string | null;
    is_active?: number | boolean | null;
    status?: string | null;
  }>;
  bugs: UserActivitySnapshotItem[];
  fixes: UserActivitySnapshotItem[];
  updates: UserActivitySnapshotItem[];
  counts: {
    bugs: number;
    fixes: number;
    updates: number;
    projects?: number;
  };
}

export interface UserPortfolioStatusStep {
  status: string;
  from_status?: string | null;
  entered_at?: string | null;
  exited_at?: string | null;
  duration_seconds?: number | null;
  duration_label?: string | null;
  is_current?: boolean;
  source?: string;
}

export interface UserPortfolioWorkItem {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  type?: string | null;
  kind: "bug" | "update";
  raised_at?: string | null;
  resolved_at?: string | null;
  rise_duration_seconds?: number | null;
  rise_duration_label?: string | null;
  fix_duration_seconds?: number | null;
  fix_duration_label?: string | null;
  is_open?: boolean;
  reported_by_user?: boolean;
  fixed_by_user?: boolean;
  reported_by_name?: string | null;
  fixed_by_name?: string | null;
  created_by_name?: string | null;
  status_timeline: UserPortfolioStatusStep[];
}

export interface UserPortfolioProject {
  id: string;
  name: string;
  status?: string | null;
  is_active?: number | null;
  member_role?: string | null;
  assigned_at?: string | null;
  is_member?: boolean;
  is_creator?: boolean;
  counts: {
    bugs: number;
    fixes: number;
    updates: number;
  };
  bugs: UserPortfolioWorkItem[];
  fixes: UserPortfolioWorkItem[];
  updates: UserPortfolioWorkItem[];
}

export interface UserProfilePortfolio {
  user: {
    id: string;
    username: string;
    role: string;
  };
  summary: {
    projects: number;
    bugs_raised: number;
    fixes: number;
    updates: number;
    avg_rise_duration_seconds?: number | null;
    avg_rise_duration_label?: string | null;
    avg_fix_duration_seconds?: number | null;
    avg_fix_duration_label?: string | null;
  };
  projects: UserPortfolioProject[];
}

class UserService {
  private baseUrl = `${ENV.API_URL}/users`;

  private generateAvatar(username: string, role: UserRole): string {
    const backgroundColors = {
      admin: '3b82f6',
      developer: '10b981',
      tester: 'f59e0b',
    };
    const bgColor = backgroundColors[role] || '6b7280';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${bgColor}&color=fff`;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async getUsers(): Promise<User[]> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/getAll.php`);
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.data.map((user: any) => ({
      ...user,
      avatar: this.generateAvatar(user.name, user.role), // <-- use name
      account_active:
        user.account_active !== undefined && user.account_active !== null
          ? Number(user.account_active)
          : undefined,
      joining_date: user.joining_date ?? null,
    }));
  }

  async getAllTesterEmails(): Promise<string[]> {
    const response = await fetch(`${ENV.API_URL}/get_all_testers.php`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch tester emails');
    }
    return data.emails;
  }

  async addUser(userData: NewUserData): Promise<{ user: User, message: string }> {
    const response = await fetch(`${this.baseUrl}/create.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to add user.");
    }
    return { user: { ...data.data, phone: data.data.phone }, message: data.message };
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    const response = await fetch(`${ENV.API_URL}/users/update.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ id: userId, ...userData }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to update user");
    }
    
    // Backend now returns the updated user in result.data
    if (result.data) {
      const updatedUser = result.data;
      // Ensure all required User fields are present
      return {
        id: updatedUser.id || userId,
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        role: updatedUser.role || userData.role || 'user',
        role_id: updatedUser.role_id || null,
        name: updatedUser.name || updatedUser.username || '',
        avatar: this.generateAvatar(
          updatedUser.name || updatedUser.username || '',
          (updatedUser.role || userData.role || 'user') as UserRole
        ),
        created_at: updatedUser.created_at,
        last_active_at: updatedUser.last_active_at || null,
        account_active:
          updatedUser.account_active !== undefined && updatedUser.account_active !== null
            ? Number(updatedUser.account_active)
            : undefined,
        joining_date: updatedUser.joining_date ?? null,
      };
    }
    
    // Fallback if backend doesn't return data (shouldn't happen with new implementation)
    throw new Error("Backend did not return updated user data");
  }

  async getUserStats(userId: string): Promise<UserStats> {
    // Assuming an API endpoint like /users/stats.php that accepts a user ID
    const response = await this.fetchWithAuth(`${this.baseUrl}/stats.php?id=${userId}`);
    if (!response.success) {
      throw new Error(response.message || "Failed to fetch user stats.");
    }
    return response.data; // Assuming response.data contains the UserStats object
  }

  async getUserWorkStats(userId: string, opts?: { full?: boolean; months?: number }): Promise<any> {
    const params = new URLSearchParams({ id: userId });
    if (opts?.full) params.set('full', '1');
    if (opts?.months && opts.months > 0) params.set('months', String(opts.months));
    const response = await this.fetchWithAuth(`${ENV.API_URL}/users/work_stats.php?${params.toString()}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch work statistics');
    }
    return response.data;
  }

  async getPeriodDetails(userId: string, periodStart: string, periodEnd: string): Promise<any> {
    const response = await this.fetchWithAuth(`${ENV.API_URL}/users/work_stats.php?id=${userId}&period_start=${periodStart}&period_end=${periodEnd}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch period details');
    }
    return response.data;
  }

  async getTeamPeriodDetails(periodStart: string, periodEnd: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `${ENV.API_URL}/users/work_stats.php?period_start=${periodStart}&period_end=${periodEnd}&team=1`
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch team period details');
    }
    return response.data;
  }

  async getUsersAnalytics(opts?: {
    months?: number;
    month?: string;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<UsersAnalyticsPayload> {
    const params = new URLSearchParams({ analytics: '1' });
    if (opts?.months && opts.months > 0) params.set('months', String(opts.months));
    if (opts?.month) params.set('month', opts.month);
    if (opts?.limit && opts.limit > 0) params.set('limit', String(opts.limit));
    if (opts?.activeOnly) params.set('active_only', '1');
    const response = await this.fetchWithAuth(`${ENV.API_URL}/users/work_stats.php?${params.toString()}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch user analytics');
    }
    return response.data as UsersAnalyticsPayload;
  }

  async getActiveHours(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily'
  ): Promise<any> {
    const response = await this.fetchWithAuth(
      `${this.baseUrl}/active_hours.php?id=${userId}&period=${period}`
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch active hours');
    }
    return response.data;
  }

  async getActivitySnapshot(userId: string): Promise<UserActivitySnapshot> {
    const response = await this.fetchWithAuth(
      `${this.baseUrl}/activity_snapshot.php?id=${encodeURIComponent(userId)}`
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch activity snapshot');
    }
    return response.data as UserActivitySnapshot;
  }

  async getProfilePortfolio(userId: string): Promise<UserProfilePortfolio> {
    const response = await this.fetchWithAuth(
      `${this.baseUrl}/profile_portfolio.php?id=${encodeURIComponent(userId)}`
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch profile portfolio');
    }
    return response.data as UserProfilePortfolio;
  }

  async deleteUser(userId: string, force = false): Promise<boolean> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/delete.php?id=${userId}${force ? '&force=true' : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases with detailed messages
      if (response.status === 409) {
        // Conflict - user has dependencies
        throw new Error(data.message || 'Cannot delete user. User has associated data that must be removed first.');
      } else if (response.status === 404) {
        throw new Error('User not found.');
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete user');
    }

    return true;
  }

  async generateUserDashboardLink(userId: string): Promise<{ url: string; expires_at: string; ttl_seconds: number }> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post<{ success: boolean; data: { url: string; expires_at: string; ttl_seconds: number }; message?: string }>(
        `${ENV.API_URL}/users/generate-dashboard-link.php`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to generate dashboard link');
      }
    } catch (error: any) {
      //console.error('Error generating dashboard link:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to generate dashboard link');
    }
  }
}

export const userService = new UserService();
