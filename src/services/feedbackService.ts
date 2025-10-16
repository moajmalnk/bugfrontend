import { ENV } from '@/lib/env';

export interface FeedbackStatus {
  has_submitted: boolean;
  should_show: boolean;
  first_submission_at?: string;
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
   * Check feedback status with localStorage fallback
   */
  async shouldShowFeedback(): Promise<boolean> {
    // Check localStorage first for immediate response
    const localFeedbackSubmitted = localStorage.getItem('bugricer_feedback_submitted');
    if (localFeedbackSubmitted === 'true') {
      return false;
    }

    try {
      // Check server status
      const status = await this.getFeedbackStatus();
      
      // Update localStorage based on server response
      if (status.has_submitted) {
        localStorage.setItem('bugricer_feedback_submitted', 'true');
        return false;
      }

      return status.should_show;
    } catch (error) {
      console.error('Error checking feedback status:', error);
      // If there's an error, don't show feedback to avoid spamming
      return false;
    }
  }

  /**
   * Mark feedback as submitted in localStorage
   */
  markFeedbackAsSubmitted(): void {
    localStorage.setItem('bugricer_feedback_submitted', 'true');
  }
}

export const feedbackService = new FeedbackService();
