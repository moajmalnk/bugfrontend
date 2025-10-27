import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ChatGroup } from "@/types";
import { 
  MessageCircle, 
  Plus,
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
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { toast } from "sonner";

const Messages = () => {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions(null);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  const [groupsCount, setGroupsCount] = useState(0);
  const [deletedGroup, setDeletedGroup] = useState<ChatGroup | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

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

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
    // Hide sidebar on mobile after selection
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBackToChatList = () => {
    setSelectedGroup(null);
    // Show sidebar on mobile when going back
    if (isMobile) {
      setShowSidebar(true);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const handleNewChatClick = () => {
    setTriggerCreateGroup(true);
  };

  const handleGroupsCountUpdate = (count: number) => {
    setGroupsCount(count);
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

  if (!hasPermission('MESSAGING_VIEW')) {
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
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Messages
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Send and receive messages with your team members. Stay connected and collaborate in real-time.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  onClick={handleNewChatClick}
                  variant="default"
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  New Chat
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {groupsCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Professional Main Content Area */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex h-[600px] sm:h-[650px] lg:h-[700px] xl:h-[750px] min-h-0">
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
                  "flex flex-col h-full bg-[#111b21] dark:bg-[#111b21] border-r border-[#2a3942] dark:border-[#2a3942] transition-all duration-300 ease-in-out",
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
                    onCreateGroupClick={() => {
                      setTriggerCreateGroup(true);
                    }}
                    triggerCreateGroup={triggerCreateGroup}
                    onTriggerCreateGroupReset={() => setTriggerCreateGroup(false)}
                    onGroupsCountUpdate={handleGroupsCountUpdate}
                    onGroupDelete={(group) => {
                      setDeletedGroup(group);
                      undoDelete.startCountdown();
                    }}
                    refreshTrigger={refreshTrigger}
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
                  "flex-1 flex flex-col h-full bg-[#0b141a] dark:bg-[#0b141a] transition-all duration-300 overflow-hidden",
                  // Mobile: show only when group selected or when no sidebar
                  isMobile
                    ? selectedGroup || !showSidebar
                      ? "block w-full"
                      : "hidden"
                    : selectedGroup
                    ? "block"
                    : "flex"
                )}
              >
                {selectedGroup ? (
                  <ChatInterface
                    selectedGroup={selectedGroup}
                    onBackToChatList={handleBackToChatList}
                  />
                ) : (
                  // Enhanced Professional Empty State
                  <div className="flex-1 flex flex-col bg-[#222e35] dark:bg-[#222e35] border-b-[6px] border-[#00a884] overflow-y-auto">
                    <div className="flex-1 flex flex-col items-center justify-center w-full p-4 sm:p-6 lg:p-8">
                      <div className="text-center max-w-lg w-full">
                        <div className="mb-6 sm:mb-8 relative">
                          <div className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] mx-auto rounded-full bg-[#1f2c33] dark:bg-[#1f2c33] flex items-center justify-center shadow-2xl">
                            <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-[#54656f] dark:text-[#54656f]" strokeWidth={1.5} />
                          </div>
                          <div className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-[#00a884] flex items-center justify-center shadow-xl">
                            <MessageCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="white" strokeWidth={0} />
                          </div>
                        </div>
                        
                        <h3 className="text-xl sm:text-2xl lg:text-3xl font-light mb-3 sm:mb-4 text-[#e9edef] dark:text-[#e9edef]">
                          BugRicer Chat
                        </h3>
                        
                        <p className="text-sm sm:text-base text-[#8696a0] dark:text-[#8696a0] leading-relaxed mb-6 sm:mb-8 px-4">
                          Send and receive messages with your team members. Stay connected and collaborate in real-time.
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
        </div>

        {/* Professional Undo Delete Countdown */}
        {undoDelete.isCountingDown && deletedGroup && (
          <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-4 z-50">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl"></div>
              <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-sm mx-auto sm:mx-0">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center shadow-lg">
                      <Trash2 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
                    </div>
                    {/* Circular Progress Indicator */}
                    <div className="absolute inset-0 w-10 h-10 sm:w-12 sm:h-12">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 transform -rotate-90" viewBox="0 0 48 48">
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="18"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 18}`}
                          strokeDashoffset={`${2 * Math.PI * 18 * (1 - (10 - undoDelete.timeLeft) / 10)}`}
                          className="text-red-500 transition-all duration-1000 ease-linear"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      Chat Group Deleted
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">
                      "{deletedGroup.name}"
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-red-500 animate-pulse" />
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            Permanently deleted in
                          </span>
                        </div>
                        <div className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-md border border-red-200 dark:border-red-800">
                          <span className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-300 tabular-nums">
                            {undoDelete.timeLeft}s
                          </span>
                        </div>
                      </div>
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                          style={{ width: `${((10 - undoDelete.timeLeft) / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      onClick={undoDelete.cancelCountdown}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-7 sm:h-8 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      Undo
                    </Button>
                    <Button
                      onClick={undoDelete.confirmDelete}
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 text-xs px-3 py-1.5 h-7 sm:h-8 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Messages;
