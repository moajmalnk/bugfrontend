import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { API_BASE_URL } from '@/lib/env';

interface MagicLinkButtonProps {
  onSuccess: (response: any) => void;
  onError: (error: any) => void;
  variant?: 'full' | 'icon';
}

export const MagicLinkButton: React.FC<MagicLinkButtonProps> = ({ 
  onSuccess, 
  onError, 
  variant = 'full' 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const handleMagicLinkRequest = async () => {
    if (!email.trim()) {
      onError({ message: 'Please enter your email address' });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/send_magic_link_simple.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess({
          message: data.message,
          expires_in: data.expires_in,
          email: email
        });
        setShowEmailInput(false);
        setEmail('');
      } else {
        onError({ message: data.message });
      }
    } catch (error) {
      onError({ 
        message: 'Failed to send magic link. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIconClick = () => {
    if (variant === 'icon') {
      setShowEmailInput(true);
    } else {
      handleMagicLinkRequest();
    }
  };

  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={handleIconClick}
          disabled={isLoading}
          className="group relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign in with Magic Link"
        >
          <Sparkles className={`h-4 w-4 sm:h-5 sm:w-5 transition-colors text-slate-500 group-hover:text-purple-600 ${isLoading ? 'animate-pulse' : ''}`} />
        </button>

        {/* Email Input Modal */}
        {showEmailInput && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 p-4 z-50">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Magic Link Sign-In
                </h3>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleMagicLinkRequest}
                  disabled={isLoading || !email.trim()}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
                <button
                  onClick={() => {
                    setShowEmailInput(false);
                    setEmail('');
                  }}
                  className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400">
                We'll send you a secure link to sign in without a password.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <span className="text-sm font-medium">Magic Link Sign-In</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={handleMagicLinkRequest}
          disabled={isLoading || !email.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending Magic Link...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Send Magic Link
            </>
          )}
        </button>
        
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          We'll send you a secure link to sign in without a password. The link expires in 15 minutes.
        </p>
      </div>
    </div>
  );
};
