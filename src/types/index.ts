export type Project = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export type Bug = {
  id: string;
  title: string;
  description: string;
  expected_result?: string;
  actual_result?: string;
  project_id: string;
  project_name?: string;
  reported_by: string;
  reporter_name?: string;
  updated_by?: string;
  updated_by_name?: string;  // Add this field
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'fixed' | 'declined' | 'rejected';
  created_at: string;
  updated_at: string;
  fix_description?: string | null;
  screenshots?: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
  }>;
  files?: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
  }>;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    uploaded_by?: string;
    created_at?: string;
  }>;
  fixed_by?: string | null;
  fixed_by_name?: string | null;
};

export type BugPriority = 'low' | 'medium' | 'high';
export type BugStatus = 'pending' | 'in_progress' | 'fixed' | 'rejected' | 'declined';

export type UserRole = 'admin' | 'developer' | 'tester';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  created_at?: string;
}

// Messaging System Types
export type MessageType = 'text' | 'voice' | 'reply';

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count: number;
  last_message_at?: string;
  is_member: boolean;
  projectName?: string;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message_type: MessageType;
  content?: string;
  voice_file_path?: string;
  voice_duration?: number;
  reply_to_message_id?: string;
  is_deleted: boolean;
  deleted_at?: string;
  is_pinned: boolean;
  pinned_at?: string;
  pinned_by?: string;
  pinned_by_name?: string;
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  reply_content?: string;
  reply_type?: MessageType;
  reply_sender_name?: string;
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  read_status?: MessageReadStatus[];
}

export interface ChatGroupMember {
  id: string;
  username: string;
  email: string;
  role: string;
  joined_at: string;
  last_read_at?: string;
  is_muted: boolean;
  muted_until?: string;
  show_read_receipts: boolean;
}

export interface TypingIndicator {
  user_id: string;
  user_name: string;
}

export interface MessagePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MessageResponse {
  messages: ChatMessage[];
  pagination: MessagePagination;
}

// New Enhanced Messaging Types
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string;
  emoji: string;
  created_at: string;
}

export interface MessageMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  mentioned_user_name: string;
  created_at: string;
}

export interface MessageReadStatus {
  message_id: string;
  user_id: string;
  user_name: string;
  read_at: string;
}

export interface EmojiReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface GroupSettings {
  is_muted: boolean;
  muted_until?: string;
  show_read_receipts: boolean;
}

export interface PinnedMessage {
  id: string;
  content: string;
  message_type: MessageType;
  sender_name: string;
  pinned_at: string;
  pinned_by_name: string;
}
