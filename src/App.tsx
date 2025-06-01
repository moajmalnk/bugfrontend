import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PrivacyOverlay } from "@/components/PrivacyOverlay";
import AppProviders from "@/components/providers/AppProviders";
import RouteConfig from "@/components/routes/RouteConfig";
import { initOfflineDetector } from "@/lib/offline";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { requestNotificationPermission } from "./firebase-messaging-sw";
import ContextMenu from "./components/ContextMenu";

// Initialize the query client outside of the component
const queryClient = new QueryClient();

function useChunkLoadErrorRefresh() {
  useEffect(() => {
    const handler = (event) => {
      // Vite/React chunk load error pattern
      if (
        event?.message?.includes("Failed to fetch dynamically imported module") ||
        event?.message?.includes("Loading chunk") ||
        event?.message?.includes("expected a JavaScript module script")
      ) {
        // Show a popup or toast
        if (window.confirm("A new version of this site is available or a network error occurred. Click OK to refresh.")) {
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);
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

  useChunkLoadErrorRefresh();

  return (
    <Router>
      <AppProviders queryClient={queryClient}>
        {/* Attach React handlers to the div */}
        <div onContextMenu={handleReactContextMenu} onClick={handleReactClick}>
          <KeyboardShortcuts />
          <RouteConfig />
          <PrivacyOverlay visible={privacy} />
          <ContextMenu
            mouseX={contextMenu.mouseX}
            mouseY={contextMenu.mouseY}
            onClose={() => setContextMenu({ mouseX: null, mouseY: null })} // Pass a no-argument function
          />
        </div>
      </AppProviders>
    </Router>
  );
}

export default App;
