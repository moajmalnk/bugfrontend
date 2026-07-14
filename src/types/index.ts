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
  already_raised?: boolean;
  bug_level?: BugLevel;
  /** NULL pending, 0 no, 1 yes — tester retested after fix */
  tester_retested?: boolean | number | null;
  /** NULL N/A, 0 still broken, 1 confirmed fixed — only when retested=yes */
  tester_issue_fixed?: boolean | number | null;
  tester_verified_by?: string | null;
  tester_verified_by_name?: string | null;
  tester_verified_at?: string | null;
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
export type BugLevel = 'normal' | 'floap' | 'utter_floap';
export type BugStatus = 'pending' | 'in_progress' | 'fixed' | 'rejected' | 'declined';

export type CommonBugReason = 'already_raised' | 'duplicate';

export type CommonBug = Bug & {
  common_reasons: CommonBugReason[];
  duplicate_count?: number;
  project_developers: { id: string; username: string }[];
};

export type CommonBugsSummary = {
  total: number;
  already_raised_count: number;
  duplicate_count: number;
};

export type UserRole = 'admin' | 'developer' | 'tester';

export interface Permission {
  id: number;
  permission_key: string;
  permission_name: string;
  category: string;
  scope: 'global' | 'project';
  selected?: boolean; // For UI state in role editor
}

export interface Role {
  id: number;
  role_name: string;
  description: string;
  is_system_role: boolean;
  permission_count?: number;
  permissions?: Permission[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  role_id?: number | null;
  /** 1 = active, 0 = deactivated by admin (when column exists) */
  account_active?: number;
  /** Employment start date (YYYY-MM-DD); attendance blocked before this day */
  joining_date?: string | null;
  avatar?: string;
  created_at?: string;
  admin_id?: string; // For impersonation tracking
  status?: 'active' | 'idle' | 'offline'; // For presence tracking
  last_active_at?: string; // For last seen information - updated
  /** True when the user checked in for work today (work_submissions.check_in_time) */
  checked_in_today?: boolean;
  check_in_time?: string | null;
  today_hours_worked?: number;
  today_break_minutes?: number;
  checkout_time?: string | null;
  permissions?: string[]; // Effective permissions for the user
}

export type CommercialStatus = 'lead' | 'active' | 'inactive' | 'ended';
export type MarketIndustry =
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'education'
  | 'saas'
  | 'manufacturing'
  | 'real_estate'
  | 'other';
export type ReferralSource =
  | 'direct'
  | 'referral'
  | 'website'
  | 'social_media'
  | 'event'
  | 'partner'
  | 'other';

export interface ClientSummary {
  id: string;
  corporate_name: string;
  website?: string | null;
  market_industry?: MarketIndustry | null;
  commercial_status?: CommercialStatus;
  primary_contact_name?: string | null;
  direct_email?: string | null;
  direct_phone?: string | null;
  hq_location?: string | null;
}

export interface ClientAttachment {
  id: string;
  client_id: string;
  file_name: string;
  file_path: string;
  file_type?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
}

export interface ClientLinkedProject {
  id: string;
  name: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client extends ClientSummary {
  gst_tax_id?: string | null;
  position?: string | null;
  birthday?: string | null;
  date_of_joining?: string | null;
  date_of_ending?: string | null;
  referral_source?: ReferralSource | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  project_count?: number;
  active_project_count?: number;
  attachments?: ClientAttachment[];
  projects?: ClientLinkedProject[];
}

// Messaging System Types
export type MessageType = 'text' | 'voice' | 'reply' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'contact';
export type MediaType = 'image' | 'video' | 'document' | 'audio';
export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

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
  /** Latest non-deleted message snippet for chat list */
  last_message_preview?: string | null;
  last_message_sender_id?: string | null;
  last_message_sender_name?: string | null;
  is_member: boolean;
  projectName?: string;
  // WhatsApp features
  group_picture?: string;
  is_archived?: boolean;
  archived_at?: string;
}

/** Local sidebar patch when a chat receives a new message (no full list reload). */
export interface ChatGroupPreviewUpdate {
  groupId: string;
  preview: string;
  senderId: string;
  senderName: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message_type: MessageType;
  content?: string;
  // Voice message fields
  voice_file_path?: string;
  voice_duration?: number;
  // Media fields (images, videos, documents)
  media_type?: MediaType;
  media_file_path?: string;
  media_file_name?: string;
  media_file_size?: number;
  media_thumbnail?: string;
  media_duration?: number;
  // Reply fields
  reply_to_message_id?: string;
  reply_content?: string;
  reply_type?: MessageType;
  reply_sender_name?: string;
  // Status fields
  is_deleted: boolean;
  deleted_at?: string;
  is_pinned: boolean;
  pinned_at?: string;
  pinned_by?: string;
  pinned_by_name?: string;
  // WhatsApp features
  is_starred?: boolean;
  starred_at?: string;
  starred_by?: string;
  is_forwarded?: boolean;
  original_message_id?: string;
  is_edited?: boolean;
  edited_at?: string;
  delivery_status?: DeliveryStatus;
  // Metadata
  created_at: string;
  updated_at: string;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  // Relations
  reactions?: MessageReaction[];
  mentions?: MessageMention[];
  read_status?: MessageReadStatus[];
  voice_played_count?: number;
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
  played_at?: string;
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
