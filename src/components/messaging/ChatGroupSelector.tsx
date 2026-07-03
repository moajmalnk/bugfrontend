import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { ENV } from "@/lib/env";
import { cn, getEffectiveRole } from "@/lib/utils";
import { MessagingService } from "@/services/messagingService";
import { projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import type { ChatGroup, Project } from "@/types";
import {
  Check,
  ChevronsUpDown,
  Edit,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatListItem } from "./ChatListItem";
import React, { useEffect, useMemo, useRef, useState } from "react";

function messagingAuthToken(): string {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

function normalizeGroupRow(g: ChatGroup & { project_name?: string }): ChatGroup {
  const raw = g.is_member as unknown;
  const isMember =
    raw === true ||
    raw === 1 ||
    raw === "1";
  const mc = g.member_count as unknown;
  const memberCount =
    typeof mc === "number" ? mc : Number(mc) || 0;
  return {
    ...g,
    is_member: isMember,
    member_count: memberCount,
    projectName: g.projectName ?? g.project_name,
  };
}

type MemberRow = {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
};

function filterMemberList(
  members: MemberRow[],
  query: string,
  nameKey: "username" | "name"
) {
  const q = query.trim().toLowerCase();
  if (!q) return members;
  return members.filter((member) => {
    const display = (
      member[nameKey] ||
      member.username ||
      member.name ||
      member.email ||
      ""
    ).toLowerCase();
    const email = (member.email || "").toLowerCase();
    const role = (member.role || "").toLowerCase();
    return display.includes(q) || email.includes(q) || role.includes(q);
  });
}

interface MemberManagementPanelProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  members: MemberRow[];
  nameKey: "username" | "name";
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
  selectedTone: "destructive" | "primary";
  actionLabel?: string;
  onAction?: () => void;
  isActionLoading?: boolean;
  isLoading: boolean;
  loadingMessage: string;
  emptyMessage: string;
  filteredEmptyMessage: string;
  listClassName?: string;
}

function MemberManagementPanel({
  title,
  icon,
  count,
  members,
  nameKey,
  search,
  onSearchChange,
  searchPlaceholder,
  selectedIds,
  onToggle,
  selectedTone,
  actionLabel,
  onAction,
  isActionLoading = false,
  isLoading,
  loadingMessage,
  emptyMessage,
  filteredEmptyMessage,
  listClassName,
}: MemberManagementPanelProps) {
  const filteredMembers = useMemo(
    () => filterMemberList(members, search, nameKey),
    [members, search, nameKey]
  );

  const selectedStyles =
    selectedTone === "destructive"
      ? "bg-destructive/10 border-destructive/30"
      : "bg-primary/10 border-primary/30";

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", listClassName)}>
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          <span className="truncate">
            {title} ({count})
          </span>
        </h3>
        {actionLabel && onAction && selectedIds.length > 0 ? (
          <Button
            variant={selectedTone === "destructive" ? "destructive" : "default"}
            size="sm"
            onClick={onAction}
            disabled={isActionLoading}
            className="h-8 shrink-0 px-3 text-xs"
          >
            {isActionLoading ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              `${actionLabel} ${selectedIds.length}`
            )}
          </Button>
        ) : null}
      </div>

      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-9"
          aria-label={searchPlaceholder}
        />
      </div>

      <ScrollArea className="min-h-[220px] flex-1 rounded-xl border bg-muted/20 sm:min-h-[280px]">
        <div className="space-y-1.5 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              {loadingMessage}
            </div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {filteredEmptyMessage}
            </div>
          ) : (
            filteredMembers.map((member) => {
              const displayName =
                member[nameKey] || member.username || member.name || member.email;
              const isSelected = selectedIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors",
                    isSelected ? selectedStyles : "border-border hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggle(member.id)}
                    aria-label={`Select ${displayName}`}
                  />
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {displayName?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{displayName}</p>
                      {member.role ? (
                        <Badge
                          variant="secondary"
                          className="hidden shrink-0 text-[10px] uppercase tracking-wide sm:inline-flex"
                        >
                          {member.role}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.role ? (
                        <span className="sm:hidden">{member.role} • </span>
                      ) : null}
                      {member.email}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ChatGroupSelectorProps {
  selectedGroup: ChatGroup | null;
  onGroupSelect: (group: ChatGroup | null) => void;
  showAllProjects?: boolean;
  /** Dark compact list styled like common chat apps (use inside Messages sidebar) */
  variant?: "default" | "messaging";
  onCreateGroupClick?: () => void;
  triggerCreateGroup?: boolean;
  onTriggerCreateGroupReset?: () => void;
  onGroupsCountUpdate?: (count: number) => void;
  onGroupDelete?: (group: ChatGroup) => void;
  refreshTrigger?: number;
  /** Increment when chat messages change to reload last-message previews */
  chatListVersion?: number;
  /** After members are added/removed, bump parent list (e.g. chatListVersion). */
  onMembersChanged?: () => void;
  /** Parent stores the callback to open the member dialog for a group (e.g. chat header). */
  exposeOpenMembers?: (openForGroup: (groupId: string) => void) => void;
  /** Parent can observe the loaded list to resolve URL-selected chats. */
  onGroupsLoaded?: (groups: ChatGroup[]) => void;
}

export const ChatGroupSelector: React.FC<ChatGroupSelectorProps> = ({
  selectedGroup,
  onGroupSelect,
  showAllProjects = false,
  variant = "default",
  onCreateGroupClick,
  triggerCreateGroup = false,
  onTriggerCreateGroupReset,
  onGroupsCountUpdate,
  onGroupDelete,
  refreshTrigger,
  chatListVersion = 0,
  onMembersChanged,
  exposeOpenMembers,
  onGroupsLoaded,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions(null);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    projectId: "",
  });
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [deletedGroups, setDeletedGroups] = useState<{
    [key: string]: { group: ChatGroup; timestamp: number; timeoutId?: NodeJS.Timeout };
  }>({});
  const [undoCountdown, setUndoCountdown] = useState<{
    [key: string]: number;
  }>({});
  const [memberDialog, setMemberDialog] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [existingMembers, setExistingMembers] = useState<any[]>([]);
  const [isLoadingExistingMembers, setIsLoadingExistingMembers] =
    useState(false);
  const [selectedExistingMembers, setSelectedExistingMembers] = useState<
    string[]
  >([]);
  const [currentMembersSearch, setCurrentMembersSearch] = useState("");
  const [availableMembersSearch, setAvailableMembersSearch] = useState("");
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
    groupDescription: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
  });

  const isAdmin = currentUser?.role === "admin";
  const effectiveRole = getEffectiveRole(currentUser || {});

  const canManageGroupMembers = (group: ChatGroup) =>
    effectiveRole === "admin" ||
    hasPermission("MESSAGING_MANAGE") ||
    Boolean(
      currentUser?.id &&
        String(group.created_by) === String(currentUser.id)
    );

  const canEditOrDeleteGroup = () =>
    effectiveRole === "admin" || hasPermission("MESSAGING_MANAGE");

  /** New chat: only projects the user belongs to (unless admin / MESSAGING_MANAGE). */
  const projectsEligibleForNewChat = useMemo(() => {
    if (!currentUser?.id) return projects;
    const uid = String(currentUser.id);
    if (effectiveRole === "admin" || hasPermission("MESSAGING_MANAGE")) {
      return projects;
    }
    return projects.filter((p) => {
      const withMembers = p as Project & { members?: string[] };
      const memberIds = withMembers.members ?? [];
      return (
        memberIds.some((id) => String(id) === uid) ||
        String(p.created_by) === uid
      );
    });
  }, [projects, currentUser?.id, effectiveRole, hasPermission]);

  useEffect(() => {
    if (!isCreateDialogOpen || !createForm.projectId) return;
    const stillValid = projectsEligibleForNewChat.some(
      (p) => p.id === createForm.projectId
    );
    if (!stillValid) {
      setCreateForm((prev) => ({ ...prev, projectId: "" }));
    }
  }, [
    isCreateDialogOpen,
    projectsEligibleForNewChat,
    createForm.projectId,
  ]);

  const handleManageMembersRef = useRef<(groupId: string) => Promise<void>>(
    async () => {}
  );

  // Handle external trigger to open create group dialog
  useEffect(() => {
    if (triggerCreateGroup && onTriggerCreateGroupReset) {
      setIsCreateDialogOpen(true);
      onTriggerCreateGroupReset();
    }
  }, [triggerCreateGroup, onTriggerCreateGroupReset]);

  // Notify parent component when groups count changes
  useEffect(() => {
    if (onGroupsCountUpdate) {
      onGroupsCountUpdate(groups.length);
    }
  }, [groups.length, onGroupsCountUpdate]);

  useEffect(() => {
    onGroupsLoaded?.(groups);
  }, [groups, onGroupsLoaded]);

  // Countdown effect for undo functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        const newState = { ...prev };
        let hasChanges = false;

        Object.keys(newState).forEach((groupId) => {
          const timeLeft = Math.max(
            0,
            10 -
              Math.floor(
                (Date.now() - deletedGroups[groupId]?.timestamp || 0) / 1000
              )
          );

          if (timeLeft <= 0) {
            delete newState[groupId];
            hasChanges = true;
          } else if (newState[groupId] !== timeLeft) {
            newState[groupId] = timeLeft;
            hasChanges = true;
          }
        });

        return hasChanges ? newState : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [deletedGroups]);

  // Cleanup pending timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(deletedGroups).forEach((deleted) => {
        if (deleted.timeoutId) {
          clearTimeout(deleted.timeoutId);
        }
      });
    };
  }, [deletedGroups]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const allProjects = await projectService.getProjects();
      setProjects(allProjects as unknown as Project[]);

      if (variant === "messaging") {
        const my = await MessagingService.getMyChatGroups();
        setGroups(
          my.map((g) =>
            normalizeGroupRow(g as ChatGroup & { project_name?: string })
          )
        );
      } else {
        let allGroups: ChatGroup[] = [];
        for (const project of allProjects) {
          const groups = await MessagingService.getGroupsByProject(project.id);
          allGroups = allGroups.concat(
            groups.map((g) =>
              normalizeGroupRow({
                ...g,
                projectName: project.name,
              })
            )
          );
        }
        setGroups(allGroups);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat groups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [refreshTrigger, chatListVersion, variant]);

  const handleCreateGroup = async () => {
    if (!createForm.projectId || !createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const newGroup = await MessagingService.createGroup({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        project_id: createForm.projectId,
      });
      setGroups((prev) => [
        {
          ...newGroup,
          projectName: projects.find((p) => p.id === createForm.projectId)
            ?.name,
          projectId: createForm.projectId,
        },
        ...prev,
      ]);
      setCreateForm({ name: "", description: "", projectId: "" });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Chat group created successfully",
      });
    } catch (error: unknown) {
      console.error("Error creating group:", error);
      const ax = error as {
        response?: { data?: { message?: string }; status?: number };
      };
      const msg =
        ax.response?.data?.message ||
        (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as Error).message === "string"
          ? (error as Error).message
          : null);
      toast({
        title: "Error",
        description: msg || "Failed to create chat group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const groupToDelete = groups.find((g) => g.id === groupId);
    if (!groupToDelete) return;

    setDeleteDialog({
      isOpen: true,
      groupId,
      groupName: groupToDelete.name,
    });
  };

  const confirmDeleteGroup = async () => {
    if (!deleteDialog) return;

    const { groupId } = deleteDialog;
    const groupToDelete = groups.find((g) => g.id === groupId);
    if (!groupToDelete) return;

    // Use the new onGroupDelete prop for undo delete functionality
    if (onGroupDelete) {
      onGroupDelete(groupToDelete);
      setDeleteDialog(null);
      return;
    }

    // Remove from UI immediately
    setGroups((prev) => prev.filter((g) => g.id !== groupId));

    if (selectedGroup?.id === groupId) {
      onGroupSelect(null);
    }

    // Close dialog
    setDeleteDialog(null);

    // Start countdown
    setUndoCountdown((prev) => ({
      ...prev,
      [groupId]: 10,
    }));

    // Show success toast with undo option
    toast({
      title: "Chat group deleted",
      description: "You can undo this action within 10 seconds",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => undoDeleteGroup(groupId)}
          className="ml-2"
        >
          Undo (10s)
        </Button>
      ),
    });

    // Schedule server deletion after 10 seconds
    const timeoutId = setTimeout(async () => {
      try {
        // Delete from server after timeout
        await MessagingService.deleteGroup(groupId);
        
        // Remove from deleted groups after successful deletion
        setDeletedGroups((prev) => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });

        // Clear countdown
        setUndoCountdown((prev) => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });
      } catch (error) {
        console.error("Error deleting group from server:", error);
        
        // Restore the group if server deletion failed
        setGroups((prev) => [...prev, groupToDelete]);
        
        // Remove from deleted groups
        setDeletedGroups((prev) => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });

        toast({
          title: "Error",
          description: "Failed to delete chat group",
          variant: "destructive",
        });
      }
    }, 10000); // 10 seconds

    // Store the group and timeout ID for potential undo
    setDeletedGroups((prev) => ({
      ...prev,
      [groupId]: {
        group: groupToDelete,
        timestamp: Date.now(),
        timeoutId,
      },
    }));
  };

  const undoDeleteGroup = (groupId: string) => {
    const deletedGroup = deletedGroups[groupId];
    if (!deletedGroup) return;

    // Cancel the scheduled deletion
    if (deletedGroup.timeoutId) {
      clearTimeout(deletedGroup.timeoutId);
    }

    // Restore the group
    setGroups((prev) => [...prev, deletedGroup.group]);

    // Remove from deleted groups
    setDeletedGroups((prev) => {
      const newState = { ...prev };
      delete newState[groupId];
      return newState;
    });

    // Clear countdown
    setUndoCountdown((prev) => {
      const newState = { ...prev };
      delete newState[groupId];
      return newState;
    });

    toast({
      title: "Undo successful",
      description: "Chat group has been restored",
    });
  };

  const handleEditGroup = (group: ChatGroup) => {
    setEditDialog({
      isOpen: true,
      groupId: group.id,
      groupName: group.name,
      groupDescription: group.description || "",
    });
    setEditForm({
      name: group.name,
      description: group.description || "",
    });
  };

  const handleUpdateGroup = async () => {
    if (!editDialog) return;

    if (!editForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Group name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await MessagingService.updateGroup(editDialog.groupId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
      });

      // Update local state
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editDialog.groupId
            ? {
                ...g,
                name: editForm.name.trim(),
                description: editForm.description.trim(),
              }
            : g
        )
      );

      // Update selected group if it's the one being edited
      if (selectedGroup?.id === editDialog.groupId) {
        onGroupSelect({
          ...selectedGroup,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
        });
      }

      toast({
        title: "Success",
        description: "Chat group updated successfully",
      });

      setEditDialog(null);
      setEditForm({ name: "", description: "" });
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update chat group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDeleteGroup = () => {
    setDeleteDialog(null);
  };

  const refreshMemberDialogLists = async (groupId: string) => {
    setIsLoadingExistingMembers(true);
    setIsLoadingMembers(true);
    try {
      const token = messagingAuthToken();
      const res = await fetch(
        `${ENV.API_URL}/messaging/get_members.php?group_id=${encodeURIComponent(groupId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to load members");
      }
      const members = (data.data || []).filter((m: any) => !isBugBotUser(m));
      setExistingMembers(members);

      const users = (await userService.getUsers()).filter(
        (u: any) => !isBugBotUser(u)
      );
      const memberIds = members.map((m: { id: string }) => m.id);
      setAvailableMembers(users.filter((u) => !memberIds.includes(u.id)));
    } catch (error) {
      console.error("Error loading member dialog lists:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load group members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExistingMembers(false);
      setIsLoadingMembers(false);
    }
  };

  const handleManageMembers = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setMemberDialog({
      isOpen: true,
      groupId,
      groupName: group.name,
    });
    setSelectedMembers([]);
    setSelectedExistingMembers([]);
    setCurrentMembersSearch("");
    setAvailableMembersSearch("");
    await refreshMemberDialogLists(groupId);
  };

  handleManageMembersRef.current = handleManageMembers;

  useEffect(() => {
    if (!exposeOpenMembers) return;
    exposeOpenMembers((groupId) => {
      void handleManageMembersRef.current(groupId);
    });
  }, [exposeOpenMembers]);

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member to add",
        variant: "destructive",
      });
      return;
    }

    if (!memberDialog) return;

    setIsLoadingMembers(true);
    try {
      const response = await fetch(`${ENV.API_URL}/messaging/add_member.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${messagingAuthToken()}`,
        },
        body: JSON.stringify({
          group_id: memberDialog.groupId,
          user_ids: selectedMembers,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || `Failed to add members (${response.status})`
        );
      }

      const added =
        typeof data.data?.added_count === "number"
          ? data.data.added_count
          : selectedMembers.length;
      if (added < 1) {
        throw new Error(
          data.message || "No members were added. Check that users exist and are active."
        );
      }

      let patched: ChatGroup | undefined;
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== memberDialog.groupId) return group;
          patched = {
            ...group,
            member_count: group.member_count + added,
          };
          return patched;
        })
      );
      if (patched && selectedGroup?.id === memberDialog.groupId) {
        onGroupSelect(patched);
      }

      await refreshMemberDialogLists(memberDialog.groupId);
      onMembersChanged?.();

      toast({
        title: "Success",
        description:
          data.message ||
          `${added} member(s) added to the group`,
      });

      setSelectedMembers([]);
    } catch (error) {
      console.error("Error adding members:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add members to the group",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const cancelMemberDialog = () => {
    setMemberDialog(null);
    setSelectedMembers([]);
    setSelectedExistingMembers([]);
    setExistingMembers([]);
    setAvailableMembers([]);
    setCurrentMembersSearch("");
    setAvailableMembersSearch("");
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleDeleteMembers = async () => {
    if (selectedExistingMembers.length === 0) {
      toast({
        title: "No members selected",
        description: "Please select at least one member to remove",
        variant: "destructive",
      });
      return;
    }

    if (!memberDialog) return;

    setIsLoadingExistingMembers(true);
    try {
      const response = await fetch(
        `${ENV.API_URL}/messaging/remove_member.php`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${messagingAuthToken()}`,
          },
          body: JSON.stringify({
            group_id: memberDialog.groupId,
            user_ids: selectedExistingMembers,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const removed =
          typeof data.data?.removed_count === "number"
            ? data.data.removed_count
            : selectedExistingMembers.length;
        let patched: ChatGroup | undefined;
        setGroups((prev) =>
          prev.map((group) => {
            if (group.id !== memberDialog.groupId) return group;
            patched = {
              ...group,
              member_count: Math.max(0, group.member_count - removed),
            };
            return patched;
          })
        );
        if (patched && selectedGroup?.id === memberDialog.groupId) {
          onGroupSelect(patched);
        }

        await refreshMemberDialogLists(memberDialog.groupId);
        onMembersChanged?.();

        toast({
          title: "Success",
          description:
            data.message ||
            `${selectedExistingMembers.length} member(s) removed from the group`,
        });

        setSelectedExistingMembers([]);
      } else {
        throw new Error(data.message || "Failed to remove members");
      }
    } catch (error) {
      console.error("Error removing members:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to remove members from the group",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExistingMembers(false);
    }
  };

  const toggleExistingMemberSelection = (userId: string) => {
    setSelectedExistingMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return "No messages yet";
    return MessagingService.formatMessageTime(timestamp);
  };

  const isBugBotIdentity = (value?: string | null) => {
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    return normalized === "bugbot" || normalized.includes("bugbot");
  };

  const isBugBotUser = (user: {
    id?: string;
    username?: string;
    name?: string;
    email?: string;
  }) =>
    isBugBotIdentity(user.id) ||
    isBugBotIdentity(user.username) ||
    isBugBotIdentity(user.name) ||
    isBugBotIdentity(user.email);

  const formatChatListSubtitle = (group: ChatGroup) => {
    const preview = group.last_message_preview?.trim();
    const sid = group.last_message_sender_id;
    const sname = group.last_message_sender_name?.trim();
    if (preview) {
      const who =
        currentUser?.id && sid && String(sid) === String(currentUser.id)
          ? "You"
          : isBugBotIdentity(sname)
            ? "Member"
            : sname || "Member";
      return `${who}: ${preview}`;
    }
    if (group.last_message_at) return "Open to view messages";
    const desc = group.description?.trim();
    if (desc) return desc;
    return "No messages yet";
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMessaging = variant === "messaging";

  return (
    <div
      className={cn(
        "flex flex-col h-full min-h-0 overflow-hidden",
        isMessaging ? "bg-[#111b21] text-[#e9edef]" : "bg-background"
      )}
    >
      {isMessaging ? (
        <>
          <div className="flex-shrink-0 bg-[#202c33] border-b border-[#2a3942] px-3 py-2.5 z-10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MessageCircle className="h-5 w-5 text-[#00a884] shrink-0" />
                <h2 className="text-base font-semibold text-[#e9edef] truncate">
                  Chats
                </h2>
              </div>
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="h-9 w-9 rounded-full text-[#aebac1] hover:bg-[#2a3942] hover:text-[#e9edef] shrink-0"
                  title="New group"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 px-2 py-2 border-b border-[#2a3942]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0] pointer-events-none" />
              <Input
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-[#2a3942] border-0 rounded-lg text-sm text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-1 focus-visible:ring-[#00a884]"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-3 sm:px-4 py-3 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Chat Groups
                  </h2>
                </div>
                {isAdmin && (
                  <Button
                    size="icon"
                    variant={
                      filteredGroups.length === 0 && !searchQuery
                        ? "default"
                        : "outline"
                    }
                    onClick={() => setIsCreateDialogOpen(true)}
                    className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-all duration-200 ${
                      filteredGroups.length === 0 && !searchQuery
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    title={
                      filteredGroups.length === 0 && !searchQuery
                        ? "Create your first group"
                        : "Create new group"
                    }
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="sticky top-16 z-10">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 px-3 sm:px-4 py-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className={cn(
          "flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden space-y-0 hide-scrollbar",
          isMessaging ? "bg-[#111b21]" : "bg-background"
        )}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm">Loading groups...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center px-4">
            {searchQuery ? (
              // Search results empty state
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-4">
                    <Search className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Groups Found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Try adjusting your search terms or create a new group
                  </p>
                  {isAdmin && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-10 px-4 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Group
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              // No groups promotional state
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 max-w-md animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <MessageCircle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Chat Groups Yet</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                    Create your first chat group to start collaborating with your team members. Chat groups help organize conversations by project or topic.
                  </p>

                  {isAdmin ? (
                    // Admin can create groups
                    <div className="space-y-4">
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="w-full h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                        size="lg"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Your First Group
                      </Button>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          <span>Create project-specific chat rooms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                          <span>Invite team members to collaborate</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                          <span>Share updates and discuss issues</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Non-admin users
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                          Contact your administrator to create chat groups for your team.
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                          <span>Chat groups help organize conversations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                          <span>Get notified about important updates</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                          <span>Share ideas and collaborate effectively</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={isMessaging ? "" : "space-y-1 p-2"}>
            {filteredGroups.map((group) =>
              isMessaging ? (
                <ChatListItem
                  key={group.id}
                  group={group}
                  isSelected={selectedGroup?.id === group.id}
                  subtitle={formatChatListSubtitle(group)}
                  timeLabel={
                    group.last_message_at
                      ? formatLastMessageTime(group.last_message_at)
                      : null
                  }
                  canManageMembers={canManageGroupMembers(group)}
                  canEditOrDelete={canEditOrDeleteGroup()}
                  onSelect={onGroupSelect}
                  onManageMembers={handleManageMembers}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                />
              ) : (
                <div
                  key={group.id}
                  className={`group relative overflow-hidden rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01] cursor-pointer ${
                    selectedGroup?.id === group.id
                      ? "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
                      : "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20"
                  }`}
                  onClick={() => onGroupSelect(group)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onGroupSelect(group);
                  }}
                  aria-selected={selectedGroup?.id === group.id}
                >
                  {selectedGroup?.id === group.id && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full shadow-lg"></div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                          {group.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              {group.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              >
                                {group.projectName}
                              </Badge>
                              {!group.is_member && (
                                <Badge variant="secondary" className="text-xs px-2 py-1">
                                  Not Member
                                </Badge>
                              )}
                            </div>
                          </div>
                          {(canManageGroupMembers(group) || canEditOrDeleteGroup()) && (
                            <div className="flex items-center space-x-1 ml-2">
                              {canManageGroupMembers(group) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleManageMembers(group.id);
                                  }}
                                  tabIndex={-1}
                                  className="h-8 w-8 p-0 hover:bg-primary/10 rounded-lg transition-all duration-200"
                                  title="Manage members"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              )}
                              {canEditOrDeleteGroup() && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditGroup(group);
                                    }}
                                    tabIndex={-1}
                                    className="h-8 w-8 p-0 hover:bg-primary/10 rounded-lg transition-all duration-200"
                                    title="Edit group"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteGroup(group.id);
                                    }}
                                    tabIndex={-1}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                                    title="Delete group"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {group.last_message_preview?.trim() ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                            {formatChatListSubtitle(group)}
                          </p>
                        ) : group.description ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
                            {group.description}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-blue-500 rounded-lg">
                              <Users className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-medium">{group.member_count} members</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-green-500 rounded-lg">
                              <MessageCircle className="h-3 w-3 text-white" />
                            </div>
                            <span className="font-medium">Active chat</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
      {/* Create Group Dialog with project dropdown inside */}
      {isAdmin && (
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setProjectPickerOpen(false);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Chat Group</DialogTitle>
              <DialogDescription>
                Create a new chat group to organize team discussions and collaboration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="group-description">Description</Label>
                <Textarea
                  id="group-description"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter group description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="project-select">Select Project *</Label>
                <Popover open={projectPickerOpen} onOpenChange={setProjectPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="project-select"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectPickerOpen}
                      disabled={projectsEligibleForNewChat.length === 0}
                      className="mt-1 w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {createForm.projectId
                          ? projectsEligibleForNewChat.find(
                              (p) => p.id === createForm.projectId
                            )?.name ?? "Choose a project"
                          : "Choose a project"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 z-[70]"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search project..." />
                      <CommandList>
                        <CommandEmpty>No project found.</CommandEmpty>
                        <CommandGroup>
                          {projectsEligibleForNewChat.map((project) => (
                            <CommandItem
                              key={project.id}
                              value={`${project.name} ${project.id}`}
                              onSelect={() => {
                                setCreateForm((prev) => ({
                                  ...prev,
                                  projectId: project.id,
                                }));
                                setProjectPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  createForm.projectId === project.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {project.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {projectsEligibleForNewChat.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    You are not a member of any project. Ask an admin to add you
                    to a project, or use an account with messaging management
                    access.
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateGroup}
                  disabled={
                    isLoading ||
                    !createForm.name.trim() ||
                    !createForm.projectId
                  }
                >
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom Delete Confirmation Dialog */}
      {deleteDialog && (
        <Dialog
          open={deleteDialog.isOpen}
          onOpenChange={() => setDeleteDialog(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </div>
                Delete Chat Group
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this chat group? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this chat group?
                </p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-semibold text-base">
                    {deleteDialog.groupName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This action cannot be undone after 10 seconds
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={cancelDeleteGroup}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteGroup}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </div>
                  ) : (
                    "Delete Group"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Member Management Dialog */}
      {memberDialog && (
        <Dialog
          open={memberDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) cancelMemberDialog();
          }}
        >
          <DialogContent className="flex max-h-[min(92vh,820px)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
            <DialogHeader className="shrink-0 space-y-1 border-b px-4 pb-4 pt-5 sm:px-6">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                Manage Group Members
              </DialogTitle>
              <DialogDescription>
                Add or remove members from this chat group. Changes apply
                immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="shrink-0 border-b bg-muted/30 px-4 py-3 sm:px-6">
              <div className="rounded-xl border bg-background/80 px-4 py-3">
                <p className="truncate text-base font-semibold">
                  {memberDialog.groupName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {existingMembers.length} current member
                  {existingMembers.length === 1 ? "" : "s"} •{" "}
                  {availableMembers.length} available to add
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
              <div className="flex min-h-0 flex-1 flex-col md:hidden">
                <Tabs defaultValue="current" className="flex min-h-0 flex-1 flex-col">
                  <TabsList className="grid h-10 w-full shrink-0 grid-cols-2">
                    <TabsTrigger value="current" className="text-xs sm:text-sm">
                      Current ({existingMembers.length})
                    </TabsTrigger>
                    <TabsTrigger value="available" className="text-xs sm:text-sm">
                      Add ({availableMembers.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent
                    value="current"
                    className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                  >
                    <MemberManagementPanel
                      title="Current Members"
                      icon={<Users className="h-4 w-4" />}
                      count={existingMembers.length}
                      members={existingMembers}
                      nameKey="username"
                      search={currentMembersSearch}
                      onSearchChange={setCurrentMembersSearch}
                      searchPlaceholder="Search current members..."
                      selectedIds={selectedExistingMembers}
                      onToggle={toggleExistingMemberSelection}
                      selectedTone="destructive"
                      actionLabel="Remove"
                      onAction={handleDeleteMembers}
                      isActionLoading={isLoadingExistingMembers}
                      isLoading={isLoadingExistingMembers}
                      loadingMessage="Loading members..."
                      emptyMessage="No members in this group"
                      filteredEmptyMessage="No members match your search"
                      listClassName="min-h-[min(42vh,360px)]"
                    />
                  </TabsContent>
                  <TabsContent
                    value="available"
                    className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                  >
                    <MemberManagementPanel
                      title="Available to Add"
                      icon={<UserPlus className="h-4 w-4" />}
                      count={availableMembers.length}
                      members={availableMembers}
                      nameKey="name"
                      search={availableMembersSearch}
                      onSearchChange={setAvailableMembersSearch}
                      searchPlaceholder="Search users to add..."
                      selectedIds={selectedMembers}
                      onToggle={toggleMemberSelection}
                      selectedTone="primary"
                      actionLabel="Add"
                      onAction={handleAddMembers}
                      isActionLoading={isLoadingMembers}
                      isLoading={isLoadingMembers}
                      loadingMessage="Loading users..."
                      emptyMessage="No users available to add"
                      filteredEmptyMessage="No users match your search"
                      listClassName="min-h-[min(42vh,360px)]"
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="hidden min-h-0 flex-1 gap-5 md:grid md:grid-cols-2">
                <MemberManagementPanel
                  title="Current Members"
                  icon={<Users className="h-4 w-4" />}
                  count={existingMembers.length}
                  members={existingMembers}
                  nameKey="username"
                  search={currentMembersSearch}
                  onSearchChange={setCurrentMembersSearch}
                  searchPlaceholder="Search current members..."
                  selectedIds={selectedExistingMembers}
                  onToggle={toggleExistingMemberSelection}
                  selectedTone="destructive"
                  actionLabel="Remove"
                  onAction={handleDeleteMembers}
                  isActionLoading={isLoadingExistingMembers}
                  isLoading={isLoadingExistingMembers}
                  loadingMessage="Loading members..."
                  emptyMessage="No members in this group"
                  filteredEmptyMessage="No members match your search"
                  listClassName="h-[min(48vh,420px)]"
                />
                <MemberManagementPanel
                  title="Available to Add"
                  icon={<UserPlus className="h-4 w-4" />}
                  count={availableMembers.length}
                  members={availableMembers}
                  nameKey="name"
                  search={availableMembersSearch}
                  onSearchChange={setAvailableMembersSearch}
                  searchPlaceholder="Search users to add..."
                  selectedIds={selectedMembers}
                  onToggle={toggleMemberSelection}
                  selectedTone="primary"
                  actionLabel="Add"
                  onAction={handleAddMembers}
                  isActionLoading={isLoadingMembers}
                  isLoading={isLoadingMembers}
                  loadingMessage="Loading users..."
                  emptyMessage="No users available to add"
                  filteredEmptyMessage="No users match your search"
                  listClassName="h-[min(48vh,420px)]"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t px-4 py-3 sm:px-6">
              <Button
                variant="outline"
                onClick={cancelMemberDialog}
                disabled={isLoadingMembers || isLoadingExistingMembers}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Group Dialog */}
      {isAdmin && editDialog && (
        <Dialog
          open={editDialog.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditDialog(null);
              setEditForm({ name: "", description: "" });
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Chat Group</DialogTitle>
              <DialogDescription>
                Update the name and description of this chat group.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-group-name">Group Name *</Label>
                <Input
                  id="edit-group-name"
                  placeholder="Enter group name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-group-description">Description</Label>
                <Textarea
                  id="edit-group-description"
                  placeholder="Enter group description (optional)"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  disabled={isLoading}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditDialog(null);
                    setEditForm({ name: "", description: "" });
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroup} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    "Update Group"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Undo Notifications */}
      {Object.keys(deletedGroups).map((groupId) => {
        const deletedGroup = deletedGroups[groupId];
        const timeLeft = undoCountdown[groupId] || 0;

        if (!deletedGroup || timeLeft <= 0) return null;

        return (
          <div
            key={groupId}
            className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-2"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Chat group deleted</p>
                <p className="text-xs text-muted-foreground mt-1">
                  "{deletedGroup.group.name}" has been deleted
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => undoDeleteGroup(groupId)}
                    className="text-xs"
                  >
                    Undo ({timeLeft}s)
                  </Button>
                  <div className="flex-1 bg-muted rounded-full h-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-1000"
                      style={{ width: `${(timeLeft / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
