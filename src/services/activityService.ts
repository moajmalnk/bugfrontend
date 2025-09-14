import { ENV } from '@/lib/env';

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface Activity {
  id: number;
  type: string;
  description: string;
  user: User;
  project: Project;
  related_title?: string;
  metadata?: Record<string, any>;
  created_at: string;
  time_ago: string;
}

export interface ActivityPagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ActivityResponse {
  activities: Activity[];
  pagination: ActivityPagination;
}

export interface ActivityStats {
  total_activities: number;
  recent_activities: number;
  activity_types: Array<{
    activity_type: string;
    count: number;
  }>;
  top_contributors: Array<{
    username: string;
    activity_count: number;
  }>;
}

export interface LogActivityRequest {
  type: string;
  description: string;
  project_id?: string;
  related_id?: string;
  metadata?: Record<string, any>;
}

class ActivityService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get activities for a specific project
   */
  async getProjectActivities(
    projectId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ActivityResponse> {
    try {
      const response = await fetch(
        `${ENV.API_URL}/activities/project_activities.php?project_id=${projectId}&limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch activities');
      }

      return result.data;
    } catch (error) {
      //.error('Error fetching project activities:', error);
      throw error;
    }
  }

  /**
   * Get all activities for the current user (based on their project access)
   */
  async getUserActivities(
    limit: number = 10,
    offset: number = 0
  ): Promise<ActivityResponse> {
    try {
      const response = await fetch(
        `${ENV.API_URL}/activities/project_activities.php?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch activities');
      }

      return result.data;
    } catch (error) {
      //.error('Error fetching user activities:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for a project
   */
  async getActivityStats(projectId: string): Promise<ActivityStats> {
    try {
      const response = await fetch(
        `${ENV.API_URL}/activities/activity_stats.php?project_id=${projectId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch activity stats');
      }

      return result.data;
    } catch (error) {
      //.error('Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Log a new activity
   */
  async logActivity(activityData: LogActivityRequest): Promise<{ id: number }> {
    try {
      const response = await fetch(
        `${ENV.API_URL}/activities/log_activity.php`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(activityData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to log activity');
      }

      return result.data;
    } catch (error) {
      //.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Helper method to log common activities
   */
  async logBugActivity(
    type: 'bug_reported' | 'bug_updated' | 'bug_fixed' | 'bug_assigned',
    bugId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: bugId,
      metadata,
    });
  }

  /**
   * Helper method to log project activities
   */
  async logProjectActivity(
    type: 'project_created' | 'project_updated' | 'member_added' | 'member_removed',
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      metadata,
    });
  }

  /**
   * Get activity type display information
   */
  getActivityTypeInfo(type: string): { icon: string; color: string; label: string } {
    const typeMap: Record<string, { icon: string; color: string; label: string }> = {
      'bug_reported': { icon: '🐛', color: 'text-red-600', label: 'Bug Reported' },
      'bug_updated': { icon: '📝', color: 'text-yellow-600', label: 'Bug Updated' },
      'bug_fixed': { icon: '✅', color: 'text-green-600', label: 'Bug Fixed' },
      'bug_assigned': { icon: '👤', color: 'text-blue-600', label: 'Bug Assigned' },
      'project_created': { icon: '🎉', color: 'text-purple-600', label: 'Project Created' },
      'project_updated': { icon: '⚡', color: 'text-orange-600', label: 'Project Updated' },
      'member_added': { icon: '👥', color: 'text-blue-600', label: 'Member Added' },
      'member_removed': { icon: '👋', color: 'text-gray-600', label: 'Member Removed' },
      'comment_added': { icon: '💬', color: 'text-indigo-600', label: 'Comment Added' },
      'milestone_reached': { icon: '🏆', color: 'text-yellow-500', label: 'Milestone Reached' },
    };

    return typeMap[type] || { icon: '📄', color: 'text-gray-600', label: 'Activity' };
  }

  /**
   * Format activity description for display
   */
  formatActivityDescription(activity: Activity): string {
    const { type, description, related_title, user } = activity;
    
    if (related_title) {
      return `${user.username} ${description} "${related_title}"`;
    }
    
    return `${user.username} ${description}`;
  }
}

export const activityService = new ActivityService();
export default activityService; 