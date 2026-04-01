import { useCallback, useState } from 'react';
import { bugBotService, type BugBotChatMessage } from '@/services/bugBotService';
import type { BugBotMessage, BugBotMode, BugBotReplyPayload } from '@/types/bugbot';

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useBugBot() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<BugBotMode>('bug_report');
  const [projectId, setProjectId] = useState<string>('');
  const [messages, setMessages] = useState<BugBotMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<BugBotReplyPayload | null>(null);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setLastReply(null);
    setError(null);
  }, []);

  /** Append a user line + assistant reply without calling chat again (e.g. format-update). */
  const applyExchange = useCallback((userText: string, reply: BugBotReplyPayload) => {
    const u: BugBotMessage = { id: uid(), role: 'user', content: userText };
    const a: BugBotMessage = {
      id: uid(),
      role: 'assistant',
      content: reply.message,
      meta: reply,
    };
    setMessages((m) => [...m, u, a]);
    setLastReply(reply);
  }, []);

  const sendUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      const userMsg: BugBotMessage = { id: uid(), role: 'user', content: trimmed };
      setMessages((m) => [...m, userMsg]);
      setLoading(true);

      const history: BugBotChatMessage[] = [...messages, userMsg].map((x) => ({
        role: x.role === 'assistant' ? 'assistant' : 'user',
        content: x.content,
      }));

      try {
        const reply = await bugBotService.chat(history, projectId || null, mode);
        setLastReply(reply);
        const assistantMsg: BugBotMessage = {
          id: uid(),
          role: 'assistant',
          content: reply.message,
          meta: reply,
        };
        setMessages((m) => [...m, assistantMsg]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Request failed';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, mode, projectId]
  );

  return {
    open,
    setOpen,
    mode,
    setMode,
    projectId,
    setProjectId,
    messages,
    loading,
    error,
    setError,
    lastReply,
    resetConversation,
    applyExchange,
    sendUserMessage,
  };
}

export type BugBotHookState = ReturnType<typeof useBugBot>;
