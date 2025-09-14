// Environment configuration
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('localhost'));

const getApiUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Auto-detect based on current URL
  if (isLocalhost) {
    return 'http://localhost/BugRicer/backend/api';
  }
  
  // Production detection - check if we're on the bug tracker domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('bugs.moajmalnk.in')) {
      return 'https://bugbackend.moajmalnk.in/api';
    }
  }
  
  // Default production fallback
  return 'https://bugbackend.moajmalnk.in/api';
};

export const ENV = {
  API_URL: getApiUrl(),
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
  
  if (missingVars.length > 0) {
    // console.error(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

// Local: http://localhost/BugRicer/backend/api/auth
// Production: https://bugsbackend.moajmalnk.in/api/auth
export const API_BASE_URL = isLocalhost
  ? "http://localhost/BugRicer/backend/api/auth"
  : "https://bugbackend.moajmalnk.in/api/auth";
