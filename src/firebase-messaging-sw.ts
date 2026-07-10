import { ENV, isValidVapidKey } from "@/lib/env";
import { apiClient } from "@/lib/axios";
import { app } from "@/firebase-config";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const TOKEN_CACHE_KEY = "fcm_registration_signature";
const TOKEN_PWA_STATE_KEY = "fcm_registration_pwa_state";
const FCM_EPOCH_KEY = "fcm_token_epoch_seen";
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
  | "skipped"
  | "storage_error";

const FCM_SYNC_IN_FLIGHT_KEY = "__bugricer_fcm_sync_in_flight__";
const FCM_SYNC_PROMISE_KEY = "__bugricer_fcm_sync_promise__";
const FCM_STORAGE_RECOVERY_KEY = "fcm_storage_recovery_at";
/** Chrome push storage needs time to release after SW/subscription teardown. */
const FCM_STORAGE_RECOVERY_COOLDOWN_MS = 15 * 60 * 1000;
const FCM_POST_RESET_DELAY_MS = 2000;

const FIREBASE_IDB_NAMES = [
  "firebase-messaging-database",
  "fcm_token_details_db",
  "firebase-installations-database",
  "firebase-heartbeat-database",
];

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

function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
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

/** Clear local FCM cache when server bumps FCM_TOKEN_EPOCH after a DB reset. */
export function applyServerFcmEpoch(
  serverEpoch: string | number | undefined | null
): boolean {
  if (serverEpoch === undefined || serverEpoch === null || serverEpoch === "") {
    return false;
  }

  const epoch = String(serverEpoch);
  try {
    const seen = localStorage.getItem(FCM_EPOCH_KEY);
    if (seen === epoch) {
      return false;
    }
    localStorage.setItem(FCM_EPOCH_KEY, epoch);
  } catch {
    // ignore storage errors and still clear token cache
  }

  clearFcmRegistrationCache();
  return true;
}

/** Re-sync token when PWA is installed or opened in standalone mode. */
export function setupFcmPwaAutoSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const syncIfGranted = () => {
    if (getNotificationPermissionState() !== "granted") {
      return;
    }
    void syncFcmTokenForSession({ force: true, interactive: false, retries: 3 });
  };

  const onInstalled = () => syncIfGranted();
  window.addEventListener("appinstalled", onInstalled);

  const standaloneMq = window.matchMedia("(display-mode: standalone)");
  const onDisplayMode = () => {
    if (isPwaInstalledMode()) {
      syncIfGranted();
    }
  };

  standaloneMq.addEventListener?.("change", onDisplayMode);
  if (isPwaInstalledMode()) {
    syncIfGranted();
  }

  return () => {
    window.removeEventListener("appinstalled", onInstalled);
    standaloneMq.removeEventListener?.("change", onDisplayMode);
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFcmStorageError(error: unknown): boolean {
  const text = String(error instanceof Error ? error.message : error).toLowerCase();
  return text.includes("storage error") || text.includes("aborterror");
}

export function hadRecentFcmStorageRecovery(): boolean {
  return wasRecentStorageRecovery();
}

function wasRecentStorageRecovery(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(FCM_STORAGE_RECOVERY_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < FCM_STORAGE_RECOVERY_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markStorageRecoveryAttempt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(FCM_STORAGE_RECOVERY_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

async function unsubscribeAllPushSubscriptions(): Promise<void> {
  if (!navigator?.serviceWorker?.getRegistrations) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      try {
        const subscription = await registration.pushManager?.getSubscription?.();
        if (subscription) {
          await subscription.unsubscribe();
        }
      } catch {
        // Non-fatal — subscription may already be gone
      }
    })
  );
}

async function clearFirebaseMessagingDatabases(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return;
  }

  const dbNames = new Set<string>(FIREBASE_IDB_NAMES);

  try {
    const listFn = (indexedDB as IDBFactory & { databases?: () => Promise<Array<{ name?: string }>> })
      .databases;
    if (typeof listFn === "function") {
      const listed = await listFn.call(indexedDB);
      for (const entry of listed) {
        if (entry?.name?.startsWith("firebase-") || entry?.name?.includes("fcm")) {
          dbNames.add(entry.name);
        }
      }
    }
  } catch {
    // databases() is not available in every browser
  }

  await Promise.all(
    Array.from(dbNames).map(
      (name) =>
        new Promise<void>((resolve) => {
          try {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          } catch {
            resolve();
          }
        })
    )
  );
}

