import { ENV } from "@/lib/env";
import { Permission, Role } from "@/types";

const API_URL = ENV.API_URL;

export interface UserPermissionsResponse {
  effective_permissions: string[];
  role_permissions: string[];
  overrides: UserPermissionOverride[];
}

export interface UserPermissionOverride {
  id: number;
  user_id: string;
  permission_id: number;
  project_id: string | null;
  granted: boolean;
  permission_key: string;
  permission_name: string;
  category: string;
  scope: 'global' | 'project';
  created_at: string;
  updated_at: string;
}

export interface SaveUserPermissionsPayload {
  overrides: Array<{
    permission_id: number;
    project_id?: string | null;
    granted: boolean;
  }>;
}

class PermissionService {
  /**
   * Get all available permissions grouped by category
   */
  async getMasterPermissions(): Promise<Record<string, Permission[]>> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/permissions/master.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch master permissions");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/settings/roles.php`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch roles");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Create a new custom role
   */
  async createRole(roleData: {
    role_name: string;
    description?: string;
    permission_ids?: number[];
  }): Promise<number> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/settings/roles.php`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to create role");
    }

    const result = await response.json();
    return result.data.id;
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(roleId: number, roleData: {
    role_name?: string;
    description?: string;
    permission_ids?: number[];
  }): Promise<void> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/settings/roles.php?roleId=${roleId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roleData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to update role");
    }
  }

  /**
   * Delete a custom role
   */
  async deleteRole(roleId: number): Promise<void> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/settings/roles.php?roleId=${roleId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to delete role");
    }
  }

  /**
   * Get user's effective permissions with role and override information
   */
  async getUserPermissions(userId: string): Promise<{
    effective_permissions: string[];
    role_permissions: string[];
    overrides: string[];
    revoked: string[];
  }> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/permissions/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user permissions");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Save user permission overrides
   */
  async saveUserPermissions(
    userId: string,
    overrides: Array<{ permission_id: number; project_id?: string | null; granted: boolean }>
  ): Promise<void> {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    const response = await fetch(`${API_URL}/permissions/user/${userId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ overrides }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Failed to save user permissions");
    }
  }
}

export const permissionService = new PermissionService();

