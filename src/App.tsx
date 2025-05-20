import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { PrivacyOverlay } from "@/components/PrivacyOverlay";
import AppProviders from "@/components/providers/AppProviders";
import RouteConfig from "@/components/routes/RouteConfig";
import { initOfflineDetector } from "@/lib/offline";
import { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { requestNotificationPermission } from "./firebase-messaging-sw";

// Initialize the query client outside of the component
const queryClient = new QueryClient();

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

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <Router>
      <AppProviders queryClient={queryClient}>
        <KeyboardShortcuts />
        <RouteConfig />
        <PrivacyOverlay visible={privacy} />
      </AppProviders>
    </Router>
  );
}

export default App;
