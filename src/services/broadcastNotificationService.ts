import { ENV } from "@/lib/env";
import { notificationService } from "./notificationService";

interface BroadcastNotification {
  id: string;
  type: 'new_bug' | 'status_change' | 'new_update';
  title: string;
  message: string;
  bugId: string;
  bugTitle: string;
  status?: string;
  createdAt: string;
  createdBy: string;
}

class BroadcastNotificationService {
  private pollInterval: number = 30000; // 30 seconds
  private lastCheckTime: string = new Date().toISOString();
  private isPolling: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Helper method to get role-neutral URL for sharing
  private getRoleBasedUrl(path: string): string {
    // For sharing, we want role-neutral URLs that work for all users
    // The route handler will redirect to the appropriate role-based URL
    return path;
  }

  constructor() {
    // Initialize last check time from localStorage
    try {
      const storedLastCheck = localStorage.getItem('lastNotificationCheck');
      if (storedLastCheck) {
        this.lastCheckTime = storedLastCheck;
      }
    } catch (error) {
      // console.warn('Failed to load last notification check time:', error);
    }
  }

  // Start polling for new notifications
  startPolling(): void {
    if (this.isPolling) {
      // console.log('Notification polling already running');
      return;
    }
    
    this.isPolling = true;
    // console.log('Starting notification polling...');
    
    // Check immediately
    this.checkForNotifications();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkForNotifications();
    }, this.pollInterval);
  }

  // Stop polling
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    // console.log('Stopped notification polling');
  }

  // Check for new notifications since last check
  private async checkForNotifications(): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      
      // Skip if browser notifications are disabled
      if (!settings.browserNotifications) {
        // console.log('Browser notifications disabled, skipping check');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        // console.log('No auth token found, stopping polling');
        this.stopPolling();
        return;
      }

      const url = `${ENV.API_URL}/notifications/get_recent.php`;
      // console.log('Checking for notifications since:', this.lastCheckTime);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          since: this.lastCheckTime
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // console.error(`HTTP error ${response.status}:`, errorText);
        return;
      }

      // Get response text first to check if it's valid JSON
      const responseText = await response.text();
      
      // Check if response looks like JSON
      if (!responseText.trim().startsWith('{') && !responseText.trim().startsWith('[')) {
        // console.error('Server returned non-JSON response:', responseText);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // console.error('Failed to parse JSON response:', parseError);
        // console.error('Response text:', responseText);
        return;
      }
      
      if (data.success && data.notifications && Array.isArray(data.notifications) && data.notifications.length > 0) {
        // console.log(`Found ${data.notifications.length} new notifications`);
        
        // Process each notification
        for (const notification of data.notifications) {
          try {
            await this.showBrowserNotification(notification);
          } catch (error) {
            // console.error('Error showing notification:', error);
          }
        }
        
        // Update last check time
        this.lastCheckTime = new Date().toISOString();
        try {
          localStorage.setItem('lastNotificationCheck', this.lastCheckTime);
        } catch (error) {
          // console.warn('Failed to save last check time:', error);
        }
      } else {
        // console.log('No new notifications found');
      }
    } catch (error) {
      // console.error('Error checking for notifications:', error);
    }
  }

  // Show browser notification for a specific notification
  private async showBrowserNotification(notification: BroadcastNotification): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      
      // Check if this type of notification is enabled
      if (notification.type === 'new_bug' && !settings.newBugNotifications) {
        // console.log('New bug notifications disabled, skipping');
        return;
      }
      
      if (notification.type === 'status_change' && !settings.statusChangeNotifications) {
        // console.log('Status change notifications disabled, skipping');
        return;
      }

      // Check browser support
      if (!('Notification' in window)) {
        // console.warn('Browser does not support notifications');
        return;
      }

      // Request permission if needed
      if (Notification.permission !== 'granted') {
        // console.log('Requesting notification permission...');
        const granted = await notificationService.requestBrowserPermission();
        if (!granted) {
          // console.warn('Notification permission denied');
          return;
        }
      }

      // console.log('Showing browser notification:', notification.title);

      // Show the notification
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: `broadcast-${notification.id}`,
        requireInteraction: false,
        silent: false
      });

      // Play sound if enabled
      if (settings.notificationSound) {
        try {
          notificationService.playNotificationSound();
        } catch (error) {
          // console.warn('Failed to play notification sound:', error);
        }
      }

      // Auto-close after 5 seconds
      setTimeout(() => {
        try {
          browserNotification.close();
        } catch (error) {
          // console.warn('Failed to close notification:', error);
        }
      }, 5000);

      // Handle click to navigate to bug
      browserNotification.onclick = () => {
        try {
          window.focus();
          // Use router navigation instead of direct href change
          const bugUrl = this.getRoleBasedUrl(`/bugs/${notification.bugId}`);
          window.location.hash = bugUrl;
          browserNotification.close();
        } catch (error) {
          // console.error('Failed to handle notification click:', error);
        }
      };

      browserNotification.onerror = (error) => {
        // console.error('Notification error:', error);
      };

    } catch (error) {
      // console.error('Error showing browser notification:', error);
    }
  }

  // Manually trigger a notification check
  async checkNow(): Promise<void> {
    // console.log('Manual notification check triggered');
    await this.checkForNotifications();
  }

  // Broadcast a notification to all users (called when creating/updating bugs)
  async broadcastNotification(notification: Omit<BroadcastNotification, 'id' | 'createdAt'>): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // console.warn('No auth token for broadcasting notification');
        return;
      }

      const url = `${ENV.API_URL}/notifications/broadcast.php`;
      // console.log('Broadcasting notification:', notification.title);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        const errorText = await response.text();
        // console.error(`Failed to broadcast notification (${response.status}):`, errorText);
        return;
      }

      const data = await response.json();
      if (data.success) {
        // console.log('Notification broadcasted successfully:', data);
      } else {
        // console.error('Broadcast failed:', data.message);
      }
    } catch (error) {
      // console.error('Error broadcasting notification:', error);
    }
  }

  // Broadcast new bug notification
  async broadcastNewBug(bugTitle: string, bugId: string, createdBy: string): Promise<void> {
    // console.log('Broadcasting new bug notification:', bugTitle);
    await this.broadcastNotification({
      type: 'new_bug',
      title: 'New Bug Reported',
      message: `A new bug has been reported: ${bugTitle}`,
      bugId,
      bugTitle,
      createdBy
    });
  }

  // Broadcast status change notification
  async broadcastStatusChange(bugTitle: string, bugId: string, status: string, updatedBy: string): Promise<void> {
    // console.log('Broadcasting status change notification:', bugTitle, 'to', status);
    
    const statusMessages: Record<string, string> = {
      'fixed': `Bug has been fixed: ${bugTitle}`,
      'in_progress': `Bug is now in progress: ${bugTitle}`,
      'declined': `Bug has been declined: ${bugTitle}`,
      'rejected': `Bug has been rejected: ${bugTitle}`
    };

    const message = statusMessages[status] || `Bug status updated to ${status}: ${bugTitle}`;

    await this.broadcastNotification({
      type: 'status_change',
      title: 'Bug Status Updated',
      message,
      bugId,
      bugTitle,
      status,
      createdBy: updatedBy
    });
  }

  // Get current polling status
  isCurrentlyPolling(): boolean {
    return this.isPolling;
  }

  // Reset last check time (useful for testing)
  resetLastCheckTime(): void {
    this.lastCheckTime = new Date().toISOString();
    try {
      localStorage.setItem('lastNotificationCheck', this.lastCheckTime);
      // console.log('Reset last check time to:', this.lastCheckTime);
    } catch (error) {
      // console.warn('Failed to reset last check time:', error);
    }
  }
}

export const broadcastNotificationService = new BroadcastNotificationService(); 