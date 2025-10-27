import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft, Save, User, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { PermissionToggleGroup } from '@/components/permissions/PermissionToggleGroup';
import { permissionService } from '@/services/permissionService';
import { usePermissions } from '@/context/PermissionContext';
import { useAuth } from '@/context/AuthContext';
import { UserPermissionData, Permission, UserPermissionOverride } from '@/types';

const UserPermissions: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const canManagePermissions = hasPermission('USERS_MANAGE_PERMISSIONS');
  
  const [userData, setUserData] = useState<UserPermissionData | null>(null);
  const [masterPermissions, setMasterPermissions] = useState<Record<string, Permission[]>>({});
  const [permissionValues, setPermissionValues] = useState<Record<string, 'inherit' | 'grant' | 'revoke'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 UserPermissions: canManagePermissions =', canManagePermissions);
    console.log('🔍 UserPermissions: isAuthenticated =', isAuthenticated);
    console.log('🔍 UserPermissions: currentUser =', currentUser);
    console.log('🔍 UserPermissions: permissionsLoading =', permissionsLoading);
    
    // Wait for authentication and permission loading
    if (!isAuthenticated || !currentUser) {
      console.log('🔍 UserPermissions: Not authenticated, waiting...');
      return;
    }
    
    // Wait for permissions to finish loading before checking
    if (permissionsLoading) {
      console.log('🔍 UserPermissions: Permissions still loading, waiting...');
      return;
    }
    
    if (!canManagePermissions) {
      console.log('🔍 UserPermissions: Redirecting to /admin/users due to lack of permissions');
      navigate('/admin/users');
      return;
    }

    if (userId) {
      loadUserPermissions();
    }
  }, [userId, canManagePermissions, navigate, isAuthenticated, currentUser, permissionsLoading]);

  const loadUserPermissions = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [userPermissionData, masterPerms] = await Promise.all([
        permissionService.getUserPermissions(userId),
        permissionService.getMasterPermissions(),
      ]);

      setUserData(userPermissionData);
      setMasterPermissions(masterPerms as unknown as Record<string, Permission[]>);

      // Initialize permission values based on current overrides
      const initialValues: Record<string, 'inherit' | 'grant' | 'revoke'> = {};
      
      // Set all permissions to inherit by default
      Object.values(masterPerms).flat().forEach(permission => {
        initialValues[permission.permission_key] = 'inherit';
      });

      // Apply current overrides
      userPermissionData.permission_overrides.forEach(override => {
        initialValues[override.permission_key] = override.granted ? 'grant' : 'revoke';
      });

      setPermissionValues(initialValues);
    } catch (err) {
      console.error('Failed to load user permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (permissionKey: string, value: 'inherit' | 'grant' | 'revoke') => {
    setPermissionValues(prev => ({
      ...prev,
      [permissionKey]: value,
    }));
  };

  const handleSave = async () => {
    if (!userId || !userData) return;

    setIsSaving(true);

    try {
      // Convert permission values to overrides
      const overrides: UserPermissionOverride[] = [];
      
      Object.entries(permissionValues).forEach(([permissionKey, value]) => {
        if (value !== 'inherit') {
          const permission = Object.values(masterPermissions)
            .flat()
            .find(p => p.permission_key === permissionKey);
          
          if (permission) {
            overrides.push({
              permission_id: permission.id,
              granted: value === 'grant',
            });
          }
        }
      });

      await permissionService.saveUserPermissions(userId, overrides);
      
      toast({
        title: "Permissions saved",
        description: "User permissions have been updated successfully.",
      });

      // Reload data to reflect changes
      await loadUserPermissions();
    } catch (err) {
      console.error('Failed to save permissions:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save permissions",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    if (!userData) return false;
    
    const currentOverrides = userData.permission_overrides;
    const currentValues: Record<string, 'inherit' | 'grant' | 'revoke'> = {};
    
    // Initialize all as inherit
    Object.values(masterPermissions).flat().forEach(permission => {
      currentValues[permission.permission_key] = 'inherit';
    });
    
    // Apply current overrides
    currentOverrides.forEach(override => {
      currentValues[override.permission_key] = override.granted ? 'grant' : 'revoke';
    });
    
    // Compare with current values
    return JSON.stringify(currentValues) !== JSON.stringify(permissionValues);
  };

  // Show loading state while permissions are loading
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading permissions...</span>
        </div>
      </div>
    );
  }

  if (!canManagePermissions) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading user permissions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/admin/users')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Users
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      User Permissions
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Manage permissions for {userData.user.name || userData.user.username}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges()}
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Name</span>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {userData.user.name || userData.user.username}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50/50 dark:bg-green-900/20 rounded-xl">
                  <div className="p-1.5 bg-green-500 rounded-lg">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email</span>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {userData.user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-xl">
                  <div className="p-1.5 bg-purple-500 rounded-lg">
                    <Shield className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Role</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={userData.role.is_system_role ? "default" : "secondary"} className="text-xs">
                        {userData.role.role_name}
                      </Badge>
                      {userData.role.is_system_role && (
                        <Badge variant="outline" className="text-xs">System Role</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-orange-50/50 dark:bg-orange-900/20 rounded-xl">
                  <div className="p-1.5 bg-orange-500 rounded-lg">
                    <Shield className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Effective Permissions</span>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      {userData.effective_permissions.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Role Default Permissions */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-green-50/30 dark:from-gray-800/30 dark:to-green-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-green-500 rounded-lg">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role Default Permissions</h3>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl mb-4">
                <div className="p-1.5 bg-gray-500 rounded-lg">
                  <Shield className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Role</span>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {userData.role.role_name}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {userData.role_permissions.map(permission => (
                  <Badge key={permission} variant="outline" className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    {permissionService.getPermissionDisplayName(permission)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Permission Overrides */}
        <div className="space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-purple-50/30 dark:from-gray-800/30 dark:to-purple-900/30 rounded-2xl"></div>
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-purple-500 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permission Overrides</h3>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl mb-6">
                  <div className="p-1.5 bg-gray-500 rounded-lg">
                    <AlertCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Info</span>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                      Override specific permissions for this user. Changes here will override the role's default permissions.
                    </div>
                  </div>
                </div>

                {Object.entries(masterPermissions).map(([category, permissions]) => (
                  <PermissionToggleGroup
                    key={category}
                    category={category}
                    permissions={permissions}
                    values={permissionValues}
                    onChange={handlePermissionChange}
                    showDescriptions={true}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default UserPermissions;
