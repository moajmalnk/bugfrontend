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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const settings = notificationService.getSettings();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<Date>(new Date());

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    try {
      const apiNotifications = await notificationService.getUserNotifications(50, 0);
      
      // Map API notifications to our Notification type
      const mappedNotifications: Notification[] = apiNotifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        read: n.read || false,
        createdAt: n.createdAt || n.created_at,
        entity_type: n.entity_type,
        entity_id: n.entity_id,
        project_id: n.project_id
      }));

      setNotifications(mappedNotifications);
      
      // Get unread count
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      
      lastFetchTimeRef.current = new Date();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [currentUser]);

  // Initial fetch and setup polling
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      
      // Poll every 30 seconds for new notifications
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications();
      }, 30000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [currentUser, fetchNotifications]);

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
    await notificationService.markAllAsRead();
    
    // Refresh to get accurate count
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

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
