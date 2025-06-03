class NotificationService {
  private readonly STORAGE_KEY = 'notification_settings';

  private getStoredSettings(): NotificationSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Default settings
    return {
      emailNotifications: true,
      browserNotifications: true,
      newBugNotifications: true,
      statusChangeNotifications: true,
      notificationSound: true
    };
  }

  saveSettings(settings: NotificationSettings): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }

  getSettings(): NotificationSettings {
    return this.getStoredSettings();
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

    new Notification('BugRacer Notification Test', {
      body: 'This is a test notification from BugRacer',
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

  async sendNewBugNotification(bugTitle: string): Promise<boolean> {
    return this.sendBugNotification(
      'New Bug Reported',
      `A new bug has been reported: ${bugTitle}`,
      'new'
    );
  }

  async sendBugStatusNotification(bugTitle: string, status: string): Promise<boolean> {
    return this.sendBugNotification(
      'Bug Status Updated',
      `${bugTitle} has been marked as ${status}`,
      'status_change'
    );
  }
}

export interface NotificationSettings {
  emailNotifications: boolean;
  browserNotifications: boolean;
  newBugNotifications: boolean;
  statusChangeNotifications: boolean;
  notificationSound: boolean;
}

export const notificationService = new NotificationService();
