import { apiClient } from "@/lib/axios";
import type { BugPriority, BugType } from "@/types";

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
      const rows = Array.isArray(response.data.data) ? response.data.data : [];
      return rows.map((row) => ({
        ...row,
        is_active: Boolean(row.is_active),
        sort_order: Number(row.sort_order) || 0,
        default_priority: (row.default_priority || "medium") as BugPriority,
      }));
    }
    throw new Error(response.data.message || "Failed to load bug types");
  },

  async create(payload: {
    name: string;
    sort_order?: number;
    is_active?: boolean;
    default_priority?: BugPriority;
  }): Promise<BugType> {
    const response = await apiClient.post<ApiResponse<BugType>>("/bug-types/create.php", payload);
    if (response.data.success && response.data.data) {
      return {
        ...response.data.data,
        default_priority: (response.data.data.default_priority ||
          payload.default_priority ||
          "medium") as BugPriority,
      };
    }
    throw new Error(response.data.message || "Failed to create bug type");
  },

  async update(payload: {
    id: string;
    name?: string;
    sort_order?: number;
    is_active?: boolean;
    default_priority?: BugPriority;
  }): Promise<BugType> {
    const response = await apiClient.post<ApiResponse<BugType>>("/bug-types/update.php", payload);
    if (response.data.success && response.data.data) {
      return {
        ...response.data.data,
        default_priority: (response.data.data.default_priority || "medium") as BugPriority,
      };
    }
    throw new Error(response.data.message || "Failed to update bug type");
  },
};
