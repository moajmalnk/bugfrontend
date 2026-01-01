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
  email?: string | null;
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
  project_id: string | null;
  project_name: string | null;
  creator_user_id?: string;
  creator_name?: string | null;
  role?: string;
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
   * Returns connection status and email if connected
   */
  async checkConnection(): Promise<GoogleDocsConnectionStatus> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: GoogleDocsConnectionStatus;
      }>('/docs/check-connection.php');

      const result = {
        connected: response.data.data?.connected || false,
        email: response.data.data?.email || null
      };
      return result;
    } catch (error) {
      console.error('❌ Failed to check Google Docs connection:', error);
      return { connected: false, email: null };
    }
  }

  /**
   * Disconnect Google account
   */
  async disconnect(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔌 Disconnecting Google account...');
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>('/oauth/disconnect.php');

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to disconnect');
      }

      console.log('✅ Google account disconnected successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to disconnect Google account:', error);
      throw new Error(error.response?.data?.message || 'Failed to disconnect Google account');
    }
  }

  /**
   * Get the OAuth authorization URL
   * @param token JWT token to pass as state
   * @param returnUrl Optional return URL to redirect to after OAuth callback
   */
  getAuthUrl(token?: string, returnUrl?: string): string {
    const baseUrl = `${ENV.API_URL}/oauth/auth`;
    if (token) {
      if (returnUrl) {
        // Encode both token and return_url as JSON, then base64 encode
        const stateData = {
          jwt_token: token,
          return_url: returnUrl
        };
        const encodedState = btoa(JSON.stringify(stateData));
        return `${baseUrl}?state=${encodeURIComponent(encodedState)}`;
      }
      // Just pass token as before for backward compatibility
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
    docType: string = 'general',
    projectId?: string | null,
    role?: string
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
        project_id: projectId || null,
        role: role || 'all',
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
   * Get documents for a specific project
   */
  async getDocumentsByProject(projectId: string, includeArchived: boolean = false): Promise<{
    documents: UserDocument[];
    project_id: string;
    project_name: string | null;
    count: number;
  }> {
    try {
      console.log('🔍 Fetching documents for project:', projectId);
      const url = `/docs/get-by-project.php?project_id=${encodeURIComponent(projectId)}&include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        documents: UserDocument[];
        project_id: string;
        project_name: string | null;
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch project documents');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get documents by project:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch project documents');
    }
  }

  /**
   * Get all documents (Admin only) - grouped by project
   */
  async getAllDocuments(includeArchived: boolean = false): Promise<{
    documents: Array<{
      project_id: string | null;
      project_name: string;
      documents: UserDocument[];
    }>;
    count: number;
  }> {
    try {
      console.log('🔍 Fetching all documents (admin)');
      const url = `/docs/get-all-docs.php?include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        documents: Array<{
          project_id: string | null;
          project_name: string;
          documents: UserDocument[];
        }>;
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch all documents');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get all documents:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch all documents');
    }
  }

  /**
   * Get shared documents (Developers/Testers) - from projects user is member of
   */
  async getSharedDocuments(includeArchived: boolean = false): Promise<UserDocument[]> {
    try {
      console.log('🔍 Fetching shared documents');
      const url = `/docs/get-shared-docs.php?include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        documents: UserDocument[];
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch shared documents');
      }

      return response.data.documents || [];
    } catch (error: any) {
      console.error('❌ Failed to get shared documents:', error);
      return [];
    }
  }

  /**
   * Get projects with document counts for card display
   */
  async getProjectsWithDocumentCounts(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    document_count: number;
  }>> {
    try {
      console.log('🔍 Fetching projects with document counts');
      const response = await apiClient.get<{
        success: boolean;
        projects: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          document_count: number;
        }>;
      }>('/docs/get-projects-with-counts.php');

      if (!response.data.success) {
        throw new Error('Failed to fetch projects');
      }

      return response.data.projects || [];
    } catch (error: any) {
      console.error('❌ Failed to get projects with counts:', error);
      return [];
    }
  }

  /**
   * List all general documents for the current user
   */
  async listGeneralDocuments(includeArchived: boolean = false, projectId?: string | null): Promise<UserDocument[]> {
    try {
      console.log('🔍 Fetching general documents, includeArchived:', includeArchived, 'projectId:', projectId);
      let url = `/docs/list-general-docs.php?include_archived=${includeArchived}`;
      if (projectId) {
        url += `&project_id=${encodeURIComponent(projectId)}`;
      }
      const response = await apiClient.get<{
        success: boolean;
        documents: UserDocument[];
        count: number;
      }>(url);

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
   * Update a document title, project, and template
   */
  async updateDocument(
    documentId: number,
    newTitle: string,
    projectId?: string | null,
    templateId?: number | null,
    role?: string
  ): Promise<{ success: boolean; message: string; data?: { id: number; doc_title: string } }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { id: number; doc_title: string };
      }>(`/docs/update-general-doc.php?id=${documentId}`, {
        id: documentId,
        doc_title: newTitle,
        project_id: projectId || null,
        template_id: templateId || null,
        role: role || 'all',
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update document');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to update document:', error);
      throw new Error(error.response?.data?.message || 'Failed to update document');
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

