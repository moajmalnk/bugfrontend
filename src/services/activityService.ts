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
   * Get user's own activity count (activities created by the current user)
   */
  async getUserOwnActivityCount(): Promise<number> {
    try {
      // For now, we'll fetch a large number of activities and count them client-side
      // In the future, this should be a dedicated API endpoint
      const response = await fetch(
        `${ENV.API_URL}/activities/project_activities.php?limit=1000&offset=0`,
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

      // Get current user ID from token
      const token = localStorage.getItem('token');
      if (!token) return 0;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = payload.user_id;

      // Count activities created by current user
      const userOwnActivities = result.data.activities.filter(
        (activity: Activity) => activity.user.id === currentUserId
      );

      return userOwnActivities.length;
    } catch (error) {
      console.error('Error fetching user own activity count:', error);
      return 0;
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
    type: 'project_created' | 'project_updated' | 'project_deleted' | 'member_added' | 'member_removed',
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
   * Helper method to log task activities
   */
  async logTaskActivity(
    type: 'task_created' | 'task_updated' | 'task_completed' | 'task_deleted' | 'task_assigned',
    taskId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: taskId,
      metadata,
    });
  }

  /**
   * Helper method to log update activities
   */
  async logUpdateActivity(
    type: 'update_created' | 'update_updated' | 'update_deleted',
    updateId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: updateId,
      metadata,
    });
  }

  /**
   * Helper method to log fix activities
   */
  async logFixActivity(
    type: 'fix_created' | 'fix_updated' | 'fix_deleted',
    fixId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: fixId,
      metadata,
    });
  }

  /**
   * Helper method to log user activities
   */
  async logUserActivity(
    type: 'user_created' | 'user_updated' | 'user_deleted' | 'user_role_changed',
    userId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: userId,
      metadata,
    });
  }

  /**
   * Helper method to log feedback activities
   */
  async logFeedbackActivity(
    type: 'feedback_created' | 'feedback_updated' | 'feedback_deleted' | 'feedback_dismissed',
    feedbackId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: feedbackId,
      metadata,
    });
  }

  /**
   * Helper method to log meeting activities
   */
  async logMeetingActivity(
    type: 'meeting_created' | 'meeting_updated' | 'meeting_deleted' | 'meeting_joined' | 'meeting_left',
    meetingId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: meetingId,
      metadata,
    });
  }

  /**
   * Helper method to log message activities
   */
  async logMessageActivity(
    type: 'message_sent' | 'message_updated' | 'message_deleted' | 'message_pinned' | 'message_unpinned',
    messageId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: messageId,
      metadata,
    });
  }

  /**
   * Helper method to log announcement activities
   */
  async logAnnouncementActivity(
    type: 'announcement_created' | 'announcement_updated' | 'announcement_deleted' | 'announcement_broadcast',
    announcementId: string,
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: announcementId,
      metadata,
    });
  }

  /**
   * Helper method to log general activities
   */
  async logGeneralActivity(
    type: 'comment_added' | 'comment_updated' | 'comment_deleted' | 'file_uploaded' | 'file_deleted' | 'settings_updated' | 'milestone_reached',
    projectId: string,
    description: string,
    relatedId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      type,
      description,
      project_id: projectId,
      related_id: relatedId,
      metadata,
    });
  }

  /**
   * Get activity type display information
   */
  getActivityTypeInfo(type: string): { icon: string; color: string; label: string } {
    const typeMap: Record<string, { icon: string; color: string; label: string }> = {
      // Bug Activities
      'bug_created': { icon: '🐛', color: 'text-red-600', label: 'Bug Created' },
      'bug_reported': { icon: '🐛', color: 'text-red-600', label: 'Bug Reported' },
      'bug_updated': { icon: '📝', color: 'text-yellow-600', label: 'Bug Updated' },
      'bug_fixed': { icon: '✅', color: 'text-green-600', label: 'Bug Fixed' },
      'bug_assigned': { icon: '👤', color: 'text-blue-600', label: 'Bug Assigned' },
      'bug_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Bug Deleted' },
      'bug_status_changed': { icon: '🔄', color: 'text-orange-600', label: 'Bug Status Changed' },
      
      // Task Activities
      'task_created': { icon: '📝', color: 'text-blue-600', label: 'Task Created' },
      'task_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Task Updated' },
      'task_completed': { icon: '✅', color: 'text-green-600', label: 'Task Completed' },
      'task_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Task Deleted' },
      'task_assigned': { icon: '👤', color: 'text-purple-600', label: 'Task Assigned' },
      
      // Update Activities
      'update_created': { icon: '📋', color: 'text-indigo-600', label: 'Update Created' },
      'update_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Update Updated' },
      'update_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Update Deleted' },
      
      // Fix Activities
      'fix_created': { icon: '🔧', color: 'text-green-600', label: 'Fix Created' },
      'fix_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Fix Updated' },
      'fix_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Fix Deleted' },
      
      // Project Activities
      'project_created': { icon: '🎉', color: 'text-purple-600', label: 'Project Created' },
      'project_updated': { icon: '⚡', color: 'text-orange-600', label: 'Project Updated' },
      'project_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Project Deleted' },
      'member_added': { icon: '👥', color: 'text-blue-600', label: 'Member Added' },
      'member_removed': { icon: '👋', color: 'text-gray-600', label: 'Member Removed' },
      
      // User Activities
      'user_created': { icon: '👤', color: 'text-green-600', label: 'User Created' },
      'user_updated': { icon: '✏️', color: 'text-yellow-600', label: 'User Updated' },
      'user_deleted': { icon: '🗑️', color: 'text-red-800', label: 'User Deleted' },
      'user_role_changed': { icon: '🔄', color: 'text-purple-600', label: 'User Role Changed' },
      
      // Feedback Activities
      'feedback_created': { icon: '💭', color: 'text-blue-600', label: 'Feedback Created' },
      'feedback_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Feedback Updated' },
      'feedback_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Feedback Deleted' },
      'feedback_dismissed': { icon: '❌', color: 'text-gray-600', label: 'Feedback Dismissed' },
      
      // Meeting Activities
      'meeting_created': { icon: '📅', color: 'text-indigo-600', label: 'Meeting Created' },
      'meeting_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Meeting Updated' },
      'meeting_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Meeting Deleted' },
      'meeting_joined': { icon: '🚪', color: 'text-green-600', label: 'Meeting Joined' },
      'meeting_left': { icon: '🚪', color: 'text-gray-600', label: 'Meeting Left' },
      
      // Message Activities
      'message_sent': { icon: '💬', color: 'text-blue-600', label: 'Message Sent' },
      'message_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Message Updated' },
      'message_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Message Deleted' },
      'message_pinned': { icon: '📌', color: 'text-purple-600', label: 'Message Pinned' },
      'message_unpinned': { icon: '📌', color: 'text-gray-600', label: 'Message Unpinned' },
      
      // Announcement Activities
      'announcement_created': { icon: '📢', color: 'text-orange-600', label: 'Announcement Created' },
      'announcement_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Announcement Updated' },
      'announcement_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Announcement Deleted' },
      'announcement_broadcast': { icon: '📡', color: 'text-green-600', label: 'Announcement Broadcast' },
      
      // General Activities
      'comment_added': { icon: '💬', color: 'text-indigo-600', label: 'Comment Added' },
      'comment_updated': { icon: '✏️', color: 'text-yellow-600', label: 'Comment Updated' },
      'comment_deleted': { icon: '🗑️', color: 'text-red-800', label: 'Comment Deleted' },
      'file_uploaded': { icon: '📁', color: 'text-green-600', label: 'File Uploaded' },
      'file_deleted': { icon: '🗑️', color: 'text-red-800', label: 'File Deleted' },
      'settings_updated': { icon: '⚙️', color: 'text-gray-600', label: 'Settings Updated' },
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