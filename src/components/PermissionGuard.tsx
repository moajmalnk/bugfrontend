import { usePermissions } from "@/hooks/usePermissions";
import { ReactNode } from "react";

interface PermissionGuardProps {
  permission: string;
  fallback?: ReactNode;
  children: ReactNode;
  projectId?: string | null;
}

/**
 * PermissionGuard - Conditionally renders children based on user permissions
 * 
 * @param permission - The permission key to check (e.g., 'BUGS_CREATE', 'USERS_VIEW')
 * @param children - Content to render if user has the permission
 * @param fallback - Optional content to render if user lacks the permission
 * @param projectId - Optional project ID for project-scoped permissions
 * 
 * @example
 * <PermissionGuard permission="BUGS_CREATE">
 *   <Button>Create Bug</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  projectId = null,
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions(projectId);

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * MultiplePermissionGuard - Check multiple permissions with AND/OR logic
 * 
 * @param permissions - Array of permission keys to check
 * @param mode - 'and' requires all permissions, 'or' requires any permission
 */
interface MultiplePermissionGuardProps extends Omit<PermissionGuardProps, 'permission'> {
  permissions: string[];
  mode?: 'and' | 'or';
}

export function MultiplePermissionGuard({
  permissions,
  mode = 'and',
  children,
  fallback = null,
  projectId = null,
}: MultiplePermissionGuardProps) {
  const { hasPermission } = usePermissions(projectId);

  const hasAllPermissions = permissions.every((perm) => hasPermission(perm));
  const hasAnyPermission = permissions.some((perm) => hasPermission(perm));

  const hasAccess = mode === 'and' ? hasAllPermissions : hasAnyPermission;

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

