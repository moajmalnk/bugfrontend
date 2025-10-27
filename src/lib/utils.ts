import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a role-neutral URL for sharing resources
 * This ensures that shared links work for all users regardless of their role
 * @param resourceType - The type of resource (e.g., 'bugs', 'updates', 'projects')
 * @param resourceId - The ID of the resource
 * @returns A role-neutral URL that will redirect to the appropriate role-based URL
 */
export const generateShareableUrl = (resourceType: string, resourceId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/${resourceType}/${resourceId}`;
};

/**
 * Extract resource ID from a URL path
 * @param path - The URL path (e.g., '/admin/bugs/123' or '/bugs/123')
 * @param resourceType - The type of resource to extract
 * @returns The resource ID or null if not found
 */
export const extractResourceId = (path: string, resourceType: string): string | null => {
  const pathParts = path.split('/');
  const resourceIndex = pathParts.findIndex(part => part === resourceType);
  if (resourceIndex !== -1 && resourceIndex + 1 < pathParts.length) {
    return pathParts[resourceIndex + 1];
  }
  return null;
};

/**
 * Get effective user role for routing and display
 * Uses role_id to determine the effective role (admin/developer/tester)
 * @param user - User object with role and role_id
 * @returns The effective role to use for routing ('admin', 'developer', 'tester', or 'user' for custom roles)
 */
export const getEffectiveRole = (user: { role?: string; role_id?: number | null }): string => {
  if (!user) return 'user';
  
  // If role_id is set (new system)
  if (user.role_id) {
    // Map role_id to role
    // 1 = Admin, 2 = Developer, 3 = Tester
    if (user.role_id === 1) return 'admin';
    if (user.role_id === 2) return 'developer';
    if (user.role_id === 3) return 'tester';
    // Custom roles (role_id > 3) should default to 'user' for routing
    return 'user';
  }
  
  // Fallback to legacy role field
  return user.role || 'user';
};
