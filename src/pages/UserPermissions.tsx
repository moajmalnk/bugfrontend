import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { permissionService } from "@/services/permissionService";
import { Permission, User, UserRole } from "@/types";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertCircle, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { Skeleton } from "@/components/ui/skeleton";

type PermissionState = {
  perm: Permission;
  roleHasIt: boolean; // From role permissions
  override: 'none' | 'grant' | 'revoke';
};

export function UserPermissions() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Record<string, PermissionState[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user data from API
      if (!userId) {
        throw new Error("User ID is required");
      }

      const userResponse = await fetch(`${ENV.API_URL}/users/get.php?id=${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userResult = await userResponse.json();
      if (!userResult.success) {
        throw new Error(userResult.message || "Failed to fetch user data");
      }

      const userData: User = {
        id: userResult.data.id,
        username: userResult.data.username,
        email: userResult.data.email,
        role: userResult.data.role as UserRole,
        phone: userResult.data.phone || '',
        created_at: userResult.data.created_at,
        last_active_at: userResult.data.last_active_at || new Date().toISOString(),
        status: (userResult.data.status as 'active' | 'idle' | 'offline') || 'offline',
        name: userResult.data.name || userResult.data.username,
        avatar: userResult.data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userResult.data.username)}&background=3b82f6&color=fff`,
      };
      setUser(userData);

      // Fetch master permissions
      const masterPerms = await permissionService.getMasterPermissions();
      
      // Fetch user's current permissions and overrides
      const userPermsData = await permissionService.getUserPermissions(userId || '');
      
      // Initialize permission state
      const permState: Record<string, PermissionState[]> = {};
      
      Object.keys(masterPerms).forEach((category) => {
        permState[category] = masterPerms[category].map((perm) => {
          const isGranted = userPermsData.overrides?.includes(perm.permission_key) || false;
          const isRevoked = userPermsData.revoked?.includes(perm.permission_key) || false;
          
          let override: 'none' | 'grant' | 'revoke' = 'none';
          if (isGranted) {
            override = 'grant';
          } else if (isRevoked) {
            override = 'revoke';
          }
          
          return {
            perm,
            roleHasIt: userPermsData.role_permissions?.includes(perm.permission_key) || false,
            override,
          };
        });
      });

      setPermissions(permState);
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      toast({
        title: "Error",
        description: "Failed to load user permissions data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Collect all overrides
      const overrides: { permission_id: number; granted: boolean }[] = [];
      
      Object.values(permissions).forEach((perms) => {
        perms.forEach((p) => {
          if (p.override === 'grant') {
            overrides.push({ permission_id: p.perm.id, granted: true });
          } else if (p.override === 'revoke') {
            overrides.push({ permission_id: p.perm.id, granted: false });
          }
        });
      });

      await permissionService.saveUserPermissions(userId || '', overrides);
      
      toast({
        title: "Success",
        description: "User permissions have been updated successfully.",
      });
      
      // Navigate back to users page
      navigate('/admin/users');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save user permissions.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getEffectiveState = (permState: PermissionState) => {
    if (permState.override === 'grant') return true;
    if (permState.override === 'revoke') return false;
    return permState.roleHasIt;
  };

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <Skeleton className="h-12 w-64 mb-4" />
              <Skeleton className="h-6 w-96" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">User Not Found</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                The user you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate('/admin/users')} size="lg" className="h-12 px-6">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Users
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const totalOverrides = Object.values(permissions).reduce(
    (sum, perms) => sum + perms.filter((p) => p.override !== 'none').length,
    0
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/admin/users')}
                    className="h-10 w-10 shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      Manage Permissions
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Assign custom permissions to <span className="font-semibold text-gray-900 dark:text-white">{user.username}</span> ({user.email})
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="h-12 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Save className="mr-2 h-5 w-5" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-purple-600 rounded-lg">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {totalOverrides}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 rounded-lg shrink-0">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-white mb-2 text-base">
                  How Permission Overrides Work
                </p>
                <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                  <p><strong className="text-green-700 dark:text-green-400">Grant:</strong> Explicitly give permission even if role doesn't have it.</p>
                  <p><strong className="text-red-700 dark:text-red-400">Revoke:</strong> Explicitly deny permission even if role grants it.</p>
                  <p><strong className="text-blue-700 dark:text-blue-400">Default:</strong> Use the permission from the user's role.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions by Category */}
        {Object.entries(permissions).map(([category, perms]) => {
          const overrideCount = perms.filter((p) => p.override !== 'none').length;
          return (
            <div key={category} className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 via-purple-50/30 to-indigo-50/50 dark:from-gray-800/50 dark:via-purple-900/20 dark:to-indigo-900/20 rounded-2xl"></div>
              <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-gradient-to-r from-gray-50/80 to-purple-50/80 dark:from-gray-800/80 dark:to-purple-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{category}</h3>
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                      {overrideCount} {overrideCount === 1 ? 'override' : 'overrides'} set
                    </Badge>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {perms.map((permState) => {
                      const effective = getEffectiveState(permState);
                      return (
                        <div
                          key={permState.perm.id}
                          className="group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/50 to-gray-50/30 dark:from-gray-900/50 dark:to-gray-800/30 p-4 hover:shadow-lg transition-all duration-300"
                        >
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                                  {permState.perm.permission_name}
                                </p>
                                <Badge
                                  variant={effective ? 'default' : 'secondary'}
                                  className={`text-xs font-semibold ${
                                    effective 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {effective ? 'Enabled' : 'Disabled'}
                                </Badge>
                                {permState.roleHasIt && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                    From Role
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md inline-block">
                                {permState.perm.permission_key}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                variant={permState.override === 'grant' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [category]: prev[category].map((p) =>
                                      p.perm.id === permState.perm.id
                                        ? { ...p, override: 'grant' }
                                        : p
                                    ),
                                  }))
                                }
                                className={`font-medium transition-all duration-200 ${
                                  permState.override === 'grant' 
                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md' 
                                    : 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700'
                                }`}
                              >
                                Grant
                              </Button>
                              <Button
                                variant={permState.override === 'revoke' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [category]: prev[category].map((p) =>
                                      p.perm.id === permState.perm.id
                                        ? { ...p, override: 'revoke' }
                                        : p
                                    ),
                                  }))
                                }
                                className={`font-medium transition-all duration-200 ${
                                  permState.override === 'revoke'
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                                    : 'hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700'
                                }`}
                              >
                                Revoke
                              </Button>
                              <Button
                                variant={permState.override === 'none' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() =>
                                  setPermissions((prev) => ({
                                    ...prev,
                                    [category]: prev[category].map((p) =>
                                      p.perm.id === permState.perm.id
                                        ? { ...p, override: 'none' }
                                        : p
                                    ),
                                  }))
                                }
                                className={`font-medium transition-all duration-200 ${
                                  permState.override === 'none'
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                              >
                                Default
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

export default UserPermissions;

