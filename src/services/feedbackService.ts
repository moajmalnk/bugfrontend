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
    const response = await fetch(`${this.baseUrl}/stats.php`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to get feedback statistics');
    }

    return data.data;
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
