import { apiClient } from '@/lib/axios';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: number;
  expiry_date: string | null;
  created_at: string;
  last_broadcast_at: string | null;
}

export type AnnouncementPayload = Omit<Announcement, 'id' | 'created_at' | 'last_broadcast_at'>;

class AnnouncementService {
  async getLatestActive(): Promise<Announcement | null> {
    const response = await apiClient.get<{ success: boolean; data: Announcement | null }>('/announcements/get_latest.php');
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  }

  async getAll(): Promise<Announcement[]> {
    const response = await apiClient.get<{ success: boolean, data: Announcement[] }>('/announcements/getAll.php');
    if (response.data.success) {
      return response.data.data || [];
    }
    return [];
  }

  async create(payload: AnnouncementPayload): Promise<Announcement> {
    const response = await apiClient.post<{ success: boolean, data: Announcement }>('/announcements/create.php', payload);
    if (!response.data.success) {
      throw new Error('Failed to create announcement');
    }
    return response.data.data;
  }

  async update(id: number, payload: Partial<AnnouncementPayload>): Promise<void> {
    const response = await apiClient.post(`/announcements/update.php?id=${id}`, payload);
    if (!(response.data as any).success) {
        throw new Error('Failed to update announcement');
    }
  }

  async broadcast(id: number): Promise<void> {
    const response = await apiClient.post(`/announcements/broadcast.php?id=${id}`, {});
    if (!(response.data as any).success) {
      throw new Error('Failed to broadcast announcement');
    }
  }

  async delete(id: number): Promise<void> {
    const response = await apiClient.delete(`/announcements/delete.php?id=${id}`);
    if (!(response.data as any).success) {
        throw new Error('Failed to delete announcement');
    }
  }
}

export const announcementService = new AnnouncementService(); 