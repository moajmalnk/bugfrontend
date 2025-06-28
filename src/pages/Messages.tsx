import { useState } from 'react';
import { ChatGroupSelector } from '@/components/messaging/ChatGroupSelector';
import { ChatInterface } from '@/components/messaging/ChatInterface';
import { ChatGroup } from '@/types';
import { cn } from '@/lib/utils';

const Messages = () => {
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);

  return (
    <div className="flex flex-col h-screen max-h-[100dvh] bg-gradient-to-br from-background to-muted/60">
      {/* Sticky, elegant header */}
      <header className="sticky top-0 z-30 px-6 pt-6 pb-3 bg-background/90 backdrop-blur border-b shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground text-base mt-1">
          Chat with your team members and collaborate on bug fixes.
        </p>
      </header>
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-full max-w-xs border-r bg-background/95 flex flex-col min-h-0 transition-all duration-200">
          <ChatGroupSelector
            selectedGroup={selectedGroup}
            onGroupSelect={setSelectedGroup}
          />
        </aside>
        {/* Chat */}
        <section className="flex-1 flex flex-col min-w-0 bg-background/80">
          <ChatInterface selectedGroup={selectedGroup} />
        </section>
      </main>
    </div>
  );
};

export default Messages;
