import { toast } from '@/components/ui/use-toast';

// Keep track of online status
let isOnline = navigator.onLine;
let hasInitialized = false;

// Function to check if app is online
export const isAppOnline = () => isOnline;

// Initialize offline detector
export const initOfflineDetector = () => {
  // Set up event listeners for online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial check — sync state without showing a toast on first load
  isOnline = navigator.onLine;
  hasInitialized = true;
  
  return () => {
    // Clean up event listeners
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    hasInitialized = false;
  };
};

// Handle online status
function handleOnline() {
  isOnline = true;
  handleStatusChange();
}

// Handle offline status
function handleOffline() {
  isOnline = false;
  handleStatusChange();
}

// Handle status changes
function handleStatusChange() {
  if (!hasInitialized) return;

  if (isOnline) {
    toast({
      title: "You are online",
      description: "Connected to the internet. All features available.",
      duration: 3000,
    });
    
    // If service worker is waiting, update
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
  } else {
    toast({
      title: "You are offline",
      description: "Working in offline mode. Some features may be limited.",
      variant: "destructive",
      duration: 5000,
    });
  }
}
