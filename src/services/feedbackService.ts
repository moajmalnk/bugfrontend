import { ENV } from '@/lib/env';

export interface FeedbackStatus {
  has_submitted: boolean;
  should_show: boolean;
  first_submission_at?: string;
  dismissed_at?: string | null;
}

export const FEEDBACK_SUBMITTED_KEY = 'bugricer_feedback_submitted';
export const FEEDBACK_DISMISSED_AT_KEY = 'bugricer_feedback_dismissed_at';
export const FEEDBACK_SESSION_START_KEY = 'bugricer_feedback_session_started_at';
export const FEEDBACK_ENGAGE_MS = 5 * 60 * 1000; // 5 minutes after login/use
export const FEEDBACK_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week after Maybe Later

export function getOrCreateFeedbackSessionStart(): number {
  try {
    const existing = sessionStorage.getItem(FEEDBACK_SESSION_START_KEY);
    if (existing) {
      const n = Number(existing);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const now = Date.now();
    sessionStorage.setItem(FEEDBACK_SESSION_START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

export function clearFeedbackSessionStart(): void {
  try {
    sessionStorage.removeItem(FEEDBACK_SESSION_START_KEY);
  } catch {
    // ignore
  }
}

export function isFeedbackSnoozedLocally(): boolean {
  try {
    const raw = localStorage.getItem(FEEDBACK_DISMISSED_AT_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < FEEDBACK_SNOOZE_MS;
  } catch {
    return false;
  }
}

export function markFeedbackDismissedLocally(): void {
  try {
    localStorage.setItem(FEEDBACK_DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function clearFeedbackDismissedLocally(): void {
  try {
    localStorage.removeItem(FEEDBACK_DISMISSED_AT_KEY);
  } catch {
    // ignore
  }
}

export interface FeedbackStats {
  statistics: {
    total_submissions: number;
    average_rating: string | number | null; // Can be string from API, number when parsed, or null
    five_star_count: number | string;
    four_star_count: number | string;
    three_star_count: number | string;
    two_star_count: number | string;
    one_star_count: number | string;
    text_feedback_count: number | string;
  };
  recent_feedback: Array<{
    id: string;
    rating: number;
    feedback_text: string | null;
    submitted_at: string;
    username: string;
    role: string;
  }>;
}

class FeedbackService {
  private baseUrl = `${ENV.API_URL}/feedback`;

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Check if user has already submitted feedback
   */
  async getFeedbackStatus(): Promise<FeedbackStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status.php`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get feedback status');
      }
    } catch (error) {
      console.error('Error getting feedback status:', error);
      // Default to showing feedback if there's an error
      return {
        has_submitted: false,
        should_show: true,
      };
    }
  }

  /**
   * Submit user feedback
   */
  async submitFeedback(rating: number, feedbackText?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/submit.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        rating,
        feedback_text: feedbackText?.trim() || null,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to submit feedback');
    }
  }

  /**
   * Dismiss feedback prompt
   */
  async dismissFeedback(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/dismiss.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to dismiss feedback');
    }
  }

  /**
   * Get feedback statistics (admin only)
   */
  async getFeedbackStats(): Promise<FeedbackStats> {
    let response = await fetch(`${this.baseUrl}/stats.php`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    let data = await response.json();

    // If we get a 403 with role mismatch, try to refresh the token
    if (!response.ok && data.message && data.message.includes('JWT role:') && data.message.includes('DB role:')) {
      console.log('Detected role mismatch, attempting to refresh token...');
      
      try {
        await this.refreshToken();
        // Retry the request with the new token
        response = await fetch(`${this.baseUrl}/stats.php`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
        });
        data = await response.json();
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Continue with the original error
      }
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to get feedback statistics');
    }

    return data.data;
  }

  /**
   * Refresh JWT token to get updated role information
   */
  private async refreshToken(): Promise<void> {
    const response = await fetch(`${ENV.API_URL}/auth/refresh_token.php`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse refresh token response:', jsonError);
      const responseText = await response.text();
      console.error('Response text:', responseText);
      throw new Error(`Failed to parse refresh token response: ${responseText}`);
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to refresh token');
    }

    // Update stored token
    const newToken = data.data.token;
    
    if (localStorage.getItem('token')) {
      localStorage.setItem('token', newToken);
    } else if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('token', newToken);
    }

    console.log('Token refreshed successfully');
  }

  /**
   * Check feedback status with localStorage fallback.
   * Never show after submit; hide for 1 week after Maybe Later.
   */
  async shouldShowFeedback(): Promise<boolean> {
    const localFeedbackSubmitted = localStorage.getItem(FEEDBACK_SUBMITTED_KEY);
    if (localFeedbackSubmitted === 'true') {
      return false;
    }

    if (isFeedbackSnoozedLocally()) {
      return false;
    }

    try {
      const status = await this.getFeedbackStatus();

      if (status.has_submitted) {
        localStorage.setItem(FEEDBACK_SUBMITTED_KEY, 'true');
        clearFeedbackDismissedLocally();
        return false;
      }

      if (!status.should_show) {
        // Server says snoozed or otherwise hidden — mirror dismiss locally if provided
        if (status.dismissed_at) {
          const dismissedMs = Date.parse(status.dismissed_at);
          if (Number.isFinite(dismissedMs)) {
            localStorage.setItem(FEEDBACK_DISMISSED_AT_KEY, String(dismissedMs));
          }
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking feedback status:', error);
      return false;
    }
  }

  /**
   * Delete feedback (admin only)
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/delete.php?id=${feedbackId}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      throw error;
    }
  }

  /**
   * Mark feedback as submitted in localStorage (never ask again).
   */
  markFeedbackAsSubmitted(): void {
    localStorage.setItem(FEEDBACK_SUBMITTED_KEY, 'true');
    clearFeedbackDismissedLocally();
  }

  /**
   * Mark Maybe Later snooze locally (1 week).
   */
  markFeedbackDismissed(): void {
    markFeedbackDismissedLocally();
  }
}

export const feedbackService = new FeedbackService();
