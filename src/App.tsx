import React, { useEffect, useState } from "react";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PrivacyOverlay } from "@/components/PrivacyOverlay";
import AppProviders, { CoreProviders, RouterProviders } from "@/components/providers/AppProviders";
import RouteConfig from "@/components/routes/RouteConfig";
import { initOfflineDetector } from "@/lib/offline";
import { initializeServiceWorker, serviceWorkerManager } from "@/lib/serviceWorkerManager";
import { initDevUtils } from "@/lib/devUtils";
import { QueryClient } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { requestNotificationPermission } from "./firebase-messaging-sw";
import ContextMenu from "./components/ContextMenu";
import { MainLayout } from "@/components/layout/MainLayout";
import Fixes from "@/pages/Fixes";
import { ErrorBoundaryProvider } from "@/components/ErrorBoundaryManager";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { DebugInfo } from "@/components/DebugInfo";
import { TimezoneDebug } from "@/components/TimezoneDebug";
import { ChunkErrorHandler } from "@/components/ChunkErrorHandler";
import { useAuth } from "@/context/AuthContext";
import { LoadingErrorModal } from "@/components/ui/LoadingErrorModal";
import { useLoadingErrorModal } from "@/hooks/useLoadingErrorModal";
import "@/utils/testLoadingError"; // Import for development testing
import { BugProvider } from "@/context/BugContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import NetworkError from './components/NetworkError';
import { AuthProvider } from "./context/AuthContext";
import { NotificationSettingsProvider } from "./context/NotificationSettingsContext";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { BundleAnalyzer } from "@/components/performance/BundleAnalyzer";
import { AccessibilityProvider, SkipToContent } from "@/components/accessibility/AccessibilityProvider";
import { ModernErrorBoundary } from "@/components/error/ModernErrorBoundary";
import { SEOHead } from "@/components/seo/SEOHead";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_OAUTH_CONFIG } from '@/config/google-oauth-config';
// Import troubleshooting tool (makes it available globally in console)
import '@/utils/googleOAuthTroubleshoot';
import { ProfessionalRefreshButton } from '@/components/ui/ProfessionalRefreshButton';
import { RefreshKeyboardShortcuts } from '@/components/ui/RefreshKeyboardShortcuts';

// Initialize the query client outside of the component with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (renamed from cacheTime in v5)
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors (401, 403)
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: true, // Refetch when internet connection is restored
      refetchOnMount: (query) => {
        // Only refetch on mount if data is stale
        return query.state.dataUpdatedAt === 0 || query.isStale();
      },
    },
  },
});

// Add React Router v7 future flags to eliminate warnings
const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

// Professional update notification component
function UpdateNotificationModal({ show, onAccept, onDismiss }: {
  show: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "2rem",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 64px rgba(0,0,0,0.15)",
          textAlign: "center",
          border: "1px solid #e5e7eb"
        }}
      >
        <div style={{ marginBottom: 16, fontSize: 24 }}>🚀</div>
        <h2 style={{ 
          marginBottom: 12, 
          color: "#111827",
          fontSize: "1.25rem",
          fontWeight: 600
        }}>
          New Version Available
        </h2>
        <p style={{ 
          marginBottom: 24, 
          color: "#6b7280",
          lineHeight: 1.6
        }}>
          A new version of BugRicer is ready with improvements and bug fixes.
          Would you like to update now?
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <button
            style={{
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              padding: "0.75rem 1.5rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={onDismiss}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#e5e7eb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
            }}
          >
            Later
          </button>
          <ProfessionalRefreshButton
            onHardRefresh={onAccept}
            showDropdown={false}
            label="Update Now"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white border-0"
          />
        </div>
      </div>
    </div>
  );
}

// Offline notification banner
function OfflineBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#f59e0b",
        color: "#92400e",
        padding: "0.75rem 1rem",
        textAlign: "center",
        zIndex: 9998,
        fontSize: "0.875rem",
        fontWeight: 500,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}
    >
      📡 You're currently offline. Some features may be limited.
    </div>
  );
}

