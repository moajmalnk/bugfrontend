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
const FCM_TOKEN_TIMEOUT_MS = 12_000;
const FCM_SYNC_TIMEOUT_MS = 20_000;

type SwPrefer = "auto" | "main" | "legacy";

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

function getFcmSyncTimeoutMs(): number {
  return isSafariBrowser() ? 25_000 : 15_000;
}

export function isSafariWebBrowser(): boolean {
  return isSafariBrowser();
}

/** Safari iOS needs Add to Home Screen before web push works. */
export function needsSafariPwaForPush(): boolean {
  return isSafariBrowser() && detectDeviceType() === "ios" && !isPwaInstalledMode();
}

/**
 * Run on every login — clears stale local FCM state so registration works
 * without users manually clearing browser cache (especially Safari).
 */
export async function prepareFcmOnLogin(): Promise<void> {
  clearFcmRegistrationCache();
  try {
    sessionStorage.removeItem(FCM_STORAGE_RECOVERY_KEY);
  } catch {
    // ignore
  }

  if (getNotificationPermissionState() !== "granted") {
    return;
  }

  await softResetPushState();
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
    void syncFcmTokenForSession({ force: true, interactive: false, retries: 1, timeoutMs: 15_000 });
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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

/** Chrome/Edge desktop: lightweight FCM-only SW avoids push storage errors from the PWA cache worker. */
function prefersLegacyFcmWorker(): boolean {
  if (isPwaInstalledMode()) {
    return false;
  }
  if (isSafariBrowser()) {
    return false;
  }
  if (detectDeviceType() !== "desktop") {
    return false;
  }
  const ua = navigator.userAgent;
  return (/Chrome/i.test(ua) && !/Edg/i.test(ua)) || /Edg\//i.test(ua);
}

function getSwAttemptOrder(): SwPrefer[] {
  return prefersLegacyFcmWorker() ? ["legacy", "main"] : ["main", "legacy"];
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

/** Soft reset — never unregister the PWA service worker (that causes Chrome storage errors). */
async function softResetPushState(): Promise<void> {
  clearFcmRegistrationCache();
  await unsubscribeAllPushSubscriptions();
  await clearFirebaseMessagingDatabases();
  await sleep(1000);
}

/** Clear broken push subscription / Firebase IDB state. */
export async function resetPushBrowserState(): Promise<void> {
  await softResetPushState();
}

async function waitForServiceWorkerActive(registration: ServiceWorkerRegistration): Promise<void> {
  await navigator.serviceWorker.ready;
  if (!registration.installing) {
    return;
  }

  await new Promise<void>((resolve) => {
    const worker = registration.installing!;
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

async function registerLegacyFcmWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!navigator?.serviceWorker) {
    return null;
  }

  try {
    let registration = await navigator.serviceWorker.getRegistration(LEGACY_FCM_SW_SCOPE);
    if (!registration) {
      registration = await navigator.serviceWorker.register(LEGACY_FCM_SW_URL, {
        scope: LEGACY_FCM_SW_SCOPE,
      });
    }
    await waitForServiceWorkerActive(registration);
    return registration;
  } catch {
    return null;
  }
}

async function registerMainPwaWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!navigator?.serviceWorker) {
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
    await waitForServiceWorkerActive(registration);

    // Keep legacy worker on Chrome desktop — it is used for reliable token registration.
    if (!prefersLegacyFcmWorker()) {
      await unregisterLegacyFcmWorker();
    }
    return registration;
  } catch {
    return null;
  }
}

async function resolveServiceWorkerRegistration(
  prefer: SwPrefer
): Promise<ServiceWorkerRegistration | null> {
  const useLegacy =
    prefer === "legacy" || (prefer === "auto" && prefersLegacyFcmWorker());

  if (useLegacy) {
    const legacy = await registerLegacyFcmWorker();
    if (legacy) {
      return legacy;
    }
    if (prefer === "legacy") {
      return null;
    }
  }

  return registerMainPwaWorker();
}

async function acquireFcmToken(vapidKey: string, allowRecovery: boolean): Promise<string | null> {
  const requestToken = async (prefer: SwPrefer): Promise<string | null> => {
    const registration = await resolveServiceWorkerRegistration(prefer);
    if (!registration) {
      return null;
    }
    const messaging = getMessaging(app);
    return withTimeout(
      getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      }),
      FCM_TOKEN_TIMEOUT_MS,
      "FCM getToken"
    );
  };

  const order = getSwAttemptOrder();
  let lastError: unknown;

  for (const prefer of order) {
    try {
      const token = await requestToken(prefer);
      if (token) {
        return token;
      }
    } catch (error) {
      lastError = error;
      if (!isFcmStorageError(error)) {
        throw error;
      }
    }
  }

  if (!allowRecovery || !lastError || !isFcmStorageError(lastError) || wasRecentStorageRecovery()) {
    throw lastError ?? new Error("FCM token unavailable");
  }

  markStorageRecoveryAttempt();
  console.warn("[FCM] Storage error — clearing push subscription cache and retrying once");
  await softResetPushState();

  for (const prefer of order) {
    try {
      const token = await requestToken(prefer);
      if (token) {
        return token;
      }
    } catch (error) {
      lastError = error;
      if (!isFcmStorageError(error)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("FCM token unavailable after recovery");
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

/** Resolve the service worker used for Firebase Cloud Messaging. */
export async function getFirebaseServiceWorkerRegistration(
  options?: { prefer?: SwPrefer }
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !navigator?.serviceWorker) {
    return null;
  }

  const prefer = options?.prefer ?? "auto";
  const registration = await resolveServiceWorkerRegistration(prefer);
  if (registration) {
    return registration;
  }

  if (prefer === "auto") {
    return resolveServiceWorkerRegistration(prefersLegacyFcmWorker() ? "main" : "legacy");
  }

  return null;
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
  timeoutMs?: number;
}): Promise<NotificationPermissionResult> {
  const existing = (window as any)[FCM_SYNC_PROMISE_KEY] as
    | Promise<NotificationPermissionResult>
    | undefined;
  if (existing) {
    return existing;
  }

  const timeoutMs = options?.timeoutMs ?? FCM_SYNC_TIMEOUT_MS;

  const run = withTimeout(
    (async (): Promise<NotificationPermissionResult> => {
      (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = true;
      const retries = Math.max(0, options?.retries ?? 1);
      try {
        const interactive = options?.interactive ?? false;
        const forceSave = options?.force ?? false;

        let result = await requestNotificationPermission({
          interactive,
          forceSave,
        });

        for (let attempt = 1; attempt <= retries; attempt++) {
          if (result !== "skipped") break;
          if (getNotificationPermissionState() !== "granted") break;
          if (wasRecentStorageRecovery() && !hasFcmTokenOnThisDevice()) break;
          await sleep(attempt * 800);
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
    })(),
    timeoutMs,
    "FCM sync"
  ).catch((error) => {
    (window as any)[FCM_SYNC_IN_FLIGHT_KEY] = false;
    (window as any)[FCM_SYNC_PROMISE_KEY] = undefined;
    if (isFcmStorageError(error) || String(error).includes("timed out")) {
      return "storage_error" as const;
    }
    return "skipped" as const;
  });

  (window as any)[FCM_SYNC_PROMISE_KEY] = run;
  return run;
}

/** Re-register push token on this browser/device (call after user enables notifications). */
export async function registerPushOnThisDevice(): Promise<NotificationPermissionResult> {
  clearFcmRegistrationCache();
  try {
    sessionStorage.removeItem(FCM_STORAGE_RECOVERY_KEY);
  } catch {
    // ignore
  }
  return withTimeout(
    requestNotificationPermission({ interactive: true, forceSave: true }),
    FCM_SYNC_TIMEOUT_MS,
    "FCM register"
  ).catch((error) => {
    if (isFcmStorageError(error) || String(error).includes("timed out")) {
      return "storage_error" as const;
    }
    return "skipped" as const;
  });
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

  if (needsSafariPwaForPush()) {
    return "unsupported";
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
      console.warn("[FCM] Token registration failed after recovery:", error);
      return "storage_error";
    }
    console.warn("[FCM] Token registration failed:", error);
    return "skipped";
  }
}
