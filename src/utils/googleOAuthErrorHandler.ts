/**
 * Global Google OAuth Error Handler
 * Detects and handles Google OAuth configuration errors globally
 */

import { googleOAuthDiagnostic } from './googleOAuthDiagnostic';

let errorLogged = false;
let errorCheckInterval: NodeJS.Timeout | null = null;

/**
 * Check for Google OAuth errors in console messages
 */
const checkForOAuthErrors = () => {
  // Check if we've already logged the error to avoid spam
  if (errorLogged) {
    return;
  }

  // Check for GSI_LOGGER errors in console
  const consoleMessages = (window as any).__consoleMessages || [];
  const hasOAuthError = consoleMessages.some((msg: any) => {
    const message = msg.message?.toString() || '';
    return (
      message.includes('GSI_LOGGER') ||
      message.includes('origin is not allowed') ||
      message.includes('client ID') ||
      (message.includes('403') && message.includes('accounts.google.com'))
    );
  });

  if (hasOAuthError) {
    errorLogged = true;
    googleOAuthDiagnostic.logRejectionError();
  }
};

/**
 * Set up global error listeners for Google OAuth
 */
export const setupGoogleOAuthErrorHandler = () => {
  // Check immediately on load if we're on a potentially unauthorized origin
  const originInfo = googleOAuthDiagnostic.getCurrentOriginInfo();
  const check = googleOAuthDiagnostic.checkAuthorization();
  
  // If origin is not in expected list, log instructions immediately
  if (check.needsSetup && !errorLogged) {
    // Small delay to ensure console is ready
    setTimeout(() => {
      console.warn('%c⚠️ Google OAuth may need configuration for this origin', 'color: #FF9800; font-weight: bold; font-size: 12px;');
      console.log('Current origin:', originInfo.origin);
      console.log('Run this in console for setup instructions: googleOAuthDiagnostic.logRejectionError()');
    }, 1000);
  }
  
  // Override console.error to catch Google OAuth errors
  const originalError = console.error;
  const originalWarn = console.warn;

  const errorHandler = (...args: any[]) => {
    const errorMessage = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    
    // Detect Google OAuth origin rejection errors
    if (
      (errorMessage.includes('GSI_LOGGER') || 
       errorMessage.includes('accounts.google.com') ||
       errorMessage.includes('gsi/button') ||
       fullMessage.includes('GSI_LOGGER') ||
       fullMessage.includes('origin is not allowed')) &&
      (errorMessage.includes('origin') || 
       errorMessage.includes('client ID') || 
       errorMessage.includes('not allowed') || 
       errorMessage.includes('403') ||
       fullMessage.includes('origin') ||
       fullMessage.includes('not allowed') ||
       fullMessage.includes('403'))
    ) {
      if (!errorLogged) {
        errorLogged = true;
        // Log immediately, don't wait
        googleOAuthDiagnostic.logRejectionError();
      }
    }
    
    originalError.apply(console, args);
  };

  const warnHandler = (...args: any[]) => {
    const warnMessage = args[0]?.toString() || '';
    const fullMessage = args.map(arg => String(arg)).join(' ');
    
    // Treat Google OAuth warnings as errors
    if (
      (warnMessage.includes('GSI_LOGGER') || 
       warnMessage.includes('accounts.google.com') ||
       fullMessage.includes('GSI_LOGGER') ||
       fullMessage.includes('origin is not allowed')) &&
      (warnMessage.includes('origin') || 
       warnMessage.includes('client ID') || 
       warnMessage.includes('not allowed') || 
       warnMessage.includes('403') ||
       fullMessage.includes('origin') ||
       fullMessage.includes('not allowed') ||
       fullMessage.includes('403'))
    ) {
      if (!errorLogged) {
        errorLogged = true;
        // Log immediately, don't wait
        googleOAuthDiagnostic.logRejectionError();
      }
    }
    
    originalWarn.apply(console, args);
  };

  console.error = errorHandler;
  console.warn = warnHandler;

  // Monitor network errors for 403s from Google
  if (typeof window !== 'undefined' && 'fetch' in window) {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check if it's a Google OAuth endpoint with 403
        const url = args[0]?.toString() || '';
        if (
          (url.includes('accounts.google.com') || url.includes('gstatic.com')) &&
          (url.includes('gsi') || url.includes('button')) &&
          response.status === 403
        ) {
          if (!errorLogged) {
            errorLogged = true;
            // Log immediately
            googleOAuthDiagnostic.logRejectionError();
          }
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };
  }

  // Also check periodically for errors (as a fallback)
  errorCheckInterval = setInterval(() => {
    checkForOAuthErrors();
  }, 2000);

  // Cleanup function
  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    if (errorCheckInterval) {
      clearInterval(errorCheckInterval);
    }
  };
};

/**
 * Reset error logged flag (useful for testing or after fixing the issue)
 */
export const resetOAuthErrorHandler = () => {
  errorLogged = false;
};

// Expose diagnostic function globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).fixGoogleOAuth = () => {
    errorLogged = false;
    googleOAuthDiagnostic.logRejectionError();
  };
  
  (window as any).checkGoogleOAuth = () => {
    const check = googleOAuthDiagnostic.checkAuthorization();
    const originInfo = googleOAuthDiagnostic.getCurrentOriginInfo();
    console.log('Current Origin:', originInfo.origin);
    console.log('Needs Setup:', check.needsSetup);
    console.log('Run fixGoogleOAuth() for setup instructions');
    return check;
  };
  
  // Auto-check on page load and show instructions if needed
  setTimeout(() => {
    const originInfo = googleOAuthDiagnostic.getCurrentOriginInfo();
    const check = googleOAuthDiagnostic.checkAuthorization();
    
    // Show a prominent message if origin might not be authorized
    if (check.needsSetup || originInfo.isDevelopment) {
      console.log(
        '%c🔍 Google OAuth Origin Check', 
        'color: #2196F3; font-weight: bold; font-size: 14px;'
      );
      console.log('Current origin:', originInfo.origin);
      console.log('If you see 403 errors, add this origin to Google Cloud Console');
      console.log('Quick fix: Run fixGoogleOAuth() in console for detailed instructions');
    }
  }, 2000);
}
