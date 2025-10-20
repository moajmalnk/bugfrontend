import { apiClient } from '@/lib/axios';
import { ENV } from '@/lib/env';

export interface BugDocument {
  id: number;
  bug_id: number;
  google_doc_id: string;
  google_doc_url: string;
  document_name: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleDocsConnectionStatus {
  connected: boolean;
}

export interface CreateDocumentResponse {
  document_id: string;
  document_url: string;
  document_name: string;
}

class GoogleDocsService {
  /**
   * Check if user has connected their Google account
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: GoogleDocsConnectionStatus;
      }>('/docs/check-connection.php');
      
      return response.data.data?.connected || false;
    } catch (error) {
      console.error('Failed to check Google Docs connection:', error);
      return false;
    }
  }

  /**
   * Get the OAuth authorization URL
   */
  getAuthUrl(token?: string): string {
    const baseUrl = `${ENV.API_URL}/oauth/auth`;
    if (token) {
      return `${baseUrl}?state=${encodeURIComponent(token)}`;
    }
    return baseUrl;
  }

  /**
   * Link the current user's account with Google OAuth data from session
   */
  async linkAccount(): Promise<{ success: boolean; email?: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { email: string; google_user_id: string };
      }>('/oauth/link-account.php', {});
      
      return {
        success: response.data.success,
        email: response.data.data?.email,
      };
    } catch (error: any) {
      console.error('Failed to link Google account:', error);
      throw new Error(error.response?.data?.message || 'Failed to link Google account');
    }
  }

  /**
   * Create a new Google Doc for a bug
   */
  async createBugDocument(bugId: string | number): Promise<CreateDocumentResponse> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: CreateDocumentResponse;
      }>('/docs/create.php', {
        bug_id: bugId,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create document');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create bug document:', error);
      throw new Error(error.response?.data?.message || 'Failed to create document');
    }
  }

  /**
   * Get all Google Docs linked to a bug
   */
  async getBugDocuments(bugId: string | number): Promise<BugDocument[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: BugDocument[];
      }>(`/docs/list.php?bug_id=${bugId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch documents');
      }
      
      return response.data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch bug documents:', error);
      return [];
    }
  }

  /**
   * Open a Google Doc in a new tab
   */
  openDocument(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// Google Docs Service Instance
export const googleDocsService = new GoogleDocsService();

