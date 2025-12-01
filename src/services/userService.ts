import { ENV } from '@/lib/env';
import { User, UserRole } from '@/types';
import axios from 'axios';

interface NewUserData {
  username: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
}

interface UpdateUserData {
  username?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  role_id?: number;
}

// Define the structure for user statistics
interface UserStats {
  total_projects: number;
  total_bugs: number;
  total_fixes?: number; // Optional for developers/admins
  recent_activity: Array<{ // Define the structure for recent activity items
    type: string; // e.g., 'bug', 'fix'
    title: string;
    created_at: string; // ISO date string
  }>;
}

class UserService {
  private baseUrl = `${ENV.API_URL}/users`;

  private generateAvatar(username: string, role: UserRole): string {
    const backgroundColors = {
      admin: '3b82f6',
      developer: '10b981',
      tester: 'f59e0b',
    };
    const bgColor = backgroundColors[role] || '6b7280';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=${bgColor}&color=fff`;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  async getUsers(): Promise<User[]> {
    const response = await this.fetchWithAuth(`${this.baseUrl}/getAll.php`);
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.data.map((user: any) => ({
      ...user,
      avatar: this.generateAvatar(user.name, user.role) // <-- use name
    }));
  }

  async getAllTesterEmails(): Promise<string[]> {
    const response = await fetch(`${ENV.API_URL}/get_all_testers.php`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch tester emails');
    }
    return data.emails;
  }

  async addUser(userData: NewUserData): Promise<{ user: User, message: string }> {
    const response = await fetch(`${this.baseUrl}/create.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to add user.");
    }
    return { user: { ...data.data, phone: data.data.phone }, message: data.message };
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    const response = await fetch(`${ENV.API_URL}/users/update.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ id: userId, ...userData }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Failed to update user");
    }
    
    // Backend now returns the updated user in result.data
    if (result.data) {
      const updatedUser = result.data;
      // Ensure all required User fields are present
      return {
        id: updatedUser.id || userId,
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        role: updatedUser.role || userData.role || 'user',
        role_id: updatedUser.role_id || null,
        name: updatedUser.name || updatedUser.username || '',
        avatar: this.generateAvatar(
          updatedUser.name || updatedUser.username || '',
          (updatedUser.role || userData.role || 'user') as UserRole
        ),
        created_at: updatedUser.created_at,
        last_active_at: updatedUser.last_active_at || null,
      };
    }
    
    // Fallback if backend doesn't return data (shouldn't happen with new implementation)
    throw new Error("Backend did not return updated user data");
  }

  async getUserStats(userId: string): Promise<UserStats> {
    // Assuming an API endpoint like /users/stats.php that accepts a user ID
    const response = await this.fetchWithAuth(`${this.baseUrl}/stats.php?id=${userId}`);
    if (!response.success) {
      throw new Error(response.message || "Failed to fetch user stats.");
    }
    return response.data; // Assuming response.data contains the UserStats object
  }

  async getUserWorkStats(userId: string): Promise<any> {
    const response = await this.fetchWithAuth(`${ENV.API_URL}/users/work_stats.php?id=${userId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch work statistics');
    }
    return response.data;
  }

  async deleteUser(userId: string, force = false): Promise<boolean> {
    const token = localStorage.getItem('token');
    const url = `${this.baseUrl}/delete.php?id=${userId}${force ? '&force=true' : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error cases with detailed messages
      if (response.status === 409) {
        // Conflict - user has dependencies
        throw new Error(data.message || 'Cannot delete user. User has associated data that must be removed first.');
      } else if (response.status === 404) {
        throw new Error('User not found.');
      } else {
        throw new Error(data.message || 'Failed to delete user');
      }
    }
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete user');
    }

    return true;
  }

  async generateUserDashboardLink(userId: string): Promise<{ url: string; expires_at: string; ttl_seconds: number }> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post<{ success: boolean; data: { url: string; expires_at: string; ttl_seconds: number }; message?: string }>(
        `${ENV.API_URL}/users/generate-dashboard-link.php`,
        { userId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to generate dashboard link');
      }
    } catch (error: any) {
      //console.error('Error generating dashboard link:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to generate dashboard link');
    }
  }
}

export const userService = new UserService();
