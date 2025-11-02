import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { permissionService } from "@/services/permissionService";
import { Permission, User, UserRole } from "@/types";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

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
      
      // Fetch user data
      // TODO: Fetch actual user data from API
      const userData: User = {
          id: userId || '',
          username: 'demo',
          email: 'demo@example.com',
          role: 'user' as UserRole,
          phone: '',
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          status: 'active' as 'active' | 'idle' | 'offline',
          name: ""
      };
      setUser(userData);

      // Fetch master permissions
      const masterPerms = await permissionService.getMasterPermissions();
      
      // Fetch user's current permissions and overrides
      const userPermsData = await permissionService.getUserPermissions(userId || '');
      
      // Initialize permission state
      const permState: Record<string, PermissionState[]> = {};
      
      Object.keys(masterPerms).forEach((category) => {
        permState[category] = masterPerms[category].map((perm) => ({
          perm,
          roleHasIt: userPermsData.role_permissions?.includes(perm.permission_key) || false,
          override: userPermsData.overrides?.some(override => override.permission_key === perm.permission_key) 
            ? 'grant' 
            : (userPermsData.overrides?.some(override => override.permission_key === perm.permission_key && override.granted === false) ? 'revoke' : 'none'),
        }));
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

  const handleToggleOverride = (category: string, permissionId: number) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((p) =>
        p.perm.id === permissionId
          ? {
              ...p,
              override:
                p.override === 'grant'
                  ? 'revoke'
                  : p.override === 'revoke'
                  ? 'none'
                  : 'grant',
            }
          : p
      ),
    }));
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
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading permissions...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card>
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin/users')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle>Manage Permissions</CardTitle>
                <CardDescription>
                  Assign permissions to {user.username} ({user.email})
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                How Permission Overrides Work
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                <strong>Grant:</strong> Explicitly give permission even if role doesn't have it.
                <br />
                <strong>Revoke:</strong> Explicitly deny permission even if role grants it.
                <br />
                <strong>Default:</strong> Use the permission from the user's role.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions by Category */}
      {Object.entries(permissions).map(([category, perms]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category}</CardTitle>
            <CardDescription>
              {perms.filter((p) => p.override !== 'none').length} overrides set
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {perms.map((permState) => {
                const effective = getEffectiveState(permState);
                return (
                  <div
                    key={permState.perm.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{permState.perm.permission_name}</p>
                        <Badge
                          variant={effective ? 'default' : 'secondary'}
                        >
                          {effective ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {permState.roleHasIt && (
                          <Badge variant="outline" className="text-xs">
                            From Role
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {permState.perm.permission_key}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className={permState.override === 'grant' ? 'bg-green-600 hover:bg-green-700' : ''}
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
                      >
                        Default
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default UserPermissions;

