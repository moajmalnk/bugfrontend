/**
 * Google OAuth Setup Utility
 * This file helps diagnose and fix Google OAuth configuration issues
 */

export const GOOGLE_OAUTH_SETUP = {
  // Current client ID
  clientId: '947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com',
  
  // Get current origin
  getCurrentOrigin: () => {
    return window.location.origin;
  },
  
  // Get current URL
  getCurrentUrl: () => {
    return window.location.href;
  },
  
  // Check if current origin is authorized
  checkOriginAuthorization: () => {
    const currentOrigin = window.location.origin;
    const authorizedOrigins = [
      'http://localhost:8080',
      'http://localhost:8084', 
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:3000',
      'https://bugs.bugricer.com',
      'https://www.bugs.bugricer.com'
    ];
    
    return {
      currentOrigin,
      isAuthorized: authorizedOrigins.includes(currentOrigin),
      authorizedOrigins
    };
  },
  
  // Generate setup instructions
  getSetupInstructions: () => {
    const { currentOrigin, isAuthorized } = GOOGLE_OAUTH_SETUP.checkOriginAuthorization();
    
    return {
      currentOrigin,
      isAuthorized,
      instructions: `
🔧 Google OAuth Setup Required

Current Origin: ${currentOrigin}
Status: ${isAuthorized ? '✅ Authorized' : '❌ Not Authorized'}

To fix this issue:

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Navigate to APIs & Services → Credentials
3. Find OAuth 2.0 Client ID: ${GOOGLE_OAUTH_SETUP.clientId}
4. Click on it to edit
5. In "Authorized JavaScript origins", add:
   - ${currentOrigin}
6. In "Authorized redirect URIs", add:
   - ${currentOrigin}/login
7. Save the changes
8. Wait 2-3 minutes for changes to propagate
9. Refresh this page and try again

If you're still having issues, check:
- Make sure the origin exactly matches (including http/https)
- Ensure no trailing slashes
- Wait a few minutes after saving changes
- Clear browser cache and cookies
      `
    };
  }
};

// Log setup information on load
if (typeof window !== 'undefined') {
  const setup = GOOGLE_OAUTH_SETUP.getSetupInstructions();
  if (!setup.isAuthorized) {
    console.warn('🚨 Google OAuth Setup Required:', setup.instructions);
  }
}