// Component that uses the error handler hook inside the provider
function AppContent() {
  useApiErrorHandler(); // This will set up automatic error handling for API calls
  const loadingErrorModal = useLoadingErrorModal(); // Set up loading error modal
  
  const [privacy, setPrivacy] = useState(() => {
    return localStorage.getItem("privacyMode") === "true";
  });

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { currentUser } = useAuth();

  // Initialize service worker and offline detector
  useEffect(() => {
    // Initialize development utilities
    initDevUtils();
    
    // Initialize service worker
    initializeServiceWorker().catch(error => {
      // //.error('[App] Service worker initialization failed:', error);
    });

    // Set up service worker event listeners
    serviceWorkerManager.onUpdateAvailable(() => {
      setShowUpdateModal(true);
    });

    serviceWorkerManager.onOffline(() => {
      setIsOffline(true);
    });

    serviceWorkerManager.onOnline(() => {
      setIsOffline(false);
    });

    // Initialize offline detector as fallback
    const cleanup = initOfflineDetector();
    
    return cleanup;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        setPrivacy((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Persist privacy mode
  useEffect(() => {
    localStorage.setItem("privacyMode", privacy ? "true" : "false");
  }, [privacy]);

  // Enable notification permission request
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const [contextMenu, setContextMenu] = useState<{ mouseX: number | null; mouseY: number | null }>({ mouseX: null, mouseY: null });

  // Native event handlers for document
  const handleNativeContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
    });
  };

  const handleNativeClick = (event: MouseEvent) => {
    // Only close context menu if clicking outside of it
    // Don't interfere with button clicks
    const target = event.target as HTMLElement;

    // If the click happened inside the custom context menu, do nothing and let the menu item handler run.
    if (target.closest('[data-context-menu-root]')) {
      return;
    }

    // Check if click is on a button or interactive element
    if (target.closest('button') || 
        target.closest('[role="button"]') || 
        target.closest('a') ||
        target.closest('[onclick]')) {
      // Let button handlers execute first
      return;
    }

    setContextMenu({ mouseX: null, mouseY: null });
  };

  useEffect(() => {
    document.addEventListener('contextmenu', handleNativeContextMenu);
    // Use capture phase to check before button handlers
    document.addEventListener('click', handleNativeClick, true);
    return () => {
      document.removeEventListener('contextmenu', handleNativeContextMenu);
      document.removeEventListener('click', handleNativeClick, true);
    };
  }, []);

  // Handle service worker update
  const handleUpdateAccept = () => {
    serviceWorkerManager.skipWaiting();
    setShowUpdateModal(false);
  };

  const handleUpdateDismiss = () => {
    setShowUpdateModal(false);
  };

  // Start notification polling when user is logged in
  useEffect(() => {
    if (currentUser) {
      broadcastNotificationService.startPolling();
      //.log('Started notification polling for user:', currentUser.name || currentUser.username);
    } else {
      broadcastNotificationService.stopPolling();
      //.log('Stopped notification polling - user not logged in');
    }

    // Cleanup polling when component unmounts
    return () => {
      broadcastNotificationService.stopPolling();
    };
  }, [currentUser]);

  const networkError = false; // Replace with actual network error logic

  useEffect(() => {
    // Monitor all button clicks globally (development only)
    const handleGlobalClick = (e: MouseEvent) => {
      if (!import.meta.env.DEV) return;
      
      const target = e.target as HTMLElement;
      const button = target.closest('button');
      
      if (button) {
        // Check if button becomes stuck after 3 seconds
        setTimeout(() => {
          if (button.disabled && button.textContent?.includes('Loading') || button.textContent?.includes('Creating')) {
            console.warn('⚠️ [Global] Button still disabled/loading after 3s:', {
              text: button.textContent?.trim(),
              disabled: button.disabled,
              className: button.className
            });
          }
        }, 3000);
      }
    };
    
    document.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return (
    <>
      <SEOHead />
      <SkipToContent />
      <OfflineBanner show={isOffline} />
      <div style={{ paddingTop: isOffline ? '3rem' : '0' }}>
        <RouteConfig />
        <KeyboardShortcuts />
        <PrivacyOverlay visible={privacy} />
        <ContextMenu
          mouseX={contextMenu.mouseX}
          mouseY={contextMenu.mouseY}
          onClose={() => setContextMenu({ mouseX: null, mouseY: null })}
        />
        <UpdateNotificationModal
          show={showUpdateModal}
          onAccept={handleUpdateAccept}
          onDismiss={handleUpdateDismiss}
        />
        <TimezoneDebug />
        {networkError && <NetworkError />}
        <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
        <BundleAnalyzer enabled={process.env.NODE_ENV === 'development'} />
        
        {/* Loading Error Modal */}
        <LoadingErrorModal
          open={loadingErrorModal.isOpen}
          onOpenChange={loadingErrorModal.hideModal}
          onRefresh={loadingErrorModal.handleRefresh}
          onCancel={loadingErrorModal.handleCancel}
          retryCount={loadingErrorModal.retryCount}
          showRetryOption={loadingErrorModal.retryCount < 3}
        />
      </div>
    </>
  );
}

type GlobalErrorFallbackProps = {
  error: Error;
  resetError: () => void;
  retry: () => void;
};

function GlobalErrorFallback({ resetError, retry }: GlobalErrorFallbackProps) {
  const handleHardRefresh = () => {
    // Force a full reload to pull the latest version
    window.location.reload();
  };

  return (
    <>
      {/* Enable refresh keyboard shortcut only while this screen is visible */}
      <RefreshKeyboardShortcuts />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
        <div className="max-w-md w-full bg-slate-950/80 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-400/30 shadow-inner shadow-emerald-500/40">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-50 tracking-tight">
                New Version of BugRicer Available
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-300/80 leading-relaxed">
                We detected an issue loading the current version. This usually means a fresh
                update is ready. Refresh to continue with the latest, most stable experience.
              </p>
            </div>

            <div className="w-full space-y-2 mt-4">
              <ProfessionalRefreshButton
                onHardRefresh={handleHardRefresh}
                showDropdown={false}
                label="Refresh & Update"
                variant="default"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/30"
              />
              <p className="text-xs text-slate-400 mt-1">
                Tip: You can also press <span className="font-semibold text-slate-200">Ctrl + Shift + R</span> to refresh.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full justify-center">
              <button
                onClick={retry}
                className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-900/80 transition-colors"
              >
                Try Again Without Refresh
              </button>
              <button
                onClick={resetError}
                className="flex-1 text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-800 text-slate-400 hover:bg-slate-900/60 transition-colors"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


function App() {

  return (
    <ChunkErrorHandler>
      <HelmetProvider>
        <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CONFIG.clientId}>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ThemeProvider>
              <AccessibilityProvider>
                <AppProviders queryClient={queryClient}>
                  <AuthProvider>
                    <BugProvider>
                    <NotificationProvider>
                      <NotificationSettingsProvider>
                        <ModernErrorBoundary
                          fallbackRender={(props) => <GlobalErrorFallback {...props} />}
                        >
                          <ErrorBoundaryProvider>
                            <AppContent />
                          </ErrorBoundaryProvider>
                        </ModernErrorBoundary>
                      </NotificationSettingsProvider>
                    </NotificationProvider>
                  </BugProvider>
                </AuthProvider>
              </AppProviders>
            </AccessibilityProvider>
          </ThemeProvider>
        </Router>
        </GoogleOAuthProvider>
      </HelmetProvider>
    </ChunkErrorHandler>
  );
}

export default App;
