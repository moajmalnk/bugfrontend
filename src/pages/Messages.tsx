import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { cn } from "@/lib/utils";
import { ChatGroup } from "@/types";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

const Messages = () => {
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
  };

  const handleBackToChatList = () => {
    setSelectedGroup(null);
  };

  return (
    <div className="fixed top-[52px] lg:top-0 lg:left-72 right-0 bottom-0 flex w-auto overflow-hidden bg-[#111b21] dark:bg-[#111b21] z-10">
      {/* Chat Group Selector - WhatsApp Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full bg-[#111b21] dark:bg-[#111b21] border-r border-[#2a3942] dark:border-[#2a3942] transition-all duration-200",
          // Mobile: full width when no group selected, hidden when group selected
          isMobile
            ? selectedGroup
              ? "hidden"
              : "w-full"
            : "w-full md:w-[400px] lg:w-[420px]"
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

      {/* Chat Interface - WhatsApp Main Chat */}
      <section
        className={cn(
          "flex-1 flex flex-col h-full bg-[#0b141a] dark:bg-[#0b141a] transition-all duration-200 overflow-hidden",
          // Mobile: show only when group selected
          isMobile
            ? selectedGroup
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
          // WhatsApp-style Empty State
          <div className="flex-1 flex items-center justify-center bg-[#222e35] dark:bg-[#222e35] border-b-[6px] border-[#00a884]">
            <div className="text-center max-w-md px-8">
              <div className="mb-8 relative">
                <div className="w-[280px] h-[280px] mx-auto rounded-full bg-[#1f2c33] dark:bg-[#1f2c33] flex items-center justify-center shadow-2xl">
                  <MessageCircle className="h-32 w-32 text-[#54656f] dark:text-[#54656f]" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-xl">
                  <MessageCircle className="h-8 w-8 text-white" fill="white" strokeWidth={0} />
                </div>
              </div>
              <h3 className="text-[32px] font-light mb-6 text-[#e9edef] dark:text-[#e9edef]">
                BugRicer Messages
              </h3>
              <p className="text-sm text-[#8696a0] dark:text-[#8696a0] leading-relaxed mb-8">
                Send and receive messages with your team members. Stay connected and collaborate in real-time.
              </p>
              <div className="space-y-3 text-xs text-[#667781] dark:text-[#667781]">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                  <span>End-to-end encrypted messages</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                  <span>Share files, images, and voice notes</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                  <span>Organize discussions by project</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Messages;
