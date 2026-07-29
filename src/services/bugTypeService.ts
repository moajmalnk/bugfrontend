import { apiClient } from "@/lib/axios";
import type { BugType } from "@/types";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export const bugTypeService = {
  async list(options?: { includeInactive?: boolean }): Promise<BugType[]> {
    const params = options?.includeInactive ? { include_inactive: 1 } : undefined;
    const response = await apiClient.get<ApiResponse<BugType[]>>("/bug-types/list.php", {
      params,
    });
    if (response.data.success) {
      return Array.isArray(response.data.data) ? response.data.data : [];
    }
    throw new Error(response.data.message || "Failed to load bug types");
  },

  async create(payload: {
    name: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<BugType> {
    const response = await apiClient.post<ApiResponse<BugType>>("/bug-types/create.php", payload);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to create bug type");
  },

  async update(payload: {
    id: string;
    name?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<BugType> {
    const response = await apiClient.post<ApiResponse<BugType>>("/bug-types/update.php", payload);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "Failed to update bug type");
  },
};
