import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PrivacyOverlay } from "@/components/PrivacyOverlay";
import { CoreProviders, RouterProviders } from "@/components/providers/AppProviders";
import RouteConfig from "@/components/routes/RouteConfig";
import { initOfflineDetector } from "@/lib/offline";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { requestNotificationPermission } from "./firebase-messaging-sw";
import ContextMenu from "./components/ContextMenu";
import { MainLayout } from "@/components/layout/MainLayout";
import Fixes from "@/pages/Fixes";

// Initialize the query client outside of the component
const queryClient = new QueryClient();

// Add React Router v7 future flags to eliminate warnings
const futureConfig = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

export function useChunkLoadErrorRefresh() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (event) => {
      if (
        event?.message?.includes("Failed to fetch dynamically imported module") ||
        event?.message?.includes("Loading chunk") ||
        event?.message?.includes("expected a JavaScript module script")
      ) {
        setShowModal(true);
      }
    };
    window.addEventListener("error", handler);

    // Also handle unhandledrejection for dynamic import errors
    const rejectionHandler = (event) => {
      if (
        event?.reason?.message?.includes("Failed to fetch dynamically imported module") ||
        event?.reason?.message?.includes("Loading chunk") ||
        event?.reason?.message?.includes("expected a JavaScript module script")
      ) {
        setShowModal(true);
      }
    };
    window.addEventListener("unhandledrejection", rejectionHandler);

    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  // Render the modal if needed
  return showModal ? (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "2rem",
          maxWidth: 400,
          boxShadow: "0 4px 32px rgba(0,0,0,0.2)",
          textAlign: "center"
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Update Available</h2>
        <p style={{ marginBottom: 24 }}>
          A new version of this site is available or a network error occurred.<br />
          Please refresh to continue.
        </p>
        <button
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "0.75rem 1.5rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
          onClick={() => window.location.reload()}
        >
          Refresh Now
        </button>
      </div>
    </div>
  ) : null;
}

function App() {
  const [privacy, setPrivacy] = useState(() => {
    return localStorage.getItem("privacyMode") === "true";
  });

  // Initialize offline detector
  useEffect(() => {
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
    // You might want to check if the click was outside the context menu before closing
    // For simplicity, we'll close on any click for now
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

  // Handler for React's onContextMenu prop
  const handleReactContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      event.preventDefault();
      setContextMenu({
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
  };

  // Handler for React's onClick prop
  const handleReactClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // This will be handled by the native click listener for closing the menu
      // Add any other click logic here if needed
  };

  const chunkErrorModal = useChunkLoadErrorRefresh();

  return (
    <CoreProviders queryClient={queryClient}>
      <Router future={futureConfig}>
        <RouterProviders>
          <RouteConfig />
          <KeyboardShortcuts />
          <PrivacyOverlay visible={privacy} />
          <ContextMenu
            mouseX={contextMenu.mouseX}
            mouseY={contextMenu.mouseY}
            onClose={() => setContextMenu({ mouseX: null, mouseY: null })}
          />
        </RouterProviders>
      </Router>
    </CoreProviders>
  );
}

export default App;
