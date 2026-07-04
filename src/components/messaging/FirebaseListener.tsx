import { useEffect } from "react";
import { onMessage, type MessagePayload } from "firebase/messaging";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { getFirebaseMessagingInstance } from "@/firebase-messaging-sw";

function resolvePayload(payload: MessagePayload) {
  const data = payload.data ?? {};
  const notification = payload.notification ?? {};

  return {
    title: data.title || notification.title || "BugRicer",
    body: data.body || notification.body || "You have a new update.",
    url: data.click_action || data.url || "/notifications",
    image: data.image || notification.image || "",
    type: data.type || "",
  };
}

function showSystemNotification(
  title: string,
  body: string,
  url: string,
  image?: string
) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }

  try {
    const options: NotificationOptions & { image?: string } = {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: `bugricer-${url}`,
      renotify: true,
      data: { url },
    };
    if (image) {
      options.image = image;
    }

    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      if (url) {
        window.location.href = url.startsWith("http")
          ? url
          : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
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

    void getFirebaseMessagingInstance().then((messaging) => {
      if (!messaging) {
        return;
      }

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
        showSystemNotification(
          resolved.title,
          resolved.body,
          resolved.url,
          resolved.image || undefined
        );

        // Refresh notification UIs listening for this event
        window.dispatchEvent(
          new CustomEvent("bugricer:push", {
            detail: resolved,
          })
        );
      });
    }).catch(() => {
      // Messaging unsupported in this browser/context
    });

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "BUGRICER_NOTIFICATION_NAV" && event.data.url) {
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      unsubscribe();
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [currentUser]);

  return null;
};

export default FirebaseListener;
