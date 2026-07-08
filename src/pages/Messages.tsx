import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
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
    () => typeof window !== "undefined" && window.innerWidth >= 1024
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
      // Match Tailwind `lg`: two-pane on desktop/tablet landscape, stacked on phones
      setShowSplitLayout(window.innerWidth >= 1024);
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
      <main className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-4" />
        <h1 className="text-xl font-bold mb-2">Loading...</h1>
        <p className="text-muted-foreground text-sm">
          Verifying your access permissions...
        </p>
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
      <main className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center bg-background p-6">
        <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-8 sm:p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl">
            <Lock className="h-10 w-10 text-white" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
            Access Denied
          </h3>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            You do not have permission to view messages.
          </p>
        </div>
      </main>
    );
  }

  const showChatList = showSplitLayout || !selectedGroup;
  const showChatPane = showSplitLayout || Boolean(selectedGroup);

  return (
    <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Full-bleed chat shell — fills MainLayout content area */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-0 bg-white dark:bg-gray-950 lg:border-l lg:border-gray-200/40 dark:lg:border-gray-800/60">
          <div className="flex h-full min-h-0 min-w-0 flex-1">
            {/* Chat list sidebar */}
            <aside
              className={cn(
                "flex h-full min-h-0 min-w-0 flex-col border-r border-gray-200/60 bg-white/80 transition-all duration-300 ease-in-out dark:border-gray-800/60 dark:bg-gray-950/80",
                showChatList
                  ? showSplitLayout
                    ? "w-full shrink-0 sm:w-[18rem] md:w-[20rem] lg:w-[22rem] xl:w-[24rem]"
                    : "w-full flex-1"
                  : "hidden"
              )}
            >
              <div className="min-h-0 flex-1 overflow-hidden">
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
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-950/40",
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
                      ? () => openGroupMembersRef.current?.(selectedGroup.id)
                      : undefined
                  }
                  showBackButton={!showSplitLayout}
                />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto p-6 sm:p-8 md:p-10">
                    <div className="w-full min-w-0 max-w-lg text-center">
                      <div className="relative mb-6">
                        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 shadow-xl ring-4 ring-blue-600/10 dark:from-blue-950/50 dark:to-emerald-950/50 sm:h-36 sm:w-36">
                          <MessageCircle
                            className="h-12 w-12 text-blue-600 dark:text-emerald-400 sm:h-14 sm:w-14"
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-emerald-600 shadow-xl">
                          <MessageCircle
                            className="h-5 w-5 text-white"
                            fill="white"
                            strokeWidth={0}
                          />
                        </div>
                      </div>

                      <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                        BugRicer Chat
                      </h3>

                      <p className="mb-6 px-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
                        Pick a chat to start messaging. New messages appear
                        automatically.
                      </p>

                      <div className="mx-auto max-w-sm space-y-3 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>Secure team messaging</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                          <span>Share files, images, and voice notes</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Users className="h-4 w-4 shrink-0 text-emerald-600" />
                          <span>Organize discussions by project</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="h-1 shrink-0 bg-gradient-to-r from-blue-600 to-emerald-600" />
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
    </main>
  );
};

export default Messages;
