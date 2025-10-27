import { ENV } from "@/lib/env";
import { Permission, PermissionCategory, UserPermissionData, UserPermissionOverride } from "@/types";

class PermissionService {
  private baseUrl = `${ENV.API_URL}`;

  /**
   * Get all available permissions grouped by category
   */
  async getMasterPermissions(): Promise<PermissionCategory> {
    const response = await fetch(`${this.baseUrl}/admin/permissions/master.php`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch master permissions');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get current user's effective permissions and role information
   */
  async getCurrentUserPermissions(): Promise<UserPermissionData> {
    const url = `${this.baseUrl}/admin/permissions/current-user.php`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch current user permissions');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user's effective permissions and role information (for other users)
   */
  async getUserPermissions(userId: string): Promise<UserPermissionData> {
    const response = await fetch(`${this.baseUrl}/admin/permissions/user-permissions.php?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user permissions');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Save user's permission overrides
   */
  async saveUserPermissions(userId: string, permissions: UserPermissionOverride[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/permissions/save-user-permissions.php?user_id=${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ permissions }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save user permissions');
    }
  }

  /**
   * Check if current user has a specific permission (client-side helper)
   * Note: This is a client-side check and should be used for UI state only.
   * Server-side permission checks are still required for security.
   */
  checkPermission(permissionKey: string, userPermissions?: string[]): boolean {
    if (!userPermissions) {
      return false;
    }
    return userPermissions.includes(permissionKey);
  }

  /**
   * Get permission display name from permission key
   */
  getPermissionDisplayName(permissionKey: string): string {
    const permissionMap: Record<string, string> = {
      'BUGS_VIEW_ALL': 'View All Bugs',
      'BUGS_VIEW_OWN': 'View Own Bugs',
      'BUGS_CREATE': 'Create Bugs',
      'BUGS_EDIT_ALL': 'Edit All Bugs',
      'BUGS_EDIT_OWN': 'Edit Own Bugs',
      'BUGS_DELETE': 'Delete Bugs',
      'BUGS_CHANGE_STATUS': 'Change Bug Status',
      'BUGS_ASSIGN': 'Assign Bugs',
      'USERS_VIEW': 'View Users',
      'USERS_CREATE': 'Create Users',
      'USERS_EDIT': 'Edit Users',
      'USERS_DELETE': 'Delete Users',
      'USERS_CHANGE_PASSWORD': 'Change User Passwords',
      'USERS_MANAGE_PERMISSIONS': 'Manage User Permissions',
      'USERS_IMPERSONATE': 'Impersonate Users',
      'PROJECTS_VIEW_ALL': 'View All Projects',
      'PROJECTS_VIEW_ASSIGNED': 'View Assigned Projects',
      'PROJECTS_CREATE': 'Create Projects',
      'PROJECTS_EDIT': 'Edit Projects',
      'PROJECTS_DELETE': 'Delete Projects',
      'PROJECTS_MANAGE_MEMBERS': 'Manage Project Members',
      'PROJECTS_ARCHIVE': 'Archive Projects',
      'DOCS_VIEW': 'View Documentation',
      'DOCS_CREATE': 'Create Documentation',
      'DOCS_EDIT': 'Edit Documentation',
      'DOCS_DELETE': 'Delete Documentation',
      'TASKS_VIEW_ALL': 'View All Tasks',
      'TASKS_VIEW_ASSIGNED': 'View Assigned Tasks',
      'TASKS_CREATE': 'Create Tasks',
      'TASKS_EDIT': 'Edit Tasks',
      'TASKS_DELETE': 'Delete Tasks',
      'TASKS_ASSIGN': 'Assign Tasks',
      'UPDATES_VIEW': 'View Updates',
      'UPDATES_CREATE': 'Create Updates',
      'UPDATES_EDIT': 'Edit Updates',
      'UPDATES_DELETE': 'Delete Updates',
      'UPDATES_APPROVE': 'Approve Updates',
      'SETTINGS_VIEW': 'View Settings',
      'SETTINGS_EDIT': 'Edit Settings',
      'ROLES_MANAGE': 'Manage Roles',
      'ANNOUNCEMENTS_MANAGE': 'Manage Announcements',
      'MESSAGING_VIEW': 'View Messages',
      'MESSAGING_SEND': 'Send Messages',
      'MESSAGING_DELETE': 'Delete Messages',
      'MESSAGING_MANAGE_GROUPS': 'Manage Chat Groups',
      'MEETINGS_CREATE': 'Create Meetings',
      'MEETINGS_JOIN': 'Join Meetings',
      'MEETINGS_MANAGE': 'Manage Meetings',
      'SUPER_ADMIN': 'Super Administrator',
    };

    return permissionMap[permissionKey] || permissionKey;
  }

  /**
   * Get category display name
   */
  getCategoryDisplayName(category: string): string {
    const categoryMap: Record<string, string> = {
      'Bugs': 'Bug Management',
      'Users': 'User Management',
      'Projects': 'Project Management',
      'Documentation': 'Documentation',
      'Tasks': 'Task Management',
      'Updates': 'Update Management',
      'Settings': 'System Settings',
      'Messaging': 'Messaging',
      'Meetings': 'Meetings',
      'System': 'System',
    };

    return categoryMap[category] || category;
  }
}

export const permissionService = new PermissionService();
