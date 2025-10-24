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
    setContextMenu({ mouseX: null, mouseY: null });
  };

  useEffect(() => {
    document.addEventListener('contextmenu', handleNativeContextMenu);
    document.addEventListener('click', handleNativeClick);
    return () => {
      document.removeEventListener('contextmenu', handleNativeContextMenu);
      document.removeEventListener('click', handleNativeClick);
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

  return (
    <>
      <SEOHead />
      <SkipToContent />
      <RefreshKeyboardShortcuts />
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
                          fallbackRender={({ error, resetError, retry }) => (
                            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                              <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 text-center">
                                <h1 className="text-xl font-semibold text-foreground mb-2">
                                  Application Error
                                </h1>
                                <p className="text-muted-foreground mb-4">
                                  Something went wrong. Please try again.
                                </p>
                                <div className="space-y-2">
                                  <button
                                    onClick={retry}
                                    className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                                  >
                                    Try Again
                                  </button>
                                  <button
                                    onClick={resetError}
                                    className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors"
                                  >
                                    Reset
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
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
