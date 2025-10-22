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

export interface UserDocument {
  id: number;
  doc_title: string;
  google_doc_id: string;
  google_doc_url: string;
  doc_type: string;
  is_archived: number;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  template_name: string | null;
}

export interface Template {
  id: number;
  template_name: string;
  google_doc_id: string;
  description: string | null;
  category: string;
  is_active: number;
  is_configured: boolean;
  created_at: string;
}

class GoogleDocsService {
  /**
   * Check if user has connected their Google account
   */
  async checkConnection(): Promise<boolean> {
    try {
      console.log('🔍 Checking Google Docs connection...');
      const response = await apiClient.get<{
        success: boolean;
        data: GoogleDocsConnectionStatus;
      }>('/docs/check-connection.php');
      
      const connected = response.data.data?.connected || false;
      console.log('🔗 Connection check result:', connected);
      console.log('🔍 Debug info:', response.data);
      return connected;
    } catch (error) {
      console.error('❌ Failed to check Google Docs connection:', error);
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

  // ========================================================================
  // General Document CRUD Operations
  // ========================================================================

  /**
   * Create a general document (not tied to a bug)
   */
  async createGeneralDocument(
    docTitle: string,
    templateId?: number,
    docType: string = 'general'
  ): Promise<{ success: boolean; id: number; document_url: string; document_title: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        id: number;
        document_url: string;
        document_title: string;
      }>('/docs/create-general-doc.php', {
        doc_title: docTitle,
        template_id: templateId,
        doc_type: docType,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create document');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to create general document:', error);
      throw new Error(error.response?.data?.message || 'Failed to create document');
    }
  }

  /**
   * List all general documents for the current user
   */
  async listGeneralDocuments(includeArchived: boolean = false): Promise<UserDocument[]> {
    try {
      console.log('🔍 Fetching general documents, includeArchived:', includeArchived);
      const response = await apiClient.get<{
        success: boolean;
        documents: UserDocument[];
        count: number;
      }>(`/docs/list-general-docs.php?include_archived=${includeArchived}`);

      console.log('📄 API response:', response.data);

      if (!response.data.success) {
        throw new Error('Failed to fetch documents');
      }

      const documents = response.data.documents || [];
      console.log('📊 Returning documents:', documents.length);
      return documents;
    } catch (error: any) {
      console.error('❌ Failed to list general documents:', error);
      return [];
    }
  }

  /**
   * Delete a general document
   */
  async deleteDocument(documentId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/docs/delete-general-doc.php?id=${documentId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete document');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to delete document:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete document');
    }
  }

  /**
   * Get all available templates
   */
  async listTemplates(category?: string): Promise<Template[]> {
    try {
      const url = category 
        ? `/docs/list-templates.php?category=${encodeURIComponent(category)}`
        : '/docs/list-templates.php';
      
      const response = await apiClient.get<{
        success: boolean;
        templates: Template[];
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch templates');
      }

      return response.data.templates || [];
    } catch (error: any) {
      console.error('Failed to list templates:', error);
      return [];
    }
  }

  /**
   * Create a bug document using the new endpoint with template support
   */
  async createBugDocumentWithTemplate(
    bugId: string | number,
    bugTitle: string,
    templateName: string = 'Bug Report Template'
  ): Promise<CreateDocumentResponse> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        document_id: string;
        document_url: string;
        document_name: string;
      }>('/docs/create-bug-doc.php', {
        bug_id: bugId,
        bug_title: bugTitle,
        template_name: templateName,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create bug document');
      }

      return {
        document_id: response.data.document_id,
        document_url: response.data.document_url,
        document_name: response.data.document_name,
      };
    } catch (error: any) {
      console.error('Failed to create bug document:', error);
      throw new Error(error.response?.data?.message || 'Failed to create bug document');
    }
  }
}

// Google Docs Service Instance
export const googleDocsService = new GoogleDocsService();

