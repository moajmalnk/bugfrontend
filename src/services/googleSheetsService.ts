import { apiClient } from '@/lib/axios';
import { ENV } from '@/lib/env';

export interface BugSheet {
  id: number;
  bug_id: number;
  google_sheet_id: string;
  google_sheet_url: string;
  sheet_name: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetsConnectionStatus {
  connected: boolean;
  email?: string | null;
}

export interface CreateSheetResponse {
  sheet_id: string;
  sheet_url: string;
  sheet_name: string;
}

export interface UserSheet {
  id: number;
  sheet_title: string;
  google_sheet_id: string;
  google_sheet_url: string;
  sheet_type: string;
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
  google_sheet_id: string;
  description: string | null;
  category: string;
  is_active: number;
  is_configured: boolean;
  created_at: string;
}

class GoogleSheetsService {
  /**
   * Check if user has connected their Google account
   * Returns connection status and email if connected
   */
  async checkConnection(): Promise<GoogleSheetsConnectionStatus> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: GoogleSheetsConnectionStatus;
      }>('/sheets/check-connection.php');

      const result = {
        connected: response.data.data?.connected || false,
        email: response.data.data?.email || null
      };
      return result;
    } catch (error) {
      console.error('❌ Failed to check Google Sheets connection:', error);
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
   * Create a new Google Sheet for a bug
   */
  async createBugSheet(bugId: string | number): Promise<CreateSheetResponse> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: CreateSheetResponse;
      }>('/sheets/create.php', {
        bug_id: bugId,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create sheet');
      }

      return response.data.data;
    } catch (error: any) {
      console.error('Failed to create bug sheet:', error);
      throw new Error(error.response?.data?.message || 'Failed to create sheet');
    }
  }

  /**
   * Get all Google Sheets linked to a bug
   */
  async getBugSheets(bugId: string | number): Promise<BugSheet[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: BugSheet[];
      }>(`/sheets/list.php?bug_id=${bugId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch sheets');
      }

      return response.data.data || [];
    } catch (error: any) {
      console.error('Failed to fetch bug sheets:', error);
      return [];
    }
  }

  /**
   * Open a Google Sheet in a new tab
   */
  openSheet(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ========================================================================
  // General Sheet CRUD Operations
  // ========================================================================

  /**
   * Create a general sheet (not tied to a bug)
   */
  async createGeneralSheet(
    sheetTitle: string,
    templateId?: number,
    sheetType: string = 'general',
    projectId?: string | null,
    role?: string
  ): Promise<{ success: boolean; id: number; sheet_url: string; sheet_title: string }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        id: number;
        sheet_url: string;
        sheet_title: string;
      }>('/sheets/create-general-sheet.php', {
        sheet_title: sheetTitle,
        template_id: templateId,
        sheet_type: sheetType,
        project_id: projectId || null,
        role: role || 'all',
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create sheet');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to create general sheet:', error);
      throw new Error(error.response?.data?.message || 'Failed to create sheet');
    }
  }

  /**
   * Get sheets for a specific project
   */
  async getSheetsByProject(projectId: string, includeArchived: boolean = false): Promise<{
    sheets: UserSheet[];
    project_id: string;
    project_name: string | null;
    count: number;
  }> {
    try {
      console.log('🔍 Fetching sheets for project:', projectId);
      const url = `/sheets/get-by-project.php?project_id=${encodeURIComponent(projectId)}&include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        sheets: UserSheet[];
        project_id: string;
        project_name: string | null;
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch project sheets');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get sheets by project:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch project sheets');
    }
  }

  /**
   * Get all sheets (Admin only) - grouped by project
   */
  async getAllSheets(includeArchived: boolean = false): Promise<{
    sheets: Array<{
      project_id: string | null;
      project_name: string;
      sheets: UserSheet[];
    }>;
    count: number;
  }> {
    try {
      console.log('🔍 Fetching all sheets (admin)');
      const url = `/sheets/get-all-sheets.php?include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        sheets: Array<{
          project_id: string | null;
          project_name: string;
          sheets: UserSheet[];
        }>;
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch all sheets');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get all sheets:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch all sheets');
    }
  }

  /**
   * Get shared sheets (Developers/Testers) - from projects user is member of
   */
  async getSharedSheets(includeArchived: boolean = false): Promise<UserSheet[]> {
    try {
      console.log('🔍 Fetching shared sheets');
      const url = `/sheets/get-shared-sheets.php?include_archived=${includeArchived}`;
      const response = await apiClient.get<{
        success: boolean;
        sheets: UserSheet[];
        count: number;
      }>(url);

      if (!response.data.success) {
        throw new Error('Failed to fetch shared sheets');
      }

      return response.data.sheets || [];
    } catch (error: any) {
      console.error('❌ Failed to get shared sheets:', error);
      return [];
    }
  }

  /**
   * Get projects with sheet counts for card display
   */
  async getProjectsWithSheetCounts(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    status: string;
    sheet_count: number;
  }>> {
    try {
      console.log('🔍 Fetching projects with sheet counts');
      const response = await apiClient.get<{
        success: boolean;
        projects: Array<{
          id: string;
          name: string;
          description: string;
          status: string;
          sheet_count: number;
        }>;
      }>('/sheets/get-projects-with-counts.php');

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
   * List all general sheets for the current user
   */
  async listGeneralSheets(includeArchived: boolean = false, projectId?: string | null): Promise<UserSheet[]> {
    try {
      console.log('🔍 Fetching general sheets, includeArchived:', includeArchived, 'projectId:', projectId);
      let url = `/sheets/list-general-sheets.php?include_archived=${includeArchived}`;
      if (projectId) {
        url += `&project_id=${encodeURIComponent(projectId)}`;
      }
      const response = await apiClient.get<{
        success: boolean;
        sheets: UserSheet[];
        count: number;
      }>(url);

      console.log('📄 API response:', response.data);

      if (!response.data.success) {
        throw new Error('Failed to fetch sheets');
      }

      const sheets = response.data.sheets || [];
      console.log('📊 Returning sheets:', sheets.length);
      return sheets;
    } catch (error: any) {
      console.error('❌ Failed to list general sheets:', error);
      return [];
    }
  }

  /**
   * Update a sheet title, project, and template
   */
  async updateSheet(
    sheetId: number,
    newTitle: string,
    projectId?: string | null,
    templateId?: number | null,
    role?: string
  ): Promise<{ success: boolean; message: string; data?: { id: number; sheet_title: string } }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: { id: number; sheet_title: string };
      }>(`/sheets/update-general-sheet.php?id=${sheetId}`, {
        id: sheetId,
        sheet_title: newTitle,
        project_id: projectId || null,
        template_id: templateId || null,
        role: role || 'all',
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update sheet');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to update sheet:', error);
      throw new Error(error.response?.data?.message || 'Failed to update sheet');
    }
  }

  /**
   * Delete a general sheet
   */
  async deleteSheet(sheetId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/sheets/delete-general-sheet.php?id=${sheetId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to delete sheet');
      }

      return response.data;
    } catch (error: any) {
      console.error('Failed to delete sheet:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete sheet');
    }
  }

  /**
   * Get all available templates
   */
  async listTemplates(category?: string): Promise<Template[]> {
    try {
      const url = category
        ? `/sheets/list-templates.php?category=${encodeURIComponent(category)}`
        : '/sheets/list-templates.php';

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
   * Create a bug sheet using the new endpoint with template support
   */
  async createBugSheetWithTemplate(
    bugId: string | number,
    bugTitle: string,
    templateName: string = 'Bug Report Template'
  ): Promise<CreateSheetResponse> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        sheet_id: string;
        sheet_url: string;
        sheet_name: string;
      }>('/sheets/create-bug-sheet.php', {
        bug_id: bugId,
        bug_title: bugTitle,
        template_name: templateName,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create bug sheet');
      }

      return {
        sheet_id: response.data.sheet_id,
        sheet_url: response.data.sheet_url,
        sheet_name: response.data.sheet_name,
      };
    } catch (error: any) {
      console.error('Failed to create bug sheet:', error);
      throw new Error(error.response?.data?.message || 'Failed to create bug sheet');
    }
  }
}

// Google Sheets Service Instance
export const googleSheetsService = new GoogleSheetsService();

