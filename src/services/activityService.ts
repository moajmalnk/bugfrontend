import { apiClient } from '@/lib/axios';

export interface Activity {
  id: string;
  type: string;
  entity_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface ActivityResponse {
  success: boolean;
  data: Activity[];
  total: number;
}

export const activityService = {
  getActivities: async (limit: number = 10, offset: number = 0): Promise<ActivityResponse> => {
    const response = await apiClient.get<ActivityResponse>(`/activities/getAll.php?limit=${limit}&offset=${offset}`);
    return response.data;
  }
}; 