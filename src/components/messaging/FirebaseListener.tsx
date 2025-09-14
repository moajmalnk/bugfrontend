import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from '@/firebase-config'; // Assuming you have a firebase-config.ts
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const FirebaseListener = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !('serviceWorker' in navigator)) {
      return;
    }

    const messaging = getMessaging(app);

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);

      const { notification } = payload;
      
      // Check if it's our specific announcement broadcast
      if (payload.data?.type === 'announcement_broadcast') {
         window.location.reload(); // Simple reload to show the announcement
      } else if (notification) {
        toast({
          title: notification.title,
          description: notification.body,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  return null; // This component doesn't render anything
};

export default FirebaseListener; 