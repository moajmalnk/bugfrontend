/**
 * Google OAuth Troubleshooting Utility
 */

export const googleOAuthTroubleshoot = {
  clientId: '947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com',
  
  /**
   * Run diagnostic check
   */
  runFullDiagnostic: () => {
    const origin = window.location.origin;
    
    console.group('Google OAuth Diagnostic');
    console.table({
      'Current Origin': origin,
      'Protocol': window.location.protocol,
      'Hostname': window.location.hostname,
      'Port': window.location.port || 'default',
      'Client ID': googleOAuthTroubleshoot.clientId
    });
    
    const commonOrigins = [
      'http://localhost:8080',
      'http://localhost:8084',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8084',
      'https://bugs.bugricer.com',
      'https://www.bugs.bugricer.com'
    ];
    
    if (!commonOrigins.includes(origin)) {
      console.warn(`Origin "${origin}" should be added to Google Cloud Console`);
    }
    
    console.groupEnd();
    
    return { origin, clientId: googleOAuthTroubleshoot.clientId };
  },
  
  /**
   * Clear all caches
   */
  clearAllCaches: async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      
      console.log('Caches cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  },
  
  /**
   * Test Google OAuth connection
   */
  testConnection: () => {
    const origin = window.location.origin;
    console.log('Testing connection for origin:', origin);
    
    const testUrl = `https://accounts.google.com/gsi/client?client_id=${googleOAuthTroubleshoot.clientId}`;
    
    fetch(testUrl, { method: 'HEAD', mode: 'no-cors' })
      .then(() => console.log('Can reach Google OAuth servers'))
      .catch((error) => console.error('Cannot reach Google OAuth servers:', error));
    
    const gsiScript = document.querySelector('script[src*="accounts.google.com/gsi"]');
    console.log('Google Sign-In script:', gsiScript ? 'Found' : 'Not found');
  },
  
  /**
   * Print setup instructions
   */
  printInstructions: () => {
    const origin = window.location.origin;
    
    console.group('Google OAuth Setup Instructions');
    console.log(`1. Go to: https://console.cloud.google.com/apis/credentials`);
    console.log(`2. Find Client ID: ${googleOAuthTroubleshoot.clientId}`);
    console.log(`3. Add to "Authorized JavaScript origins": ${origin}`);
    console.log(`4. Add to "Authorized redirect URIs": ${origin}/login`);
    console.log('5. Save and wait 5-15 minutes');
    console.log('6. Clear browser cache and refresh');
    console.groupEnd();
  }
};

// Export helper for console
if (typeof window !== 'undefined') {
  (window as any).googleOAuthTroubleshoot = googleOAuthTroubleshoot;
}

