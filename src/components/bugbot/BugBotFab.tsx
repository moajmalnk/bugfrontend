import { useState } from 'react';
import { BugBotChatPanel } from '@/components/bugbot/BugBotChatPanel';
import { useBugBot } from '@/hooks/useBugBot';
import { Bot } from 'lucide-react';

export function BugBotFab() {
  const enabled = String(import.meta.env.VITE_ENABLE_BUGBOT ?? '').toLowerCase() === 'true';
  const [open, setOpen] = useState(false);
  const bugBot = useBugBot();

  if (!enabled) return null;

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-slate-100 shadow-lg shadow-black/30 ring-1 ring-white/10 transition hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Open BugBot"
          title="BugBot — AI bug report & updates"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400/40 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-sky-500/90" />
          </span>
        </button>
      </div>
      <BugBotChatPanel open={open} onOpenChange={setOpen} bugBot={bugBot} />
    </>
  );
}
