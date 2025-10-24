/**
 * Clear Google OAuth Cache Utility
 * This helps resolve Google OAuth origin issues
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

      // Clear any cached Google OAuth data from memory
      if ((window as any).google && (window as any).google.accounts) {
        try {
          (window as any).google.accounts.id.cancel();
        } catch (e) {
          // Ignore errors
        }
      }
    }
  } catch (error) {
    console.warn('Error clearing Google OAuth cache:', error);
  }
};

/**
 * Force refresh the page to clear all Google OAuth cache
 */
export const forceRefreshGoogleOAuth = () => {
  clearGoogleOAuthCache();
  window.location.reload();
};
