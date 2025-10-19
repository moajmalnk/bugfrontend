import { apiClient as axiosInstance } from '@/lib/axios';
import {
    ChatGroup,
    ChatGroupMember,
    ChatMessage,
    EmojiReaction,
    GroupSettings,
    MessageReaction,
    MessageResponse,
    PinnedMessage,
    TypingIndicator
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

  // Enhanced Features - Reactions
  static async addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
    const response = await axiosInstance.post<{ data: MessageReaction }>(`${MESSAGING_API_BASE}/add_reaction.php`, {
      message_id: messageId,
      emoji
    });
    return response.data.data;
  }

  static async removeReaction(messageId: string, emoji: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/remove_reaction.php`, {
      params: { message_id: messageId, emoji }
    });
  }

  static async getReactions(messageId: string): Promise<EmojiReaction[]> {
    const response = await axiosInstance.get<{ data: EmojiReaction[] }>(`${MESSAGING_API_BASE}/get_reactions.php`, {
      params: { message_id: messageId }
    });
    return response.data.data;
  }

  // Enhanced Features - Pinned Messages
  static async pinMessage(messageId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/pin_message.php`, null, {
      params: { message_id: messageId }
    });
  }

  static async unpinMessage(messageId: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/unpin_message.php`, {
      params: { message_id: messageId }
    });
  }

  static async getPinnedMessages(groupId: string): Promise<PinnedMessage[]> {
    const response = await axiosInstance.get<{ data: PinnedMessage[] }>(`${MESSAGING_API_BASE}/get_pinned_messages.php`, {
      params: { group_id: groupId }
    });
    return response.data.data;
  }

  // Enhanced Features - Group Settings
  static async updateGroupSettings(groupId: string, settings: Partial<GroupSettings>): Promise<void> {
    await axiosInstance.put(`${MESSAGING_API_BASE}/update_group_settings.php`, settings, {
      params: { group_id: groupId }
    });
  }

  static async getGroupSettings(groupId: string): Promise<GroupSettings> {
    const response = await axiosInstance.get<{ data: GroupSettings }>(`${MESSAGING_API_BASE}/get_group_settings.php`, {
      params: { group_id: groupId }
    });
    return response.data.data;
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
    let lastPollTimestamp: Date | null = null;
    let isPolling = true;

    const poll = async () => {
      if (!isPolling) return;

      try {
        // Get latest messages (increased to 50 to catch more new messages)
        const messageResponse = await this.getMessages(groupId, 1, 50);
        const messages = messageResponse.messages;
        
        if (messages.length > 0) {
          // If this is the first poll, just set the timestamp
          if (!lastPollTimestamp) {
            const latestMessage = messages[messages.length - 1];
            lastPollTimestamp = new Date(latestMessage.created_at);
          } else {
            // Find all new messages since last poll
            const newMessages = messages.filter(msg => {
              const msgDate = new Date(msg.created_at);
              return msgDate > lastPollTimestamp!;
            });
            
            // Send new messages to the callback (in order)
            newMessages.forEach(msg => onNewMessage(msg));
            
            // Update timestamp to the latest message
            if (newMessages.length > 0) {
              const latestNewMessage = newMessages[newMessages.length - 1];
              lastPollTimestamp = new Date(latestNewMessage.created_at);
            }
          }
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
      // Use local time formatting
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  static formatVoiceDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Emoji utilities
  static getCommonEmojis(): string[] {
    return ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🔥', '💯'];
  }

  static isValidEmoji(emoji: string): boolean {
    return emoji.length <= 10 && /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(emoji);
  }

  // WhatsApp-like Features
  
  // Media Upload
  static async uploadMedia(file: File, groupId: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_id', groupId);

    const response = await axiosInstance.post<{ data: any }>(`${MESSAGING_API_BASE}/upload_media.php`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  // Star Messages
  static async starMessage(messageId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/star_message.php`, {
      message_id: messageId
    });
  }

  static async unstarMessage(messageId: string): Promise<void> {
    await axiosInstance.delete(`${MESSAGING_API_BASE}/unstar_message.php`, {
      params: { message_id: messageId }
    });
  }

  static async getStarredMessages(groupId: string): Promise<ChatMessage[]> {
    const response = await axiosInstance.get<{ data: ChatMessage[] }>(`${MESSAGING_API_BASE}/get_starred_messages.php`, {
      params: { group_id: groupId }
    });
    return response.data.data;
  }

  // Message Search
  static async searchMessages(groupId: string, query: string): Promise<ChatMessage[]> {
    const response = await axiosInstance.get<{ data: ChatMessage[] }>(`${MESSAGING_API_BASE}/search_messages.php`, {
      params: { 
        group_id: groupId,
        query
      }
    });
    return response.data.data;
  }

  // Forward Messages
  static async forwardMessage(messageId: string, targetGroupIds: string[]): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/forward_message.php`, {
      message_id: messageId,
      target_group_ids: targetGroupIds
    });
  }

  // Edit Message
  static async editMessage(messageId: string, newContent: string): Promise<ChatMessage> {
    const response = await axiosInstance.put<{ data: ChatMessage }>(`${MESSAGING_API_BASE}/edit_message.php`, {
      message_id: messageId,
      content: newContent
    });
    return response.data.data;
  }

  // Message Info (delivery status)
  static async getMessageInfo(messageId: string): Promise<any> {
    const response = await axiosInstance.get<{ data: any }>(`${MESSAGING_API_BASE}/get_message_info.php`, {
      params: { message_id: messageId }
    });
    return response.data.data;
  }

  // Archive/Unarchive Group
  static async archiveGroup(groupId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/archive_group.php`, {
      group_id: groupId
    });
  }

  static async unarchiveGroup(groupId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/unarchive_group.php`, {
      group_id: groupId
    });
  }

  // Mute/Unmute Group
  static async muteGroup(groupId: string, duration?: number): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/mute_group.php`, {
      group_id: groupId,
      duration // duration in seconds, null for until unmuted
    });
  }

  static async unmuteGroup(groupId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/unmute_group.php`, {
      group_id: groupId
    });
  }

  // Online Status
  static async updateOnlineStatus(isOnline: boolean): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/update_online_status.php`, {
      is_online: isOnline
    });
  }

  static async getUserOnlineStatus(userId: string): Promise<{ is_online: boolean; last_seen: string | null }> {
    const response = await axiosInstance.get<{ data: any }>(`${MESSAGING_API_BASE}/get_online_status.php`, {
      params: { user_id: userId }
    });
    return response.data.data;
  }

  // Profile Picture
  static async updateProfilePicture(file: File): Promise<{ profile_picture_url: string }> {
    const formData = new FormData();
    formData.append('profile_picture', file);

    const response = await axiosInstance.post<{ data: any }>(`${MESSAGING_API_BASE}/update_profile_picture.php`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  static async updateGroupPicture(groupId: string, file: File): Promise<{ group_picture_url: string }> {
    const formData = new FormData();
    formData.append('group_picture', file);
    formData.append('group_id', groupId);

    const response = await axiosInstance.post<{ data: any }>(`${MESSAGING_API_BASE}/update_group_picture.php`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  }

  // Delivery Status
  static async markMessageAsDelivered(messageId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/mark_delivered.php`, {
      message_id: messageId
    });
  }

  static async markMessageAsRead(messageId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/mark_read.php`, {
      message_id: messageId
    });
  }

  // Block/Unblock User
  static async blockUser(userId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/block_user.php`, {
      user_id: userId
    });
  }

  static async unblockUser(userId: string): Promise<void> {
    await axiosInstance.post(`${MESSAGING_API_BASE}/unblock_user.php`, {
      user_id: userId
    });
  }

  static async getBlockedUsers(): Promise<any[]> {
    const response = await axiosInstance.get<{ data: any[] }>(`${MESSAGING_API_BASE}/get_blocked_users.php`);
    return response.data.data;
  }
} 