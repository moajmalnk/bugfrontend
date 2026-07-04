import { useEffect } from "react";
import { getMessaging, onMessage, type MessagePayload } from "firebase/messaging";
import { app } from "@/firebase-config";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

function resolvePayload(payload: MessagePayload) {
  const data = payload.data ?? {};
  const notification = payload.notification ?? {};

  return {
    title: data.title || notification.title || "BugRicer",
    body: data.body || notification.body || "You have a new update.",
    url: data.click_action || data.url || "/admin/notifications",
    type: data.type || "",
  };
}

function showSystemNotification(title: string, body: string, url: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `bugricer-${url}`,
      renotify: true,
      data: { url },
    });

    notification.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url;
      }
      notification.close();
    };
  } catch {
    // Some browsers block manual Notification while tab is focused
  }
}

const FirebaseListener = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser || !("serviceWorker" in navigator)) {
      return;
    }

    let unsubscribe = () => {};

    try {
      const messaging = getMessaging(app);

      unsubscribe = onMessage(messaging, (payload) => {
        const resolved = resolvePayload(payload);

        if (resolved.type === "announcement_broadcast") {
          window.location.reload();
          return;
        }

        // Always show in-app toast when the tab is open
        toast({
          title: resolved.title,
          description: resolved.body,
        });

        // Also try a system notification (helps when toast is easy to miss)
        showSystemNotification(resolved.title, resolved.body, resolved.url);

        // Refresh notification UIs listening for this event
        window.dispatchEvent(
          new CustomEvent("bugricer:push", {
            detail: resolved,
          })
        );
      });
    } catch {
      // Messaging unsupported in this browser/context
    }

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  return null;
};

export default FirebaseListener;
