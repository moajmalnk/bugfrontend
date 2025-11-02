/**
 * Google OAuth Diagnostic Tool
 * Provides origin information and setup instructions for Google OAuth configuration
 */

export const googleOAuthDiagnostic = {
  clientId: '947044333217-u64nbc6pjmip562b4njg049mtddqaean.apps.googleusercontent.com',
  
  /**
   * Get current origin information
   */
  getCurrentOriginInfo: () => {
    const origin = window.location.origin;
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    return {
      origin,
      protocol,
      hostname,
      port: port || (protocol === 'https:' ? '443' : '80'),
      fullUrl: window.location.href,
      isDevelopment: hostname.includes('localhost') || hostname.includes('127.0.0.1')
    };
  },
  
  /**
   * Check if current origin is in expected list
   * NOTE: Actual authorization is verified by Google's servers
   */
  checkAuthorization: () => {
    const info = googleOAuthDiagnostic.getCurrentOriginInfo();
    const expectedOrigins = [
      'http://localhost',
      'http://localhost:80',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:8084',
      'http://127.0.0.1',
      'http://127.0.0.1:80',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:8084',
      'http://localhost/BugRicer',
      'http://127.0.0.1/BugRicer',
      'https://bugs.bugricer.com',
      'https://www.bugs.bugricer.com'
    ];
    
    return {
      ...info,
      isInExpectedList: expectedOrigins.includes(info.origin),
      needsSetup: !expectedOrigins.includes(info.origin)
    };
  },
  
  /**
   * Generate setup instructions
   * @param forceShow - Force show instructions even if origin is in expected list
   */
  getSetupInstructions: (forceShow: boolean = false) => {
    const check = googleOAuthDiagnostic.checkAuthorization();
    
    if (!forceShow && check.isInExpectedList) {
      return {
        status: 'warning',
        message: 'Origin may need to be added to Google Cloud Console',
        currentOrigin: check.origin
      };
    }
    
    const instructions = `Google OAuth Setup Required

Current origin: ${check.origin}
Client ID: ${googleOAuthDiagnostic.clientId}

How to fix:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find Client ID: ${googleOAuthDiagnostic.clientId}
3. Edit the client
4. Add to "Authorized JavaScript origins": ${check.origin}
5. Add to "Authorized redirect URIs": ${check.origin}/login
6. Save and wait 5-15 minutes
7. Clear browser cache and refresh

Important:
- No trailing slashes
- Match protocol exactly (http vs https)
- Include port if present`;
    
    return {
      status: 'error',
      message: `Origin "${check.origin}" needs to be added to Google Cloud Console`,
      currentOrigin: check.origin,
      instructions
    };
  },
  
  /**
   * Get setup instructions when Google rejects the request
   */
  getSetupInstructionsForRejection: () => {
    return googleOAuthDiagnostic.getSetupInstructions(true);
  },
  
  /**
   * Log rejection error with setup instructions
   */
  logRejectionError: () => {
    const setup = googleOAuthDiagnostic.getSetupInstructionsForRejection();
    
    console.error('%cGoogle OAuth Rejection', 'color: red; font-weight: bold;');
    console.warn(setup.instructions);
    console.log('Current origin:', setup.currentOrigin);
    console.log('Google Cloud Console:', 'https://console.cloud.google.com/apis/credentials');
    
    return setup;
  }
};

