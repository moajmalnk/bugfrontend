import { ENV } from "@/lib/env";
import { app } from "@/firebase-config";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const TOKEN_CACHE_KEY = "fcm_registration_signature";
const TOKEN_PWA_STATE_KEY = "fcm_registration_pwa_state";
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

const FCM_SYNC_IN_FLIGHT_KEY = "__bugricer_fcm_sync_in_flight__";

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

function parseBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";

  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  return {
    browser_name: browser,
    os_name: os,
    device_label: `${browser} on ${os}`,
  };
}

function isPwaInstalledMode(): boolean {
  if (typeof window === "undefined") return false;
  const displayMode = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

export function clearFcmRegistrationCache() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_CACHE_KEY);
    localStorage.removeItem(TOKEN_PWA_STATE_KEY);
  } catch {
    // ignore
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  return getMessaging(app);
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

async function saveFcmToken(token: string, options?: { force?: boolean }): Promise<boolean> {
  const userToken = getAuthToken();
  if (!userToken) {
    return false;
  }

  const deviceType = detectDeviceType();
  const browserInfo = parseBrowserInfo();
  const pwaInstalled = isPwaInstalledMode();
  const currentSignature = getRegistrationSignature(userToken, token, deviceType);
  const previousSignature = localStorage.getItem(TOKEN_CACHE_KEY);
  const previousPwaState = localStorage.getItem(TOKEN_PWA_STATE_KEY);
  const pwaStateChanged = previousPwaState !== String(pwaInstalled);

  if (!options?.force && previousSignature === currentSignature && !pwaStateChanged) {
    return true;
  }

  const payload = JSON.stringify({
    token,
    device_type: deviceType,
    platform: navigator.platform || "unknown",
    user_agent: navigator.userAgent,
    browser_name: browserInfo.browser_name,
    os_name: browserInfo.os_name,
    device_label: browserInfo.device_label,
    pwa_installed: pwaInstalled,
  });

  // Fallback chain for older cached builds / environment mismatch.
  const candidateBases = Array.from(
    new Set(
      [
        ENV.API_URL?.replace(/\/$/, ""),
        "https://bugbackend.bugricer.com/api",
      ].filter(Boolean)
    )
  );

  let lastError = "";
  for (const base of candidateBases) {
    try {
      const response = await fetch(`${base}/save-fcm-token.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: payload,
      });

      if (response.ok) {
        localStorage.setItem(TOKEN_CACHE_KEY, currentSignature);
        localStorage.setItem(TOKEN_PWA_STATE_KEY, String(pwaInstalled));
        return true;
      }

      lastError = `HTTP ${response.status} from ${base}`;
    } catch (err) {
      lastError = `Fetch failed for ${base}: ${String(err)}`;
    }
  }

  clearFcmRegistrationCache();
  if (import.meta.env.DEV) {
    console.warn("[FCM] save-fcm-token failed across all endpoints:", lastError);
  }
  return false;
}

/**
 * Sync FCM for the active logged-in session.
 * Call on login and when permission is already granted.
 */
export async function syncFcmTokenForSession(options?: {
  force?: boolean;
  interactive?: boolean;
  retries?: number;
}): Promise<NotificationPermissionResult> {
  if ((window as any)[FCM_SYNC_IN_FLIGHT_KEY]) {
    return "skipped";
  }
  (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = true;

  const retries = Math.max(0, options?.retries ?? 3);
  if (options?.force) {
    clearFcmRegistrationCache();
  }
  try {
    const interactive = options?.interactive ?? false;
    const forceSave = options?.force ?? false;

    let result = await requestNotificationPermission({
      interactive,
      forceSave,
    });

    // Reliability path: on some devices/browsers, SW/token setup lags behind login.
    // Retry a few times when permission is granted but token save was skipped.
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (result !== "skipped") break;
      if (getNotificationPermissionState() !== "granted") break;
      await sleep(attempt * 1200);
      result = await requestNotificationPermission({
        interactive: false,
        forceSave: true,
      });
    }

    return result;
  } finally {
    (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = false;
  }
}

/** Re-register push token on this browser/device (call after user enables notifications). */
export async function registerPushOnThisDevice(): Promise<NotificationPermissionResult> {
  clearFcmRegistrationCache();
  return requestNotificationPermission({ interactive: true, forceSave: true });
}

/**
 * Register FCM token.
 * interactive: true  → may show the browser permission dialog (call only from a user gesture / custom popup)
 * interactive: false → only refreshes token when permission is already granted
 */
export async function requestNotificationPermission(options?: {
  interactive?: boolean;
  forceSave?: boolean;
}): Promise<NotificationPermissionResult> {
  const interactive = options?.interactive ?? false;
  const forceSave = options?.forceSave ?? false;

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
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return "skipped";
    }

    const saved = await saveFcmToken(token, { force: forceSave });
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
