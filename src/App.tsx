import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PrivacyOverlay } from "@/components/PrivacyOverlay";
import AppProviders, { CoreProviders, RouterProviders } from "@/components/providers/AppProviders";
import RouteConfig from "@/components/routes/RouteConfig";
import { initOfflineDetector } from "@/lib/offline";
import { initializeServiceWorker, serviceWorkerManager } from "@/lib/serviceWorkerManager";
import { initDevUtils } from "@/lib/devUtils";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { requestNotificationPermission } from "./firebase-messaging-sw";
import ContextMenu from "./components/ContextMenu";
import { MainLayout } from "@/components/layout/MainLayout";
import Fixes from "@/pages/Fixes";
import { ErrorBoundaryProvider } from "@/components/ErrorBoundaryManager";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { DebugInfo } from "@/components/DebugInfo";
import { TimezoneDebug } from "@/components/TimezoneDebug";
import { useAuth } from "@/context/AuthContext";
import { BugProvider } from "@/context/BugContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import NetworkError from './components/NetworkError';
import { AuthProvider } from "./context/AuthContext";
import { NotificationSettingsProvider } from "./context/NotificationSettingsContext";

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
          A new version of Bugricer is ready with improvements and bug fixes.
          Would you like to update now?
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
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
          <button
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.75rem 1.5rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={onAccept}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#1d4ed8";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#2563eb";
            }}
          >
            Update Now
          </button>
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
      </div>
    </>
  );
}

// Professional chunk loading error handler using service worker
export function useChunkLoadErrorRefresh() {
  const [showModal, setShowModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const message = event?.message || '';
      if (
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Loading chunk") ||
        message.includes("expected a JavaScript module script") ||
        message.includes("Loading CSS chunk") ||
        message.includes("MIME type") ||
        message.includes("module script")
      ) {
        console.warn('[App] Chunk loading error detected:', message);
        setShowModal(true);
      }
    };
    window.addEventListener("error", handler);

    // Handle unhandled promise rejections for dynamic imports
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || '';
      if (
        reason.includes("Failed to fetch dynamically imported module") ||
        reason.includes("Loading chunk") ||
        reason.includes("expected a JavaScript module script") ||
        reason.includes("Loading CSS chunk") ||
        reason.includes("MIME type") ||
        reason.includes("module script")
      ) {
        console.warn('[App] Chunk loading promise rejection:', reason);
        setShowModal(true);
      }
    };
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRetrying(true);
    
    try {
      // Clear all caches before refresh
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear service worker cache
      await serviceWorkerManager.clearCache();
      
      // Clear localStorage cache if any
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('cache') || key.includes('chunk'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('[App] All caches cleared before refresh');
    } catch (error) {
      console.warn('[App] Failed to clear some caches before refresh:', error);
    }
    
    // Force reload with cache bypass
    window.location.href = window.location.href + '?v=' + Date.now();
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      handleRefresh();
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      // Try to reload the current page
      window.location.reload();
    } catch (error) {
      console.error('[App] Retry failed:', error);
      handleRefresh();
    }
  };

  return showModal ? (
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
        <div style={{ marginBottom: 16, fontSize: 24 }}>⚠️</div>
        <h2 style={{ 
          marginBottom: 12, 
          color: "#111827",
          fontSize: "1.25rem",
          fontWeight: 600
        }}>
          Application Update Required
        </h2>
        <p style={{ 
          marginBottom: 24, 
          color: "#6b7280",
          lineHeight: 1.6
        }}>
          The application needs to be refreshed to load the latest updates.
          This may be due to a new deployment or network connectivity issues.
          {retryCount > 0 && (
            <span style={{ display: 'block', marginTop: 8, fontSize: '0.875rem' }}>
              Retry attempt: {retryCount}/3
            </span>
          )}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          {retryCount < 3 && (
            <button
              style={{
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 6,
                padding: "0.75rem 1.5rem",
                fontWeight: 500,
                cursor: isRetrying ? "not-allowed" : "pointer",
                opacity: isRetrying ? 0.6 : 1,
                transition: "all 0.2s"
              }}
              onClick={handleRetry}
              disabled={isRetrying}
              onMouseOver={(e) => {
                if (!isRetrying) {
                  e.currentTarget.style.background = "#e5e7eb";
                }
              }}
              onMouseOut={(e) => {
                if (!isRetrying) {
                  e.currentTarget.style.background = "#f3f4f6";
                }
              }}
            >
              {isRetrying ? "Retrying..." : "Try Again"}
            </button>
          )}
          <button
            style={{
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "0.75rem 1.5rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onClick={handleRefresh}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#b91c1c";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#dc2626";
            }}
          >
            {isRetrying ? "Force Refresh" : "Refresh Application"}
          </button>
        </div>
      </div>
    </div>
  ) : null;
}

function App() {
  const chunkErrorModal = useChunkLoadErrorRefresh();

  return (
    <Router>
      <ThemeProvider>
        <AppProviders queryClient={queryClient}>
          <AuthProvider>
            <BugProvider>
              <NotificationProvider>
                <NotificationSettingsProvider>
                  <ErrorBoundaryProvider>
                    <AppContent />
                  </ErrorBoundaryProvider>
                </NotificationSettingsProvider>
              </NotificationProvider>
            </BugProvider>
          </AuthProvider>
        </AppProviders>
      </ThemeProvider>
      {chunkErrorModal}
    </Router>
  );
}

export default App;
