import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { Button } from "@/components/ui/button";
import { canOpenMessagesPage, cn, getEffectiveRole } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ChatGroup, ChatGroupPreviewUpdate } from "@/types";
import { 
  MessageCircle, 
  Clock,
  Trash2,
  ArrowLeft,
  Menu,
  X,
  Users,
  Shield,
  FileText,
  FolderOpen,
  Lock
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { UndoDeleteNotificationPortal } from "@/components/ui/UndoDeleteNotification";
import { toast } from "sonner";

const Messages = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [availableGroups, setAvailableGroups] = useState<ChatGroup[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  const [deletedGroup, setDeletedGroup] = useState<ChatGroup | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [groupPreviewUpdate, setGroupPreviewUpdate] = useState<
    (ChatGroupPreviewUpdate & { nonce: number }) | null
  >(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const openGroupMembersRef = useRef<((groupId: string) => void) | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedChatId = searchParams.get("chat") || "";
  const selectedGroupId = selectedGroup?.id;

  const registerOpenGroupMembers = useCallback(
    (fn: (groupId: string) => void) => {
      openGroupMembersRef.current = fn;
    },
    []
  );

  const handleChatActivity = useCallback((update: ChatGroupPreviewUpdate) => {
    setGroupPreviewUpdate({ ...update, nonce: Date.now() });
  }, []);
  const effectiveRole = getEffectiveRole(currentUser || {});

  // Handle responsive behavior
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      const mobile = width < 768;
      const tablet = width >= 768 && width < 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      // Auto-hide sidebar on mobile when group is selected
      if (mobile && selectedGroup) {
        setShowSidebar(false);
      }
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, [selectedGroup]);

  const updateChatUrl = useCallback(
    (groupId: string | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (groupId) {
          next.set("chat", groupId);
        } else {
          next.delete("chat");
        }
        return next;
      });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!selectedChatId) {
      if (selectedGroupId) {
        setSelectedGroup(null);
        if (isMobile) {
          setShowSidebar(true);
        }
      }
      return;
    }

    const groupFromUrl = availableGroups.find(
      (group) => String(group.id) === selectedChatId
    );

    if (!groupFromUrl || selectedGroupId === groupFromUrl.id) {
      return;
    }

    setSelectedGroup(groupFromUrl);
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [availableGroups, isMobile, selectedChatId, selectedGroupId]);

  const handleGroupSelect = (group: ChatGroup | null) => {
    updateChatUrl(group?.id ?? null);
    setSelectedGroup(group);
    if (isMobile) {
      setShowSidebar(!group);
    }
  };

  const handleBackToChatList = () => {
    setSelectedGroup(null);
    updateChatUrl(null);
    // Show sidebar on mobile when going back
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Undo delete functionality
  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      // Actually delete the group from the backend
      if (deletedGroup) {
        performActualDelete(deletedGroup.id);
        setDeletedGroup(null);
      }
    },
    onUndo: () => {
      // Restore the group to the list
      if (deletedGroup) {
        toast.success("Group deletion cancelled");
        setDeletedGroup(null);
      }
    }
  });

  const performActualDelete = async (groupId: string) => {
    try {
      // Import MessagingService to actually delete the group
      const { MessagingService } = await import("@/services/messagingService");
      
      console.log("Actually deleting group:", groupId);
      await MessagingService.deleteGroup(groupId);
      
      // Successfully deleted - clear the deleted group state
      setDeletedGroup(null);
      
      // Trigger a refresh of the groups list
      setRefreshTrigger(prev => prev + 1);
      
      toast.success("Group permanently deleted");
    } catch (err: any) {
      console.error("❌ Error deleting group:", err?.message);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to delete group";
      toast.error(errorMessage);
      
      // Restore the group if deletion failed
      if (deletedGroup) {
        toast.success("Group deletion cancelled");
        setDeletedGroup(null);
      }
    }
  };

  // Check for MESSAGING_VIEW permission
  if (isLoadingPermissions) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <p className="text-muted-foreground">
              Verifying your access permissions...
            </p>
          </div>
        </section>
      </main>
    );
  }

  const canManageMembersOnSelected =
    Boolean(selectedGroup) &&
    (effectiveRole === "admin" ||
      hasPermission("MESSAGING_MANAGE") ||
      Boolean(
        currentUser?.id &&
          selectedGroup &&
          String(selectedGroup.created_by) === String(currentUser.id)
      ));

  if (!canOpenMessagesPage(effectiveRole, hasPermission)) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Access Denied</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You do not have permission to view messages.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden bg-[#0b141a]">
      <section className="flex-1 min-h-0 flex flex-col w-full">
        {/* Main chat layout — height fills remaining viewport; only message list scrolls inside */}
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-[#0b141a]">
          <div
            className={cn(
              "flex flex-1 min-h-0 min-w-0 relative",
              isMobile && "pt-14"
            )}
          >
              {/* Mobile Header with Navigation */}
              {isMobile && (
                <div className="absolute top-0 left-0 right-0 z-50 bg-[#111b21] dark:bg-[#111b21] border-b border-[#2a3942] dark:border-[#2a3942] px-4 py-3 flex items-center justify-between">
                  {selectedGroup ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToChatList}
                        className="text-[#e9edef] hover:bg-[#2a3942] p-2 rounded-lg transition-colors"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <h2 className="text-[#e9edef] font-semibold text-lg truncate flex-1 text-center mx-4">
                        {selectedGroup.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className="text-[#e9edef] hover:bg-[#2a3942] p-2 rounded-lg transition-colors"
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="text-[#e9edef] font-semibold text-lg">Chats</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSidebar}
                        className="text-[#e9edef] hover:bg-[#2a3942] p-2 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Chat Group Selector - Professional Sidebar */}
              <aside
                className={cn(
                  "flex flex-col min-h-0 h-full bg-[#111b21] dark:bg-[#111b21] border-r border-[#2a3942] dark:border-[#2a3942] transition-all duration-300 ease-in-out",
                  // Mobile: overlay sidebar
                  isMobile
                    ? cn(
                        "absolute inset-y-0 left-0 z-40 w-full sm:w-[400px] transform transition-transform duration-300",
                        showSidebar ? "translate-x-0" : "-translate-x-full",
                        selectedGroup ? "hidden" : "block"
                      )
                    : cn(
                        "w-full",
                        isTablet ? "md:w-[350px] lg:w-[400px]" : "md:w-[400px] lg:w-[420px]"
                      )
                )}
              >
                {/* Mobile sidebar header */}
                {isMobile && (
                  <div className="flex items-center justify-between p-4 border-b border-[#2a3942] dark:border-[#2a3942]">
                    <h3 className="text-[#e9edef] font-semibold text-lg">Chats</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSidebar}
                      className="text-[#e9edef] hover:bg-[#2a3942] p-2 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}

                <div className={cn("flex-1 overflow-hidden", isMobile && "pt-0")}>
                  <ChatGroupSelector
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    showAllProjects={true}
                    variant="messaging"
                    onCreateGroupClick={() => {
                      setTriggerCreateGroup(true);
                    }}
                    triggerCreateGroup={triggerCreateGroup}
                    onTriggerCreateGroupReset={() => setTriggerCreateGroup(false)}
                    onGroupDelete={(group) => {
                      setDeletedGroup(group);
                      undoDelete.startCountdown();
                    }}
                    refreshTrigger={refreshTrigger}
                    groupPreviewUpdate={groupPreviewUpdate}
                    exposeOpenMembers={registerOpenGroupMembers}
                    onGroupsLoaded={setAvailableGroups}
                  />
                </div>
              </aside>

              {/* Mobile sidebar overlay */}
              {isMobile && showSidebar && (
                <div
                  className="absolute inset-0 bg-black/50 z-30"
                  onClick={toggleSidebar}
                />
              )}

              {/* Chat Interface - Professional Main Chat */}
              <section
                className={cn(
                  "flex-1 min-h-0 min-w-0 flex flex-col bg-[#0b141a] dark:bg-[#0b141a] transition-all duration-300 overflow-hidden",
                  isMobile
                    ? selectedGroup || !showSidebar
                      ? "flex w-full"
                      : "hidden"
                    : "flex"
                )}
              >
                {selectedGroup ? (
                  <ChatInterface
                    selectedGroup={selectedGroup}
                    onBackToChatList={handleBackToChatList}
                    onChatActivity={handleChatActivity}
                    onOpenGroupMembers={
                      canManageMembersOnSelected
                        ? () =>
                            openGroupMembersRef.current?.(selectedGroup.id)
                        : undefined
                    }
                  />
                ) : (
                  // Enhanced Professional Empty State
                  <div className="flex-1 flex flex-col min-h-0 bg-[#222e35] dark:bg-[#222e35] border-b-[6px] border-[#00a884] overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                      <div className="text-center max-w-lg w-full">
                        <div className="mb-6 relative">
                          <div className="w-[132px] h-[132px] sm:w-[160px] sm:h-[160px] mx-auto rounded-full bg-[#1f2c33] dark:bg-[#1f2c33] flex items-center justify-center shadow-2xl">
                            <MessageCircle className="h-12 w-12 sm:h-14 sm:w-14 text-[#54656f] dark:text-[#54656f]" strokeWidth={1.5} />
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center shadow-xl">
                            <MessageCircle className="h-5 w-5 text-white" fill="white" strokeWidth={0} />
                          </div>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl font-light mb-3 text-[#e9edef] dark:text-[#e9edef]">
                          BugRicer Chat
                        </h3>
                        
                        <p className="text-sm sm:text-base text-[#8696a0] dark:text-[#8696a0] leading-relaxed mb-6 px-4">
                          Pick a chat to start messaging. New messages appear automatically.
                        </p>
                        
                        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-[#667781] dark:text-[#667781] max-w-sm mx-auto">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] flex-shrink-0"></div>
                            <span className="text-center">End-to-end encrypted messages</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] flex-shrink-0"></div>
                            <span className="text-center">Share files, images, and voice notes</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00a884] flex-shrink-0"></div>
                            <span className="text-center">Organize discussions by project</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
        </div>

        <UndoDeleteNotificationPortal
          open={undoDelete.isCountingDown && !!deletedGroup}
          title="Chat Group Deleted"
          itemName={deletedGroup?.name ?? ""}
          timeLeft={undoDelete.timeLeft}
          duration={10}
          onUndo={undoDelete.cancelCountdown}
          onConfirmNow={undoDelete.confirmDelete}
        />
      </section>
    </div>
  );
};

export default Messages;
