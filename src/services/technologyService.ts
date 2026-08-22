import { apiClient } from "@/lib/axios";

export type ProjectTechnology = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export const technologyService = {
  async list(): Promise<ProjectTechnology[]> {
    const response = await apiClient.get<ApiResponse<ProjectTechnology[]>>(
      "/technologies/list.php"
    );
    if (response.data.success) {
      const rows = Array.isArray(response.data.data) ? response.data.data : [];
      return rows.map((row) => ({
        ...row,
        is_active: Boolean(row.is_active),
        sort_order: Number(row.sort_order) || 0,
      }));
    }
    throw new Error(response.data.message || "Failed to load technologies");
  },

  async create(name: string): Promise<ProjectTechnology> {
    const response = await apiClient.post<ApiResponse<ProjectTechnology>>(
      "/technologies/create.php",
      { name: name.trim().slice(0, 100) }
    );
    if (response.data.success && response.data.data) {
      return {
        ...response.data.data,
        is_active: Boolean(response.data.data.is_active),
        sort_order: Number(response.data.data.sort_order) || 0,
      };
    }
    throw new Error(response.data.message || "Failed to create technology");
  },
};
