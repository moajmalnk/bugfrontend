import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { permissionService } from '@/services/permissionService';

interface PermissionContextType {
  permissions: string[];
  hasPermission: (permissionKey: string, projectId?: string) => boolean;
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    if (!currentUser?.id) {
      setPermissions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userPermissionData = await permissionService.getCurrentUserPermissions();
      setPermissions(userPermissionData.effective_permissions);
    } catch (err) {
      console.error('🔍 PermissionContext: Failed to load permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = async () => {
    await loadPermissions();
  };

  const hasPermission = (permissionKey: string, projectId?: string): boolean => {
    // For now, we only support global permissions in the context
    // Project-specific permissions would need additional logic
    if (isLoading || !permissions.length) {
      return false;
    }
    return permissionService.checkPermission(permissionKey, permissions);
  };

  useEffect(() => {
    loadPermissions();
    
    // Periodically refresh permissions to catch changes made by admins
    const refreshInterval = setInterval(() => {
      loadPermissions();
    }, 30000); // Refresh every 30 seconds
    
    // Also refresh when user returns to the tab
    const handleFocus = () => {
      loadPermissions();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser?.id]);

  const value: PermissionContextType = {
    permissions,
    hasPermission,
    isLoading,
    error,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Convenience hook for checking a single permission
export const usePermission = (permissionKey: string, projectId?: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permissionKey, projectId);
};
