import { ENV } from '@/lib/env';

export interface Session {
  id: string;
  user_id: string;
  session_start: string;
  session_end?: string;
  session_duration_minutes?: number;
  activity_type: 'work' | 'break' | 'meeting' | 'other';
  project_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  username?: string;
  email?: string;
  project_name?: string;
  current_duration_minutes?: number;
  current_duration_hours?: number;
}

export interface SessionHistory {
  id: string;
  session_start: string;
  session_end: string;
  session_duration_minutes: number;
  activity_type: string;
  project_name?: string;
  notes?: string;
}

class SessionService {
  private baseUrl = `${ENV.API_URL}/users`;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Start a new work session
   */
  async startSession(payload: {
    project_id?: string;
    activity_type?: 'work' | 'break' | 'meeting' | 'other';
    notes?: string;
  }): Promise<{ session_id: string; start_time: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/start_session.php`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to start session');
      }

      return result.data;
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  }

  /**
   * End the current active session
   */
  async endSession(): Promise<{
    session_id: string;
    duration_minutes: number;
    duration_hours: number;
    end_time: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/end_session.php`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to end session');
      }

      return result.data;
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Get all active sessions (admin only)
   */
  async getActiveSessions(): Promise<Session[]> {
    try {
      const response = await fetch(`${this.baseUrl}/active_sessions.php`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to get active sessions');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw error;
    }
  }

  /**
   * Force end a session (admin only)
   */
  async forceEndSession(sessionId: string): Promise<{
    session_id: string;
    duration_minutes: number;
    duration_hours: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/force_end_session.php`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to force end session');
      }

      return result.data;
    } catch (error) {
      console.error('Error force ending session:', error);
      throw error;
    }
  }

  /**
   * Format duration in a human-readable way
   */
  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  /**
   * Calculate current session duration
   */
  calculateCurrentDuration(sessionStart: string): number {
    const start = new Date(sessionStart);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
  }
}

export const sessionService = new SessionService();
