/**
 * Google OAuth Utilities
 * Helper functions for handling Google OAuth issues and caching
 */

/**
 * Clear Google OAuth cache and force refresh
 */
export const clearGoogleOAuthCache = () => {
  try {
    // Clear any cached Google OAuth data
    if (typeof window !== 'undefined') {
      // Clear localStorage items related to Google OAuth
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('google') || key.includes('oauth') || key.includes('gsi'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear sessionStorage items related to Google OAuth
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('google') || key.includes('oauth') || key.includes('gsi'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      // Force reload of Google OAuth scripts
      const scripts = document.querySelectorAll('script[src*="accounts.google.com"]');
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });
    }
  } catch (error) {
    console.warn('Error clearing Google OAuth cache:', error);
  }
};

/**
 * Check if Google OAuth is properly configured
 */
export const checkGoogleOAuthConfig = () => {
  const currentOrigin = window.location.origin;
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
    'https://bugs.bugricer.com',
    'https://www.bugs.bugricer.com'
  ];

  return {
    currentOrigin,
    isAllowed: allowedOrigins.includes(currentOrigin),
    allowedOrigins
  };
};

/**
 * Force refresh Google OAuth button
 */
export const refreshGoogleOAuthButton = () => {
  try {
    // Clear cache first
    clearGoogleOAuthCache();
    
    // Force reload the page to refresh Google OAuth
    window.location.reload();
  } catch (error) {
    console.warn('Error refreshing Google OAuth button:', error);
  }
};

/**
 * Handle Google OAuth errors with specific error messages
 */
export const handleGoogleOAuthError = (error: any) => {
  console.error('Google OAuth Error:', error);
  
  if (error.error === 'popup_closed_by_user') {
    return 'Sign-in was cancelled. Please try again.';
  }
  
  if (error.error === 'access_denied') {
    return 'Access denied. Please check your Google account permissions.';
  }
  
  if (error.error === 'invalid_request') {
    return 'Invalid request. Please refresh the page and try again.';
  }
  
  if (error.error === 'unauthorized_client') {
    return 'Unauthorized client. Please contact support.';
  }
  
  return 'Failed to sign in with Google. Please try again.';
};
