import { ENV } from "@/lib/env";
import { notificationService } from "./notificationService";

interface BroadcastNotification {
  id: string;
  type: 'new_bug' | 'status_change';
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

  constructor() {
    // Initialize last check time from localStorage
    const storedLastCheck = localStorage.getItem('lastNotificationCheck');
    if (storedLastCheck) {
      this.lastCheckTime = storedLastCheck;
    }
  }

  // Start polling for new notifications
  startPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('Starting notification polling...');
    
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
    console.log('Stopped notification polling');
  }

  // Check for new notifications since last check
  private async checkForNotifications(): Promise<void> {
    try {
      const settings = notificationService.getSettings();
      
      // Skip if browser notifications are disabled
      if (!settings.browserNotifications) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        return; // User not logged in
      }

      const response = await fetch(`${ENV.API_URL}/notifications/get_recent.php`, {
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
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.notifications && data.notifications.length > 0) {
        console.log(`Found ${data.notifications.length} new notifications`);
        
        // Process each notification
        for (const notification of data.notifications) {
          await this.showBrowserNotification(notification);
        }
        
        // Update last check time
        this.lastCheckTime = new Date().toISOString();
        localStorage.setItem('lastNotificationCheck', this.lastCheckTime);
      }
    } catch (error) {
      console.error('Error checking for notifications:', error);
    }
  }

  // Show browser notification for a specific notification
  private async showBrowserNotification(notification: BroadcastNotification): Promise<void> {
    const settings = notificationService.getSettings();
    
    // Check if this type of notification is enabled
    if (notification.type === 'new_bug' && !settings.newBugNotifications) {
      return;
    }
    
    if (notification.type === 'status_change' && !settings.statusChangeNotifications) {
      return;
    }

    // Request permission if needed
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      const granted = await notificationService.requestBrowserPermission();
      if (!granted) return;
    }

    // Show the notification
    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: `broadcast-${notification.id}`,
      data: {
        bugId: notification.bugId,
        type: notification.type
      }
    });

    // Play sound if enabled
    if (settings.notificationSound) {
      notificationService.playNotificationSound();
    }

    // Auto-close after 5 seconds
    setTimeout(() => {
      browserNotification.close();
    }, 5000);

    // Handle click to navigate to bug
    browserNotification.onclick = () => {
      window.focus();
      // Navigate to the bug details page
      window.location.href = `${window.location.origin}/bugs/${notification.bugId}`;
      browserNotification.close();
    };
  }

  // Manually trigger a notification check
  async checkNow(): Promise<void> {
    await this.checkForNotifications();
  }

  // Broadcast a notification to all users (called when creating/updating bugs)
  async broadcastNotification(notification: Omit<BroadcastNotification, 'id' | 'createdAt'>): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      const response = await fetch(`${ENV.API_URL}/notifications/broadcast.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Notification broadcasted:', data);
    } catch (error) {
      console.error('Error broadcasting notification:', error);
    }
  }

  // Broadcast new bug notification
  async broadcastNewBug(bugTitle: string, bugId: string, createdBy: string): Promise<void> {
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
    const statusMessages = {
      'fixed': `Bug has been fixed: ${bugTitle}`,
      'in_progress': `Bug is now in progress: ${bugTitle}`,
      'declined': `Bug has been declined: ${bugTitle}`,
      'rejected': `Bug has been rejected: ${bugTitle}`
    };

    const message = statusMessages[status as keyof typeof statusMessages] || `Bug status updated: ${bugTitle}`;

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
}

export const broadcastNotificationService = new BroadcastNotificationService(); 