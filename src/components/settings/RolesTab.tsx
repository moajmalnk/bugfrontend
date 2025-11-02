import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { permissionService } from "@/services/permissionService";
import { Permission, Role } from "@/types";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { Plus, Shield, Users, UserCog, Pencil, Trash2, AlertTriangle, Undo2, CheckSquare, Square } from "lucide-react";
import { useEffect, useState } from "react";

export function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const data = await permissionService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error("Failed to load roles:", error);
      toast({
        title: "Error",
        description: "Failed to load roles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleCreated = () => {
    setIsCreateDialogOpen(false);
    loadRoles();
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const performActualDelete = async (roleId: number) => {
    try {
      await permissionService.deleteRole(roleId);
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      setRoleToDelete(null);
      loadRoles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    }
  };

  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (roleToDelete) {
        performActualDelete(roleToDelete.id);
      }
    },
    onUndo: () => {
      setRoleToDelete(null);
      toast({
        title: "Deletion Cancelled",
        description: "Role deletion has been cancelled.",
      });
    },
  });

  const handleDeleteRole = (role: Role) => {
    setRoleToDelete(role);
    undoDelete.startCountdown();
    toast({
      title: "Role Deletion Started",
      description: `${role.role_name.replace(/\s*0$/, '')} will be deleted in ${undoDelete.timeLeft} seconds. Click undo to cancel.`,
      action: (
        <button
          onClick={() => undoDelete.cancelCountdown()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ),
    });
  };

  const getRoleIcon = (roleName: string) => {
    const normalized = roleName.toLowerCase();
    if (normalized.includes("admin")) return <Shield className="h-5 w-5" />;
    if (normalized.includes("developer")) return <UserCog className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                Roles Management
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg">
                Create and manage user roles with custom permission sets
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Custom Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <CreateRoleDialog onSuccess={handleRoleCreated} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading roles...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {roles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={loadRoles}
                  onDelete={() => handleDeleteRole(role)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Deletion Confirmation Dialog */}
      <AlertDialog
        open={!!roleToDelete && undoDelete.isCountingDown}
        onOpenChange={() => {
          if (undoDelete.isCountingDown) {
            undoDelete.cancelCountdown();
          }
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle className="text-xl">
                Delete Role?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-base">
                You are about to delete the role <span className="font-semibold text-gray-900 dark:text-white">"{roleToDelete?.role_name.replace(/\s*0$/, '')}"</span>. This will remove all permissions associated with this role.
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  ⏱️ This action will be completed in {undoDelete.timeLeft} seconds
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => undoDelete.cancelCountdown()}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Cancel Deletion
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => undoDelete.confirmDelete()}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 order-1 sm:order-2"
            >
              Delete Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    onEdit();
  };

  // Get role-specific colors
  const getRoleColors = () => {
    const normalized = role.role_name.toLowerCase();
    if (normalized.includes("admin")) {
      return {
        bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20",
        iconBg: "bg-gradient-to-br from-blue-600 to-blue-700",
        borderColor: "border-blue-200 dark:border-blue-800",
        badgeColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
      };
    } else if (normalized.includes("developer")) {
      return {
        bgGradient: "from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20",
        iconBg: "bg-gradient-to-br from-green-600 to-green-700",
        borderColor: "border-green-200 dark:border-green-800",
        badgeColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
      };
    } else if (normalized.includes("tester")) {
      return {
        bgGradient: "from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20",
        iconBg: "bg-gradient-to-br from-yellow-600 to-yellow-700",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        badgeColor: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
      };
    } else {
      return {
        bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20",
        iconBg: "bg-gradient-to-br from-purple-600 to-purple-700",
        borderColor: "border-purple-200 dark:border-purple-800",
        badgeColor: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
      };
    }
  };

  const colors = getRoleColors();

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 ${colors.borderColor} border-2`}>
      <div className={`p-4 sm:p-5 lg:p-6 bg-gradient-to-r ${colors.bgGradient} transition-colors`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className={`p-3 rounded-xl shadow-lg ${colors.iconBg}`}>
              {role.role_name === "Admin" || role.role_name.toLowerCase().includes("admin") ? (
                <Shield className="h-6 w-6 text-white" />
              ) : role.role_name === "Developer" || role.role_name.toLowerCase().includes("developer") ? (
                <UserCog className="h-6 w-6 text-white" />
              ) : (
                <Users className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {role.role_name.replace(/\s*0$/, '')}
                </h3>
                {role.is_system_role && (
                  <Badge variant="secondary" className="text-xs">
                    System Role
                  </Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3">
                {role.description || "No description provided"}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${colors.badgeColor} font-semibold px-3 py-1`}>
                  {role.permission_count || 0} Permissions
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!role.is_system_role && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="font-medium">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Permissions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <EditRoleDialog role={role} onSuccess={handleEditSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CreateRoleDialog({ onSuccess }: { onSuccess: () => void }) {
  const [roleName, setRoleName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const handleTogglePermission = (category: string, permissionId: number) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) =>
        perm.id === permissionId ? { ...perm, selected: !perm.selected } : perm
      ),
    }));
  };

  const handleSelectAllCategory = (category: string) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) => ({ ...perm, selected: true })),
    }));
  };

  const handleDeselectAllCategory = (category: string) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) => ({ ...perm, selected: false })),
    }));
  };

  const handleSelectAll = () => {
    setPermissions((prev) =>
      Object.keys(prev).reduce((acc, category) => {
        acc[category] = prev[category].map((perm) => ({ ...perm, selected: true }));
        return acc;
      }, {} as Record<string, Permission[]>)
    );
  };

  const handleDeselectAll = () => {
    setPermissions((prev) =>
      Object.keys(prev).reduce((acc, category) => {
        acc[category] = prev[category].map((perm) => ({ ...perm, selected: false }));
        return acc;
      }, {} as Record<string, Permission[]>)
    );
  };

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const data = await permissionService.getMasterPermissions();
        
        // Mark all permissions as unselected by default
        Object.keys(data).forEach((category) => {
          data[category] = data[category].map((perm) => ({
            ...perm,
            selected: false,
          }));
        });
        
        setPermissions(data);
      } catch (error) {
        console.error("Failed to load permissions:", error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    loadPermissions();
  }, []);

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const permissionIds = Object.values(permissions)
        .flat()
        .filter((p) => p.selected)
        .map((p) => p.id);

      await permissionService.createRole({
        role_name: roleName,
        description,
        permission_ids: permissionIds,
      });

      toast({
        title: "Success",
        description: "Role created successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPermissions) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Create a new role with custom permissions
          </DialogDescription>
        </DialogHeader>
        <p>Loading permissions...</p>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Custom Role</DialogTitle>
        <DialogDescription>
          Create a new role with custom permissions
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="roleName">Role Name</Label>
          <Input
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g., Project Manager"
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this role's responsibilities"
            rows={3}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Permissions</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                <CheckSquare className="mr-1 h-3 w-3" />
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs"
              >
                <Square className="mr-1 h-3 w-3" />
                Deselect All
              </Button>
            </div>
          </div>
          <div className="mt-2 space-y-6 border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-slate-950">
            {Object.entries(permissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    {category}
                    <span className="text-xs font-normal normal-case">
                      ({perms.filter(p => p.selected).length} / {perms.length})
                    </span>
                  </h4>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllCategory(category)}
                      className="text-xs h-7 px-2"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeselectAllCategory(category)}
                      className="text-xs h-7 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                        perm.selected
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={perm.selected}
                        onChange={() => handleTogglePermission(category, perm.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{perm.permission_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{perm.permission_key}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {}}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Role"}
          </Button>
        </div>
      </div>
    </>
  );
}

function EditRoleDialog({
  role,
  onSuccess,
}: {
  role: Role;
  onSuccess: () => void;
}) {
  const [roleName, setRoleName] = useState(() => {
    // Clean role name on initialization
    return (role.role_name || '').replace(/\s*0$/, '').trim();
  });
  const [description, setDescription] = useState(() => role.description || "");
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        // Get master permissions
        const data = await permissionService.getMasterPermissions();
        
        // Get current role permissions from API
        const rolesList = await permissionService.getRoles();
        const currentRole = rolesList.find(r => r.id === role.id);
        const rolePermissionIds = currentRole?.permissions?.map(p => p.id) || [];
        
        // Mark selected permissions
        Object.keys(data).forEach((category) => {
          data[category] = data[category].map((perm) => ({
            ...perm,
            selected: rolePermissionIds.includes(perm.id),
          }));
        });
        
        setPermissions(data);
      } catch (error) {
        console.error("Failed to load permissions:", error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };
    loadPermissions();
  }, [role.id]);

  const handleTogglePermission = (category: string, permissionId: number) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) =>
        perm.id === permissionId ? { ...perm, selected: !perm.selected } : perm
      ),
    }));
  };

  const handleSelectAllCategory = (category: string) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) => ({ ...perm, selected: true })),
    }));
  };

  const handleDeselectAllCategory = (category: string) => {
    setPermissions((prev) => ({
      ...prev,
      [category]: prev[category].map((perm) => ({ ...perm, selected: false })),
    }));
  };

  const handleSelectAll = () => {
    setPermissions((prev) =>
      Object.keys(prev).reduce((acc, category) => {
        acc[category] = prev[category].map((perm) => ({ ...perm, selected: true }));
        return acc;
      }, {} as Record<string, Permission[]>)
    );
  };

  const handleDeselectAll = () => {
    setPermissions((prev) =>
      Object.keys(prev).reduce((acc, category) => {
        acc[category] = prev[category].map((perm) => ({ ...perm, selected: false }));
        return acc;
      }, {} as Record<string, Permission[]>)
    );
  };


  const handleSubmit = async () => {
    if (!roleName.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const permissionIds = Object.values(permissions)
        .flat()
        .filter((p) => p.selected)
        .map((p) => p.id);

      // Clean role name before submitting
      const cleanedRoleName = roleName.trim().replace(/\s*0$/, '');

      await permissionService.updateRolePermissions(role.id, {
        role_name: cleanedRoleName,
        description,
        permission_ids: permissionIds,
      });

      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingPermissions) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update role permissions for {role.role_name.replace(/\s*0$/, '')}
          </DialogDescription>
        </DialogHeader>
        <p>Loading permissions...</p>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Role</DialogTitle>
        <DialogDescription>
          Update role permissions for {role.role_name.replace(/\s*0$/, '')}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="roleName">Role Name</Label>
          <Input
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g., Project Manager"
            disabled={role.is_system_role}
          />
          {role.is_system_role && (
            <p className="text-xs text-muted-foreground mt-1">
              System roles cannot be renamed
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this role's responsibilities"
            rows={3}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Permissions</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                <CheckSquare className="mr-1 h-3 w-3" />
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                className="text-xs"
              >
                <Square className="mr-1 h-3 w-3" />
                Deselect All
              </Button>
            </div>
          </div>
          <div className="mt-2 space-y-6 border rounded-lg p-4 max-h-[400px] overflow-y-auto bg-slate-50 dark:bg-slate-950">
            {Object.entries(permissions).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    {category}
                    <span className="text-xs font-normal normal-case">
                      ({perms.filter(p => p.selected).length} / {perms.length})
                    </span>
                  </h4>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllCategory(category)}
                      className="text-xs h-7 px-2"
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeselectAllCategory(category)}
                      className="text-xs h-7 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all ${
                        perm.selected
                          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={perm.selected}
                        onChange={() => handleTogglePermission(category, perm.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{perm.permission_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{perm.permission_key}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {}}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </div>
    </>
  );
}

