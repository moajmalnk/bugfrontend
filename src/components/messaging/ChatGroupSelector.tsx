import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ENV } from "@/lib/env";
import { MessagingService } from "@/services/messagingService";
import { projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import { ChatGroup, Project } from "@/types";
import {
  Edit,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
interface ChatGroupSelectorProps {
  selectedGroup: ChatGroup | null;
  onGroupSelect: (group: ChatGroup) => void;
  showAllProjects?: boolean;
  onCreateGroupClick?: () => void;
}

export const ChatGroupSelector: React.FC<ChatGroupSelectorProps> = ({
  selectedGroup,
  onGroupSelect,
  showAllProjects = false,
  onCreateGroupClick,
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
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
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    groupId: string;
    groupName: string;
  } | null>(null);
  const [deletedGroups, setDeletedGroups] = useState<{
    [key: string]: { group: ChatGroup; timestamp: number };
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

  const isAdmin = currentUser?.role === "admin";

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

  useEffect(() => {
    // Always load all projects and all groups
    (async () => {
      setIsLoading(true);
      try {
        const allProjects = await projectService.getProjects();
        setProjects(allProjects as unknown as Project[]);
        let allGroups: ChatGroup[] = [];
        for (const project of allProjects) {
          const groups = await MessagingService.getGroupsByProject(project.id);
          allGroups = allGroups.concat(
            groups.map((g) => ({
              ...g,
              projectName: project.name,
              projectId: project.id,
            }))
          );
        }
        setGroups(allGroups);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load chat groups",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

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
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: "Failed to create chat group",
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

    setIsLoading(true);
    try {
      // Store the group for potential undo
      setDeletedGroups((prev) => ({
        ...prev,
        [groupId]: {
          group: groupToDelete,
          timestamp: Date.now(),
        },
      }));

      // Start countdown
      setUndoCountdown((prev) => ({
        ...prev,
        [groupId]: 10,
      }));

      // Remove from UI immediately
      setGroups((prev) => prev.filter((g) => g.id !== groupId));

      if (selectedGroup?.id === groupId) {
        onGroupSelect(null);
      }

      // Close dialog
      setDeleteDialog(null);

      // Show success toast with undo option
      toast({
        title: "Chat group deleted",
        description: `You can undo this action within ${
          undoCountdown[groupId] || 10
        } seconds`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => undoDeleteGroup(groupId)}
            className="ml-2"
            disabled={!undoCountdown[groupId]}
          >
            Undo ({undoCountdown[groupId] || 10}s)
          </Button>
        ),
      });

      // Actually delete from server
      await MessagingService.deleteGroup(groupId);

      // Remove from deleted groups after successful server deletion
      setTimeout(() => {
        setDeletedGroups((prev) => {
          const newState = { ...prev };
          delete newState[groupId];
          return newState;
        });
      }, 10000); // 10 seconds
    } catch (error) {
      console.error("Error deleting group:", error);

      // Restore the group if server deletion failed
      setGroups((prev) => [...prev, groupToDelete]);

      toast({
        title: "Error",
        description: "Failed to delete chat group",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const undoDeleteGroup = (groupId: string) => {
    const deletedGroup = deletedGroups[groupId];
    if (!deletedGroup) return;

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

  const cancelDeleteGroup = () => {
    setDeleteDialog(null);
  };

  const handleManageMembers = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    setMemberDialog({
      isOpen: true,
      groupId,
      groupName: group.name,
    });

    await loadAvailableMembers(groupId);
    await loadExistingMembers(groupId);
  };

  const loadAvailableMembers = async (groupId: string) => {
    setIsLoadingMembers(true);
    try {
      // Load all users (admins, developers, testers)
      const users = await userService.getUsers();

      // Filter out users who are already members of this group
      const existingMemberIds = existingMembers.map((member) => member.id);
      const available = users.filter(
        (user) => !existingMemberIds.includes(user.id)
      );

      setAvailableMembers(available || []);
    } catch (error) {
      console.error("Error loading available members:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load available members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

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
          Authorization: `Bearer ${
            sessionStorage.getItem("token") || localStorage.getItem("token")
          }`,
        },
        body: JSON.stringify({
          group_id: memberDialog.groupId,
          user_ids: selectedMembers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the group in the list
        setGroups((prev) =>
          prev.map((group) =>
            group.id === memberDialog.groupId
              ? {
                  ...group,
                  member_count:
                    group.member_count +
                    (data.data?.added_count || selectedMembers.length),
                }
              : group
          )
        );

        // Reload both existing and available members
        await loadExistingMembers(memberDialog.groupId);
        await loadAvailableMembers(memberDialog.groupId);

        toast({
          title: "Success",
          description:
            data.message ||
            `${selectedMembers.length} member(s) added to the group`,
        });

        setMemberDialog(null);
        setSelectedMembers([]);
      } else {
        throw new Error(data.message || "Failed to add members");
      }
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
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const loadExistingMembers = async (groupId: string) => {
    setIsLoadingExistingMembers(true);
    try {
      const response = await fetch(
        `${ENV.API_URL}/messaging/get_members.php?group_id=${groupId}`,
        {
          headers: {
            Authorization: `Bearer ${
              sessionStorage.getItem("token") || localStorage.getItem("token")
            }`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setExistingMembers(data.data || []);
      } else {
        throw new Error(data.message || "Failed to load existing members");
      }
    } catch (error) {
      console.error("Error loading existing members:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load existing members",
        variant: "destructive",
      });
    } finally {
      setIsLoadingExistingMembers(false);
    }
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
            Authorization: `Bearer ${
              sessionStorage.getItem("token") || localStorage.getItem("token")
            }`,
          },
          body: JSON.stringify({
            group_id: memberDialog.groupId,
            user_ids: selectedExistingMembers,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Update the group in the list
        setGroups((prev) =>
          prev.map((group) =>
            group.id === memberDialog.groupId
              ? {
                  ...group,
                  member_count:
                    group.member_count -
                    (data.data?.removed_count ||
                      selectedExistingMembers.length),
                }
              : group
          )
        );

        // Reload existing members
        await loadExistingMembers(memberDialog.groupId);

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

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header with plus button */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <h2 className="text-base sm:text-lg font-semibold">Chat Groups</h2>
        {isAdmin && (
          <Button
            size="icon"
            variant={
              filteredGroups.length === 0 && !searchQuery
                ? "default"
                : "outline"
            }
            onClick={() => setIsCreateDialogOpen(true)}
            className={`h-8 w-8 sm:h-9 sm:w-9 ${
              filteredGroups.length === 0 && !searchQuery
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : ""
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
      {/* Search Bar - Mobile */}
      <div className="md:hidden sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-3 sm:px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus:bg-background text-sm"
          />
        </div>
      </div>
      {/* Scrollable Groups List */}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden space-y-0 bg-background hide-scrollbar">
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
              <div className="space-y-3">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    No groups found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search terms
                  </p>
                </div>
              </div>
            ) : (
              // No groups promotional state
              <div className="space-y-6 max-w-sm animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      No Chat Groups Yet
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Create your first chat group to start collaborating with
                      your team members. Chat groups help organize conversations
                      by project or topic.
                    </p>
                  </div>
                </div>

                {isAdmin ? (
                  // Admin can create groups
                  <div className="space-y-3">
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="w-full"
                      size="lg"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>✨ Create project-specific chat rooms</p>
                      <p>👥 Invite team members to collaborate</p>
                      <p>💬 Share updates and discuss issues</p>
                    </div>
                  </div>
                ) : (
                  // Non-admin users
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Contact your administrator to create chat groups for
                        your team.
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>📋 Chat groups help organize conversations</p>
                      <p>🔔 Get notified about important updates</p>
                      <p>💡 Share ideas and collaborate effectively</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedGroup?.id === group.id
                    ? "bg-primary/10 border-r-2 border-primary"
                    : ""
                }`}
                onClick={() => onGroupSelect(group)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onGroupSelect(group);
                }}
                aria-selected={selectedGroup?.id === group.id}
              >
                {/* Group Avatar */}
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                    {group.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate text-sm">
                      {group.name}
                    </h4>
                    <span className="text-xs text-primary font-semibold flex-shrink-0 ml-2">
                      {group.projectName}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{group.member_count}</span>
                    </div>
                    {!group.is_member && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Not Member
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Admin Actions - Desktop only */}
                {isAdmin && (
                  <div className="hidden md:flex items-center space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageMembers(group.id);
                      }}
                      tabIndex={-1}
                      className="h-6 w-6 p-0 hover:bg-primary/10"
                      title="Manage members"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit functionality
                      }}
                      tabIndex={-1}
                      className="h-6 w-6 p-0 hover:bg-primary/10"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      tabIndex={-1}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Create Group Dialog with project dropdown inside */}
      {isAdmin && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Chat Group</DialogTitle>
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
                <Select
                  value={createForm.projectId}
                  onValueChange={(val) =>
                    setCreateForm((prev) => ({ ...prev, projectId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          onOpenChange={() => setMemberDialog(null)}
        >
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                Manage Group Members
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Manage members for this chat group
                </p>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-semibold text-base">
                    {memberDialog.groupName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {existingMembers.length} current members •{" "}
                    {availableMembers.length} available to add
                  </p>
                </div>
              </div>

              {/* Tabs for Existing and Available Members */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Existing Members Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Current Members ({existingMembers.length})
                    </h3>
                    {selectedExistingMembers.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteMembers}
                        disabled={isLoadingExistingMembers}
                        className="h-7 px-2 text-xs"
                      >
                        {isLoadingExistingMembers ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          `Remove ${selectedExistingMembers.length}`
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {isLoadingExistingMembers ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading members...
                        </span>
                      </div>
                    ) : existingMembers.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No members in this group
                      </div>
                    ) : (
                      existingMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedExistingMembers.includes(member.id)
                              ? "bg-destructive/10 border-destructive/30"
                              : "hover:bg-muted/50 border-border"
                          }`}
                          onClick={() =>
                            toggleExistingMemberSelection(member.id)
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selectedExistingMembers.includes(
                              member.id
                            )}
                            onChange={() =>
                              toggleExistingMemberSelection(member.id)
                            }
                            className="rounded"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.username?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.username || member.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.role} • {member.email}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Available Members Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      Available to Add ({availableMembers.length})
                    </h3>
                    {selectedMembers.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddMembers}
                        disabled={isLoadingMembers}
                        className="h-7 px-2 text-xs"
                      >
                        {isLoadingMembers ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          `Add ${selectedMembers.length}`
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                    {isLoadingMembers ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">
                          Loading users...
                        </span>
                      </div>
                    ) : availableMembers.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No users available to add
                      </div>
                    ) : (
                      availableMembers.map((user: any) => (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                            selectedMembers.includes(user.id)
                              ? "bg-primary/10 border-primary/30"
                              : "hover:bg-muted/50 border-border"
                          }`}
                          onClick={() => toggleMemberSelection(user.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(user.id)}
                            onChange={() => toggleMemberSelection(user.id)}
                            className="rounded"
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name || user.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.role} • {user.email}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={cancelMemberDialog}
                  disabled={isLoadingMembers || isLoadingExistingMembers}
                >
                  Close
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
