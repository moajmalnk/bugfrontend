import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_OAUTH_CONFIG } from '@/config/google-oauth-config';
import { ReactNode, useEffect } from 'react';

/**
 * Why: Load Google Identity Services only on auth screens so the landing page
 * does not pay for /gsi/client (~97 KiB) on cold load.
 */
export function GoogleOAuthGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Inject Google preconnect only when auth UI mounts
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://accounts.google.com';
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void import('@/utils/googleOAuthTroubleshoot');
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void import('@/utils/googleOAuthErrorHandler').then(({ setupGoogleOAuthErrorHandler }) => {
      cleanup = setupGoogleOAuthErrorHandler();
    });
    return () => cleanup?.();
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CONFIG.clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default GoogleOAuthGate;
