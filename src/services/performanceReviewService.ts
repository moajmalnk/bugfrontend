import { ENV } from '@/lib/env';

export type ReviewQuestionType =
  | 'rating_1_5'
  | 'short_text'
  | 'long_text'
  | 'multi_select'
  | 'boolean';

export type ReviewStatus = 'draft' | 'completed';

export type ActiveReviewUser = {
  id: string;
  username: string;
  email?: string | null;
  role?: string | null;
};

export type ReviewQuestion = {
  id: number;
  template_id: number;
  section_name: string;
  question_text: string;
  question_type: ReviewQuestionType;
  options_json?: string | null;
  options?: string[] | null;
  is_required: boolean;
  display_order: number;
};

export type ReviewTemplate = {
  id: number;
  title: string;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  questions: ReviewQuestion[];
};

export type ReviewAnswer = {
  id?: number;
  review_id?: number;
  question_id: number;
  answer_text: string | null;
  section_name?: string;
  question_text?: string;
  question_type?: ReviewQuestionType | string;
  is_required?: boolean;
  display_order?: number;
};

export type PerformanceReview = {
  id: number;
  employee_id: string;
  employee_username?: string | null;
  employee_email?: string | null;
  employee_role?: string | null;
  reviewer_id: string;
  reviewer_username?: string | null;
  department: string;
  review_month: string;
  review_date: string;
  status: ReviewStatus;
  overall_rating?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  answers?: ReviewAnswer[];
};

export type ReviewListResult = {
  items: PerformanceReview[];
  total: number;
  page: number;
  limit: number;
};

export type ChallengeEntry = {
  review_id: number;
  employee_id: string;
  employee_username: string;
  department: string;
  overall_rating?: number | null;
  section_name: string;
  question_text: string;
  question_type: string;
  display_order?: number;
  answer_text: string;
  status: string;
};

export type ChallengesMonthGroup = {
  review_month: string;
  entries: ChallengeEntry[];
};

export const REVIEW_DEPARTMENTS = [
  'Developer',
  'Tester',
  'Creative',
  'Marketing',
  'Other',
] as const;

function authHeaders(): HeadersInit {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

class PerformanceReviewService {
  private baseUrl = `${ENV.API_URL}/reviews`;

  async getActiveUsers(): Promise<ActiveReviewUser[]> {
    const res = await fetch(`${this.baseUrl}/get_active_users.php`, {
      headers: authHeaders(),
    });
    const data = await parseJson(res);
    return (data.data || []) as ActiveReviewUser[];
  }

  async getTemplate(): Promise<ReviewTemplate> {
    const res = await fetch(`${this.baseUrl}/get_template.php`, {
      headers: authHeaders(),
    });
    const data = await parseJson(res);
    return data.data as ReviewTemplate;
  }

  async saveQuestion(payload: Partial<ReviewQuestion> & {
    question_text: string;
    options?: string[];
  }): Promise<ReviewQuestion> {
    const res = await fetch(`${this.baseUrl}/save_question.php`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    return data.data as ReviewQuestion;
  }

  async deleteQuestion(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/delete_question.php`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    await parseJson(res);
  }

  async listReviews(params: {
    employee_id?: string;
    review_month?: string;
    department?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<ReviewListResult> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v) !== '') {
        qs.set(k, String(v));
      }
    });
    const res = await fetch(`${this.baseUrl}/list_reviews.php?${qs}`, {
      headers: authHeaders(),
    });
    const data = await parseJson(res);
    return data.data as ReviewListResult;
  }

  async createReview(payload: {
    employee_id: string;
    department: string;
    review_month: string;
    review_date?: string;
  }): Promise<PerformanceReview> {
    const res = await fetch(`${this.baseUrl}/create_review.php`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    return data.data as PerformanceReview;
  }

  async getReview(id: number): Promise<PerformanceReview> {
    const res = await fetch(`${this.baseUrl}/get_review.php?id=${id}`, {
      headers: authHeaders(),
    });
    const data = await parseJson(res);
    return data.data as PerformanceReview;
  }

  async saveAnswers(payload: {
    review_id: number;
    department?: string;
    review_date?: string;
    status?: ReviewStatus;
    answers: Array<{ question_id: number; answer_text: string }>;
  }): Promise<PerformanceReview> {
    const res = await fetch(`${this.baseUrl}/save_answers.php`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);
    return data.data as PerformanceReview;
  }

  async deleteReview(id: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/delete_review.php`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    await parseJson(res);
  }

  async getChallengesSummary(reviewMonth?: string): Promise<ChallengesMonthGroup[]> {
    const qs = reviewMonth ? `?review_month=${encodeURIComponent(reviewMonth)}` : '';
    const res = await fetch(`${this.baseUrl}/get_challenges_summary.php${qs}`, {
      headers: authHeaders(),
    });
    const data = await parseJson(res);
    return (data.data?.months || []) as ChallengesMonthGroup[];
  }
}

export const performanceReviewService = new PerformanceReviewService();
