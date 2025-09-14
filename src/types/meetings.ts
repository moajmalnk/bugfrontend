export interface MeetingResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    code: string;
    title: string;
  };
}

export interface Meeting {
  id: number;
  code: string;
  title: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: string | null;
  display_name: string | null;
  role: 'host' | 'cohost' | 'participant';
  joined_at: string;
  left_at: string | null;
  is_connected: boolean;
}

export interface MeetingMessage {
  id: number;
  sender_id: string | null;
  sender_name: string | null;
  message: string;
  created_at: string;
}