/** Clear broken push state. Safari: never unregister the main SW (causes reload loops). */
export async function resetPushBrowserState(): Promise<void> {
  clearFcmRegistrationCache();
  await unsubscribeAllPushSubscriptions();
  await clearFirebaseMessagingDatabases();

  const preserveServiceWorker = isSafariBrowser();

  if (!preserveServiceWorker && navigator?.serviceWorker?.getRegistrations) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if (!preserveServiceWorker && "caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  await sleep(preserveServiceWorker ? 800 : FCM_POST_RESET_DELAY_MS);
}

async function acquireFcmToken(vapidKey: string, allowRecovery: boolean): Promise<string | null> {
  const attempt = async () => {
    const registration = await getFirebaseServiceWorkerRegistration();
    if (!registration) {
      return null;
    }
    const messaging = getMessaging(app);
    return getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  };

  try {
    return await attempt();
  } catch (error) {
    if (!allowRecovery || !isFcmStorageError(error) || wasRecentStorageRecovery()) {
      throw error;
    }

    markStorageRecoveryAttempt();
    console.warn("[FCM] Storage error detected — resetting browser push state and retrying once");
    await resetPushBrowserState();
    return attempt();
  }
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

  const payload = {
    token,
    device_type: deviceType,
    platform: navigator.platform || "unknown",
    user_agent: navigator.userAgent,
    browser_name: browserInfo.browser_name,
    os_name: browserInfo.os_name,
    device_label: browserInfo.device_label,
    pwa_installed: pwaInstalled,
  };

  const savePaths = [
    "/save-fcm-token.php",
    "https://bugbackend.bugricer.com/api/save-fcm-token.php",
  ];

  let lastError = "";
  for (const path of savePaths) {
    try {
      const response = await apiClient.post(path, payload, {
        headers: { Authorization: `Bearer ${userToken}` },
        timeout: 20000,
      });

      const body = response.data as {
        success?: boolean;
        error?: string;
        message?: string;
        saved_to_table?: boolean;
      };
      let accepted = true;
      if (body?.success === false) {
        accepted = false;
        lastError = body?.error || body?.message || `API rejected token (${path})`;
      } else if (body?.saved_to_table === false) {
        console.warn(
          `[FCM] Token saved to users.fcm_token but not user_fcm_tokens (${path})`
        );
      }

      if (accepted) {
        localStorage.setItem(TOKEN_CACHE_KEY, currentSignature);
        localStorage.setItem(TOKEN_PWA_STATE_KEY, String(pwaInstalled));
        return true;
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr.response?.status) {
        lastError = `HTTP ${axiosErr.response.status} (${path})`;
      } else {
        lastError = `Request failed (${path}): ${String(axiosErr.message || err)}`;
      }
    }
  }

  clearFcmRegistrationCache();
  console.warn("[FCM] save-fcm-token failed across all endpoints:", lastError);
  return false;
}

/**
 * Sync FCM for the active logged-in session.
 * Call on login and when permission is already granted.
 *
 * force: re-POST token to backend even if local signature matches.
 * Does NOT clear local cache first (that was wiping registration on every login
 * and falsely showing "Finish setup on this device").
 */
export async function syncFcmTokenForSession(options?: {
  force?: boolean;
  interactive?: boolean;
  retries?: number;
}): Promise<NotificationPermissionResult> {
  const existing = (window as any)[FCM_SYNC_PROMISE_KEY] as
    | Promise<NotificationPermissionResult>
    | undefined;
  if (existing) {
    return existing;
  }

  const run = (async (): Promise<NotificationPermissionResult> => {
    (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = true;
    const retries = Math.max(0, options?.retries ?? 3);
    try {
      const interactive = options?.interactive ?? false;
      const forceSave = options?.force ?? false;

      let result = await requestNotificationPermission({
        interactive,
        forceSave,
      });

      // Retry when permission is granted but token save was skipped.
      // Do not hammer Chrome when push storage is corrupted — one recovery per cooldown window.
      for (let attempt = 1; attempt <= retries; attempt++) {
        if (result !== "skipped") break;
        if (getNotificationPermissionState() !== "granted") break;
        if (wasRecentStorageRecovery() && !hasFcmTokenOnThisDevice()) break;
        await sleep(attempt * 1200);
        result = await requestNotificationPermission({
          interactive: false,
          forceSave: true,
        });
      }

      return result;
    } finally {
      (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = false;
      (window as any)[FCM_SYNC_PROMISE_KEY] = undefined;
    }
  })();

  (window as any)[FCM_SYNC_PROMISE_KEY] = run;
  return run;
}

/** Re-register push token on this browser/device (call after user enables notifications). */
export async function registerPushOnThisDevice(): Promise<NotificationPermissionResult> {
  clearFcmRegistrationCache();
  try {
    // User explicitly retried — allow one fresh storage recovery attempt.
    sessionStorage.removeItem(FCM_STORAGE_RECOVERY_KEY);
  } catch {
    // ignore
  }
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
  if (!isValidVapidKey(vapidKey)) {
    console.warn(
      "[FCM] Invalid VAPID key in build config. Set VITE_FIREBASE_VAPID_KEY to the Web Push key only (from Firebase Console → Cloud Messaging), not the full .env line."
    );
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
    const token = await acquireFcmToken(vapidKey, true);

    if (!token) {
      return "skipped";
    }

    const saved = await saveFcmToken(token, { force: forceSave });
    if (!saved) {
      return "skipped";
    }

    return "granted";
  } catch (error) {
    if (isFcmStorageError(error)) {
      console.warn(
        "[FCM] Token registration failed after recovery:",
        error,
        "— In Chrome: DevTools → Application → Storage → Clear site data, then refresh and tap Finish setup once."
      );
      return "storage_error";
    }
    console.warn("[FCM] Token registration failed:", error);
    return "skipped";
  }
}
