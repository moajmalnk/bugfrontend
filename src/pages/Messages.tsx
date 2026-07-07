import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { Button } from "@/components/ui/button";
import { canOpenMessagesPage, cn, getEffectiveRole } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ChatGroup, ChatGroupPreviewUpdate } from "@/types";
import {
  MessageCircle,
  Lock,
  Shield,
  Users,
  FileText,
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
  const [showSplitLayout, setShowSplitLayout] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1280
  );
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  const [deletedGroup, setDeletedGroup] = useState<ChatGroup | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [groupPreviewUpdate, setGroupPreviewUpdate] = useState<
    (ChatGroupPreviewUpdate & { nonce: number }) | null
  >(null);
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

  useEffect(() => {
    const checkResponsive = () => {
      setShowSplitLayout(window.innerWidth >= 1280);
    };

    checkResponsive();
    window.addEventListener("resize", checkResponsive);
    return () => window.removeEventListener("resize", checkResponsive);
  }, []);

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
  }, [availableGroups, selectedChatId, selectedGroupId]);

  const handleGroupSelect = (group: ChatGroup | null) => {
    updateChatUrl(group?.id ?? null);
    setSelectedGroup(group);
  };

  const handleBackToChatList = () => {
    setSelectedGroup(null);
    updateChatUrl(null);
  };

  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (deletedGroup) {
        performActualDelete(deletedGroup.id);
        setDeletedGroup(null);
      }
    },
    onUndo: () => {
      if (deletedGroup) {
        toast.success("Group deletion cancelled");
        setDeletedGroup(null);
      }
    },
  });

  const performActualDelete = async (groupId: string) => {
    try {
      const { MessagingService } = await import("@/services/messagingService");

      await MessagingService.deleteGroup(groupId);
      setDeletedGroup(null);
      setRefreshTrigger((prev) => prev + 1);
      toast.success("Group permanently deleted");
    } catch (err: any) {
      console.error("Error deleting group:", err?.message);
      const errorMessage =
        err?.response?.data?.error || err?.message || "Failed to delete group";
      toast.error(errorMessage);

      if (deletedGroup) {
        toast.success("Group deletion cancelled");
        setDeletedGroup(null);
      }
    }
  };

  if (isLoadingPermissions) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Loading...</h1>
            <p className="text-muted-foreground text-sm">
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
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Access Denied
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You do not have permission to view messages.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const showChatList = showSplitLayout || !selectedGroup;
  const showChatPane = showSplitLayout || Boolean(selectedGroup);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto min-w-0 space-y-6 sm:space-y-8">
        {/* Page header */}
        <div className="relative overflow-hidden rounded-2xl min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-5 xl:gap-6 min-w-0">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight break-words">
                      BugMessage
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl leading-relaxed">
                  Team chat by project — share updates, files, and voice notes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-emerald-600 rounded-lg shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {availableGroups.length}
                    </div>
                    <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                      Active chats
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200/40 dark:border-gray-700/40 min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden min-w-0 h-[calc(100vh-14rem)] min-h-[28rem] max-h-[52rem]">
            <div className="flex h-full min-h-0 min-w-0">
              {/* Chat list sidebar */}
              <aside
                className={cn(
                  "flex flex-col min-h-0 h-full border-r border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-900/60 transition-all duration-300 ease-in-out min-w-0",
                  showChatList
                    ? showSplitLayout
                      ? "w-full xl:w-[22rem] xl:shrink-0"
                      : "w-full flex-1"
                    : "hidden"
                )}
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatGroupSelector
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    showAllProjects={true}
                    variant="messaging"
                    onCreateGroupClick={() => setTriggerCreateGroup(true)}
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

              {/* Chat area */}
              <section
                className={cn(
                  "flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-950/30",
                  showChatPane ? "flex" : "hidden"
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
                    showBackButton={!showSplitLayout}
                  />
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto p-6 sm:p-8">
                      <div className="text-center max-w-lg w-full min-w-0">
                        <div className="mb-6 relative">
                          <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-950/50 dark:to-emerald-950/50 flex items-center justify-center shadow-xl ring-4 ring-blue-600/10">
                            <MessageCircle
                              className="h-12 w-12 sm:h-14 sm:w-14 text-blue-600 dark:text-emerald-400"
                              strokeWidth={1.5}
                            />
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center shadow-xl">
                            <MessageCircle
                              className="h-5 w-5 text-white"
                              fill="white"
                              strokeWidth={0}
                            />
                          </div>
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                          BugRicer Chat
                        </h3>

                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed mb-6 px-2">
                          Pick a chat to start messaging. New messages appear
                          automatically.
                        </p>

                        <div className="space-y-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                          <div className="flex items-center justify-center gap-2">
                            <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Secure team messaging</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            <span>Share files, images, and voice notes</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Organize discussions by project</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="h-1 bg-gradient-to-r from-blue-600 to-emerald-600 shrink-0" />
                  </div>
                )}
              </section>
            </div>
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
    </main>
  );
};

export default Messages;
