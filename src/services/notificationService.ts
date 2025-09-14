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
  whatsappNotifications: boolean;
  newBugNotifications: boolean;
  statusChangeNotifications: boolean;
  notificationSound: boolean;
}

export const notificationService = new NotificationService();
