import { apiClient } from '@/lib/axios';
import type { BugBotBugDraft, BugBotMode, BugBotReplyPayload, BugBotUpdateDraft } from '@/types/bugbot';

export interface BugBotChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const bugBotService = {
  async chat(messages: BugBotChatMessage[], projectId: string | null, mode: BugBotMode): Promise<BugBotReplyPayload> {
    const res = await apiClient.post<{ success: boolean; data?: { reply: BugBotReplyPayload }; message?: string }>(
      '/bugbot/chat.php',
      {
        messages,
        project_id: projectId || undefined,
        mode,
      }
    );
    if (!res.data.success || !res.data.data?.reply) {
      throw new Error(res.data.message || 'BugBot chat failed');
    }
    return res.data.data.reply;
  },

  async finalizeBug(draft: BugBotBugDraft, projectId: string): Promise<{ bug_id: string; title: string }> {
    const res = await apiClient.post<{
      success: boolean;
      data?: { bug_id: string; title: string; project_id: string; priority: string; status: string };
      message?: string;
    }>('/bugbot/finalize-bug.php', {
      draft: { ...draft, project_id: projectId },
      project_id: projectId,
    });
    if (!res.data.success || !res.data.data?.bug_id) {
      throw new Error(res.data.message || 'Failed to create bug');
    }
    return { bug_id: res.data.data.bug_id, title: res.data.data.title };
  },

  async formatUpdate(rawText: string, projectId: string | null): Promise<BugBotReplyPayload> {
    const res = await apiClient.post<{ success: boolean; data?: { reply: BugBotReplyPayload }; message?: string }>(
      '/bugbot/format-update.php',
      {
        raw_text: rawText,
        project_id: projectId || undefined,
      }
    );
    if (!res.data.success || !res.data.data?.reply) {
      throw new Error(res.data.message || 'Format update failed');
    }
    return res.data.data.reply;
  },

  async createUpdate(draft: BugBotUpdateDraft, projectId: string): Promise<{ id: string }> {
    const res = await apiClient.post<{ success: boolean; data?: { id: string }; message?: string }>(
      '/bugbot/create-update.php',
      {
        draft: { ...draft, project_id: projectId },
      }
    );
    if (!res.data.success || !res.data.data?.id) {
      throw new Error(res.data.message || 'Failed to create update');
    }
    return { id: res.data.data.id };
  },
};
