
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element not found');

const root = createRoot(rootElement);
root.render(<App />);

// Register service worker early so share-target POST is intercepted (large PDFs).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js", { scope: "/", updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => {
      // Non-fatal — offline/share features degrade gracefully
    });
}
