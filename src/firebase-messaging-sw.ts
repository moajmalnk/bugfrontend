import { ENV } from "@/lib/env";
import { app } from "@/firebase-config";
import { getMessaging, getToken } from "firebase/messaging";

const messaging = getMessaging(app);

export async function requestNotificationPermission() {
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