import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { googleOAuthDiagnostic } from '@/utils/googleOAuthDiagnostic';

interface GoogleSignInButtonProps {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: (error: any) => void;
  variant?: 'full' | 'icon';
}

const handleGoogleError = (onError: GoogleSignInButtonProps['onError']) => {
  const diagnostic = googleOAuthDiagnostic.getSetupInstructionsForRejection();
  onError({
    type: 'setup_required',
    message: `Google OAuth Setup Required: Origin "${diagnostic.currentOrigin}" is not authorized. Check browser console (F12) for setup instructions.`,
    setup: diagnostic.instructions,
    currentOrigin: diagnostic.currentOrigin,
    clientId: googleOAuthDiagnostic.clientId,
  });
};

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  variant = 'full',
}) => {
  if (variant === 'icon') {
    return (
      <div className="relative w-10 h-10 sm:w-12 sm:h-12">
        <button
          type="button"
          className="group relative flex items-center justify-center w-full h-full rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-300 hover:scale-105"
          title="Sign in with Google"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5 transition-colors text-slate-500 group-hover:text-blue-600" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </button>

        {/* Invisible overlay — stable key so GSI initialize() is not called on every render */}
        <div className="absolute inset-0 opacity-0 pointer-events-auto overflow-hidden">
          <GoogleLogin
            onSuccess={onSuccess}
            onError={() => handleGoogleError(onError)}
            useOneTap={false}
            theme="outline"
            size="large"
            shape="rectangular"
            logo_alignment="center"
            text="signin_with"
            width="300"
            ux_mode="popup"
            auto_select={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mt-3">
      <GoogleLogin
        onSuccess={onSuccess}
        onError={() => handleGoogleError(onError)}
        useOneTap={false}
        theme="outline"
        size="large"
        shape="rectangular"
        logo_alignment="left"
        text="signin_with"
        width="280"
        ux_mode="popup"
        auto_select={false}
      />
    </div>
  );
};
