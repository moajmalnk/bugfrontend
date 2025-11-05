import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';
import { notificationService } from '@/services/notificationService';

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'bug_created' | 'bug_fixed' | 'update_created' | 'task_created' | 'meet_created' | 'doc_created' | 'project_created';
  read: boolean;
  createdAt: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const settings = notificationService.getSettings();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<Date>(new Date());
  const isFetchingRef = useRef<boolean>(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      console.log('NotificationContext: No currentUser, skipping fetch');
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('NotificationContext: Fetch already in progress, skipping');
      return;
    }

    // Check if we fetched recently (within last 2 seconds)
    const now = new Date();
    const timeSinceLastFetch = now.getTime() - lastFetchTimeRef.current.getTime();
    if (timeSinceLastFetch < 2000) {
      console.log('NotificationContext: Recent fetch detected, skipping duplicate');
      return;
    }

    isFetchingRef.current = true;
    try {
      console.log('NotificationContext: Fetching notifications...');
      const apiNotifications = await notificationService.getUserNotifications(50, 0);
      console.log('NotificationContext: Received notifications:', {
        count: apiNotifications.length,
        sample: apiNotifications[0] || null,
        all: apiNotifications
      });
      
      // Map API notifications to our Notification type
      const mappedNotifications: Notification[] = apiNotifications.map((n: any) => ({
        id: n.id,
        title: n.title || 'Notification',
        message: n.message || '',
        type: n.type || 'info',
        read: n.read === true || n.read === 1 || n.read === '1',
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        entity_type: n.entity_type,
        entity_id: n.entity_id,
        project_id: n.project_id
      }));

      console.log('NotificationContext: Mapped notifications:', {
        count: mappedNotifications.length,
        sample: mappedNotifications[0] || null
      });

      setNotifications(mappedNotifications);
      
      // Get unread count
      const count = await notificationService.getUnreadCount();
      console.log('NotificationContext: Unread count:', count);
      setUnreadCount(count);
      
      lastFetchTimeRef.current = new Date();
    } catch (error) {
      console.error('NotificationContext: Error fetching notifications:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentUser]);

  // Initial fetch and setup polling
  useEffect(() => {
    if (currentUser) {
      // Add a small delay to prevent multiple simultaneous fetches
      const timeoutId = setTimeout(() => {
        fetchNotifications();
        
        // Poll every 30 seconds for new notifications
        pollingIntervalRef.current = setInterval(() => {
          fetchNotifications();
        }, 30000);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [currentUser?.id]); // Only depend on user ID, not the whole user object

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast and browser notification based on settings
    if (settings.browserNotifications) {
      notificationService.sendTestNotification();
      if (settings.notificationSound) {
        notificationService.playNotificationSound();
      }
    }
    
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });
  }, [settings.browserNotifications, settings.notificationSound]);

  const markAsRead = useCallback(async (id: string | number) => {
    const notificationId = typeof id === 'string' ? parseInt(id) : id;
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Update on server
    await notificationService.markAsRead(notificationId);
    
    // Refresh to get accurate count
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    
    // Update on server
    const success = await notificationService.markAllAsRead();
    
    if (success) {
      // Refresh to get accurate count and state
      await fetchNotifications();
    } else {
      // Revert optimistic update on failure
      await fetchNotifications();
    }
  }, [fetchNotifications]);

  const clearNotifications = useCallback(async () => {
    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);
    
    // Delete on server
    await notificationService.deleteAll();
    
    // Refresh to get accurate state
    await fetchNotifications();
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
