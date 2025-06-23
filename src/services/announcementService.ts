import { api } from '@/lib/api';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  is_active: number;
  expiry_date: string | null;
  created_at: string;
}

export type AnnouncementPayload = Omit<Announcement, 'id' | 'created_at'>;

class AnnouncementService {
  async getLatestActive(): Promise<Announcement | null> {
    const response = await api.get<{ success: boolean; data: Announcement | null }>('announcements/get_latest.php');
    if (response.success) {
      return response.data;
    }
    return null;
  }

  async getAll(): Promise<Announcement[]> {
    const response = await api.get<{ success: boolean, data: Announcement[] }>('announcements/getAll.php');
    if (response.success) {
      return response.data || [];
    }
    return [];
  }

  async create(payload: AnnouncementPayload): Promise<Announcement> {
    const response = await api.post<{ success: boolean, data: Announcement }>('announcements/create.php', payload);
    if (!response.success) {
      throw new Error('Failed to create announcement');
    }
    return response.data;
  }

  async update(id: number, payload: Partial<AnnouncementPayload>): Promise<void> {
    const response = await api.post(`announcements/update.php?id=${id}`, payload);
    if (!(response as any).success) {
        throw new Error('Failed to update announcement');
    }
  }

  async delete(id: number): Promise<void> {
    const response = await api.delete(`announcements/delete.php?id=${id}`);
    if (!(response as any).success) {
        throw new Error('Failed to delete announcement');
    }
  }
}

export const announcementService = new AnnouncementService(); 