export type BugBotMode = 'bug_report' | 'developer_update';

export type BugBotChatRole = 'user' | 'assistant';

export interface BugBotMessage {
  id: string;
  role: BugBotChatRole;
  content: string;
  /** Structured payload when assistant returned a draft */
  meta?: BugBotReplyPayload;
}

export interface BugBotBugDraft {
  title: string;
  description: string;
  steps_to_reproduce?: string | string[];
  priority_suggestion?: 'low' | 'medium' | 'high';
  project_id?: string;
  expected_result?: string;
  actual_result?: string;
}

export interface BugBotUpdateDraft {
  title: string;
  description: string;
  type: 'feature' | 'updation' | 'maintenance';
  project_id?: string;
}

export type BugBotReplyKind = 'chat' | 'doubt_answer' | 'bug_draft' | 'update_draft';

export interface BugBotReplyPayload {
  kind: BugBotReplyKind;
  message: string;
  draft?: BugBotBugDraft | BugBotUpdateDraft | null;
}
