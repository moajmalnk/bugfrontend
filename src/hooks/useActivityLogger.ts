import { useCallback } from 'react';
import { activityService, LogActivityRequest } from '@/services/activityService';
import { useAuth } from '@/context/AuthContext';

export const useActivityLogger = () => {
  const { currentUser } = useAuth();

  const logActivity = useCallback(async (activityData: LogActivityRequest) => {
    if (!currentUser) {
      //console.warn('Cannot log activity: user not authenticated');
      return;
    }

    try {
      await activityService.logActivity(activityData);
    } catch (error) {
      // Silently fail activity logging to not disrupt user experience
      //console.warn('Failed to log activity:', error);
    }
  }, [currentUser]);

  const logBugActivity = useCallback(async (
    type: 'bug_reported' | 'bug_updated' | 'bug_fixed' | 'bug_assigned',
    bugId: string,
    projectId: string,
    bugTitle: string,
    metadata?: Record<string, any>
  ) => {
    const descriptions = {
      'bug_reported': `reported a new bug`,
      'bug_updated': `updated bug`,
      'bug_fixed': `fixed bug`,
      'bug_assigned': `was assigned to bug`
    };

    await logActivity({
      type,
      description: descriptions[type],
      project_id: projectId,
      related_id: bugId,
      metadata: { bug_title: bugTitle, ...metadata }
    });
  }, [logActivity]);

  const logProjectActivity = useCallback(async (
    type: 'project_created' | 'project_updated' | 'member_added' | 'member_removed',
    projectId: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    await logActivity({
      type,
      description,
      project_id: projectId,
      metadata
    });
  }, [logActivity]);

  const logMemberActivity = useCallback(async (
    projectId: string,
    memberUsername: string,
    action: 'added' | 'removed',
    role?: string
  ) => {
    await logProjectActivity(
      action === 'added' ? 'member_added' : 'member_removed',
      projectId,
      action === 'added' ? `added ${memberUsername} to the project` : `removed ${memberUsername} from the project`,
      { member_username: memberUsername, role }
    );
  }, [logProjectActivity]);

  return {
    logActivity,
    logBugActivity,
    logProjectActivity,
    logMemberActivity
  };
};

export default useActivityLogger; 