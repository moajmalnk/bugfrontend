import { apiClient } from "@/lib/axios";

export type BugDoubtAttachment = {
  id: string;
  doubt_id: string;
  reply_id?: string | null;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  duration?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
};

export type BugDoubtReply = {
  id: string;
  doubt_id: string;
  user_id: string;
  user_name?: string;
  body: string;
  created_at: string;
  attachments: BugDoubtAttachment[];
};

export type BugDoubt = {
  id: string;
  bug_id: string;
  asked_by: string;
  asked_by_name?: string;
  body: string;
  created_at: string;
  attachments: BugDoubtAttachment[];
  replies: BugDoubtReply[];
};

export type BugDoubtVoicePayload = {
  blob: Blob;
  duration: number;
};

export type BugDoubtUpdatePayload = {
  body: string;
  voice?: BugDoubtVoicePayload | null;
  removeAttachmentIds?: string[];
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

function voiceExtension(blob: Blob): string {
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  return "wav";
}

function appendVoice(
  formData: FormData,
  voice: BugDoubtVoicePayload | null | undefined
) {
  if (!voice) return;
  const name = `voice_note.${voiceExtension(voice.blob)}`;
  formData.append("voice_notes[]", voice.blob, name);
  if (Number.isFinite(voice.duration) && voice.duration > 0) {
    formData.append("voice_note_duration_0", String(Math.round(voice.duration)));
  }
}

function appendRemoveIds(formData: FormData, ids?: string[]) {
  if (!ids?.length) return;
  formData.append("remove_attachment_ids", JSON.stringify(ids));
}

export const bugDoubtService = {
  async list(
    bugId: string,
    options?: { skipErrorHandler?: boolean }
  ): Promise<BugDoubt[]> {
    const response = await apiClient.get<ApiResponse<{ doubts: BugDoubt[] }>>(
      "/bugs/doubts.php",
      {
        params: { bug_id: bugId },
        skipErrorHandler: Boolean(options?.skipErrorHandler),
      } as Record<string, unknown>
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to load doubts");
    }
    return response.data.data?.doubts || [];
  },

  async create(
    bugId: string,
    body: string,
    voice: BugDoubtVoicePayload | null
  ): Promise<BugDoubt | null> {
    const formData = new FormData();
    formData.append("bug_id", bugId);
    formData.append("body", body);
    appendVoice(formData, voice);
    const response = await apiClient.post<ApiResponse<{ doubt: BugDoubt | null }>>(
      "/bugs/doubts.php",
      formData,
      { timeout: 30000 }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to submit doubt");
    }
    return response.data.data?.doubt ?? null;
  },

  async updateDoubt(
    doubtId: string,
    payload: BugDoubtUpdatePayload
  ): Promise<BugDoubt | null> {
    const formData = new FormData();
    formData.append("action", "update");
    formData.append("id", doubtId);
    formData.append("body", payload.body);
    appendRemoveIds(formData, payload.removeAttachmentIds);
    appendVoice(formData, payload.voice);
    const response = await apiClient.post<ApiResponse<{ doubt: BugDoubt | null }>>(
      "/bugs/doubts.php",
      formData,
      { timeout: 30000 }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update doubt");
    }
    return response.data.data?.doubt ?? null;
  },

  async deleteDoubt(doubtId: string): Promise<void> {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("id", doubtId);
    const response = await apiClient.post<ApiResponse<unknown>>(
      "/bugs/doubts.php",
      formData
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete doubt");
    }
  },

  async reply(
    doubtId: string,
    body: string,
    voice: BugDoubtVoicePayload | null
  ): Promise<BugDoubtReply | null> {
    const formData = new FormData();
    formData.append("doubt_id", doubtId);
    formData.append("body", body);
    appendVoice(formData, voice);
    const response = await apiClient.post<
      ApiResponse<{ reply: BugDoubtReply | null }>
    >("/bugs/doubt_reply.php", formData, { timeout: 30000 });
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to submit reply");
    }
    return response.data.data?.reply ?? null;
  },

  async updateReply(
    replyId: string,
    payload: BugDoubtUpdatePayload
  ): Promise<BugDoubtReply | null> {
    const formData = new FormData();
    formData.append("action", "update");
    formData.append("id", replyId);
    formData.append("body", payload.body);
    appendRemoveIds(formData, payload.removeAttachmentIds);
    appendVoice(formData, payload.voice);
    const response = await apiClient.post<
      ApiResponse<{ reply: BugDoubtReply | null }>
    >("/bugs/doubt_reply.php", formData, { timeout: 30000 });
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update reply");
    }
    return response.data.data?.reply ?? null;
  },

  async deleteReply(replyId: string): Promise<void> {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("id", replyId);
    const response = await apiClient.post<ApiResponse<unknown>>(
      "/bugs/doubt_reply.php",
      formData
    );
    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to delete reply");
    }
  },
};
