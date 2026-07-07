import { bugMetaTextLines } from "@/lib/bugMetaUtils";

class NotificationService {
  private readonly STORAGE_KEY = 'notification_settings';

  // Default notification settings
  private readonly DEFAULT_SETTINGS: Omit<NotificationSettings, 'emailNotifications'> = {
    browserNotifications: true,
    whatsappNotifications: false, // Disabled by default since it requires manual interaction
    newBugNotifications: true,
    statusChangeNotifications: true,
    notificationSound: true
  };

  private getStoredSettings(): NotificationSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      // console.log('Raw stored settings:', stored); // Debug log
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // console.log('Parsed settings:', parsed); // Debug log
        
        // Validate that all required properties exist
        const defaultSettings = this.getDefaultSettings();
        const validatedSettings = { ...defaultSettings, ...parsed };
        
        // console.log('Validated settings:', validatedSettings); // Debug log
        return validatedSettings;
      }
    } catch (error) {
      // console.error('Error reading notification settings from localStorage:', error);
    }
    
    // Return default settings if no stored settings or error
    const defaultSettings = this.getDefaultSettings();
    // console.log('Using default settings:', defaultSettings); // Debug log
    return defaultSettings;
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      emailNotifications: true, // This property is managed globally now, but we keep it for type consistency
      browserNotifications: true,
      whatsappNotifications: false,
      newBugNotifications: true,
      statusChangeNotifications: true,
      notificationSound: true
    };
  }

  saveSettings(settings: Omit<NotificationSettings, 'emailNotifications'>): void {
    try {
      const settingsToSave = { ...this.getStoredSettings(), ...settings };
      const settingsString = JSON.stringify(settingsToSave);
      localStorage.setItem(this.STORAGE_KEY, settingsString);
      // console.log('Settings saved to localStorage:', settingsString); // Debug log
      
      // Verify the save was successful
      const savedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (savedSettings !== settingsString) {
        // console.error('Settings save verification failed!');
      } else {
        // console.log('Settings save verified successfully'); // Debug log
      }
    } catch (error) {
      // console.error('Error saving notification settings to localStorage:', error);
    }
  }

  getSettings(): NotificationSettings {
    return this.getStoredSettings();
  }

  // Add method to clear settings (for debugging)
  clearSettings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      // console.log('Settings cleared from localStorage'); // Debug log
    } catch (error) {
      // console.error('Error clearing notification settings:', error);
    }
  }

  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  async sendTestNotification(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestBrowserPermission();
      if (!granted) return false;
    }

    new Notification('BugRicer Notification Test', {
      body: 'This is a test notification from BugRicer',
      icon: '/favicon.ico'
    });

    return true;
  }

  playNotificationSound(): void {
    const settings = this.getSettings();
    if (settings.notificationSound) {
      const audio = new Audio('/notification.mp3');  // Add this sound file to your public folder
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }

  async sendBugNotification(title: string, body: string, type: 'new' | 'status_change' = 'status_change'): Promise<boolean> {
    const settings = this.getSettings();
    
    // Check if browser notifications are enabled and the specific type is allowed
    if (!settings.browserNotifications) {
      return false;
    }
    
    if (type === 'new' && !settings.newBugNotifications) {
      return false;
    }
    
    if (type === 'status_change' && !settings.statusChangeNotifications) {
      return false;
    }

    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      const granted = await this.requestBrowserPermission();
      if (!granted) return false;
    }

    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: `bug-${type}-${Date.now()}` // Prevents duplicate notifications
    });

    // Play notification sound if enabled
    if (settings.notificationSound) {
      this.playNotificationSound();
    }

    return true;
  }

  async sendNewBugNotification(
    bugTitle: string,
    extras?: { bugLevel?: string; alreadyRaised?: boolean | number | string | null }
  ): Promise<boolean> {
    const metaLine = extras
      ? bugMetaTextLines({
          bug_level: extras.bugLevel,
          already_raised: extras.alreadyRaised,
        })
      : "";
    const body = metaLine
      ? `A new bug has been reported: ${bugTitle}\n${metaLine}`
      : `A new bug has been reported: ${bugTitle}`;

    return this.sendBugNotification('New Bug Reported', body, 'new');
  }

  async sendBugStatusNotification(bugTitle: string, status: string): Promise<boolean> {
    return this.sendBugNotification(
      'Bug Status Updated',
      `${bugTitle} has been marked as ${status}`,
      'status_change'
    );
  }

  async sendBugFixedNotification(bug: {
    title: string;
    reporter_name?: string | null;
    reported_by_name?: string | null;
    fixed_by_name?: string | null;
    updated_by_name?: string | null;
    updated_at?: string | null;
  }): Promise<boolean> {
    const reporter = bug.reporter_name || bug.reported_by_name || "Unknown";
    const fixer = bug.fixed_by_name || bug.updated_by_name || "Unknown";
    const when = bug.updated_at
      ? new Date(bug.updated_at).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }) + " IST"
      : new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }) + " IST";

    return this.sendBugNotification(
      "Bug Fixed",
      `Bug '${bug.title}' was fixed by ${fixer} (reported by ${reporter}) on ${when}`,
      "status_change"
    );
  }

  // Helper function to get token and check for impersonation
  private getTokenAndImpersonationHeaders(): { token: string | null; headers: Record<string, string> } {
    // Check sessionStorage first (for impersonation tokens), then localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      
      // Check if this is an impersonation token and add headers
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // If this is a dashboard access token with admin_id, we're impersonating
        if (payload.purpose === 'dashboard_access' && payload.admin_id && payload.user_id) {
          // Add impersonation headers so backend knows to use the impersonated user's ID
          headers['X-Impersonate-User'] = payload.user_id;
          headers['X-User-Id'] = payload.user_id;
        }
      } catch (e) {
        // Ignore token parsing errors, continue with normal flow
      }
    }

    return { token, headers };
  }

  // API methods for fetching and managing notifications
  async getUserNotifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
    readCount: number;
    hasMore: boolean;
  }> {
    const empty = {
      notifications: [] as any[],
      total: 0,
      unreadCount: 0,
      readCount: 0,
      hasMore: false,
    };

    try {
      // Skip API calls when offline to avoid noisy network errors
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return empty;
      }

      const { token, headers } = this.getTokenAndImpersonationHeaders();
      if (!token) {
        if (import.meta.env.DEV) {
          console.warn('NotificationService: No token found');
        }
        return empty;
      }

      const { ENV } = await import('@/lib/env');
      const apiUrl = ENV.API_URL;
      // Add impersonation query param if needed
      let url = `${apiUrl}/notifications/get_all.php?limit=${limit}&offset=${offset}`;
      
      // Add impersonation query param if headers indicate impersonation
      if (headers['X-Impersonate-User']) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}impersonate=${encodeURIComponent(headers['X-Impersonate-User'])}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        return empty;
      }

      const payload = data.data || {};
      return {
        notifications: payload.notifications || [],
        total: payload.total ?? payload.notifications?.length ?? 0,
        unreadCount: payload.unread_count ?? 0,
        readCount: payload.read_count ?? 0,
        hasMore: Boolean(payload.has_more),
      };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('NotificationService: Error fetching notifications:', error);
      }
      return empty;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      // Skip API calls when offline
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return 0;
      }

      const { token, headers } = this.getTokenAndImpersonationHeaders();
      if (!token) {
        return 0;
      }

      const { ENV } = await import('@/lib/env');
      const apiUrl = ENV.API_URL;
      
      // Add impersonation query param if needed
      let url = `${apiUrl}/notifications/unread_count.php`;
      if (headers['X-Impersonate-User']) {
        url = `${url}?impersonate=${encodeURIComponent(headers['X-Impersonate-User'])}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data.unread_count : 0;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching unread count:', error);
      }
      return 0;
    }
  }

  async markAsRead(notificationId: number | number[]): Promise<boolean> {
    try {
      const { token, headers } = this.getTokenAndImpersonationHeaders();
      if (!token) {
        return false;
      }

      const { ENV } = await import('@/lib/env');
      const apiUrl = ENV.API_URL;
      
      const body: any = Array.isArray(notificationId)
        ? { notification_ids: notificationId }
        : { notification_id: notificationId };
      
      // Add impersonation user ID to body if needed
      if (headers['X-Impersonate-User']) {
        body.impersonate_user_id = headers['X-Impersonate-User'];
      }
      
      let url = `${apiUrl}/notifications/mark_read.php`;
      if (headers['X-Impersonate-User']) {
        url = `${url}?impersonate=${encodeURIComponent(headers['X-Impersonate-User'])}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error marking notification as read:', error);
      }
      return false;
    }
  }

  async markAllAsRead(): Promise<boolean> {
    try {
      const { token, headers } = this.getTokenAndImpersonationHeaders();
      if (!token) {
        return false;
      }

      const { ENV } = await import('@/lib/env');
      const apiUrl = ENV.API_URL;
      
      let url = `${apiUrl}/notifications/mark_all_read.php`;
      if (headers['X-Impersonate-User']) {
        url = `${url}?impersonate=${encodeURIComponent(headers['X-Impersonate-User'])}`;
      }
      
      const body: any = {};
      if (headers['X-Impersonate-User']) {
        body.impersonate_user_id = headers['X-Impersonate-User'];
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error marking all notifications as read:', error);
      }
      return false;
    }
  }

  async deleteAll(): Promise<boolean> {
    try {
      const { token, headers } = this.getTokenAndImpersonationHeaders();
      if (!token) {
        return false;
      }

      const { ENV } = await import('@/lib/env');
      const apiUrl = ENV.API_URL;
      
      let url = `${apiUrl}/notifications/delete_all.php`;
      if (headers['X-Impersonate-User']) {
        url = `${url}?impersonate=${encodeURIComponent(headers['X-Impersonate-User'])}`;
      }
      
      const body: any = {};
      if (headers['X-Impersonate-User']) {
        body.impersonate_user_id = headers['X-Impersonate-User'];
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting all notifications:', error);
      }
      return false;
    }
  }
}

export interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  whatsappNotifications: boolean;
  newBugNotifications: boolean;
  statusChangeNotifications: boolean;
  notificationSound: boolean;
}

export const notificationService = new NotificationService();
