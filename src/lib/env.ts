// Environment configuration
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('localhost'));

const getApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL as string | undefined;

  // Local dev against a remote API: route through Vite proxy (/api) to avoid CORS
  if (
    import.meta.env.DEV &&
    isLocalhost &&
    configured &&
    /^https?:\/\//.test(configured) &&
    !configured.includes('localhost') &&
    !configured.includes('127.0.0.1')
  ) {
    return '/api';
  }

  // Check for environment variable first
  if (configured) {
    return configured;
  }
  
  // Auto-detect based on current URL
  if (isLocalhost) {
    return 'http://localhost/BugRicer/backend/api';
  }
  
  // Production detection - check if we're on the bug tracker domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('bugs.moajmalnk.in') || hostname.includes('bugricer.com') || hostname.includes('bugs.bugricer.com')) {
      return 'https://bugbackend.bugricer.com/api';
    }
  }
  
  // Default production fallback
  return 'https://bugbackend.bugricer.com/api';
};

export const ENV = {
  API_URL: getApiUrl(),
  FIREBASE_VAPID_KEY: import.meta.env.VITE_FIREBASE_VAPID_KEY || "",
};

// Log the current environment for debugging
if (typeof window !== 'undefined') {
  // console.log('Environment detected:', isLocalhost ? 'Local' : 'Production');
  // console.log('Current hostname:', window.location.hostname);
  // console.log('API URL:', ENV.API_URL);
}

// Validate required environment variables
export const validateEnv = () => {
  const missingVars = [];
  
  if (!ENV.API_URL) missingVars.push('API_URL');
  if (!ENV.FIREBASE_VAPID_KEY) missingVars.push('FIREBASE_VAPID_KEY');
  
  if (missingVars.length > 0) {
    // console.error(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

export const API_BASE_URL = `${ENV.API_URL.replace(/\/$/, "")}/auth`;

// WebSocket URL configuration
export const getWebSocketUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  const apiUrl = getApiUrl();
  if (apiUrl.includes('bugbackend.bugricer.com')) {
    return 'wss://bugbackend.bugricer.com:8089';
  }

  // Auto-detect based on current URL
  if (isLocalhost) {
    return 'ws://localhost:8089';
  }
  
  // Production detection - Vercel frontend connecting to Hostinger backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If frontend is on Vercel (vercel.app domain), connect to Hostinger backend
    if (hostname.includes('vercel.app')) {
      return 'wss://bugbackend.bugricer.com:8089';
    }
    
    // If frontend is on custom domain, use the same domain for WebSocket
    if (hostname.includes('bugs.moajmalnk.in') || hostname.includes('bugricer.com') || hostname.includes('bugs.bugricer.com')) {
      return `wss://${hostname}:8089`;
    }
  }
  
  // Default production fallback - connect to Hostinger backend
  return 'wss://bugbackend.bugricer.com:8089';
};

export const WS_URL = getWebSocketUrl();
