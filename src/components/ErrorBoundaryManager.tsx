import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, LogOut, Clock, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ENV } from '@/lib/env';

interface ErrorState {
  type: 'inactivity' | 'network' | 'version' | 'cache' | 'auth' | 'server' | 'unknown';
  message: string;
  canRetry: boolean;
  requiresLogin: boolean;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
}

interface ErrorBoundaryContextType {
  showError: (error: Partial<ErrorState>) => void;
  clearError: () => void;
  isOnline: boolean;
  lastActivity: number;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within ErrorBoundaryProvider');
  }
  return context;
};

interface ErrorBoundaryProviderProps {
  children: React.ReactNode;
}

export const ErrorBoundaryProvider: React.FC<ErrorBoundaryProviderProps> = ({ children }) => {
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { logout, currentUser } = useAuth();

  // Constants - TEMPORARY SHORTER TIMEOUTS FOR TESTING
//   const INACTIVITY_TIMEOUT = 30 * 1000; // 30 seconds (normally 5 minutes)
//   const INACTIVITY_WARNING = 20 * 1000; // 20 seconds (normally 4 minutes)
  
//   PRODUCTION TIMEOUTS (uncomment these and comment above for production):
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const INACTIVITY_WARNING = 4 * 60 * 1000; // 4 minutes
  
  const VERSION_CHECK_INTERVAL = 30 * 1000; // 30 seconds
  const NETWORK_CHECK_INTERVAL = 10 * 1000; // 10 seconds

  // Activity tracking
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setInactivityWarning(false);
  }, []);

  // Activity monitoring - TEMPORARILY DISABLED
  useEffect(() => {
    return; // Disabled during testing
    
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [updateActivity]);

  // Inactivity checker - TEMPORARILY DISABLED
  useEffect(() => {
    return; // Disabled during testing
    
    if (!currentUser) return;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        showError({
          type: 'inactivity',
          message: 'Your session has expired due to inactivity. Please log in again to continue.',
          canRetry: false,
          requiresLogin: true,
          severity: 'critical'
        });
      } else if (timeSinceLastActivity >= INACTIVITY_WARNING && !inactivityWarning) {
        setInactivityWarning(true);
        showError({
          type: 'inactivity',
          message: 'Your session will expire in 1 minute due to inactivity. Click anywhere to stay logged in.',
          canRetry: true,
          requiresLogin: false,
          severity: 'warning'
        });
      }
    };

    const interval = setInterval(checkInactivity, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [lastActivity, currentUser, inactivityWarning]);

  // Version checking for deployments - TEMPORARILY DISABLED
  useEffect(() => {
    return; // Disabled during testing
    
    const checkVersion = async () => {
      try {
        const response = await fetch('/version.json?' + Date.now(), {
          cache: 'no-cache'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (appVersion && appVersion !== data.version) {
            showError({
              type: 'version',
              message: 'A new version of the application is available. Please refresh to get the latest updates.',
              canRetry: true,
              requiresLogin: false,
              severity: 'warning'
            });
          } else if (!appVersion) {
            setAppVersion(data.version);
          }
        }
      } catch (error) {
        // Version check failed - could be network issue or deployment in progress
        // console.warn('Version check failed:', error);
      }
    };

    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);
    checkVersion(); // Initial check

    return () => clearInterval(interval);
  }, [appVersion]);

  // API Health monitoring - TEMPORARILY DISABLED FOR TESTING
  useEffect(() => {
    return; // Disabled to prevent interference during testing
    
    if (!isOnline) return;

    const checkApiHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${ENV.API_URL}/health.php`, {
          signal: controller.signal,
          cache: 'no-cache'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          showError({
            type: 'server',
            message: 'Unable to connect to the server. The service may be temporarily unavailable.',
            canRetry: true,
            requiresLogin: false,
            severity: 'error'
          });
        }
      }
    };

    const interval = setInterval(checkApiHealth, NETWORK_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [isOnline]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('Loading chunk') || 
          event.message.includes('Failed to fetch dynamically imported module')) {
        showError({
          type: 'cache',
          message: 'Failed to load application resources. This usually happens after an update.',
          canRetry: true,
          requiresLogin: false,
          severity: 'error'
        });
      } else if (event.message.includes('Network Error') || 
                 event.message.includes('fetch')) {
        showError({
          type: 'network',
          message: 'Network error occurred. Please check your connection.',
          canRetry: true,
          requiresLogin: false,
          severity: 'error'
        });
      } else {
        showError({
          type: 'unknown',
          message: 'An unexpected error occurred. Please refresh the page.',
          canRetry: true,
          requiresLogin: false,
          severity: 'error'
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('401') || 
          event.reason?.message?.includes('Unauthorized')) {
        showError({
          type: 'auth',
          message: 'Your session has expired. Please log in again.',
          canRetry: false,
          requiresLogin: true,
          severity: 'critical'
        });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const showError = useCallback((error: Partial<ErrorState>) => {
    setErrorState({
      type: error.type || 'unknown',
      message: error.message || 'An unexpected error occurred',
      canRetry: error.canRetry ?? true,
      requiresLogin: error.requiresLogin ?? false,
      severity: error.severity || 'error',
      timestamp: Date.now()
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
    setInactivityWarning(false);
  }, []);

  const handleRetry = () => {
    clearError();
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    clearError();
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'network': return <WifiOff className="h-5 w-5" />;
      case 'inactivity': return <Clock className="h-5 w-5" />;
      case 'version': return <Zap className="h-5 w-5" />;
      case 'cache': return <RefreshCw className="h-5 w-5" />;
      case 'auth': return <LogOut className="h-5 w-5" />;
      case 'server': return <AlertCircle className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getErrorTitle = (type: string) => {
    switch (type) {
      case 'network': return 'Connection Issue';
      case 'inactivity': return 'Session Status';
      case 'version': return 'Update Available';
      case 'cache': return 'Loading Error';
      case 'auth': return 'Authentication Required';
      case 'server': return 'Server Issue';
      default: return 'Application Error';
    }
  };

  return (
    <ErrorBoundaryContext.Provider value={{ showError, clearError, isOnline, lastActivity }}>
      {children}
      
      {/* Error Modal */}
      {errorState && errorState.severity === 'critical' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md mx-4 shadow-2xl border-2">
            <CardHeader className={`pb-3 ${
              errorState.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800' :
              errorState.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800' :
              'bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800'
            }`}>
              <CardTitle className={`flex items-center gap-3 text-lg ${
                errorState.severity === 'critical' ? 'text-red-800 dark:text-red-200' :
                errorState.severity === 'warning' ? 'text-yellow-800 dark:text-yellow-200' :
                'text-orange-800 dark:text-orange-200'
              }`}>
                {getErrorIcon(errorState.type)}
                {getErrorTitle(errorState.type)}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="pt-4 space-y-4">
              <CardDescription className="text-sm leading-relaxed">
                {errorState.message}
              </CardDescription>
              
              {/* Network status indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isOnline ? (
                  <><Wifi className="h-3 w-3 text-green-500" /> Connected</>
                ) : (
                  <><WifiOff className="h-3 w-3 text-red-500" /> Offline</>
                )}
                <span className="mx-2">•</span>
                <span>Last activity: {Math.floor((Date.now() - lastActivity) / 1000)}s ago</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                {errorState.requiresLogin ? (
                  <Button onClick={handleLogout} className="flex-1" variant="destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                ) : (
                  <>
                    {errorState.canRetry && (
                      <Button onClick={handleRetry} className="flex-1">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Page
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Non-critical error notifications */}
      {errorState && errorState.severity !== 'critical' && (
        <div className="fixed top-4 right-4 z-40 max-w-sm">
          <Alert className={`border-2 ${
            errorState.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20' :
            'border-orange-200 bg-orange-50 dark:bg-orange-900/20'
          }`}>
            {getErrorIcon(errorState.type)}
            <AlertTitle className="ml-2">{getErrorTitle(errorState.type)}</AlertTitle>
            <AlertDescription className="ml-2 mt-1">
              {errorState.message}
              <div className="flex gap-2 mt-2">
                {errorState.canRetry && (
                  <Button onClick={handleRetry} size="sm" variant="outline">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh
                  </Button>
                )}
                <Button onClick={clearError} size="sm" variant="ghost">
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Network status indicator (small) */}
      {!isOnline && !errorState && (
        <div className="fixed bottom-4 right-4 z-40">
          <Alert className="w-auto border-red-200 bg-red-50 dark:bg-red-900/20">
            <WifiOff className="h-4 w-4" />
            <AlertDescription className="text-sm">
              No internet connection
            </AlertDescription>
          </Alert>
        </div>
      )}
    </ErrorBoundaryContext.Provider>
  );
}; 