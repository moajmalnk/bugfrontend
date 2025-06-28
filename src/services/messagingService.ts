import { apiClient as axiosInstance } from '@/lib/axios';
import { 
  ChatGroup, 
  ChatMessage, 
  ChatGroupMember, 
  TypingIndicator, 
  MessageResponse 
} from '@/types';

const MESSAGING_API_BASE = '/messaging';

interface VoiceUploadResponse {
  file_url: string;
  file_path?: string; // optional, if still returned
  duration: number;
  file_size?: number;
  file_type?: string;
}

export class MessagingService {
  // Chat Groups
  static async createGroup(data: {
    name: string;
    description?: string;
    project_id: string;
  }): Promise<ChatGroup> {
    const response = await axiosInstance.post<{ data: ChatGroup }>(`${MESSAGING_API_BASE}/create_group.php`, data);
    return response.data.data;
  }

  static async getGroupsByProject(projectId: string): Promise<ChatGroup[]> {
    const response = await axiosInstance.get<{ data: ChatGroup[] }>(`${MESSAGING_API_BASE}/get_groups.php`, {
      params: { project_id: projectId }
    });
    return response.data.data;
  }

  static async updateGroup(groupId: string, data: {
    name?: string;
    description?: string;
  }): Promise<ChatGroup> {
    const response = await axiosInstance.put<{ data: ChatGroup }>(`${MESSAGING_API_BASE}/update_group.php`, data, {
      params: { group_id: groupId }
    });
    return response.data.data;
  }

  static async deleteGroup(groupId: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/delete_group.php`, {
      params: { group_id: groupId }
    });
  }

  static async getGroupMembers(groupId: string): Promise<ChatGroupMember[]> {
    const response = await axiosInstance.get<{ data: ChatGroupMember[] }>(`${MESSAGING_API_BASE}/get_members.php`, {
      params: { group_id: groupId }
    });
    return response.data.data;
  }

  static async addGroupMember(groupId: string, userId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/add_member.php`, {
      user_id: userId
    }, {
      params: { group_id: groupId }
    });
  }

  static async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/remove_member.php`, {
      params: { group_id: groupId }
    });
    // Note: For DELETE requests with body data, you might need to use a different approach
    // or modify the backend to accept the data in query parameters
  }

  // Messages
  static async sendMessage(data: {
    group_id: string;
    message_type: 'text' | 'voice' | 'reply';
    content?: string;
    voice_file_path?: string;
    voice_duration?: number;
    reply_to_message_id?: string;
  }): Promise<ChatMessage> {
    const response = await axiosInstance.post<{ data: ChatMessage }>(`${MESSAGING_API_BASE}/send_message.php`, data);
    return response.data.data;
  }

  static async getMessages(groupId: string, page: number = 1, limit: number = 50): Promise<MessageResponse> {
    const response = await axiosInstance.get<{ data: MessageResponse }>(`${MESSAGING_API_BASE}/get_messages.php`, {
      params: { 
        group_id: groupId,
        page,
        limit
      }
    });
    return response.data.data;
  }

  static async deleteMessage(messageId: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/delete_message.php`, {
      params: { message_id: messageId }
    });
  }

  // Typing Indicators
  static async updateTyping(groupId: string, isTyping: boolean): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/update_typing.php`, {
      is_typing: isTyping
    }, {
      params: { group_id: groupId }
    });
  }

  static async getTypingIndicators(groupId: string): Promise<TypingIndicator[]> {
    const response = await axiosInstance.get<{ data: TypingIndicator[] }>(`${MESSAGING_API_BASE}/get_typing.php`, {
      params: { group_id: groupId }
    });
    return response.data.data;
  }

  // Real-time messaging with polling (fallback for WebSocket)
  static startMessagePolling(
    groupId: string, 
    onNewMessage: (message: ChatMessage) => void,
    onTypingUpdate: (typingUsers: TypingIndicator[]) => void,
    interval: number = 3000
  ): () => void {
    let lastMessageId: string | null = null;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        // Get latest messages
        const messageResponse = await this.getMessages(groupId, 1, 10);
        const latestMessage = messageResponse.messages[messageResponse.messages.length - 1];
        
        if (latestMessage && latestMessage.id !== lastMessageId) {
          onNewMessage(latestMessage);
          lastMessageId = latestMessage.id;
        }

        // Get typing indicators
        const typingUsers = await this.getTypingIndicators(groupId);
        onTypingUpdate(typingUsers);

      } catch (error) {
        console.error('Error polling messages:', error);
      }

      if (isPolling) {
        setTimeout(poll, interval);
      }
    };

    poll();

    // Return cleanup function
    return () => {
      isPolling = false;
    };
  }

  // Voice message utilities
  static async uploadVoiceMessage(file: File): Promise<VoiceUploadResponse> {
    const formData = new FormData();
    formData.append('voice_file', file);

    const response = await axiosInstance.post<{ data: VoiceUploadResponse }>(`${MESSAGING_API_BASE}/upload_voice.php`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  // Utility methods
  static formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  static formatVoiceDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
} 