import { ENV } from '@/lib/env';

const API_BASE = `${ENV.API_URL}/time-tracking`;

export interface TimeSession {
  id: number;
  user_id: string;
  submission_date: string;
  check_in_time: string;
  check_out_time?: string;
  total_duration_seconds: number;
  net_duration_seconds: number;
  is_active: boolean;
  is_paused?: boolean;
  pause_reason?: string;
  pause_start?: string;
  session_notes?: string;
  pauses?: SessionPause[];
}

export interface SessionPause {
  id: number;
  session_id: number;
  pause_start: string;
  pause_end?: string;
  pause_reason: string;
  duration_seconds: number;
  is_active: boolean;
}

export interface SessionActivity {
  id: number;
  session_id: number;
  activity_type: 'work' | 'break' | 'meeting' | 'training' | 'other';
  start_time: string;
  end_time?: string;
  activity_notes?: string;
  project_id?: string;
}

export interface TimeTrackingSettings {
  id?: number;
  user_id: string;
  expected_daily_hours: number;
  auto_checkout_time: string;
  break_duration_limit_minutes: number;
  overtime_threshold_hours: number;
  reminder_enabled: boolean;
  reminder_time: string;
}

class TimeTrackingService {
  private getAuthHeaders(): HeadersInit {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Check in - Start a new work session
   */
  async checkIn(payload: {
    submission_date?: string;
    session_notes?: string;
    project_id?: string;
  }): Promise<{ session_id: number; check_in_time: string; submission_date: string }> {
    const res = await fetch(`${API_BASE}/check-in.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to check in');
    }
    
    const data = await res.json();
    return data.data;
  }

  /**
   * Check out - End current work session
   */
  async checkOut(): Promise<{
    session_id: number;
    check_out_time: string;
    total_duration: number;
    net_duration: number;
    total_hours: number;
  }> {
    const res = await fetch(`${API_BASE}/check-out.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to check out');
    }
    
    const data = await res.json();
    return data.data;
  }

  /**
   * Pause current session
   */
  async pauseSession(payload: { pause_reason?: string } = {}): Promise<{
    pause_id: number;
    pause_start: string;
    pause_reason: string;
  }> {
    const res = await fetch(`${API_BASE}/pause.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to pause session');
    }
    
    const data = await res.json();
    return data.data;
  }

  /**
   * Resume paused session
   */
  async resumeSession(): Promise<{
    pause_duration: number;
    resume_time: string;
  }> {
    const res = await fetch(`${API_BASE}/resume.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to resume session');
    }
    
    const data = await res.json();
    return data.data;
  }

  /**
   * Get current active session with live duration
   */
  async getCurrentSession(): Promise<TimeSession | null> {
    const res = await fetch(`${API_BASE}/current-session.php`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to get current session');
    }
    
    const data = await res.json();
    return data.data.session;
  }

  /**
   * Get session history with pagination
   */
  async getSessionHistory(params: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<TimeSession[]> {
    const queryParams = new URLSearchParams();
    if (params.from) queryParams.append('from', params.from);
    if (params.to) queryParams.append('to', params.to);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    
    const res = await fetch(`${API_BASE}/session-history.php?${queryParams}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to get session history');
    }
    
    const data = await res.json();
    return data.data.sessions;
  }

  /**
   * Sync session with daily submission
   */
  async syncWithSubmission(sessionId: number, submissionDate: string): Promise<void> {
    // This would link the session to a work submission
    // Implementation depends on how you want to integrate with existing submission system
    console.log(`Syncing session ${sessionId} with submission for ${submissionDate}`);
  }

  /**
   * Format duration in seconds to human readable format
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Calculate live duration for active session
   */
  calculateLiveDuration(session: TimeSession): number {
    if (!session.is_active) {
      return session.net_duration_seconds;
    }
    
    const checkInTime = new Date(session.check_in_time).getTime();
    const currentTime = new Date().getTime();
    const totalDuration = Math.floor((currentTime - checkInTime) / 1000);
    
    // Subtract pause time if currently paused
    let pauseTime = 0;
    if (session.is_paused && session.pause_start) {
      const pauseStart = new Date(session.pause_start).getTime();
      pauseTime = Math.floor((currentTime - pauseStart) / 1000);
    }
    
    return totalDuration - pauseTime;
  }

  /**
   * Get session status text
   */
  getSessionStatus(session: TimeSession | null): string {
    if (!session) return 'Not checked in';
    if (session.is_paused) return 'Paused';
    if (session.is_active) return 'Active';
    return 'Completed';
  }

  /**
   * Get session status color
   */
  getSessionStatusColor(session: TimeSession | null): string {
    if (!session) return 'gray';
    if (session.is_paused) return 'yellow';
    if (session.is_active) return 'green';
    return 'blue';
  }
}

export const timeTrackingService = new TimeTrackingService();
