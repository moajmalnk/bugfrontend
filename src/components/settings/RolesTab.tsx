import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { permissionService } from "@/services/permissionService";
import { Permission, Role } from "@/types";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { UndoDeleteNotificationPortal } from "@/components/ui/UndoDeleteNotification";
import {
  TaskFormActions,
  TaskFormDialogShell,
  TaskFormField,
  TaskFormSection,
  taskFieldControlClass,
  taskTextareaClass,
} from "@/components/tasks/TaskFormDialogShell";
import { cn } from "@/lib/utils";
import {
  Plus,
  Shield,
  Users,
  UserCog,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  KeyRound,
  FileText,
} from "lucide-react";
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
            <Button className="w-full sm:w-auto" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Role
            </Button>
            <CreateRoleDialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              onSuccess={handleRoleCreated}
            />
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

      <UndoDeleteNotificationPortal
        open={undoDelete.isCountingDown && !!roleToDelete}
        title="Role Deleted"
        itemName={roleToDelete?.role_name.replace(/\s*0$/, "") ?? ""}
        timeLeft={undoDelete.timeLeft}
        duration={10}
        onUndo={undoDelete.cancelCountdown}
        onConfirmNow={undoDelete.confirmDelete}
      />
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
            <Button
              variant="outline"
              className="font-medium"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Permissions
            </Button>
            <EditRoleDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              role={role}
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function PermissionsEditor({
  permissions,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSelectAllCategory,
  onDeselectAllCategory,
}: {
  permissions: Record<string, Permission[]>;
  onToggle: (category: string, permissionId: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectAllCategory: (category: string) => void;
  onDeselectAllCategory: (category: string) => void;
}) {
  const totalSelected = Object.values(permissions)
    .flat()
    .filter((p) => p.selected).length;
  const totalCount = Object.values(permissions).flat().length;

  return (
    <TaskFormSection
      title="Permissions"
      subtitle={`${totalSelected} of ${totalCount} permissions selected`}
      icon={<KeyRound className="h-4 w-4" />}
      accent="blue"
    >
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSelectAll}
          className="h-9 border-2 text-xs"
        >
          <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
          Select All
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDeselectAll}
          className="h-9 border-2 text-xs"
        >
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Deselect All
        </Button>
      </div>

      <div className="max-h-[380px] space-y-5 overflow-y-auto rounded-lg border-2 border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-900/40 custom-scrollbar">
        {Object.entries(permissions).map(([category, perms]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                {category}
                <span className="font-normal normal-case text-gray-400">
                  ({perms.filter((p) => p.selected).length} / {perms.length})
                </span>
              </h4>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectAllCategory(category)}
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeselectAllCategory(category)}
                  className="h-7 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {perms.map((perm) => (
                <label
                  key={perm.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all',
                    perm.selected
                      ? 'border-indigo-300 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
                  )}
                >
                  <Checkbox
                    checked={perm.selected}
                    onCheckedChange={() => onToggle(category, perm.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {perm.permission_name}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {perm.permission_key}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </TaskFormSection>
  );
}

function RoleDetailsSection({
  roleName,
  description,
  onRoleNameChange,
  onDescriptionChange,
  roleNameDisabled,
  roleNameHelper,
}: {
  roleName: string;
  description: string;
  onRoleNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  roleNameDisabled?: boolean;
  roleNameHelper?: string;
}) {
  return (
    <TaskFormSection
      title="Role Details"
      subtitle="Name and description for this role"
      icon={<FileText className="h-4 w-4" />}
      accent="indigo"
    >
      <div className="space-y-4">
        <TaskFormField label="Role Name" required htmlFor="roleName">
          <Input
            id="roleName"
            value={roleName}
            onChange={(e) => onRoleNameChange(e.target.value)}
            placeholder="e.g., Project Manager"
            disabled={roleNameDisabled}
            className={taskFieldControlClass}
          />
          {roleNameHelper ? (
            <p className="text-xs text-muted-foreground">{roleNameHelper}</p>
          ) : null}
        </TaskFormField>
        <TaskFormField label="Description" htmlFor="description">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe this role's responsibilities"
            rows={3}
            className={taskTextareaClass}
          />
        </TaskFormField>
      </div>
    </TaskFormSection>
  );
}

function CreateRoleDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
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
      <TaskFormDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="Create Custom Role"
        description="Create a new role with custom permissions"
        icon={<Shield className="h-6 w-6" />}
        headerClassName="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600"
        maxWidthClassName="max-w-3xl"
        footer={<div />}
      >
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading permissions…
        </div>
      </TaskFormDialogShell>
    );
  }

  return (
    <TaskFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Create Custom Role"
      description="Create a new role with custom permissions"
      icon={<Shield className="h-6 w-6" />}
      headerClassName="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600"
      maxWidthClassName="max-w-3xl"
      footer={
        <TaskFormActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitting={isLoading}
          submitLabel="Create Role"
        />
      }
    >
      <div className="space-y-5">
        <RoleDetailsSection
          roleName={roleName}
          description={description}
          onRoleNameChange={setRoleName}
          onDescriptionChange={setDescription}
        />
        <PermissionsEditor
          permissions={permissions}
          onToggle={handleTogglePermission}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onSelectAllCategory={handleSelectAllCategory}
          onDeselectAllCategory={handleDeselectAllCategory}
        />
      </div>
    </TaskFormDialogShell>
  );
}

function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const cleanedRoleName = role.role_name.replace(/\s*0$/, '');

  if (isLoadingPermissions) {
    return (
      <TaskFormDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title="Edit Role"
        description={`Update permissions for ${cleanedRoleName}`}
        icon={<Shield className="h-6 w-6" />}
        headerClassName="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600"
        maxWidthClassName="max-w-3xl"
        footer={<div />}
      >
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          Loading permissions…
        </div>
      </TaskFormDialogShell>
    );
  }

  return (
    <TaskFormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Role"
      description={`Update permissions for ${cleanedRoleName}`}
      icon={<Shield className="h-6 w-6" />}
      headerClassName="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600"
      maxWidthClassName="max-w-3xl"
      footer={
        <TaskFormActions
          onCancel={() => onOpenChange(false)}
          onSubmit={handleSubmit}
          submitting={isLoading}
          submitLabel="Save Changes"
        />
      }
    >
      <div className="space-y-5">
        <RoleDetailsSection
          roleName={roleName}
          description={description}
          onRoleNameChange={setRoleName}
          onDescriptionChange={setDescription}
          roleNameDisabled={role.is_system_role}
          roleNameHelper={
            role.is_system_role ? 'System roles cannot be renamed' : undefined
          }
        />
        <PermissionsEditor
          permissions={permissions}
          onToggle={handleTogglePermission}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onSelectAllCategory={handleSelectAllCategory}
          onDeselectAllCategory={handleDeselectAllCategory}
        />
      </div>
    </TaskFormDialogShell>
  );
}

