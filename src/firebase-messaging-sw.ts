import { ENV } from "@/lib/env";
import { app } from "@/firebase-config";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

function isMessagingAllowedDomain() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;

  // Always allow localhost for local development
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }

  // Enforce HTTPS and match production/staging domains
  if (window.location.protocol !== "https:") {
    return false;
  }

  const allowedDomains = [
    "bugricer.com",
    "bugs.bugricer.com",
    "bugs.moajmalnk.in",
  ];

  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export async function requestNotificationPermission() {
  if (typeof window === "undefined") {
    return;
  }

  if (!("Notification" in window) || !navigator?.serviceWorker) {
    // console.info("requestNotificationPermission: Notifications or service workers not supported in this environment.");
    return;
  }

  if (!isMessagingAllowedDomain()) {
    // console.info("requestNotificationPermission: Skipping FCM setup on non-whitelisted domain:", window.location.hostname);
    return;
  }

  const messagingSupported = await isSupported().catch(() => false);
  if (!messagingSupported) {
    // console.info("requestNotificationPermission: Firebase messaging is not supported in this browser.");
    return;
  }

  const messaging = getMessaging(app);

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const token = await getToken(messaging, { vapidKey: "BBXSfgYVLTeG4EnmK8fYtatHbkxa_cRW0p_aOplUppKKrH6rHi5uUyDcurLEUjJj0DoV7yx2PfmChIUzL5qf3hk" });
    // // console.log("FCM Token:", token);

    // Get user token from localStorage
    const userToken = localStorage.getItem("token");
    if (!userToken) {
      // // console.error("User token not found in localStorage. Cannot send FCM token to backend.");
      return;
    }

    const response = await fetch(`${ENV.API_URL}/save-fcm-token.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      // console.error("Failed to save FCM token:", response.status, errorText);
    }
  }
}

// Example: In your login success handler (React component)

async function handleLoginSuccess() {
  // ...your login logic...
  // After storing the token in localStorage:
  await requestNotificationPermission();
}