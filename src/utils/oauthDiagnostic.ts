/**
 * OAuth Diagnostic Utility
 * Helps diagnose Google OAuth configuration issues
 */

export const oauthDiagnostic = {
  // Get current origin information
  getCurrentOriginInfo: () => {
    const origin = window.location.origin;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    const pathname = window.location.pathname;
    
    return {
      origin,
      protocol,
      hostname,
      port,
      pathname,
      fullUrl: window.location.href
    };
  },
  
  // Check if origin is likely authorized
  checkLikelyAuthorization: () => {
    const info = oauthDiagnostic.getCurrentOriginInfo();
    const likelyAuthorized = [
      'http://localhost:8080',
      'http://localhost:8084',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8084',
      'http://127.0.0.1:3000',
      'https://bugs.bugricer.com',
      'https://www.bugs.bugricer.com'
    ].includes(info.origin);
    
    return {
      ...info,
      likelyAuthorized,
      needsSetup: !likelyAuthorized
    };
  },
  
  // Generate setup instructions for current origin
  generateSetupInstructions: () => {
    const info = oauthDiagnostic.checkLikelyAuthorization();
    
    return {
      ...info,
      instructions: `
🔧 Google OAuth Setup Required

Current Origin: ${info.origin}
Status: ${info.likelyAuthorized ? '✅ Likely Authorized' : '❌ Needs Setup'}

To fix this:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find OAuth 2.0 Client ID: 947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com
3. Click to edit
4. Add to "Authorized JavaScript origins":
   - ${info.origin}
5. Add to "Authorized redirect URIs":
   - ${info.origin}/login
6. Save changes
7. Wait 2-3 minutes
8. Refresh this page

If you're using a different port or domain, add that specific origin instead.
      `.trim()
    };
  },
  
  // Log diagnostic information
  logDiagnostic: () => {
    const diagnostic = oauthDiagnostic.generateSetupInstructions();
    console.group('🔍 OAuth Diagnostic Information');
    console.log('Current Origin:', diagnostic.origin);
    console.log('Protocol:', diagnostic.protocol);
    console.log('Hostname:', diagnostic.hostname);
    console.log('Port:', diagnostic.port);
    console.log('Full URL:', diagnostic.fullUrl);
    console.log('Likely Authorized:', diagnostic.likelyAuthorized);
    console.log('Needs Setup:', diagnostic.needsSetup);
    
    if (diagnostic.needsSetup) {
      console.warn('🚨 Setup Required:', diagnostic.instructions);
    }
    
    console.groupEnd();
    return diagnostic;
  }
};

// Auto-run diagnostic on load
if (typeof window !== 'undefined') {
  oauthDiagnostic.logDiagnostic();
}
