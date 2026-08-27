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

const SYSTEM_ROLES = ['admin', 'developer', 'tester', 'creator'] as const;

/**
 * Get effective user role for routing and display.
 * Prefer a known ENUM on users.role so first-class roles (including creator)
 * keep `/creator/...` URLs even when role_id is not 1/2/3.
 */
export const getEffectiveRole = (user: { role?: string; role_id?: number | null }): string => {
  if (!user) return 'user';

  if (user.role && (SYSTEM_ROLES as readonly string[]).includes(user.role)) {
    return user.role;
  }

  if (user.role_id) {
    if (user.role_id === 1) return 'admin';
    if (user.role_id === 2) return 'developer';
    if (user.role_id === 3) return 'tester';
    return 'user';
  }

  return user.role || 'user';
};

/**
 * Why: Statutory/banking onboarding wizard is mandatory for developers only.
 * Testers, admins, and custom roles skip the lock-screen wizard.
 */
export const userRequiresOnboarding = (user: {
  role?: string;
  role_id?: number | null;
} | null | undefined): boolean => getEffectiveRole(user || {}) === "developer";

/**
 * Incomplete mandatory onboarding — only developers are locked into the wizard.
 */
export const userHasPendingOnboarding = (user: {
  role?: string;
  role_id?: number | null;
  onboarding_completed?: number | null;
} | null | undefined): boolean =>
  !!user &&
  userRequiresOnboarding(user) &&
  Number(user.onboarding_completed ?? 0) === 0;

/** Show BugMessage in the main sidebar (after BugUpdate) for admins and developers. */
export const showBugMessageInMainNav = (role: string | undefined | null): boolean =>
  role === "admin" || role === "developer" || role === "creator";

/** Who may report a new bug (on projects they are assigned to). */
export const canReportBug = (role: string | undefined | null): boolean =>
  role === "admin" || role === "developer" || role === "tester";

/**
 * Who may open the Messages (BugMessage) page: admins, developers, or anyone with MESSAGING_VIEW.
 */
export const canOpenMessagesPage = (
  role: string | undefined | null,
  hasPermission: (key: string) => boolean
): boolean =>
  showBugMessageInMainNav(role) || hasPermission("MESSAGING_VIEW");

/**
 * Why: Bridge legacy ENUM admin with RBAC so custom roles work while existing
 * admins keep access even before new permission keys are seeded.
 */
export const hasPermissionOrAdmin = (
  role: string | undefined | null,
  hasPermission: (key: string) => boolean,
  key: string
): boolean => role === "admin" || hasPermission(key);