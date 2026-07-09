import { ENV } from "@/lib/env";
import { app } from "@/firebase-config";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const TOKEN_CACHE_KEY = "fcm_registration_signature";
const MAIN_SW_URL = "/service-worker.js";
const MAIN_SW_SCOPE = "/";
/** @deprecated Legacy FCM-only worker — desktop Chrome push is unreliable with a second SW */
const LEGACY_FCM_SW_URL = "/firebase-messaging-sw.js";
const LEGACY_FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

export type NotificationPermissionResult =
  | "granted"
  | "denied"
  | "default"
  | "unsupported"
  | "skipped";

function isMessagingAllowedDomain() {
  if (typeof window === "undefined") {
    return false;
  }

  const hostname = window.location.hostname;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }

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

function detectDeviceType(): "android" | "ios" | "desktop" {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) {
    return "android";
  }
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  return "desktop";
}

function getRegistrationSignature(userToken: string, fcmToken: string, deviceType: string) {
  return `${userToken.slice(0, 16)}:${deviceType}:${fcmToken}`;
}

async function unregisterLegacyFcmWorker(): Promise<void> {
  if (!navigator?.serviceWorker?.getRegistration) {
    return;
  }
  try {
    const legacy = await navigator.serviceWorker.getRegistration(LEGACY_FCM_SW_SCOPE);
    if (legacy) {
      await legacy.unregister();
    }
  } catch {
    // Non-fatal — old worker may already be gone
  }
}

/** Use the main PWA service worker so Chrome on Mac receives background push reliably. */
export async function getFirebaseServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !navigator?.serviceWorker) {
    return null;
  }

  try {
    let registration = await navigator.serviceWorker.getRegistration(MAIN_SW_SCOPE);

    if (!registration) {
      registration = await navigator.serviceWorker.register(MAIN_SW_URL, {
        scope: MAIN_SW_SCOPE,
        updateViaCache: "none",
      });
    }

    await navigator.serviceWorker.ready;

    if (registration.installing) {
      await new Promise<void>((resolve) => {
        const worker = registration!.installing!;
        const onStateChange = () => {
          if (worker.state === "activated" || worker.state === "redundant") {
            worker.removeEventListener("statechange", onStateChange);
            resolve();
          }
        };
        worker.addEventListener("statechange", onStateChange);
        if (worker.state === "activated") {
          resolve();
        }
      });
    }

    await unregisterLegacyFcmWorker();
    return registration;
  } catch {
    try {
      return await navigator.serviceWorker.register(LEGACY_FCM_SW_URL, {
        scope: LEGACY_FCM_SW_SCOPE,
      });
    } catch {
      return null;
    }
  }
}

export async function getFirebaseMessagingInstance() {
  const messagingSupported = await isSupported().catch(() => false);
  if (!messagingSupported) {
    return null;
  }
  const registration = await getFirebaseServiceWorkerRegistration();
  if (!registration) {
    return null;
  }
  return getMessaging(app, { serviceWorkerRegistration: registration });
}

export function getNotificationPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function hasFcmTokenOnThisDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return Boolean(localStorage.getItem(TOKEN_CACHE_KEY));
  } catch {
    return false;
  }
}

export function needsPushRegistrationOnThisDevice(): boolean {
  return (
    getNotificationPermissionState() === "granted" && !hasFcmTokenOnThisDevice()
  );
}

export function canRequestNotificationPermission(): boolean {
  return getNotificationPermissionState() === "default";
}

export function isNotificationPermissionBlocked(): boolean {
  return getNotificationPermissionState() === "denied";
}

export function needsNotificationPermission(): boolean {
  const state = getNotificationPermissionState();
  if (state === "default" || state === "denied") {
    return true;
  }
  return needsPushRegistrationOnThisDevice();
}

function getAuthToken(): string | null {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token")
  );
}

async function saveFcmToken(token: string): Promise<boolean> {
  const userToken = getAuthToken();
  if (!userToken) {
    return false;
  }

  const deviceType = detectDeviceType();
  const currentSignature = getRegistrationSignature(userToken, token, deviceType);
  const previousSignature = localStorage.getItem(TOKEN_CACHE_KEY);

  if (previousSignature === currentSignature) {
    return true;
  }

  const response = await fetch(`${ENV.API_URL}/save-fcm-token.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      token,
      device_type: deviceType,
      platform: navigator.platform || "unknown",
      user_agent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_CACHE_KEY);
    return false;
  }

  localStorage.setItem(TOKEN_CACHE_KEY, currentSignature);
  return true;
}

/** Re-register push token on this browser/device (call after user enables notifications). */
export async function registerPushOnThisDevice(): Promise<NotificationPermissionResult> {
  localStorage.removeItem(TOKEN_CACHE_KEY);
  return requestNotificationPermission({ interactive: true });
}

/**
 * Register FCM token.
 * interactive: true  → may show the browser permission dialog (call only from a user gesture / custom popup)
 * interactive: false → only refreshes token when permission is already granted
 */
export async function requestNotificationPermission(options?: {
  interactive?: boolean;
}): Promise<NotificationPermissionResult> {
  const interactive = options?.interactive ?? false;

  if (typeof window === "undefined") {
    return "unsupported";
  }

  if (!("Notification" in window) || !navigator?.serviceWorker) {
    return "unsupported";
  }

  if (!isMessagingAllowedDomain()) {
    return "skipped";
  }

  const messagingSupported = await isSupported().catch(() => false);
  if (!messagingSupported) {
    return "unsupported";
  }

  const vapidKey = ENV.FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return "skipped";
  }

  let permission = Notification.permission;

  if (permission === "default") {
    if (!interactive) {
      return "default";
    }
    permission = await Notification.requestPermission();
  } else if (permission === "denied") {
    return "denied";
  }

  if (permission !== "granted") {
    return permission;
  }

  try {
    const registration = await getFirebaseServiceWorkerRegistration();
    if (!registration) {
      return "skipped";
    }
    const messaging = getMessaging(app, { serviceWorkerRegistration: registration });
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return "skipped";
    }

    const saved = await saveFcmToken(token);
    if (!saved) {
      return "skipped";
    }

    return "granted";
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[FCM] Token registration failed:", error);
    }
    return "skipped";
  }
}
