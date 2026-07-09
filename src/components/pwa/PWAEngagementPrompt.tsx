import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestNotificationPermission,
  getNotificationPermissionState,
  needsNotificationPermission,
  isNotificationPermissionBlocked,
  needsPushRegistrationOnThisDevice,
  hasFcmTokenOnThisDevice,
  registerPushOnThisDevice,
} from "@/firebase-messaging-sw";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const INSTALLED_KEY = "bugricer_pwa_installed";
const INSTALL_DISMISS_KEY = "bugricer_pwa_install_dismissed_at";
const NOTIF_DISMISS_KEY = "bugricer_pwa_notif_dismissed_at";
const LEGACY_DISMISS_KEY = "bugricer_pwa_prompt_dismissed_at";
const INSTALL_DISMISS_DAYS = 7;
const NOTIF_BLOCKED_DISMISS_KEY = "bugricer_pwa_notif_blocked_dismissed_at";
const NOTIF_DISMISS_HOURS = 12;
const NOTIF_BLOCKED_DISMISS_HOURS = 24;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const modes = ["standalone", "fullscreen", "minimal-ui"] as const;
  const displayMode = modes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayMode || iosStandalone;
}

function hasInstalledFlag(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function markInstalled() {
  try {
    localStorage.setItem(INSTALLED_KEY, "1");
  } catch {
    // ignore
  }
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function wasDismissed(key: string, maxMs: number): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  return Date.now() - dismissedAt < maxMs;
}

function markDismissed(key: string) {
  localStorage.setItem(key, String(Date.now()));
}

function clearDismissed(key: string) {
  localStorage.removeItem(key);
}

function clearLegacyDismiss() {
  try {
    localStorage.removeItem(LEGACY_DISMISS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Install prompt only when not installed.
 * Notification prompt only when permission is still "default".
 * Once installed + notifications allowed, nothing is shown.
 */
export function PWAEngagementPrompt() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">(
    () => getNotificationPermissionState()
  );
  const [installDone, setInstallDone] = useState(
    () => isStandaloneDisplay() || hasInstalledFlag()
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [forceNotifPrompt, setForceNotifPrompt] = useState(false);

  const ios = useMemo(() => isIosDevice(), []);
  const canInstall = Boolean(deferredPrompt) && !installDone;
  const notificationsBlocked = notificationState === "denied";
  const pushNeedsRegistration = needsPushRegistrationOnThisDevice();
  const canEnablePush =
    notificationState === "default" || pushNeedsRegistration;
  // UX rule: if browser permission is already granted, do not keep showing
  // the floating prompt/modal. Device token retries continue silently.
  const needsNotifications = notificationState === "default" || notificationState === "denied";

  const setInstalled = useCallback(() => {
    markInstalled();
    setInstallDone(true);
    setDeferredPrompt(null);
  }, []);

  const refreshPermission = useCallback(() => {
    const permission = getNotificationPermissionState();
    setNotificationState(permission);
    return permission;
  }, []);

  const openNotificationPrompt = useCallback(() => {
    if (!(getNotificationPermissionState() === "default" || getNotificationPermissionState() === "denied")) return;
    clearDismissed(NOTIF_DISMISS_KEY);
    clearDismissed(NOTIF_BLOCKED_DISMISS_KEY);
    setForceNotifPrompt(true);
    refreshPermission();
    setOpen(true);
  }, [refreshPermission]);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled();
    }

    const onBeforeInstall = (event: Event) => {
      // Browser only fires this when install is still available
      event.preventDefault();
      if (hasInstalledFlag() || isStandaloneDisplay()) {
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallDone(false);
    };

    const onInstalled = () => {
      setInstalled();
      setStatusMessage("App installed. Enable notifications to get bug alerts.");
      clearDismissed(NOTIF_DISMISS_KEY);
      if (getNotificationPermissionState() === "default") {
        setForceNotifPrompt(true);
        setOpen(true);
      } else {
        setOpen(false);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [setInstalled]);

  // Detect related installed apps (Chrome) and persist flag
  useEffect(() => {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<Array<{ id?: string; platform?: string }>>;
    };
    if (typeof nav.getInstalledRelatedApps !== "function") return;

    nav
      .getInstalledRelatedApps()
      .then((apps) => {
        if (apps && apps.length > 0) {
          setInstalled();
        }
      })
      .catch(() => {
        // ignore
      });
  }, [setInstalled]);

  // Decide when to show the modal
  useEffect(() => {
    if (!currentUser) {
      setOpen(false);
      return;
    }

    clearLegacyDismiss();

    const timer = window.setTimeout(() => {
      const standalone = isStandaloneDisplay();
      if (standalone || hasInstalledFlag()) {
        setInstalled();
      }

      const installed = standalone || hasInstalledFlag();
      const permission = refreshPermission();

      // Fully set up — never show install/notification modal
      if (installed && permission === "granted" && !needsPushRegistrationOnThisDevice()) {
        setOpen(false);
        return;
      }

      const showInstall =
        !installed &&
        (Boolean(deferredPrompt) || ios) &&
        !wasDismissed(INSTALL_DISMISS_KEY, INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000);

      const showNotifications =
        (permission === "default" || permission === "denied") &&
        (forceNotifPrompt ||
          installed ||
          (permission === "denied"
            ? !wasDismissed(NOTIF_BLOCKED_DISMISS_KEY, NOTIF_BLOCKED_DISMISS_HOURS * 60 * 60 * 1000)
            : !wasDismissed(NOTIF_DISMISS_KEY, NOTIF_DISMISS_HOURS * 60 * 60 * 1000)));

      // Only open when there is something useful to do
      if (showNotifications || showInstall) {
        setOpen(true);
      } else {
        setOpen(false);
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [currentUser, deferredPrompt, forceNotifPrompt, ios, refreshPermission, setInstalled]);

  // Re-check permission when user returns from browser site settings
  useEffect(() => {
    if (!currentUser) return;

    const recheck = () => {
      const previous = notificationState;
      const permission = refreshPermission();

      if (permission === "granted") {
        if (needsPushRegistrationOnThisDevice()) {
          void requestNotificationPermission({ interactive: false }).then((result) => {
            if (result === "granted" || hasFcmTokenOnThisDevice()) {
              setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
              window.setTimeout(() => {
                setOpen(false);
                setForceNotifPrompt(false);
              }, 1500);
            }
          });
          return;
        }

        if (previous === "denied") {
          setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
          window.setTimeout(() => {
            setOpen(false);
            setForceNotifPrompt(false);
          }, 1500);
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        recheck();
      }
    };

    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentUser, notificationState, refreshPermission]);

  // Quietly refresh FCM token when already granted
  useEffect(() => {
    if (!currentUser) return;
    if (getNotificationPermissionState() !== "granted") return;
    void requestNotificationPermission({ interactive: false });
  }, [currentUser]);

  const closePrompt = useCallback(
    (persistDismiss: boolean) => {
      setOpen(false);
      setStatusMessage(null);
      setForceNotifPrompt(false);
      if (!persistDismiss) return;

      if (!installDone) {
        markDismissed(INSTALL_DISMISS_KEY);
      }
      if (getNotificationPermissionState() === "default") {
        markDismissed(NOTIF_DISMISS_KEY);
      }
      if (isNotificationPermissionBlocked()) {
        markDismissed(NOTIF_BLOCKED_DISMISS_KEY);
      }
    },
    [installDone]
  );

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    setStatusMessage(null);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled();
        setStatusMessage("App installed. Next: enable notifications.");
        clearDismissed(NOTIF_DISMISS_KEY);
        if (getNotificationPermissionState() === "default") {
          setForceNotifPrompt(true);
          setOpen(true);
        } else {
          setOpen(false);
        }
      } else {
        setStatusMessage("Install cancelled. You can try again anytime.");
      }
      setDeferredPrompt(null);
    } catch {
      setStatusMessage("Install is not available in this browser right now.");
    } finally {
      setInstalling(false);
    }
  };

  const handleEnableNotifications = async () => {
    setEnablingNotifications(true);
    setStatusMessage(null);
    try {
      if (isNotificationPermissionBlocked()) {
        setStatusMessage(
          "Notifications are blocked. Use the lock icon next to the address bar, turn Notifications ON, then tap “I've enabled them”."
        );
        return;
      }

      const alreadyGranted = getNotificationPermissionState() === "granted";
      const result = alreadyGranted
        ? await registerPushOnThisDevice()
        : await requestNotificationPermission({ interactive: true });
      refreshPermission();

      if ((result === "granted" || alreadyGranted) && hasFcmTokenOnThisDevice()) {
        clearDismissed(NOTIF_DISMISS_KEY);
        clearDismissed(NOTIF_BLOCKED_DISMISS_KEY);
        setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
        window.setTimeout(() => {
          setOpen(false);
          setForceNotifPrompt(false);
        }, 1200);
      } else if (getNotificationPermissionState() === "denied") {
        setStatusMessage(
          "Notifications are blocked. Open site settings (lock icon in the address bar) and allow notifications for BugRicer."
        );
      } else if (alreadyGranted || getNotificationPermissionState() === "granted") {
        setStatusMessage(
          "Browser allows notifications, but this device could not finish setup. Refresh the page, then tap the button again."
        );
      } else {
        setStatusMessage("Could not enable notifications on this device.");
      }
    } finally {
      setEnablingNotifications(false);
    }
  };

  const handleRecheckBlockedPermission = async () => {
    setEnablingNotifications(true);
    setStatusMessage(null);
    try {
      const permission = refreshPermission();
      if (permission === "granted") {
        const result = await requestNotificationPermission({ interactive: false });
        if (result === "granted" || hasFcmTokenOnThisDevice()) {
          clearDismissed(NOTIF_BLOCKED_DISMISS_KEY);
          setStatusMessage("Notifications enabled. You will get bug alerts on this device.");
          window.setTimeout(() => {
            setOpen(false);
            setForceNotifPrompt(false);
          }, 1200);
          return;
        }
      }

      setStatusMessage(
        "Still blocked. Click the lock/tune icon next to bugs.bugricer.com → Notifications → turn ON → then try again."
      );
    } finally {
      setEnablingNotifications(false);
    }
  };

  // Floating bell when notifications still need attention (default or blocked)
  const showFloatingBell = Boolean(currentUser) && !open && needsNotifications;

  // Nothing useful to show in the modal
  const showInstallSection = !installDone && (canInstall || ios);
  const showNotifSection = needsNotifications;
  const shouldRenderModal = open && currentUser && (showInstallSection || showNotifSection);

  return (
    <>
      {showFloatingBell && (
        <button
          type="button"
          onClick={openNotificationPrompt}
          className={cn(
            "fixed z-[70] bottom-20 right-4 sm:bottom-6 sm:right-6",
            "flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg shadow-black/40",
            "bg-violet-600 text-white text-sm font-medium",
            "hover:bg-violet-500 active:scale-[0.98] transition"
          )}
        >
          <Bell className="h-4 w-4" />
          {notificationsBlocked
            ? "Notifications blocked"
            : pushNeedsRegistration
              ? "Finish notification setup"
              : "Enable notifications"}
        </button>
      )}

      {shouldRenderModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-prompt-title"
            className={cn(
              "w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/50",
              "animate-in fade-in-0 zoom-in-95 duration-200"
            )}
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600/15 border border-blue-500/30">
                  {installDone ? (
                    <Bell className="h-5 w-5 text-violet-400" />
                  ) : (
                    <Smartphone className="h-5 w-5 text-blue-400" />
                  )}
                </div>
                <div>
                  <h2 id="pwa-prompt-title" className="text-base font-semibold text-white">
                    {notificationsBlocked
                      ? "Notifications are blocked"
                      : installDone
                        ? "Enable push notifications"
                        : "Install BugRicer & stay updated"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400 leading-relaxed">
                    {notificationsBlocked
                      ? "BugRicer cannot show the permission popup again. Turn notifications on in your browser site settings."
                      : installDone
                        ? "Allow notifications so you get alerts for new bugs, fixes, and messages on this device."
                        : "Add the app to your home screen and allow notifications for new bugs, fixes, and messages."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => closePrompt(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 pb-5">
              {showInstallSection && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Download className="h-4 w-4 text-blue-400" />
                    Install app
                  </div>
                  {canInstall ? (
                    <Button
                      className="mt-3 w-full"
                      onClick={handleInstall}
                      disabled={installing}
                    >
                      {installing ? "Opening install…" : "Install BugRicer"}
                    </Button>
                  ) : (
                    <div className="mt-2 space-y-2 text-sm text-slate-400">
                      <p className="flex items-start gap-2">
                        <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                        <span>
                          Tap the <strong className="text-slate-200">Share</strong> button in Safari,
                          then choose <strong className="text-slate-200">Add to Home Screen</strong>.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {showNotifSection && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Bell className="h-4 w-4 text-violet-400" />
                    Push notifications
                  </div>
                  {notificationsBlocked ? (
                    <>
                      <ol className="mt-2 space-y-2 text-sm text-slate-400 list-decimal list-inside">
                        <li>Click the <strong className="text-slate-200">lock or tune icon</strong> left of the address bar</li>
                        <li>Find <strong className="text-slate-200">Notifications</strong> and turn it <strong className="text-slate-200">ON</strong></li>
                        <li>Come back here and tap the button below</li>
                      </ol>
                      <Button
                        className="mt-3 w-full bg-violet-600 hover:bg-violet-500"
                        onClick={handleRecheckBlockedPermission}
                        disabled={enablingNotifications}
                      >
                        {enablingNotifications ? "Checking…" : "I've enabled them"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-sm text-slate-400">
                        {pushNeedsRegistration
                          ? "Notifications are allowed in your browser. Tap below to finish registering this device for push alerts."
                          : "Get alerts for bugs and important project updates. Tap the button to allow."}
                      </p>
                      <Button
                        className="mt-3 w-full bg-violet-600 hover:bg-violet-500"
                        onClick={handleEnableNotifications}
                        disabled={enablingNotifications || !canEnablePush}
                      >
                        {enablingNotifications
                          ? "Registering…"
                          : pushNeedsRegistration
                            ? "Finish setup on this device"
                            : "Enable notifications"}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {statusMessage && (
                <p className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-300">
                  {statusMessage}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  className="flex-1 text-slate-300 hover:text-white"
                  onClick={() => closePrompt(true)}
                >
                  Not now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
