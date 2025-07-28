import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatGroup } from "@/types";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

const Messages = () => {
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [showChatList, setShowChatList] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // On mobile, show chat list by default when no group is selected
      if (mobile && !selectedGroup) {
        setShowChatList(true);
      }

      // On desktop, always show both panels when a group is selected
      if (!mobile && selectedGroup) {
        setShowChatList(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [selectedGroup]);

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
    // On mobile, hide the chat list when a group is selected
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleBackToChatList = () => {
    setShowChatList(true);
    setSelectedGroup(null);
  };

  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] w-full max-w-full overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 sm:px-6 py-3 sm:py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedGroup && isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToChatList}
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">Messages</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedGroup
                  ? `Chatting in ${selectedGroup.name}`
                  : "Select a chat to start messaging"}
              </p>
            </div>
          </div>
          {selectedGroup && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <span>{selectedGroup.member_count} members</span>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleChatList}
                  className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Chat Group Selector */}
        <aside
          className={cn(
            "border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col min-h-0 min-w-0 transition-all duration-300 ease-in-out overflow-hidden",
            // Mobile: full width when visible
            "w-full",
            // Desktop: responsive width
            "md:w-80 lg:w-96 xl:w-[420px]",
            // Mobile visibility logic
            isMobile
              ? selectedGroup && !showChatList
                ? "hidden"
                : "block"
              : "block"
          )}
        >
          <ChatGroupSelector
            selectedGroup={selectedGroup}
            onGroupSelect={handleGroupSelect}
            showAllProjects={true}
            onCreateGroupClick={() => {
              /* open dialog logic here */
            }}
          />
        </aside>

        {/* Chat Interface */}
        <section
          className={cn(
            "flex-1 flex flex-col min-w-0 min-h-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/40 overflow-hidden transition-all duration-300 ease-in-out",
            // Mobile: hide when showing chat list or no group selected
            isMobile
              ? !selectedGroup || showChatList
                ? "hidden"
                : "block"
              : !selectedGroup
              ? "hidden"
              : "block"
          )}
        >
          {selectedGroup ? (
            <ChatInterface
              selectedGroup={selectedGroup}
              onBackToChatList={handleBackToChatList}
            />
          ) : (
            // Empty state when no group is selected
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div className="text-center max-w-md">
                <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  No Chat Selected
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Choose a chat group from the sidebar to start messaging
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Mobile overlay for chat list toggle */}
      {isMobile && selectedGroup && showChatList && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setShowChatList(false)}
        />
      )}
    </div>
  );
};

export default Messages;
