import { useState } from 'react';
import { ChatGroupSelector } from '@/components/messaging/ChatGroupSelector';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { ChatGroup } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Messages = () => {
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [showChatList, setShowChatList] = useState(true);

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
    // On mobile, hide the chat list when a group is selected
    if (window.innerWidth < 768) {
      setShowChatList(false);
    }
  };

  const handleBackToChatList = () => {
    setShowChatList(true);
    setSelectedGroup(null);
  };

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] w-full max-w-full overflow-hidden bg-gradient-to-br from-background to-muted/60">
      {/* Mobile Header - Only show when chat is selected */}
      {selectedGroup && (
        <header className="md:hidden sticky top-0 z-30 px-4 py-3 bg-background/95 backdrop-blur border-b shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToChatList}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base truncate">{selectedGroup.name}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedGroup.member_count} members
              </p>
            </div>
          </div>
        </header>
      )}

      {/* Desktop Header - Only show on desktop */}

      <main className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
        {/* Chat Group Selector - Hidden on mobile when chat is selected */}
        <aside className={cn(
          "border-r bg-background/95 flex flex-col min-h-0 min-w-0 transition-all duration-200 overflow-hidden",
          "w-full max-w-xs",
          // Mobile: show only when no chat is selected or explicitly showing chat list
          "md:block",
          selectedGroup && !showChatList ? "hidden" : "block"
        )}>
          <ChatGroupSelector
            selectedGroup={selectedGroup}
            onGroupSelect={handleGroupSelect}
            showAllProjects={true}
            onCreateGroupClick={() => {/* open dialog logic here */}}
          />
        </aside>

        {/* Chat Interface - Hidden on mobile when showing chat list */}
        <section className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0 bg-background/80 overflow-hidden",
          // Mobile: hide when showing chat list
          "md:block",
          !selectedGroup || showChatList ? "hidden md:block" : "block"
        )}>
          <ChatInterface 
            selectedGroup={selectedGroup} 
            onBackToChatList={handleBackToChatList}
          />
        </section>
      </main>
    </div>
  );
};

export default Messages;
